import { cache } from "react"
import { getCurrentUser } from "@/lib/auth"
import type { ProjectPermission } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// ─── Types ──────────────────────────────────────────────────

export type LibraryWithVersions = {
  id: string
  name: string
  slug: string
  order: number
  versions: {
    id: string
    version: string
    docs: {
      id: string
      title: string
      slug: string
      parentPath: string
      published: boolean
    }[]
  }[]
}

// ─── Cached data fetchers ───────────────────────────────────

/**
 * Fetch all libraries with versions and docs.
 *
 * React `cache()` deduplicates calls **within the same request**
 * so layout + page don't hit the DB twice.
 */
export const getLibrariesWithAllVersions = cache(
  async (): Promise<LibraryWithVersions[]> => {
    return prisma.library.findMany({
      orderBy: { order: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        order: true,
        versions: {
          orderBy: { version: "desc" },
          select: {
            id: true,
            version: true,
            docs: {
              orderBy: [
                { parentPath: "asc" },
                { order: "asc" },
                { title: "asc" },
              ],
              select: {
                id: true,
                title: true,
                slug: true,
                parentPath: true,
                published: true,
              },
            },
          },
        },
      },
    })
  },
)

export const getCachedUser = cache(async () => {
  return getCurrentUser()
})

export const getCachedIsAdmin = cache(async () => {
  const user = await getCachedUser()
  return user?.isAdmin ?? false
})

// ─── Helpers ────────────────────────────────────────────────

export function getLatestVersion(
  lib: LibraryWithVersions,
): string | null {
  return lib.versions[0]?.version ?? null
}

export function canEditLibrary(
  librarySlug: string,
  isAdmin: boolean,
  permissions: ProjectPermission[],
): boolean {
  if (isAdmin) return true
  return permissions.some(
    (p) => p.librarySlug === librarySlug && p.role === "EDITOR",
  )
}
