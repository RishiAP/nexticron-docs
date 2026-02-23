import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { cleanVersion } from "@/lib/utils"

type Params = {
  params: Promise<{
    library: string
    version: string
    slug: string
  }>
}

// GET /api/docs/[library]/[version]/[slug] — get a published doc's content
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { library: librarySlug, version, slug } = await params

    // Clean version: remove 'v' prefix if present
    const cleanedVersion = cleanVersion(version)

    const doc = await prisma.doc.findFirst({
      where: {
        slug,
        published: true,
        libraryVersion: {
          version: cleanedVersion,
          library: { slug: librarySlug },
        },
      },
      include: {
        libraryVersion: {
          select: {
            version: true,
            library: { select: { name: true, slug: true } },
          },
        },
      },
    })

    if (!doc) {
      return NextResponse.json({ error: "Doc not found" }, { status: 404 })
    }

    return NextResponse.json(doc)
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch doc" },
      { status: 500 }
    )
  }
}
