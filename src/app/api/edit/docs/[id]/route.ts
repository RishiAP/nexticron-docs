import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, ProjectRole } from "@/lib/auth"
import type { AuthUser } from "@/lib/auth"

type Params = { params: Promise<{ id: string }> }

/** Look up the library slug for a doc and check EDITOR access */
async function requireDocEditAccess(
  user: AuthUser,
  docId: string,
): Promise<void> {
  if (user.isAdmin) return

  const doc = await prisma.doc.findUnique({
    where: { id: docId },
    select: {
      libraryVersion: {
        select: { library: { select: { slug: true } } },
      },
    },
  })

  if (!doc) throw new Error("Doc not found")

  const librarySlug = doc.libraryVersion.library.slug
  const hasAccess = user.projectPermissions.some(
    (p) =>
      p.librarySlug === librarySlug &&
      p.role === ProjectRole.EDITOR,
  )

  if (!hasAccess) {
    throw new Error("Unauthorized: Editor access required for this library")
  }
}

// GET /api/edit/docs/[id] — get a single doc with full content
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const user = await requireAuth()
    const { id } = await params
    await requireDocEditAccess(user, id)
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

// PATCH /api/edit/docs/[id] — update a doc
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const user = await requireAuth()
    const { id } = await params
    await requireDocEditAccess(user, id)
    const body = await req.json()

    const doc = await prisma.doc.update({
      where: { id },
      data: body,
    })
    return NextResponse.json(doc)
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
      { error: error instanceof Error ? error.message : "Failed to update doc" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 403 : 500 }
    )
  }
}

// DELETE /api/edit/docs/[id] — delete a doc
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const user = await requireAuth()
    const { id } = await params
    await requireDocEditAccess(user, id)
    await prisma.doc.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete doc" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 403 : 500 }
    )
  }
}