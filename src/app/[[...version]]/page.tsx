import { auth, currentUser } from "@clerk/nextjs/server"
import { SignIn } from "@clerk/nextjs"
import { AppSidebar } from "@/components/app-sidebar"
import { MarkdownRenderer } from "@/components/markdown-renderer"
import { DocsHeader } from "@/components/docs-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { prisma } from "@/lib/prisma"
import { cleanVersion } from "@/lib/utils"
import { BookOpen } from "lucide-react"

export const dynamic = "force-dynamic"

type VersionPageProps = {
  params: Promise<{
    version?: string[]
  }>
}

export type LibraryWithVersions = {
  id: string
  name: string
  slug: string
  order: number
  versions: {
    id: string
    version: string
    docs: {
      title: string
      slug: string
      parentPath: string
    }[]
  }[]
}

/** Get all libraries with all their versions */
async function getLibrariesWithAllVersions(): Promise<LibraryWithVersions[]> {
  return prisma.library.findMany({
    orderBy: { order: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      order: true,
      versions: {
        orderBy: { version: "desc" },
        select: {
          id: true,
          version: true,
          docs: {
            where: { published: true },
            orderBy: [{ parentPath: "asc" }, { order: "asc" }, { title: "asc" }],
            select: { title: true, slug: true, parentPath: true },
          },
        },
      },
    },
  })
}

/** Get latest version string for a library */
export function getLatestVersion(lib: LibraryWithVersions): string | null {
  return lib.versions[0]?.version ?? null
}

/**
 * Parse URL segments. URLs look like:
 * - / → landing
 * - /tiler/cell-java → latest version of tiler, doc "cell-java"
 * - /tiler/1.2.3/cell-java → version 1.2.3 of tiler, doc "cell-java"
 * - /tiler/v1.2.3/cell-java → version 1.2.3 of tiler, doc "cell-java" (also accepts v prefix)
 * - /tiler/1.2.3/TilerExceptions/my-exception → nested doc
 */
function resolveRoute(
  segments: string[],
  libraries: LibraryWithVersions[]
) {
  if (segments.length === 0) {
    return { librarySlug: null, version: null, docSegments: [] as string[], isLatest: true }
  }

  const librarySlug = segments[0]
  const lib = libraries.find((l) => l.slug === librarySlug)

  if (!lib) {
    return { librarySlug, version: null, docSegments: segments.slice(1), isLatest: true }
  }

  const latestVersion = getLatestVersion(lib)
  const knownVersions = lib.versions.map((v) => v.version)
  const secondSegment = segments[1]

  // Check if second segment is a version (clean both for comparison)
  if (secondSegment) {
    const cleanedSecondSegment = cleanVersion(secondSegment)
    if (knownVersions.includes(cleanedSecondSegment)) {
      const isLatest = cleanedSecondSegment === latestVersion
      return {
        librarySlug,
        version: cleanedSecondSegment,
        docSegments: segments.slice(2),
        isLatest,
      }
    }
  }

  // No version in URL → use latest
  return {
    librarySlug,
    version: latestVersion,
    docSegments: segments.slice(1),
    isLatest: true,
  }
}

async function getDocContent(
  librarySlug: string,
  version: string,
  docSegments: string[]
) {
  if (docSegments.length === 0) return null

  const docSlug = docSegments[docSegments.length - 1]
  const parentPath =
    docSegments.length > 1 ? docSegments.slice(0, -1).join("/") : ""

  return prisma.doc.findFirst({
    where: {
      slug: docSlug,
      parentPath,
      published: true,
      libraryVersion: {
        version,
        library: { slug: librarySlug },
      },
    },
  })
}

export default async function Page({ params }: VersionPageProps) {
  const { userId } = await auth()

  if (!userId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <SignIn routing="hash" />
      </div>
    )
  }

  const user = await currentUser()
  const isSuperAdmin =
    (user?.publicMetadata as { role?: string })?.role === "super-admin"

  const resolvedParams = await params
  const routeSegments = (resolvedParams.version ?? []).map((s) =>
    decodeURIComponent(s)
  )

  const libraries = await getLibrariesWithAllVersions()
  const { librarySlug, version, docSegments, isLatest } = resolveRoute(
    routeSegments,
    libraries
  )

  // Build selected versions map: for each library, which version is active
  const selectedVersions: Record<string, string> = {}
  for (const lib of libraries) {
    const latest = getLatestVersion(lib)
    if (lib.slug === librarySlug && version) {
      selectedVersions[lib.slug] = version
    } else if (latest) {
      selectedVersions[lib.slug] = latest
    }
  }

  const doc =
    librarySlug && version && docSegments.length > 0
      ? await getDocContent(librarySlug, version, docSegments)
      : null

  return (
    <SidebarProvider>
      <AppSidebar
        libraries={libraries}
        selectedVersions={selectedVersions}
        isSuperAdmin={isSuperAdmin}
      />
      <SidebarInset>
        <DocsHeader
          libraries={libraries}
          librarySlug={librarySlug}
          version={version}
          isLatest={isLatest}
          docSegments={docSegments}
          docTitle={doc?.title ?? null}
        />
        <div className="flex flex-1 flex-col p-6 pt-4">
          {doc ? (
            <MarkdownRenderer content={doc.content} />
          ) : librarySlug && docSegments.length > 0 ? (
            <div className="flex flex-1 items-center justify-center text-muted-foreground">
              <div className="text-center space-y-3">
                <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-muted">
                  <BookOpen className="size-8 text-muted-foreground" />
                </div>
                <h2 className="text-lg font-medium text-foreground">
                  Document not found
                </h2>
                <p className="text-sm">
                  The requested page could not be found in this version.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center text-muted-foreground">
              <div className="text-center space-y-4">
                <div className="mx-auto flex size-20 items-center justify-center rounded-2xl bg-primary/10">
                  <BookOpen className="size-10 text-primary" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-semibold text-foreground tracking-tight">
                    NextICron Documentation
                  </h2>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    Select a document from the sidebar to start reading. Each library
                    has its own versioned documentation.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
