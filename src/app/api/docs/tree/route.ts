import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET /api/docs/tree?version=v1.0.0 — get the file tree for sidebar
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const version = searchParams.get("version")

    // Get all libraries with their docs for this version
    const libraries = await prisma.library.findMany({
      orderBy: { order: "asc" },
      include: {
        versions: {
          where: version ? { version } : undefined,
          orderBy: { version: "desc" },
          take: version ? 1 : undefined,
          include: {
            docs: {
              where: { published: true },
              orderBy: [{ parentPath: "asc" }, { order: "asc" }, { title: "asc" }],
              select: {
                title: true,
                slug: true,
                parentPath: true,
              },
            },
          },
        },
      },
    })

    // Get all unique versions across all libraries
    const allVersions = await prisma.libraryVersion.findMany({
      select: { version: true },
      distinct: ["version"],
      orderBy: { version: "asc" },
    })

    return NextResponse.json({
      libraries,
      versions: allVersions.map((v: { version: string }) => v.version),
    })
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch docs tree" },
      { status: 500 }
    )
  }
}
