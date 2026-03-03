"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Save, Trash2 } from "lucide-react"

import { useUpdateDoc, useDeleteDoc } from "@/lib/queries"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { DeleteDocDialog } from "@/components/delete-doc-dialog"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { TiptapEditor } from "@/components/tiptap-editor"
import { LocationFinder } from "./location-finder"

export type DocForEdit = {
  id: string
  title: string
  slug: string
  content: string
  parentPath: string
  order: number
  published: boolean
  libraryVersion: {
    version: string
    library: { name: string; slug: string }
  }
}

export function DocEditor({
  doc,
  viewUrl,
}: {
  doc: DocForEdit
  viewUrl: string
}) {
  const router = useRouter()
  const updateDoc = useUpdateDoc(doc.id)
  const deleteDoc = useDeleteDoc()

  const [content, setContent] = useState(doc.content)
  const [title, setTitle] = useState(doc.title)
  const [slug, setSlug] = useState(doc.slug)
  const [parentPath, setParentPath] = useState(doc.parentPath)
  const [order, setOrder] = useState(doc.order)
  const [published, setPublished] = useState(doc.published)
  const [saved, setSaved] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  // Refs for Ctrl+S save
  const titleRef = useRef(title)
  const slugRef = useRef(slug)
  const contentRef = useRef(content)
  const parentPathRef = useRef(parentPath)
  const orderRef = useRef(order)
  const publishedRef = useRef(published)

  useEffect(() => { titleRef.current = title }, [title])
  useEffect(() => { slugRef.current = slug }, [slug])
  useEffect(() => { contentRef.current = content }, [content])
  useEffect(() => { parentPathRef.current = parentPath }, [parentPath])
  useEffect(() => { orderRef.current = order }, [order])
  useEffect(() => { publishedRef.current = published }, [published])

  const save = useCallback(async (overrides?: Record<string, unknown>) => {
    setSaved(false)
    await updateDoc.mutateAsync({
      title: titleRef.current,
      slug: slugRef.current,
      content: contentRef.current,
      parentPath: parentPathRef.current,
      order: orderRef.current,
      published: publishedRef.current,
      ...overrides,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }, [updateDoc])

  const handlePublishToggle = useCallback(async (newPublished: boolean) => {
    setPublished(newPublished)
    publishedRef.current = newPublished
    await save({ published: newPublished })
  }, [save])

  const handleDeleteConfirm = useCallback(async () => {
    await deleteDoc.mutateAsync(doc.id)
    setDeleteDialogOpen(false)
    router.push(viewUrl.replace(/\/[^/]+\/edit$/, "").replace(/\/[^/]+$/, "") || "/")
    router.refresh()
  }, [deleteDoc, doc.id, router, viewUrl])

  // Ctrl+S to save
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault()
        save()
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [save])

  return (
    <>
      {/* Editor Header */}
      <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center border-b border-border/40 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="flex w-full items-center justify-between px-4 gap-4">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                router.push(viewUrl)
                router.refresh()
              }}
              className="gap-1.5"
            >
              <ArrowLeft className="size-3.5" />
              <span className="hidden sm:inline">Back to View</span>
            </Button>
            <Separator
              orientation="vertical"
              className="mx-1 data-[orientation=vertical]:h-4"
            />
            <LocationFinder
              librarySlug={doc.libraryVersion.library.slug}
              libraryName={doc.libraryVersion.library.name}
              version={doc.libraryVersion.version}
              pathSegments={[
                ...(doc.parentPath ? doc.parentPath.split("/") : []),
                doc.slug,
              ]}
              docTitle={doc.title}
            />
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Switch
                id="published"
                checked={published}
                onCheckedChange={handlePublishToggle}
                disabled={updateDoc.isPending}
              />
              <Label htmlFor="published" className="text-xs whitespace-nowrap">
                {published ? "Published" : "Draft"}
              </Label>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleteDialogOpen(true)}
              disabled={deleteDoc.isPending}
              className="hidden sm:flex"
            >
              <Trash2 className="mr-1.5 size-3.5" />
              Delete
            </Button>
            <Button
              size="sm"
              onClick={() => save()}
              disabled={updateDoc.isPending}
            >
              <Save className="mr-1.5 size-3.5" />
              {updateDoc.isPending ? "Saving..." : saved ? "Saved!" : "Save"}
            </Button>
          </div>
        </div>
      </header>

      {/* Metadata + Editor */}
      <div className="flex flex-1 flex-col p-6 pt-4 space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="edit-title" className="text-xs">Title</Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              size={16}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-slug" className="text-xs">Slug</Label>
            <Input
              id="edit-slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              size={16}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-parent" className="text-xs">Parent Path</Label>
            <Input
              id="edit-parent"
              value={parentPath}
              onChange={(e) => setParentPath(e.target.value)}
              size={16}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-order" className="text-xs">Order</Label>
            <Input
              id="edit-order"
              type="number"
              value={order}
              onChange={(e) => setOrder(parseInt(e.target.value) || 0)}
              size={16}
            />
          </div>
        </div>

        <TiptapEditor
          content={content}
          onChange={setContent}
          placeholder="Start writing documentation..."
        />
      </div>

      <DeleteDocDialog
        open={deleteDialogOpen}
        title={title}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDeleteConfirm}
        isPending={deleteDoc.isPending}
      />
    </>
  )
}
