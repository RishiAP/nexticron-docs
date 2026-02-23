"use client"

import { useRouter } from "next/navigation"
import { Tag } from "lucide-react"
import { formatVersion } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { LibraryWithVersions } from "@/app/[[...version]]/page"
import { Badge } from "@/components/ui/badge"

type HeaderVersionSelectorProps = {
  libraries: LibraryWithVersions[]
  librarySlug: string | null
  activeVersion: string | null
}

export function HeaderVersionSelector({
  libraries,
  librarySlug,
  activeVersion,
}: HeaderVersionSelectorProps) {
  const router = useRouter()

  if (!librarySlug || !activeVersion) return null

  const lib = libraries.find((l) => l.slug === librarySlug)
  if (!lib || lib.versions.length === 0) return null

  const latestVersion = lib.versions[0]?.version

  const handleSelect = (nextVersion: string) => {
    if (nextVersion === activeVersion) return
    const isNextLatest = nextVersion === latestVersion
    const versionSegment = isNextLatest ? "" : `/${nextVersion}`
    router.push(`/${lib.slug}${versionSegment}`)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div
          role="button"
          aria-label="Select documentation version"
          className="inline-flex h-7 items-center gap-1.5 rounded-full border border-border/70 bg-background px-2.5 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
          tabIndex={0}
        >
          <Tag className="size-3.5 text-muted-foreground" />
          <span className="tabular-nums">{formatVersion(activeVersion)}</span>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="bottom" sideOffset={6} className="min-w-44">
        <DropdownMenuLabel className="flex items-center justify-between text-xs">
          <span>{lib.name}</span>
          <span className="text-[10px] text-muted-foreground">Version</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {lib.versions.map((v) => (
          <DropdownMenuItem
            key={v.version}
            className="flex items-center gap-2 text-xs"
            onClick={() => handleSelect(v.version)}
          >
            <span className="flex-1">{formatVersion(v.version)}</span>
            {v.version === latestVersion && (
              <Badge variant="outline" className="h-4 px-1 text-[9px]">
                Latest
              </Badge>
            )}
            {v.version === activeVersion && (
              <span className="text-[10px] text-primary">Current</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

