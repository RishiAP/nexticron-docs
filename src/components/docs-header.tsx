"use client"

import { HeaderVersionSelector } from "@/components/header-version-selector"
import { LocationFinder } from "@/components/location-finder"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar"
import type { LibraryWithVersions } from "@/app/[[...version]]/page"

type DocsHeaderProps = {
  libraries: LibraryWithVersions[]
  librarySlug: string | null
  version: string | null
  isLatest: boolean
  docSegments: string[]
  docTitle: string | null
}

export function DocsHeader({
  libraries,
  librarySlug,
  version,
  isLatest,
  docSegments,
  docTitle,
}: DocsHeaderProps) {
  const { open } = useSidebar()

  const activeLibrary = librarySlug
    ? libraries.find((l) => l.slug === librarySlug) ?? null
    : null
  const libraryName = activeLibrary?.name ?? null

  const showHeaderVersionSelector = !open

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
        {showHeaderVersionSelector && (
          <HeaderVersionSelector
            libraries={libraries}
            librarySlug={librarySlug}
            activeVersion={version}
          />
        )}
      </div>
    </header>
  )
}

