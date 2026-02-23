import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireSuperAdmin } from "@/lib/auth"

// GET /api/admin/libraries — list all libraries
export async function GET() {
  try {
    await requireSuperAdmin()
    const libraries = await prisma.library.findMany({
      orderBy: { order: "asc" },
      include: {
        versions: {
          orderBy: { version: "asc" },
          select: { id: true, version: true },
        },
      },
    })
    return NextResponse.json(libraries)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch libraries" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 403 : 500 }
    )
  }
}

// POST /api/admin/libraries — create a new library
export async function POST(req: NextRequest) {
  try {
    await requireSuperAdmin()
    const body = await req.json()
    const { name, slug, order } = body

    if (!name || !slug) {
      return NextResponse.json({ error: "Name and slug are required" }, { status: 400 })
    }

    const library = await prisma.library.create({
      data: { name, slug, order: order ?? 0 },
    })
    return NextResponse.json(library, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create library" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 403 : 500 }
    )
  }
}
