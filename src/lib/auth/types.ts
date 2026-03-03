/**
 * Core authentication types for the LDAP-based auth system.
 * Provider-agnostic — the adapter pattern allows swapping
 * the identity provider without changing application code.
 */

/**
 * Re-export the Prisma ProjectRole enum so the auth layer
 * uses the DB enum as the single source of truth.
 */
export { ProjectRole } from "@/generated/prisma/client"
import type { ProjectRole } from "@/generated/prisma/client"

/** A single derived project permission */
export interface ProjectPermission {
  libraryId: string
  librarySlug: string
  role: ProjectRole
}

/** Decoded user identity from JWT claims */
export interface AuthUser {
  /** Internal user ID (UUID from users table) */
  userId: string
  /** LDAP username (uid) */
  username: string
  /** Email address */
  email: string
  /** Whether the user has global admin access */
  isAdmin: boolean
  /** Raw directory group memberships */
  groups: string[]
  /** Derived per-project permissions */
  projectPermissions: ProjectPermission[]
}

/** JWT payload stored in the access token */
export interface SessionPayload {
  /** Internal user ID (UUID) */
  sub: string
  /** LDAP username */
  username: string
  email: string
  isAdmin: boolean
  groups: string[]
  projectPermissions: ProjectPermission[]
  /** Issued-at timestamp (epoch seconds) */
  iat: number
  /** Expiration timestamp (epoch seconds) */
  exp: number
}

/** Result from the identity provider authenticate call */
export interface AuthenticateResult {
  success: boolean
  user?: {
    uid: string
    displayName: string
    email: string
    groups: string[]
    /** UNIX timestamp (seconds) of the last LDAP password change, or null if unknown. */
    krbLastPwdChange: number | null
  }
  error?: string
}

/**
 * Auth adapter interface — implement this for each identity provider.
 * Currently: LDAP. Future: Keycloak, etc.
 */
export interface AuthAdapter {
  /** Verify credentials and return user identity + group memberships. */
  authenticate(username: string, password: string): Promise<AuthenticateResult>
}
