/**
 * Permission derivation.
 *
 * Resolves directory group memberships into per-library project permissions
 * by querying the GroupPermissionMapping table.
 */

import { prisma } from "@/lib/prisma"
import type { ProjectPermission } from "./types"

/**
 * Given a list of directory group names, derive the project permissions
 * by looking up GroupPermissionMapping records.
 */
export async function deriveProjectPermissions(
  groups: string[],
): Promise<ProjectPermission[]> {
  if (groups.length === 0) return []

  const mappings = await prisma.groupPermissionMapping.findMany({
    where: { groupName: { in: groups } },
    include: {
      library: { select: { id: true, slug: true } },
    },
  })

  return mappings.map((m) => ({
    libraryId: m.library.id,
    librarySlug: m.library.slug,
    role: m.role,
  }))
}
