import { PageHeaderSkeleton, FiltersRowSkeleton, DocsTableSkeleton } from "@/components/skeletons"

export default function AdminDocsLoading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <FiltersRowSkeleton />
      <DocsTableSkeleton />
    </div>
  )
}
