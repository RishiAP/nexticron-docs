import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireSuperAdmin } from "@/lib/auth"
import { cleanVersion } from "@/lib/utils"

// POST /api/admin/versions — create a new library version
export async function POST(req: NextRequest) {
  try {
    await requireSuperAdmin()
    const body = await req.json()
    let { version, libraryId } = body

    if (!version || !libraryId) {
      return NextResponse.json({ error: "Version and libraryId are required" }, { status: 400 })
    }

    // Clean version: remove 'v' prefix if present
    version = cleanVersion(version)

    const libraryVersion = await prisma.libraryVersion.create({
      data: { version, libraryId },
    })
    return NextResponse.json(libraryVersion, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create version" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 403 : 500 }
    )
  }
}
