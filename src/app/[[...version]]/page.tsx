import { redirect } from "next/navigation"
import { MarkdownRenderer } from "@/components/markdown-renderer"
import { DocsHeader } from "@/components/docs-header"
import { DocEditor, type DocForEdit } from "@/components/doc-editor"
import { prisma } from "@/lib/prisma"
import { cleanVersion } from "@/lib/utils"
import { BookOpen, ShieldAlert } from "lucide-react"
import {
  getLibrariesWithAllVersions,
  getCachedUser,
  getCachedIsAdmin,
  getLatestVersion,
  canEditLibrary,
} from "./data"
import type { LibraryWithVersions } from "./data"

export { type LibraryWithVersions } from "./data"

type VersionPageProps = {
  params: Promise<{
    version?: string[]
  }>
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
  libraryVersionId: string,
  docSegments: string[]
) {
  if (docSegments.length === 0) return null

  const docSlug = docSegments[docSegments.length - 1]
  const parentPath =
    docSegments.length > 1 ? docSegments.slice(0, -1).join("/") : ""

  const doc = await prisma.doc.findUnique({
    where: {
      libraryVersionId_parentPath_slug: {
        libraryVersionId,
        slug: docSlug,
        parentPath,
      },
    },
  })

  if (!doc?.published) return null
  return doc
}

/** Fetch full doc data for editing (published or draft) */
async function getDocForEdit(
  libraryVersionId: string,
  docSegments: string[]
): Promise<DocForEdit | null> {
  if (docSegments.length === 0) return null

  const docSlug = docSegments[docSegments.length - 1]
  const parentPath =
    docSegments.length > 1 ? docSegments.slice(0, -1).join("/") : ""

  return prisma.doc.findUnique({
    where: {
      libraryVersionId_parentPath_slug: {
        libraryVersionId,
        slug: docSlug,
        parentPath,
      },
    },
    include: {
      libraryVersion: {
        include: { library: { select: { name: true, slug: true } } },
      },
    },
  })
}

export default async function Page({ params }: VersionPageProps) {
  const user = await getCachedUser()

  if (!user) {
    redirect("/sign-in")
  }

  const isAdmin = await getCachedIsAdmin()

  const resolvedParams = await params
  const routeSegments = (resolvedParams.version ?? []).map((s) =>
    decodeURIComponent(s)
  )

  const allLibraries = await getLibrariesWithAllVersions()

  // Admins see all libraries; others see only those they have permission for
  const libraries = isAdmin
    ? allLibraries
    : allLibraries.filter((lib) =>
        user.projectPermissions.some((p) => p.librarySlug === lib.slug),
      )

  const { librarySlug, version, docSegments, isLatest } = resolveRoute(
    routeSegments,
    libraries
  )

  const activeLibrary = librarySlug
    ? libraries.find((l) => l.slug === librarySlug) ?? null
    : null
  const activeLibraryVersionId =
    activeLibrary && version
      ? activeLibrary.versions.find((v) => v.version === version)?.id ?? null
      : null

  // Detect /edit at the end of URL segments
  const isEditMode =
    docSegments.length > 0 &&
    docSegments[docSegments.length - 1] === "edit"
  const actualDocSegments = isEditMode
    ? docSegments.slice(0, -1)
    : docSegments

  // Determine edit permission for current library
  const canEdit = librarySlug
    ? canEditLibrary(librarySlug, isAdmin, user.projectPermissions)
    : false

  // Build per-library permissions map for header version selector
  const libraryPermissions: Record<string, boolean> = {}
  for (const lib of libraries) {
    libraryPermissions[lib.slug] = canEditLibrary(
      lib.slug,
      isAdmin,
      user.projectPermissions,
    )
  }

  // Filter docs for header: editors/admins see drafts, viewers see published only
  const filteredLibraries = libraries.map((lib) => ({
    ...lib,
    versions: lib.versions.map((v) => ({
      ...v,
      docs: libraryPermissions[lib.slug]
        ? v.docs
        : v.docs.filter((d) => d.published),
    })),
  }))

  // Compute view URL (without /edit) for back-navigation
  const viewUrl = librarySlug
    ? `/${librarySlug}${!isLatest && version ? `/${version}` : ""}${actualDocSegments.length > 0 ? `/${actualDocSegments.join("/")}` : ""}`
    : "/"

  // Fetch doc for view or editing
  if (
    isEditMode &&
    librarySlug &&
    version &&
    activeLibraryVersionId &&
    actualDocSegments.length > 0
  ) {
    // Fetch title for breadcrumb (lightweight query, needed for all edit-mode branches)
    const docSlug = actualDocSegments[actualDocSegments.length - 1]
    const docParentPath =
      actualDocSegments.length > 1 ? actualDocSegments.slice(0, -1).join("/") : ""
    const docTitleResult = await prisma.doc.findUnique({
      where: {
        libraryVersionId_parentPath_slug: {
          libraryVersionId: activeLibraryVersionId,
          slug: docSlug,
          parentPath: docParentPath,
        },
      },
      select: { title: true },
    })
    const editDocTitle = docTitleResult?.title ?? null

    // Edit mode
    if (!canEdit) {
      return (
        <>
          <DocsHeader
            libraries={filteredLibraries}
            librarySlug={librarySlug}
            version={version}
            isLatest={isLatest}
            docSegments={actualDocSegments}
            docTitle={editDocTitle}
            canEdit={false}
          />
          <div className="flex flex-1 items-center justify-center text-muted-foreground">
            <div className="text-center space-y-3">
              <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-destructive/10">
                <ShieldAlert className="size-8 text-destructive" />
              </div>
              <h2 className="text-lg font-medium text-foreground">
                Access Denied
              </h2>
              <p className="text-sm">
                You don&apos;t have permission to edit this document.
              </p>
            </div>
          </div>
        </>
      )
    }

    const docForEdit = await getDocForEdit(
      activeLibraryVersionId,
      actualDocSegments,
    )

    if (!docForEdit) {
      return (
        <>
          <DocsHeader
            libraries={filteredLibraries}
            librarySlug={librarySlug}
            version={version}
            isLatest={isLatest}
            docSegments={actualDocSegments}
            docTitle={editDocTitle}
            canEdit={false}
          />
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
        </>
      )
    }

    return <DocEditor doc={docForEdit} viewUrl={viewUrl} />
  }

  // View mode
  const doc =
    librarySlug && version && activeLibraryVersionId && actualDocSegments.length > 0
      ? await getDocContent(activeLibraryVersionId, actualDocSegments)
      : null

  return (
    <>
      <DocsHeader
        libraries={filteredLibraries}
        librarySlug={librarySlug}
        version={version}
        isLatest={isLatest}
        docSegments={actualDocSegments}
        docTitle={doc?.title ?? null}
        canEdit={canEdit}
      />
      <div className="flex flex-1 flex-col p-6 pt-4">
        {doc ? (
          <MarkdownRenderer content={doc.content} />
        ) : librarySlug && actualDocSegments.length > 0 ? (
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
    </>
  )
}
