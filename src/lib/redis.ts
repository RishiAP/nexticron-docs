/**
 * Redis client singleton.
 *
 * Uses ioredis with Redis ≤ 6 compatible commands only:
 *   SET, GET, DEL, SETEX, EXPIRE, TTL, EXISTS
 *
 * Environment variable:
 *   REDIS_URL — Redis connection string (default: redis://localhost:6379)
 */

import Redis from "ioredis"

const globalForRedis = globalThis as unknown as { redis: Redis | undefined }

function createRedisClient(): Redis {
  const url = process.env.REDIS_URL ?? "redis://localhost:6379"
  return new Redis(url, {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  })
}

export const redis = globalForRedis.redis ?? createRedisClient()

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis
}

// ---------------------------------------------------------------------------
// User session cache helpers
// ---------------------------------------------------------------------------

/** Key pattern: `docs:user:{userId}` */
function userCacheKey(userId: string): string {
  return `docs:user:${userId}`
}

export interface CachedUserData {
  email: string
  groups: string[]
  isAdmin: boolean
  /** UNIX timestamp (seconds) of the last LDAP password change, or null if unknown. */
  krbLastPwdChange: number | null
}

/**
 * Cache a user's LDAP-derived data in Redis.
 * TTL matches the refresh token expiry so the cache lives as long as the session.
 *
 * Uses SETEX (Redis ≤ 6 compatible) — `SETEX key seconds value`.
 */
export async function cacheUserSession(
  userId: string,
  data: CachedUserData,
  ttlSeconds: number,
): Promise<void> {
  await redis.setex(userCacheKey(userId), ttlSeconds, JSON.stringify(data))
}

/**
 * Retrieve a user's cached LDAP data from Redis.
 * Returns null on cache miss (user must re-authenticate).
 */
export async function getCachedUserSession(
  userId: string,
): Promise<CachedUserData | null> {
  const raw = await redis.get(userCacheKey(userId))
  if (!raw) return null
  try {
    return JSON.parse(raw) as CachedUserData
  } catch {
    return null
  }
}

/**
 * Delete a user's cached session data (e.g. on sign-out).
 */
export async function deleteCachedUserSession(userId: string): Promise<void> {
  await redis.del(userCacheKey(userId))
}
