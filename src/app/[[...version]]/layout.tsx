import { redirect } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { NavigationProvider } from "@/components/navigation-provider"
import { RouteTransition } from "@/components/route-transition"
import { DocsContentSkeleton } from "@/components/skeletons"
import {
  getLibrariesWithAllVersions,
  getCachedUser,
  getCachedIsAdmin,
  canEditLibrary,
} from "./data"

export default async function DocsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCachedUser()

  if (!user) {
    redirect("/sign-in")
  }

  const isAdmin = await getCachedIsAdmin()
  const allLibraries = await getLibrariesWithAllVersions()

  // Admins see all libraries; others see only those they have permission for
  const libraries = isAdmin
    ? allLibraries
    : allLibraries.filter((lib) =>
        user.projectPermissions.some((p) => p.librarySlug === lib.slug),
      )

  // Build per-library permissions map for sidebar
  const libraryPermissions: Record<string, boolean> = {}
  for (const lib of libraries) {
    libraryPermissions[lib.slug] = canEditLibrary(
      lib.slug,
      isAdmin,
      user.projectPermissions,
    )
  }

  // Filter sidebar docs: editors/admins see drafts, viewers see published only
  const sidebarLibraries = libraries.map((lib) => ({
    ...lib,
    versions: lib.versions.map((v) => ({
      ...v,
      docs: libraryPermissions[lib.slug]
        ? v.docs
        : v.docs.filter((d) => d.published),
    })),
  }))

  return (
    <NavigationProvider>
      <SidebarProvider>
        <AppSidebar
          libraries={sidebarLibraries}
          isAdmin={isAdmin}
          displayName={user.username}
          libraryPermissions={libraryPermissions}
        />
        <SidebarInset>
          <RouteTransition fallback={<DocsContentSkeleton />}>
            {children}
          </RouteTransition>
        </SidebarInset>
      </SidebarProvider>
    </NavigationProvider>
  )
}
