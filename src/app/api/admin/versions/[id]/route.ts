import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireSuperAdmin } from "@/lib/auth"

type Params = { params: Promise<{ id: string }> }

// DELETE /api/admin/versions/[id]
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    await requireSuperAdmin()
    const { id } = await params
    await prisma.libraryVersion.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete version" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 403 : 500 }
    )
  }
}
