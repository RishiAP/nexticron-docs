import { auth, currentUser } from "@clerk/nextjs/server"

export async function isSuperAdmin(): Promise<boolean> {
  const user = await currentUser()
  if (!user) return false
  return (user.publicMetadata as { role?: string })?.role === "super-admin"
}

export async function requireSuperAdmin() {
  const isAdmin = await isSuperAdmin()
  if (!isAdmin) {
    throw new Error("Unauthorized: Super admin access required")
  }
}
