"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Edit } from "lucide-react"
import { HeaderVersionSelector } from "@/components/header-version-selector"
import { LocationFinder } from "@/components/location-finder"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar"
import type { LibraryWithVersions } from "@/app/[[...version]]/page"

type DocsHeaderProps = {
  libraries: LibraryWithVersions[]
  librarySlug: string | null
  version: string | null
  isLatest: boolean
  docSegments: string[]
  docTitle: string | null
  canEdit?: boolean
}

export function DocsHeader({
  libraries,
  librarySlug,
  version,
  isLatest,
  docSegments,
  docTitle,
  canEdit = false,
}: DocsHeaderProps) {
  const { open } = useSidebar()
  const pathname = usePathname()

  const activeLibrary = librarySlug
    ? libraries.find((l) => l.slug === librarySlug) ?? null
    : null
  const libraryName = activeLibrary?.name ?? null

  const showHeaderVersionSelector = !open

  // Show edit button only when viewing a doc and user has edit permission
  const showEditButton = canEdit && docTitle && docSegments.length > 0

  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center border-b border-border/40 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="flex w-full items-center justify-between px-4 gap-4">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-[orientation=vertical]:h-4"
          />
          <LocationFinder
            librarySlug={librarySlug}
            libraryName={libraryName}
            version={isLatest ? null : version}
            pathSegments={docSegments}
            docTitle={docTitle}
          />
        </div>
        <div className="flex items-center gap-2">
          {showEditButton && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`${pathname}/edit`}>
                <Edit className="mr-1.5 size-3.5" />
                Edit
              </Link>
            </Button>
          )}
          {showHeaderVersionSelector && (
            <HeaderVersionSelector
              libraries={libraries}
              librarySlug={librarySlug}
              activeVersion={version}
            />
          )}
        </div>
      </div>
    </header>
  )
}

