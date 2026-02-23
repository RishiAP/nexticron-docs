"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Plus, Trash2, Edit, Eye, EyeOff } from "lucide-react"
import { formatVersion } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import { DocsTableSkeleton, PageHeaderSkeleton, FiltersRowSkeleton } from "@/components/skeletons"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type Library = {
  id: string
  name: string
  slug: string
  versions: { id: string; version: string }[]
}

type DocSummary = {
  id: string
  title: string
  slug: string
  parentPath: string
  order: number
  published: boolean
  updatedAt: string
}

export default function AdminDocsPage() {
  const searchParams = useSearchParams()
  const initialLibraryId = searchParams.get("libraryId") ?? ""
  const initialVersionId = searchParams.get("versionId") ?? ""

  const [libraries, setLibraries] = useState<Library[]>([])
  const [selectedLibraryId, setSelectedLibraryId] = useState(initialLibraryId)
  const [selectedVersionId, setSelectedVersionId] = useState(initialVersionId)
  const [docs, setDocs] = useState<DocSummary[]>([])
  const [loading, setLoading] = useState(true)

  // New doc dialog
  const [createOpen, setCreateOpen] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [newSlug, setNewSlug] = useState("")
  const [newParentPath, setNewParentPath] = useState("")

  useEffect(() => {
    fetch("/api/admin/libraries")
      .then((res) => res.json())
      .then(setLibraries)
      .finally(() => setLoading(false))
  }, [])

  const selectedLibrary = libraries.find((l) => l.id === selectedLibraryId)
  const versions = selectedLibrary?.versions ?? []

  useEffect(() => {
    if (!selectedVersionId) {
      return
    }
    void fetch(`/api/admin/docs?libraryVersionId=${selectedVersionId}`)
      .then((res) => res.json())
      .then(setDocs)
  }, [selectedVersionId])

  const autoSlug = (name: string) =>
    name
      .toLowerCase()
      .replace(/[^a-z0-9.]+/g, "-")
      .replace(/^-|-$/g, "")

  const createDoc = async () => {
    if (!newTitle || !newSlug || !selectedVersionId) return
    const res = await fetch("/api/admin/docs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: newTitle,
        slug: newSlug,
        parentPath: newParentPath,
        libraryVersionId: selectedVersionId,
        content: `# ${newTitle}\n\nStart writing documentation here...`,
      }),
    })
    if (res.ok) {
      const doc = await res.json()
      setNewTitle("")
      setNewSlug("")
      setNewParentPath("")
      setCreateOpen(false)
      // Redirect to editor
      window.location.href = `/admin/docs/${doc.id}/edit`
    }
  }

  const deleteDoc = async (id: string) => {
    if (!confirm("Delete this documentation page?")) return
    const res = await fetch(`/api/admin/docs/${id}`, { method: "DELETE" })
    if (res.ok) {
      setDocs(docs.filter((d) => d.id !== id))
    }
  }

  const togglePublish = async (id: string, published: boolean) => {
    const res = await fetch(`/api/admin/docs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ published: !published }),
    })
    if (res.ok) {
      setDocs(docs.map((d) => (d.id === id ? { ...d, published: !published } : d)))
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeaderSkeleton />
        <FiltersRowSkeleton />
        <DocsTableSkeleton />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Documentation Pages</h1>
          <p className="text-sm text-muted-foreground">
            Create and edit documentation for your libraries.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end">
        <div className="w-full md:w-64">
          <Label className="mb-1.5 block text-sm">Library</Label>
          <Select
            value={selectedLibraryId}
            onValueChange={(val) => {
              setSelectedLibraryId(val)
              setSelectedVersionId("")
              setDocs([])
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select library" />
            </SelectTrigger>
            <SelectContent>
              {libraries.map((lib) => (
                <SelectItem key={lib.id} value={lib.id}>
                  {lib.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-full md:w-48">
          <Label className="mb-1.5 block text-sm">Version</Label>
          <Select
            value={selectedVersionId}
            onValueChange={setSelectedVersionId}
            disabled={!selectedLibraryId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select version" />
            </SelectTrigger>
            <SelectContent>
              {versions.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {formatVersion(v.version)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedVersionId && (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="w-full md:w-auto">
                <Plus className="mr-2 size-4" />
                New Page
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] rounded-lg sm:w-full">
              <DialogHeader>
                <DialogTitle>Create Documentation Page</DialogTitle>
                <DialogDescription>
                  Add a new documentation page to this version.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="doc-title">Title</Label>
                  <Input
                    id="doc-title"
                    placeholder="e.g. Cell.java"
                    value={newTitle}
                    onChange={(e) => {
                      setNewTitle(e.target.value)
                      setNewSlug(autoSlug(e.target.value))
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="doc-slug">Slug</Label>
                  <Input
                    id="doc-slug"
                    placeholder="e.g. cell-java"
                    value={newSlug}
                    onChange={(e) => setNewSlug(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="doc-parent">
                    Parent Path{" "}
                    <span className="text-muted-foreground">(optional, for nesting)</span>
                  </Label>
                  <Input
                    id="doc-parent"
                    placeholder="e.g. TilerExceptions"
                    value={newParentPath}
                    onChange={(e) => setNewParentPath(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={createDoc} disabled={!newTitle || !newSlug}>
                  Create & Edit
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Docs table */}
      {selectedVersionId ? (
        docs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No docs for this version yet. Create one to get started.
            </CardContent>
          </Card>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead className="hidden sm:table-cell">Slug</TableHead>
                  <TableHead className="hidden md:table-cell">Path</TableHead>
                  <TableHead className="hidden lg:table-cell">Status</TableHead>
                  <TableHead className="hidden lg:table-cell">Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {docs.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{doc.title}</div>
                        <div className="sm:hidden text-xs text-muted-foreground">
                          {doc.slug}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell font-mono text-xs text-muted-foreground">
                      {doc.slug}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                      {doc.parentPath || "/"}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <Badge variant={doc.published ? "default" : "secondary"}>
                        {doc.published ? "Published" : "Draft"}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                      {new Date(doc.updatedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title={doc.published ? "Unpublish" : "Publish"}
                          onClick={() => togglePublish(doc.id, doc.published)}
                          className="h-8 w-8"
                        >
                          {doc.published ? (
                            <EyeOff className="size-4" />
                          ) : (
                            <Eye className="size-4" />
                          )}
                        </Button>
                        <Button variant="ghost" size="icon" asChild className="h-8 w-8">
                          <Link href={`/admin/docs/${doc.id}/edit`}>
                            <Edit className="size-4" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive h-8 w-8"
                          onClick={() => deleteDoc(doc.id)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Select a library and version to manage documentation pages.
          </CardContent>
        </Card>
      )}
    </div>
  )
}
