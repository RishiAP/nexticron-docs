"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Plus, Trash2 } from "lucide-react"
import { formatVersion } from "@/lib/utils"
import {
  createLibrarySchema,
  createVersionSchema,
  type CreateLibraryInput,
  type CreateVersionInput,
} from "@/lib/schemas"
import {
  useLibraries,
  useCreateLibrary,
  useDeleteLibrary,
  useCreateVersion,
  useDeleteVersion,
} from "@/lib/queries"
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
import { Badge } from "@/components/ui/badge"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"

export default function AdminLibrariesPage() {
  const { data: libraries = [], isLoading } = useLibraries()

  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [versionDialogOpen, setVersionDialogOpen] = useState(false)
  const [deleteLibraryDialog, setDeleteLibraryDialog] = useState<{
    open: boolean
    id: string
    name: string
  }>({ open: false, id: "", name: "" })
  const [deleteVersionDialog, setDeleteVersionDialog] = useState<{
    open: boolean
    id: string
    name: string
  }>({ open: false, id: "", name: "" })

  const createLibrary = useCreateLibrary()
  const deleteLibrary = useDeleteLibrary()
  const createVersion = useCreateVersion()
  const deleteVersion = useDeleteVersion()

  // Library form
  const libraryForm = useForm<CreateLibraryInput>({
    resolver: zodResolver(createLibrarySchema),
    defaultValues: { name: "", slug: "" },
  })

  // Version form
  const versionForm = useForm<CreateVersionInput>({
    resolver: zodResolver(createVersionSchema),
    defaultValues: { version: "", libraryId: "" },
  })

  const autoSlug = (name: string) =>
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")

  async function onCreateLibrary(values: CreateLibraryInput) {
    await createLibrary.mutateAsync(values)
    libraryForm.reset()
    setCreateDialogOpen(false)
  }

  async function onDeleteLibrary(id: string, name: string) {
    setDeleteLibraryDialog({ open: true, id, name })
  }

  async function onCreateVersion(values: CreateVersionInput) {
    await createVersion.mutateAsync(values)
    versionForm.reset()
    setVersionDialogOpen(false)
  }

  async function onDeleteVersion(id: string, name: string) {
    setDeleteVersionDialog({ open: true, id, name })
  }

  async function confirmDeleteLibrary() {
    await deleteLibrary.mutateAsync(deleteLibraryDialog.id)
    setDeleteLibraryDialog({ open: false, id: "", name: "" })
  }

  async function confirmDeleteVersion() {
    await deleteVersion.mutateAsync(deleteVersionDialog.id)
    setDeleteVersionDialog({ open: false, id: "", name: "" })
  }

  if (isLoading) {
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
            Manage your Java library documentation projects
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
            <Form {...libraryForm}>
              <form onSubmit={libraryForm.handleSubmit(onCreateLibrary)} className="space-y-4 py-4">
                <FormField
                  control={libraryForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. Tiler"
                          {...field}
                          onChange={(e) => {
                            field.onChange(e)
                            libraryForm.setValue("slug", autoSlug(e.target.value))
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={libraryForm.control}
                  name="slug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Slug (URL-safe)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. tiler" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit" disabled={createLibrary.isPending}>
                    {createLibrary.isPending ? "Creating\u2026" : "Create"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
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
                    className="text-destructive hover:text-destructive shrink-0"
                    onClick={() => onDeleteLibrary(lib.id, lib.name)}
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
                        onClick={() => onDeleteVersion(v.id, formatVersion(v.version))}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="mt-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      versionForm.setValue("libraryId", lib.id)
                      setVersionDialogOpen(true)
                    }}
                    className="w-full sm:w-auto"
                  >
                    <Plus className="mr-1 size-3" />
                    Version
                  </Button>
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
          <Form {...versionForm}>
            <form onSubmit={versionForm.handleSubmit(onCreateVersion)} className="space-y-4 py-4">
              <FormField
                control={versionForm.control}
                name="version"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Version</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. 1.0.0" {...field} />
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-muted-foreground">Enter semantic version (e.g. 1.0.0) &mdash; the &quot;v&quot; prefix will be added automatically</p>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={createVersion.isPending}>
                  {createVersion.isPending ? "Creating\u2026" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteLibraryDialog.open}
        onOpenChange={(open) =>
          setDeleteLibraryDialog((state) => ({ ...state, open }))
        }
      >
        <DialogContent className="w-[95vw] rounded-lg sm:w-full">
          <DialogHeader>
            <DialogTitle>Delete library?</DialogTitle>
            <DialogDescription>
              This will permanently delete <span className="font-medium">{deleteLibraryDialog.name}</span> and all its versions/docs.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteLibraryDialog({ open: false, id: "", name: "" })}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeleteLibrary} disabled={deleteLibrary.isPending}>
              {deleteLibrary.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteVersionDialog.open}
        onOpenChange={(open) =>
          setDeleteVersionDialog((state) => ({ ...state, open }))
        }
      >
        <DialogContent className="w-[95vw] rounded-lg sm:w-full">
          <DialogHeader>
            <DialogTitle>Delete version?</DialogTitle>
            <DialogDescription>
              This will permanently delete version <span className="font-medium">{deleteVersionDialog.name}</span> and all its docs.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteVersionDialog({ open: false, id: "", name: "" })}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeleteVersion} disabled={deleteVersion.isPending}>
              {deleteVersion.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
