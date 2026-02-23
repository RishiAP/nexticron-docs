"use client"

import * as React from "react"
import Link from "next/link"
import { ChevronDown, ChevronRight } from "lucide-react"
import { cleanVersion } from "@/lib/utils"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type LocationFinderProps = {
  librarySlug: string | null
  libraryName?: string | null
  version: string | null // null = latest (no version in URL)
  pathSegments: string[]
  docTitle?: string | null
}

export function LocationFinder({
  librarySlug,
  libraryName,
  version,
  pathSegments,
  docTitle,
}: LocationFinderProps) {
  const [siblingDocs, setSiblingDocs] = React.useState<
    { title: string; slug: string; parentPath: string }[]
  >([])

  // Build the base path for this library + version
  const basePath = librarySlug
    ? version
      ? `/${librarySlug}/${version}`
      : `/${librarySlug}`
    : ""

  // Use the original library name if available, otherwise the slug as-is
  const displayLibraryName = libraryName ?? librarySlug

  const parentPath =
    pathSegments.length > 1 ? pathSegments.slice(0, -1).join("/") : ""
  const currentSlug =
    pathSegments.length > 0 ? pathSegments[pathSegments.length - 1] : null

  React.useEffect(() => {
    if (!librarySlug || !version || !currentSlug) return

    const controller = new AbortController()

    async function fetchSiblings() {
      try {
        const res = await fetch(`/api/docs/tree?version=${encodeURIComponent(version || "")}`, {
          signal: controller.signal,
        })
        if (!res.ok) return
        const data = (await res.json()) as {
          libraries: {
            slug: string
            versions: {
              version: string
              docs: { title: string; slug: string; parentPath: string }[]
            }[]
          }[]
        }

        const lib = data.libraries.find((l) => l.slug === librarySlug)
        if (!lib || lib.versions.length === 0) return

        if (version) {
          const cleanedVersion = cleanVersion(version)
          const versionEntry =
            lib.versions.find((v) => v.version === cleanedVersion) ?? lib.versions[0]

          const siblings = versionEntry.docs.filter(
            (doc) => doc.parentPath === parentPath
          )
          setSiblingDocs(siblings)
        }
      } catch {
        // ignore fetch errors
      }
    }

    fetchSiblings()

    return () => controller.abort()
  }, [librarySlug, version, parentPath, currentSlug])

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href="/">Docs</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>

        {librarySlug && (
          <>
            <BreadcrumbSeparator>
              <ChevronRight className="size-3.5" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              {pathSegments.length === 0 ? (
                <BreadcrumbPage>{displayLibraryName}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link href={basePath}>{displayLibraryName}</Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </>
        )}

        {pathSegments.map((segment, index) => {
          const isLastSegment = index === pathSegments.length - 1
          const href = `${basePath}/${pathSegments.slice(0, index + 1).join("/")}`

          // For the last segment, use the doc title if available
          const displayText =
            isLastSegment && docTitle ? docTitle : decodeURIComponent(segment)

          return (
            <React.Fragment key={`${segment}-${index}`}>
              <BreadcrumbSeparator>
                <ChevronRight className="size-3.5" />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                {isLastSegment && siblingDocs.length > 0 ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <div
                        role="button"
                        className="flex items-center gap-1 cursor-pointer rounded hover:bg-accent/50 transition-colors px-1 -mx-1 text-sm text-foreground"
                        tabIndex={0}
                      >
                        {displayText}
                        <ChevronDown className="size-3" />
                      </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" side="bottom" sideOffset={4}>
                      {siblingDocs.map((doc) => {
                        const siblingHref = doc.parentPath
                          ? `${basePath}/${doc.parentPath}/${doc.slug}`
                          : `${basePath}/${doc.slug}`
                        return (
                          <DropdownMenuItem key={siblingHref} asChild className="text-xs">
                            <Link href={siblingHref}>{doc.title}</Link>
                          </DropdownMenuItem>
                        )
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : isLastSegment ? (
                  <BreadcrumbPage>{displayText}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={href}>{decodeURIComponent(segment)}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </React.Fragment>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
