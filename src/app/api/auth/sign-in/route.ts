/**
 * POST /api/auth/sign-in
 *
 * Authenticates against LDAP, creates/looks-up the internal user,
 * caches groups + admin flag in Redis,
 * derives project permissions, issues an access token (JWT) in the
 * response body and a refresh token in an HTTP-only cookie.
 */
import { NextRequest, NextResponse } from "next/server"
import { LdapAdapter } from "@/lib/auth/ldap-adapter"
import { deriveProjectPermissions } from "@/lib/auth/permissions"
import {
  createAccessToken,
  createRefreshTokenRecord,
  setRefreshCookie,
  setSessionCookie,
} from "@/lib/auth/session"
import { prisma } from "@/lib/prisma"
import { cacheUserSession } from "@/lib/redis"

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      username?: string
      password?: string
    }

    if (!body.username || !body.password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 },
      )
    }

    const adapter = new LdapAdapter()
    const result = await adapter.authenticate(body.username, body.password)

    if (!result.success || !result.user) {
      return NextResponse.json(
        { error: result.error ?? "Authentication failed" },
        { status: 401 },
      )
    }

    // Upsert internal user record (identity only — groups cached in Redis)
    const isAdmin = adapter.isAdmin(result.user.groups)
    const user = await prisma.user.upsert({
      where: { username: result.user.uid },
      update: {
        email: result.user.email,
      },
      create: {
        username: result.user.uid,
        email: result.user.email,
      },
    })

    // Cache LDAP groups + admin flag in Redis (TTL = refresh token lifetime)
    const refreshExpiryDays = parseInt(process.env.REFRESH_AND_SESSION_TOKEN_EXPIRY_DAYS ?? "7", 10)
    await cacheUserSession(user.id, {
      email: user.email,
      groups: result.user.groups,
      isAdmin,
      krbLastPwdChange: result.user.krbLastPwdChange,
    }, refreshExpiryDays * 24 * 60 * 60)

    const projectPermissions = await deriveProjectPermissions(result.user.groups)

    // Short-lived access token (JWT) — returned in body, stored in client memory only
    const accessToken = await createAccessToken({
      sub: user.id,
      username: user.username,
      email: user.email,
      isAdmin,
      groups: result.user.groups,
      projectPermissions,
    })

    // Long-lived refresh token (HTTP-only cookie scoped to /api/auth/refresh)
    const { rawToken: rawRefreshToken, recordId: refreshTokenRecordId } = await createRefreshTokenRecord(user.id)
    await setRefreshCookie(rawRefreshToken)

    // Session identity cookie (for SSR / middleware — NOT the access token)
    await setSessionCookie({ id: user.id, username: user.username, isAdmin, refreshTokenId: refreshTokenRecordId })

    return NextResponse.json({
      success: true,
      accessToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        isAdmin,
      },
    })
  } catch (error) {
    console.error("Sign-in error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}
