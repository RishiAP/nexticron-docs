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
