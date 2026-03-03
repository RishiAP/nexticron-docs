/**
 * JWT access-token + refresh-token session management.
 *
 * Access token  — short-lived JWT (10–15 min), stored ONLY in client
 *                 memory (never in cookies / localStorage).
 * Refresh token — cryptographically secure 256-bit random string
 *                 stored as SHA-256 hash in the DB, sent in an
 *                 HTTP-only cookie scoped to the refresh endpoint.
 * Session cookie — long-lived signed JWT with minimal claims (sub, isAdmin),
 *                  used ONLY for SSR identity resolution and middleware
 *                  route gating.  NOT used for API authorization.
 *
 * Environment variables:
 *   JWT_SECRET                 — Secret key for signing JWTs (min 32 chars)
 *   ACCESS_TOKEN_EXPIRY_MINS   — Access token lifetime in minutes (default: 15)
 *   REFRESH_AND_SESSION_TOKEN_EXPIRY_DAYS  — Refresh token and session cookie lifetime in days (default: 7)
 */

import { randomBytes, createHash } from "crypto"
import { SignJWT, jwtVerify } from "jose"
import { cookies } from "next/headers"
import { prisma } from "@/lib/prisma"
import { cacheUserSession, getCachedUserSession } from "@/lib/redis"
import { LdapAdapter } from "./ldap-adapter"
import { deriveProjectPermissions } from "./permissions"
import type { AuthUser, SessionPayload, ProjectPermission } from "./types"

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const REFRESH_COOKIE_NAME = "refresh_token"
const SESSION_COOKIE_NAME = "session"

// ---------------------------------------------------------------------------
// Env helpers
// ---------------------------------------------------------------------------

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET
  if (!secret || secret.length < 32) {
    throw new Error(
      "JWT_SECRET environment variable must be at least 32 characters",
    )
  }
  return new TextEncoder().encode(secret)
}

function getAccessTokenExpiryMins(): number {
  const mins = process.env.ACCESS_TOKEN_EXPIRY_MINS
  return mins ? parseInt(mins, 10) : 15
}

function getRefreshAndSessionTokenExpiryDays(): number {
  const days = process.env.REFRESH_AND_SESSION_TOKEN_EXPIRY_DAYS
  return days ? parseInt(days, 10) : 7
}

// ---------------------------------------------------------------------------
// Access token (JWT)
// ---------------------------------------------------------------------------

/** Create a signed short-lived access token JWT. */
export async function createAccessToken(payload: {
  sub: string // userId (UUID)
  username: string
  email: string
  isAdmin: boolean
  groups: string[]
  projectPermissions: ProjectPermission[]
}): Promise<string> {
  const expiryMins = getAccessTokenExpiryMins()
  const now = Math.floor(Date.now() / 1000)

  return new SignJWT({
    sub: payload.sub,
    username: payload.username,
    email: payload.email,
    isAdmin: payload.isAdmin,
    groups: payload.groups,
    projectPermissions: payload.projectPermissions,
    iat: now,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(`${expiryMins}m`)
    .setIssuedAt(now)
    .sign(getSecret())
}

/** Verify and decode an access token, returning null if invalid/expired. */
export async function verifyAccessToken(
  token: string,
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    return payload as unknown as SessionPayload
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Refresh token (opaque)
// ---------------------------------------------------------------------------

/** Generate a cryptographically secure 256-bit random refresh token. */
export function generateRefreshToken(): string {
  return randomBytes(32).toString("hex") // 64-char hex = 256 bits
}

/** SHA-256 hash a raw refresh token for safe DB storage. */
export function hashRefreshToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex")
}

/**
 * Store a hashed refresh token in the DB linked to a userId.
 * Returns the raw (unhashed) token AND the DB record ID.
 */
export async function createRefreshTokenRecord(
  userId: string,
): Promise<{ rawToken: string; recordId: string }> {
  const rawToken = generateRefreshToken()
  const tokenHash = hashRefreshToken(rawToken)
  const expiryDays = getRefreshAndSessionTokenExpiryDays()
  const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000)

  const record = await prisma.refreshToken.create({
    data: {
      tokenHash,
      userId,
      expiresAt,
    },
  })

  return { rawToken, recordId: record.id }
}

/**
 * Validate a raw refresh token:
 *  - hash it
 *  - look up the hash in the DB
 *  - check it is not revoked or expired
 *
 * **Reuse detection (Rule 4):** If the token exists in the DB but is
 * already revoked, this means a previously-rotated token was replayed.
 * This is treated as a compromised session — all of that user's refresh
 * tokens are revoked immediately.
 *
 * Returns the DB record (with userId) or null.
 */
export async function validateRefreshToken(rawToken: string) {
  const tokenHash = hashRefreshToken(rawToken)

  const record = await prisma.refreshToken.findUnique({
    where: { tokenHash },
  })

  if (!record) return null

  // Reuse detection: a revoked token being presented again means the
  // token family is compromised. Revoke ALL tokens for this user.
  if (record.revoked) {
    console.warn(
      `[auth] Refresh-token reuse detected for user ${record.userId} — revoking all sessions`,
    )
    await revokeAllUserRefreshTokens(record.userId)
    return null
  }

  if (record.expiresAt < new Date()) return null

  return record
}

/** Revoke a single refresh token record by its id. */
export async function revokeRefreshToken(recordId: string): Promise<void> {
  await prisma.refreshToken.update({
    where: { id: recordId },
    data: { revoked: true },
  })
}

/** Revoke all refresh tokens for a user (e.g. on sign-out or admin revocation). */
export async function revokeAllUserRefreshTokens(
  userId: string,
): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { userId, revoked: false },
    data: { revoked: true },
  })
}

// ---------------------------------------------------------------------------
// Refresh-token cookie helpers
// ---------------------------------------------------------------------------

/** Set the refresh-token cookie (HTTP-only, Secure, SameSite=Strict). */
export async function setRefreshCookie(rawToken: string): Promise<void> {
  const expiryDays = getRefreshAndSessionTokenExpiryDays()
  const cookieStore = await cookies()

  cookieStore.set(REFRESH_COOKIE_NAME, rawToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api/auth/refresh",
    maxAge: expiryDays * 24 * 60 * 60,
  })
}

/** Clear the refresh-token cookie (on sign-out). */
export async function clearRefreshCookie(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete({
    name: REFRESH_COOKIE_NAME,
    path: "/api/auth/refresh",
  })
}

/** Read the raw refresh token from the cookie (Server Components / Route Handlers). */
export async function getRefreshTokenFromCookie(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get(REFRESH_COOKIE_NAME)?.value ?? null
}

/** Read the raw refresh token from a raw cookie header string (middleware / edge). */
export function getRefreshTokenFromCookieString(
  cookieHeader: string | null,
): string | null {
  if (!cookieHeader) return null
  const match = cookieHeader.match(
    new RegExp(`(?:^|;\\s*)${REFRESH_COOKIE_NAME}=([^;]+)`),
  )
  return match?.[1] ?? null
}

// ---------------------------------------------------------------------------
// Access token header helper
// ---------------------------------------------------------------------------

/**
 * Read the access token from the Authorization header (Bearer scheme).
 * Used by API route handlers.
 */
export function getAccessTokenFromHeader(
  authHeader: string | null,
): string | null {
  if (!authHeader) return null
  const match = authHeader.match(/^Bearer\s+(\S+)$/i)
  return match?.[1] ?? null
}

// ---------------------------------------------------------------------------
// Session cookie (SSR identity — NOT the access token)
// ---------------------------------------------------------------------------

/** Minimal claims stored in the session cookie. */
interface SessionCookiePayload {
  /** Internal user ID (UUID) */
  sub: string
  /** LDAP username */
  username: string
  /** Whether the user has global admin access */
  isAdmin: boolean
  /** DB record ID of the refresh token that issued this session cookie */
  refreshTokenId: string
  iat: number
  exp: number
}

/**
 * Create a signed session-identity JWT.
 * Same secret as the access token, but long-lived (same as refresh token)
 * and contains only minimal, non-sensitive claims.
 */
async function createSessionCookieToken(payload: {
  sub: string
  username: string
  isAdmin: boolean
  refreshTokenId: string
}): Promise<string> {
  const expiryDays = getRefreshAndSessionTokenExpiryDays()
  const now = Math.floor(Date.now() / 1000)

  return new SignJWT({
    sub: payload.sub,
    username: payload.username,
    isAdmin: payload.isAdmin,
    refreshTokenId: payload.refreshTokenId,
    purpose: "session", // distinguishes from access token
    iat: now,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(`${expiryDays}d`)
    .setIssuedAt(now)
    .sign(getSecret())
}

/** Verify a session cookie JWT and return the payload, or null. */
async function verifySessionCookieToken(
  token: string,
): Promise<SessionCookiePayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    // Ensure this is a session cookie, not an access token
    if ((payload as Record<string, unknown>).purpose !== "session") return null
    return payload as unknown as SessionCookiePayload
  } catch {
    return null
  }
}

/** Set the session identity cookie (HTTP-only, SameSite=Lax, path="/"). */
export async function setSessionCookie(user: {
  id: string
  username: string
  isAdmin: boolean
  refreshTokenId: string
}): Promise<void> {
  const expiryDays = getRefreshAndSessionTokenExpiryDays()
  const token = await createSessionCookieToken({
    sub: user.id,
    username: user.username,
    isAdmin: user.isAdmin,
    refreshTokenId: user.refreshTokenId,
  })
  const cookieStore = await cookies()

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: expiryDays * 24 * 60 * 60,
  })
}

/** Clear the session cookie (on sign-out). */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE_NAME)
}

// ---------------------------------------------------------------------------
// SSR identity resolution (session cookie → DB user cache)
// ---------------------------------------------------------------------------

/**
 * Resolve the current user's identity for SSR (Server Components).
 *
 * Resolution strategy:
 *   1. Verify the signed session cookie JWT.
 *   2. Check Redis cache (fast path — no DB / LDAP).
 *   3. On cache miss, verify the session cookie's linked refresh token
 *      is still valid in the DB (not revoked, not expired).
 *   4. If valid, re-fetch LDAP groups via service bind and rebuild the
 *      Redis cache (graceful recovery after Redis restart or eviction).
 *   5. If the refresh token is revoked or expired, reject — the user
 *      must re-authenticate.
 *
 * This ensures old / stolen session cookies cannot grant access once
 * the corresponding refresh token has been revoked.
 */
export async function resolveUserFromSessionCookie(): Promise<AuthUser | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value
  if (!token) return null

  const payload = await verifySessionCookieToken(token)
  if (!payload) return null

  // ---- Fast path: Redis cache hit ----
  const cached = await getCachedUserSession(payload.sub)
  if (cached) {
    // Password-change check: if LDAP password was changed after session was
    // issued, force re-authentication.
    if (
      cached.krbLastPwdChange != null &&
      payload.iat != null &&
      cached.krbLastPwdChange > payload.iat
    ) {
      return null
    }

    const projectPermissions = await deriveProjectPermissions(cached.groups)
    return {
      userId: payload.sub,
      username: payload.username,
      email: cached.email,
      isAdmin: cached.isAdmin,
      groups: cached.groups,
      projectPermissions,
    }
  }

  // ---- Slow path: cache miss — verify refresh token in DB ----
  if (!payload.refreshTokenId) return null

  const refreshRecord = await prisma.refreshToken.findUnique({
    where: { id: payload.refreshTokenId },
  })

  if (!refreshRecord || refreshRecord.revoked || refreshRecord.expiresAt < new Date()) {
    return null // refresh token revoked or expired — session invalid
  }

  // Refresh token still valid — re-fetch LDAP groups and rebuild cache
  try {
    const adapter = new LdapAdapter()
    const { groups, krbLastPwdChange } = await adapter.fetchUserGroups(payload.username)

    // Password-change check: if password was changed after session was
    // issued, reject the session — user must re-authenticate.
    if (
      krbLastPwdChange != null &&
      payload.iat != null &&
      krbLastPwdChange > payload.iat
    ) {
      return null
    }

    const isAdmin = adapter.isAdmin(groups)

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
    })
    if (!user) return null

    // Rebuild Redis cache
    const refreshExpiryDays = getRefreshAndSessionTokenExpiryDays()
    await cacheUserSession(user.id, {
      email: user.email,
      groups,
      isAdmin,
      krbLastPwdChange,
    }, refreshExpiryDays * 24 * 60 * 60)

    const projectPermissions = await deriveProjectPermissions(groups)
    return {
      userId: user.id,
      username: user.username,
      email: user.email,
      isAdmin,
      groups,
      projectPermissions,
    }
  } catch (error) {
    console.error("[auth] Failed to rebuild session from LDAP:", error)
    return null
  }
}

/**
 * Lightweight SSR identity check from a raw cookie header (middleware / edge).
 *
 * Verifies the signed session cookie and returns minimal user info.
 * Used by Next.js middleware which cannot call `cookies()` from next/headers.
 */
export async function resolveUserFromCookieString(
  cookieHeader: string | null,
): Promise<{ userId: string; username: string; isAdmin: boolean } | null> {
  if (!cookieHeader) return null
  const match = cookieHeader.match(
    new RegExp(`(?:^|;\\s*)${SESSION_COOKIE_NAME}=([^;]+)`),
  )
  const token = match?.[1]
  if (!token) return null

  const payload = await verifySessionCookieToken(token)
  if (!payload) return null

  return {
    userId: payload.sub,
    username: payload.username,
    isAdmin: payload.isAdmin,
  }
}
