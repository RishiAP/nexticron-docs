/**
 * Re-export auth helpers for backward compatibility.
 * All logic lives in @/lib/auth/*.
 */
export {
  isAdmin,
  getCurrentUser,
  getSession,
  requireAuth,
  requireAdmin,
  requireRole,
  requireProjectPermission,
  getUserProjectPermissions,
} from "./auth/helpers"

export type {
  AuthUser,
  SessionPayload,
  ProjectPermission,
  AuthAdapter,
  AuthenticateResult,
} from "./auth/types"

export { ProjectRole } from "./auth/types"
