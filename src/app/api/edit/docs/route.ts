import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, ProjectRole } from "@/lib/auth"
import type { AuthUser } from "@/lib/auth"

/** Check if the user has at least EDITOR access to the library owning this version */
async function requireDocAccess(
  user: AuthUser,
  libraryVersionId: string,
): Promise<void> {
  if (user.isAdmin) return

  const version = await prisma.libraryVersion.findUnique({
    where: { id: libraryVersionId },
    select: { library: { select: { slug: true } } },
  })

  if (!version) throw new Error("Library version not found")

  const hasAccess = user.projectPermissions.some(
    (p) =>
      p.librarySlug === version.library.slug &&
      p.role === ProjectRole.EDITOR,
  )

  if (!hasAccess) {
    throw new Error("Unauthorized: Editor access required for this library")
  }
}

// GET /api/edit/docs?libraryVersionId=xxx — list docs for a version
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(req.url)
    const libraryVersionId = searchParams.get("libraryVersionId")

    if (!libraryVersionId) {
      return NextResponse.json({ error: "libraryVersionId is required" }, { status: 400 })
    }

    await requireDocAccess(user, libraryVersionId)

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

// POST /api/edit/docs — create a new doc
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await req.json()
    const { title, slug, content, parentPath, order, published, libraryVersionId } = body

    if (!title || !slug || !libraryVersionId) {
      return NextResponse.json(
        { error: "title, slug, and libraryVersionId are required" },
        { status: 400 }
      )
    }

    await requireDocAccess(user, libraryVersionId)

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
  } catch (error: unknown) {
    // Prisma unique constraint violation
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: string }).code === "P2002"
    ) {
      const target = (error as { meta?: { target?: string[] } }).meta?.target ?? []
      const field = target.includes("title") ? "title" : "slug"
      return NextResponse.json(
        { error: `A document with this ${field} already exists in this location` },
        { status: 409 }
      )
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create doc" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 403 : 500 }
    )
  }
}