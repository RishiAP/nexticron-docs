import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth"
import { ProjectRole } from "@/lib/auth"

/**
 * GET /api/admin/permissions — list all group permission mappings
 */
export async function GET() {
  try {
    await requireAdmin()

    const mappings = await prisma.groupPermissionMapping.findMany({
      orderBy: [{ groupName: "asc" }, { createdAt: "asc" }],
      include: {
        library: { select: { id: true, name: true, slug: true } },
      },
    })

    return NextResponse.json(mappings)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch permission mappings" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 403 : 500 },
    )
  }
}

/**
 * POST /api/admin/permissions — create a new group permission mapping
 *
 * Body: { groupName: string, libraryId: string, role: ProjectRole }
 */
export async function POST(req: NextRequest) {
  try {
    await requireAdmin()
    const body = await req.json()
    const { groupName, libraryId, role } = body as {
      groupName?: string
      libraryId?: string
      role?: string
    }

    if (!groupName || !libraryId || !role) {
      return NextResponse.json(
        { error: "groupName, libraryId, and role are required" },
        { status: 400 },
      )
    }

    if (!Object.values(ProjectRole).includes(role as ProjectRole)) {
      return NextResponse.json(
        { error: `Invalid role. Must be one of: ${Object.values(ProjectRole).join(", ")}` },
        { status: 400 },
      )
    }

    // Verify library exists
    const library = await prisma.library.findUnique({ where: { id: libraryId } })
    if (!library) {
      return NextResponse.json({ error: "Library not found" }, { status: 404 })
    }

    const mapping = await prisma.groupPermissionMapping.create({
      data: {
        groupName: groupName.trim(),
        libraryId,
        role: role as ProjectRole,
      },
      include: {
        library: { select: { id: true, name: true, slug: true } },
      },
    })

    return NextResponse.json(mapping, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create permission mapping"

    // Handle unique constraint violation
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
