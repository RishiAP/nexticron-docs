/**
 * POST /api/auth/refresh
 *
 * Reads the refresh token from the HTTP-only cookie, validates it,
 * re-fetches LDAP groups via service bind, updates the Redis user cache,
 * recomputes permissions, rotates the refresh token, and returns a new
 * access token in the response body (never in a cookie).
 */
import { NextResponse } from "next/server"
import { LdapAdapter } from "@/lib/auth/ldap-adapter"
import { deriveProjectPermissions } from "@/lib/auth/permissions"
import {
  createAccessToken,
  createRefreshTokenRecord,
  getRefreshTokenFromCookie,
  revokeRefreshToken,
  setRefreshCookie,
  setSessionCookie,
  validateRefreshToken,
} from "@/lib/auth/session"
import { prisma } from "@/lib/prisma"
import { cacheUserSession } from "@/lib/redis"

export async function POST() {
  try {
    // 1. Read refresh token from cookie
    const rawToken = await getRefreshTokenFromCookie()
    if (!rawToken) {
      return NextResponse.json(
        { error: "No refresh token" },
        { status: 401 },
      )
    }

    // 2. Validate the refresh token in DB
    const record = await validateRefreshToken(rawToken)
    if (!record) {
      return NextResponse.json(
        { error: "Invalid or expired refresh token" },
        { status: 401 },
      )
    }

    // 3. Look up the user
    const user = await prisma.user.findUnique({
      where: { id: record.userId },
    })
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 401 },
      )
    }

    // 4. Re-fetch LDAP groups via service bind account
    const adapter = new LdapAdapter()
    const { groups, krbLastPwdChange } = await adapter.fetchUserGroups(user.username)
    const isAdmin = adapter.isAdmin(groups)
    const projectPermissions = await deriveProjectPermissions(groups)

    // 4b. Update cached groups / admin flag in Redis (TTL = refresh token lifetime)
    const refreshExpiryDays = parseInt(process.env.REFRESH_AND_SESSION_TOKEN_EXPIRY_DAYS ?? "7", 10)
    await cacheUserSession(user.id, {
      email: user.email,
      groups,
      isAdmin,
      krbLastPwdChange,
    }, refreshExpiryDays * 24 * 60 * 60)

    // 5. Issue new access token (response body only — no cookie)
    const accessToken = await createAccessToken({
      sub: user.id,
      username: user.username,
      email: user.email,
      isAdmin,
      groups,
      projectPermissions,
    })

    // 6. Rotate refresh token — revoke old, issue new
    await revokeRefreshToken(record.id)
    const { rawToken: newRawToken, recordId: newRefreshTokenRecordId } = await createRefreshTokenRecord(user.id)
    await setRefreshCookie(newRawToken)

    // 7. Update session identity cookie (reflects latest isAdmin)
    await setSessionCookie({ id: user.id, username: user.username, isAdmin, refreshTokenId: newRefreshTokenRecordId })

    return NextResponse.json({
      success: true,
      accessToken,
    })
  } catch (error) {
    console.error("Refresh error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}
