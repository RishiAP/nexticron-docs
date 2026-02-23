import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireSuperAdmin } from "@/lib/auth"

// GET /api/admin/docs?libraryVersionId=xxx — list docs for a version
export async function GET(req: NextRequest) {
  try {
    await requireSuperAdmin()
    const { searchParams } = new URL(req.url)
    const libraryVersionId = searchParams.get("libraryVersionId")

    if (!libraryVersionId) {
      return NextResponse.json({ error: "libraryVersionId is required" }, { status: 400 })
    }

    const docs = await prisma.doc.findMany({
      where: { libraryVersionId },
      orderBy: [{ parentPath: "asc" }, { order: "asc" }, { title: "asc" }],
      select: {
        id: true,
        title: true,
        slug: true,
        parentPath: true,
        order: true,
        published: true,
        updatedAt: true,
      },
    })
    return NextResponse.json(docs)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch docs" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 403 : 500 }
    )
  }
}

// POST /api/admin/docs — create a new doc
export async function POST(req: NextRequest) {
  try {
    await requireSuperAdmin()
    const body = await req.json()
    const { title, slug, content, parentPath, order, published, libraryVersionId } = body

    if (!title || !slug || !libraryVersionId) {
      return NextResponse.json(
        { error: "title, slug, and libraryVersionId are required" },
        { status: 400 }
      )
    }

    const doc = await prisma.doc.create({
      data: {
        title,
        slug,
        content: content ?? "",
        parentPath: parentPath ?? "",
        order: order ?? 0,
        published: published ?? false,
        libraryVersionId,
      },
    })
    return NextResponse.json(doc, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create doc" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 403 : 500 }
    )
  }
}
