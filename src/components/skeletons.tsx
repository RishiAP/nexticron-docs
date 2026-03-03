import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

/**
 * Skeleton loader for library cards grid
 */
export function LibraryCardsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
              </div>
              <Skeleton className="h-9 w-9 rounded" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-6 w-16" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-9 w-20" />
              <Skeleton className="h-9 w-20" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

/**
 * Skeleton loader for documentation table
 */
export function DocsTableSkeleton() {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Slug</TableHead>
            <TableHead>Path</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Updated</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell>
                <Skeleton className="h-4 w-32" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-24" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-20" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-6 w-16" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-24" />
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Skeleton className="h-9 w-9 rounded" />
                  <Skeleton className="h-9 w-9 rounded" />
                  <Skeleton className="h-9 w-9 rounded" />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

/**
 * Skeleton loader for page header
 */
export function PageHeaderSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-96" />
    </div>
  )
}

/**
 * Skeleton loader for select/filters
 */
export function FiltersRowSkeleton() {
  return (
    <div className="flex gap-4">
      <div className="w-64 space-y-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-9 w-full rounded" />
      </div>
      <div className="w-48 space-y-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-9 w-full rounded" />
      </div>
      <div className="flex items-end">
        <Skeleton className="h-9 w-24 rounded" />
      </div>
    </div>
  )
}

/**
 * Skeleton loader for content card
 */
export function ContentCardSkeleton() {
  return (
    <Card>
      <CardContent className="py-12">
        <div className="space-y-4">
          <Skeleton className="h-6 w-48 mx-auto" />
          <Skeleton className="h-4 w-96 mx-auto" />
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Skeleton loader for sidebar navigation tree
 */
export function SidebarSkeleton() {
  return (
    <div className="flex h-full w-64 flex-col border-r bg-background p-4 space-y-4">
      {/* Brand header */}
      <div className="flex items-center gap-2 px-2 py-1">
        <Skeleton className="h-8 w-8 rounded-lg" />
        <div className="space-y-1">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      {/* Library sections */}
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="flex items-center gap-2 px-2">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-12 ml-auto rounded-full" />
          </div>
          <div className="ml-4 space-y-1.5">
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} className="flex items-center gap-2 px-2">
                <Skeleton className="h-3.5 w-3.5 rounded" />
                <Skeleton className="h-3.5 w-28" />
              </div>
            ))}
          </div>
        </div>
      ))}
      {/* Footer */}
      <div className="mt-auto space-y-2 px-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-7 w-7 rounded-full" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
    </div>
  )
}

/**
 * Skeleton loader for documentation content page
 */
export function DocsContentSkeleton() {
  return (
    <div className="flex flex-1 flex-col">
      {/* Header / breadcrumb */}
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <Skeleton className="h-6 w-6 rounded" />
        <Skeleton className="h-4 w-px" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-32" />
      </div>
      {/* Content */}
      <div className="p-6 pt-4 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-full max-w-2xl" />
        <Skeleton className="h-4 w-full max-w-xl" />
        <Skeleton className="h-4 w-full max-w-2xl" />
        <div className="pt-2" />
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-full max-w-lg" />
        <Skeleton className="h-4 w-full max-w-xl" />
        <Skeleton className="h-32 w-full max-w-2xl rounded-lg" />
        <Skeleton className="h-4 w-full max-w-md" />
        <Skeleton className="h-4 w-full max-w-xl" />
      </div>
    </div>
  )
}

/**
 * Skeleton loader for full docs page (sidebar + content)
 */
export function DocsPageSkeleton() {
  return (
    <div className="flex h-screen w-full">
      <SidebarSkeleton />
      <DocsContentSkeleton />
    </div>
  )
}

/**
 * Skeleton loader for doc editor page
 */
export function DocEditorSkeleton() {
  return (
    <div className="flex flex-1 flex-col">
      {/* Editor header */}
      <div className="flex h-14 items-center justify-between border-b px-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-6 rounded" />
          <Skeleton className="h-4 w-px" />
          <Skeleton className="h-8 w-24 rounded" />
          <Skeleton className="h-4 w-px" />
          <div className="space-y-1">
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-5 w-10 rounded-full" />
          <Skeleton className="h-8 w-20 rounded" />
          <Skeleton className="h-8 w-16 rounded" />
        </div>
      </div>
      {/* Metadata fields */}
      <div className="p-6 pt-4 space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-3.5 w-12" />
              <Skeleton className="h-9 w-full rounded" />
            </div>
          ))}
        </div>
        {/* Editor area */}
        <Skeleton className="h-96 w-full rounded-lg" />
      </div>
    </div>
  )
}
