import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireSuperAdmin } from "@/lib/auth"

type Params = { params: Promise<{ id: string }> }

// GET /api/admin/docs/[id] — get a single doc with full content
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await requireSuperAdmin()
    const { id } = await params
    const doc = await prisma.doc.findUnique({
      where: { id },
      include: {
        libraryVersion: {
          include: { library: { select: { name: true, slug: true } } },
        },
      },
    })
    if (!doc) {
      return NextResponse.json({ error: "Doc not found" }, { status: 404 })
    }
    return NextResponse.json(doc)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch doc" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 403 : 500 }
    )
  }
}

// PATCH /api/admin/docs/[id] — update a doc
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    await requireSuperAdmin()
    const { id } = await params
    const body = await req.json()

    const doc = await prisma.doc.update({
      where: { id },
      data: body,
    })
    return NextResponse.json(doc)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update doc" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 403 : 500 }
    )
  }
}

// DELETE /api/admin/docs/[id] — delete a doc
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    await requireSuperAdmin()
    const { id } = await params
    await prisma.doc.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete doc" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 403 : 500 }
    )
  }
}
