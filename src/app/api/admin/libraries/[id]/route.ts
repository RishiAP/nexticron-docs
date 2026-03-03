import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth"

type Params = { params: Promise<{ id: string }> }

// GET /api/admin/libraries/[id]
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await requireAdmin()
    const { id } = await params
    const library = await prisma.library.findUnique({
      where: { id },
      include: {
        versions: {
          orderBy: { version: "asc" },
          include: { docs: { select: { id: true, title: true, slug: true, parentPath: true, published: true } } },
        },
      },
    })
    if (!library) {
      return NextResponse.json({ error: "Library not found" }, { status: 404 })
    }
    return NextResponse.json(library)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch library" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 403 : 500 }
    )
  }
}

// PATCH /api/admin/libraries/[id]
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    await requireAdmin()
    const { id } = await params
    const body = await req.json()
    const library = await prisma.library.update({
      where: { id },
      data: body,
    })
    return NextResponse.json(library)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update library" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 403 : 500 }
    )
  }
}

// DELETE /api/admin/libraries/[id]
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    await requireAdmin()
    const { id } = await params
    await prisma.library.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete library" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 403 : 500 }
    )
  }
}
