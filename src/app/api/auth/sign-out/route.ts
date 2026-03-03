/**
 * POST /api/auth/sign-out
 *
 * Identifies the user from the access token (Authorization header),
 * revokes all their refresh tokens, clears cookies, and deletes
 * the Redis user cache.
 *
 * Note: the refresh cookie is scoped to /api/auth/refresh so it is NOT
 * sent to this endpoint. We identify the user from the JWT instead and
 * clear the cookie via a Set-Cookie response header with matching path.
 */
import { NextRequest, NextResponse } from "next/server"
import {
  clearRefreshCookie,
  clearSessionCookie,
  getAccessTokenFromHeader,
  revokeAllUserRefreshTokens,
  verifyAccessToken,
} from "@/lib/auth/session"
import { deleteCachedUserSession } from "@/lib/redis"

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization")
  const token = getAccessTokenFromHeader(authHeader)

  if (token) {
    const session = await verifyAccessToken(token)
    if (session) {
      await revokeAllUserRefreshTokens(session.sub)
      await deleteCachedUserSession(session.sub)
    }
  }

  await clearRefreshCookie()
  await clearSessionCookie()
  return NextResponse.json({ success: true })
}
