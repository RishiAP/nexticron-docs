import { redirect } from "next/navigation"
import Link from "next/link"
import { getCurrentUser } from "@/lib/auth"
import { ThemeSwitcher } from "@/components/theme-switcher"
import { AdminNav } from "@/components/admin-nav"
import { UserDropdown } from "@/components/logout-button"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()
  if (!user?.isAdmin) {
    redirect("/")
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <div className="md:hidden">
              <AdminNav />
            </div>
            <Link href="/admin" className="text-lg font-semibold">
              NextICron Admin
            </Link>
            <nav className="hidden items-center gap-2 md:flex">
              <Link
                href="/admin"
                className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Libraries
              </Link>
              <Link
                href="/admin/permissions"
                className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Permissions
              </Link>
              <Link
                href="/"
                className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Back to Docs
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <UserDropdown displayName={user.username} />
            <ThemeSwitcher />
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-6">{children}</main>
    </div>
  )
}
