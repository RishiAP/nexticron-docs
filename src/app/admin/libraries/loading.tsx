import { PageHeaderSkeleton, LibraryCardsSkeleton } from "@/components/skeletons"

export default function LibrariesLoading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <LibraryCardsSkeleton />
    </div>
  )
}
