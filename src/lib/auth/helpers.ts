/**
 * Authentication helper functions — Clerk-like developer experience.
 *
 * Works consistently across Server Components, Route Handlers, and API routes.
 *
 * Identity resolution strategy:
 *   1. Authorization header (Bearer JWT) — API calls from the SPA client.
 *   2. Refresh-token cookie → DB user cache — SSR page loads.
 *
 * Helpers:
 *   getCurrentUser()                                  — current user or null
 *   getSession()                                      — raw session payload or null
 *   requireAuth()                                     — throw if not authenticated
 *   requireAdmin()                                    — throw if not admin
 *   isAdmin()                                         — boolean admin check
 *   requireRole(role)                                 — throw if missing role
 *   requireProjectPermission(librarySlug, permission) — throw if no project access
 *   getUserProjectPermissions()                       — all project permissions
 */

import { headers } from "next/headers"
import {
  getAccessTokenFromHeader,
  resolveUserFromSessionCookie,
  verifyAccessToken,
} from "./session"
import type { AuthUser, ProjectPermission, SessionPayload } from "./types"
import { ProjectRole } from "./types"

/**
 * Get the decoded session payload, or null if not authenticated.
 * Reads from the Authorization header (Bearer JWT).
 * This is only available for API route handler calls.
 */
export async function getSession(): Promise<SessionPayload | null> {
  const headerStore = await headers()
  const authHeader = headerStore.get("authorization")
  const headerToken = getAccessTokenFromHeader(authHeader)
  if (headerToken) {
    return verifyAccessToken(headerToken)
  }
  return null
}

/**
 * Get the current user identity.
 *
 * 1. Try Bearer JWT from Authorization header (API calls).
 * 2. Fall back to refresh-token cookie → DB user cache (SSR).
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  // 1. Try JWT (API route handlers)
  const session = await getSession()
  if (session) {
    return {
      userId: session.sub,
      username: session.username,
      email: session.email,
      isAdmin: session.isAdmin,
      groups: session.groups,
      projectPermissions: session.projectPermissions,
    }
  }

  // 2. Fall back to session cookie → DB cache (SSR / Server Components)
  return resolveUserFromSessionCookie()
}

/** Require an authenticated session. Throws if not authenticated. */
export async function requireAuth(): Promise<AuthUser> {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error("Unauthorized: Authentication required")
  }
  return user
}

/** Require global admin role. Throws if not admin. */
export async function requireAdmin(): Promise<AuthUser> {
  const user = await requireAuth()
  if (!user.isAdmin) {
    throw new Error("Unauthorized: Admin access required")
  }
  return user
}

/**
 * Require a specific project role across all project permissions.
 * Admins bypass this check.
 */
export async function requireRole(role: ProjectRole): Promise<AuthUser> {
  const user = await requireAuth()

  if (user.isAdmin) return user

  const hasRole = user.projectPermissions.some((p) => p.role === role)
  if (!hasRole) {
    throw new Error(`Unauthorized: "${role}" role required`)
  }
  return user
}

/**
 * Require a specific project permission. Admins bypass this check.
 */
export async function requireProjectPermission(
  librarySlug: string,
  permission: ProjectRole,
): Promise<AuthUser> {
  const user = await requireAuth()

  // Admins have full access everywhere
  if (user.isAdmin) return user

  const hasPermission = user.projectPermissions.some(
    (p) =>
      p.librarySlug === librarySlug &&
      (p.role === permission ||
        // EDITOR implicitly has VIEWER access
        (permission === ProjectRole.VIEWER && p.role === ProjectRole.EDITOR)),
  )

  if (!hasPermission) {
    throw new Error(
      `Unauthorized: "${permission}" access required for project "${librarySlug}"`,
    )
  }
  return user
}

/** Get all project permissions for the current user. */
export async function getUserProjectPermissions(): Promise<
  ProjectPermission[]
> {
  const user = await getCurrentUser()
  return user?.projectPermissions ?? []
}

/** Check if the current user has global admin access. */
export async function isAdmin(): Promise<boolean> {
  const user = await getCurrentUser()
  return user?.isAdmin ?? false
}
