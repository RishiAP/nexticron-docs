import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin, ProjectRole } from "@/lib/auth"

type Params = { params: Promise<{ id: string }> }

/**
 * GET /api/admin/permissions/[id] — get a single mapping
 */
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await requireAdmin()
    const { id } = await params

    const mapping = await prisma.groupPermissionMapping.findUnique({
      where: { id },
      include: {
        library: { select: { id: true, name: true, slug: true } },
      },
    })

    if (!mapping) {
      return NextResponse.json({ error: "Mapping not found" }, { status: 404 })
    }

    return NextResponse.json(mapping)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch mapping" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 403 : 500 },
    )
  }
}

/**
 * PATCH /api/admin/permissions/[id] — update a mapping
 *
 * Body: { groupName?: string, libraryId?: string, role?: ProjectRole }
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    await requireAdmin()
    const { id } = await params
    const body = await req.json()
    const { groupName, libraryId, role } = body as {
      groupName?: string
      libraryId?: string
      role?: string
    }

    // Validate role if provided
    if (role && !Object.values(ProjectRole).includes(role as ProjectRole)) {
      return NextResponse.json(
        { error: `Invalid role. Must be one of: ${Object.values(ProjectRole).join(", ")}` },
        { status: 400 },
      )
    }

    // Validate library if provided
    if (libraryId) {
      const library = await prisma.library.findUnique({ where: { id: libraryId } })
      if (!library) {
        return NextResponse.json({ error: "Library not found" }, { status: 404 })
      }
    }

    const data: Record<string, string> = {}
    if (groupName) data.groupName = groupName.trim()
    if (libraryId) data.libraryId = libraryId
    if (role) data.role = role

    const mapping = await prisma.groupPermissionMapping.update({
      where: { id },
      data,
      include: {
        library: { select: { id: true, name: true, slug: true } },
      },
    })

    return NextResponse.json(mapping)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update mapping"

    if (message.includes("Unique constraint")) {
      return NextResponse.json(
        { error: "A mapping for this group and library already exists" },
        { status: 409 },
      )
    }

    return NextResponse.json(
      { error: message },
      { status: message.includes("Unauthorized") ? 403 : 500 },
    )
  }
}

/**
 * DELETE /api/admin/permissions/[id] — delete a mapping
 */
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    await requireAdmin()
    const { id } = await params

    await prisma.groupPermissionMapping.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete mapping" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 403 : 500 },
    )
  }
}
