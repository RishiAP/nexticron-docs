import { PageHeaderSkeleton, LibraryCardsSkeleton } from "@/components/skeletons"

export default function AdminLoading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <LibraryCardsSkeleton />
    </div>
  )
}
