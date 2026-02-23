"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Plus, Trash2, BookOpen } from "lucide-react"
import { formatVersion } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { LibraryCardsSkeleton, PageHeaderSkeleton } from "@/components/skeletons"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"

type LibraryVersion = {
  id: string
  version: string
}

type Library = {
  id: string
  name: string
  slug: string
  order: number
  versions: LibraryVersion[]
}

export default function AdminPage() {
  const [libraries, setLibraries] = useState<Library[]>([])
  const [loading, setLoading] = useState(true)

  // New library form
  const [newLibName, setNewLibName] = useState("")
  const [newLibSlug, setNewLibSlug] = useState("")
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  // New version form
  const [newVersion, setNewVersion] = useState("")
  const [versionLibraryId, setVersionLibraryId] = useState("")
  const [versionDialogOpen, setVersionDialogOpen] = useState(false)

  const fetchLibraries = () =>
    fetch("/api/admin/libraries")
      .then((res) => res.json())
      .then((data: Library[]) => setLibraries(data))

  useEffect(() => {
    fetch("/api/admin/libraries")
      .then((res) => res.json())
      .then((data: Library[]) => setLibraries(data))
      .finally(() => setLoading(false))
  }, [])

  const createLibrary = async () => {
    if (!newLibName || !newLibSlug) return
    const res = await fetch("/api/admin/libraries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newLibName, slug: newLibSlug }),
    })
    if (res.ok) {
      setNewLibName("")
      setNewLibSlug("")
      setCreateDialogOpen(false)
      fetchLibraries()
    }
  }

  const deleteLibrary = async (id: string) => {
    if (!confirm("Delete this library and all its versions/docs?")) return
    const res = await fetch(`/api/admin/libraries/${id}`, { method: "DELETE" })
    if (res.ok) fetchLibraries()
  }

  const createVersion = async () => {
    if (!newVersion || !versionLibraryId) return
    const res = await fetch("/api/admin/versions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ version: newVersion, libraryId: versionLibraryId }),
    })
    if (res.ok) {
      setNewVersion("")
      setVersionLibraryId("")
      setVersionDialogOpen(false)
      fetchLibraries()
    }
  }

  const deleteVersion = async (id: string) => {
    if (!confirm("Delete this version and all its docs?")) return
    const res = await fetch(`/api/admin/versions/${id}`, { method: "DELETE" })
    if (res.ok) fetchLibraries()
  }

  const autoSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeaderSkeleton />
        <LibraryCardsSkeleton />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Libraries</h1>
          <p className="text-sm text-muted-foreground">
            Manage your Java library documentation
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">
              <Plus className="mr-2 size-4" />
              New Library
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] rounded-lg sm:w-full">
            <DialogHeader>
              <DialogTitle>Create Library</DialogTitle>
              <DialogDescription>
                Add a new Java library to document.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="lib-name">Name</Label>
                <Input
                  id="lib-name"
                  placeholder="e.g. Tiler"
                  value={newLibName}
                  onChange={(e) => {
                    setNewLibName(e.target.value)
                    setNewLibSlug(autoSlug(e.target.value))
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lib-slug">Slug (URL-safe)</Label>
                <Input
                  id="lib-slug"
                  placeholder="e.g. tiler"
                  value={newLibSlug}
                  onChange={(e) => setNewLibSlug(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={createLibrary} disabled={!newLibName || !newLibSlug}>
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {libraries.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No libraries yet. Create one to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {libraries.map((lib) => (
            <Card key={lib.id} className="flex flex-col">
              <CardHeader>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <CardTitle className="text-lg truncate">{lib.name}</CardTitle>
                    <CardDescription className="font-mono text-xs">
                      /{lib.slug}
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive flex-shrink-0"
                    onClick={() => deleteLibrary(lib.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 flex-1 flex flex-col">
                <div className="flex flex-wrap gap-1.5">
                  {lib.versions.map((v) => (
                    <div key={v.id} className="flex items-center gap-1">
                      <Badge variant="secondary" className="text-xs">{formatVersion(v.version)}</Badge>
                      <button
                        onClick={() => deleteVersion(v.id)}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex flex-col gap-2 sm:flex-row mt-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setVersionLibraryId(lib.id)
                      setVersionDialogOpen(true)
                    }}
                    className="w-full sm:w-auto"
                  >
                    <Plus className="mr-1 size-3" />
                    Version
                  </Button>
                  {lib.versions.length > 0 && (
                    <Button variant="outline" size="sm" asChild className="w-full sm:w-auto">
                      <Link href={`/admin/docs?libraryId=${lib.id}&versionId=${lib.versions[lib.versions.length - 1].id}`}>
                        <BookOpen className="mr-1 size-3" />
                        Docs
                      </Link>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={versionDialogOpen} onOpenChange={setVersionDialogOpen}>
        <DialogContent className="w-[95vw] rounded-lg sm:w-full">
          <DialogHeader>
            <DialogTitle>Add Version</DialogTitle>
            <DialogDescription>
              Create a new version for documentation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="version">Version</Label>
              <Input
                id="version"
                placeholder="e.g. 1.0.0"
                value={newVersion}
                onChange={(e) => setNewVersion(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Enter semantic version (e.g. 1.0.0) &mdash; the &quot;v&quot; prefix will be added automatically</p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={createVersion} disabled={!newVersion}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
