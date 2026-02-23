"use client"

import { useEffect, useState, use, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Save } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { TiptapEditor } from "@/components/tiptap-editor"

type DocData = {
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

export default function EditDocPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const [doc, setDoc] = useState<DocData | null>(null)
  const [content, setContent] = useState("")
  const [title, setTitle] = useState("")
  const [slug, setSlug] = useState("")
  const [parentPath, setParentPath] = useState("")
  const [order, setOrder] = useState(0)
  const [published, setPublished] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  // Refs to always have the latest values in save()
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

  useEffect(() => {
    fetch(`/api/admin/docs/${id}`)
      .then((res) => res.json())
      .then((data: DocData) => {
        setDoc(data)
        setContent(data.content)
        setTitle(data.title)
        setSlug(data.slug)
        setParentPath(data.parentPath)
        setOrder(data.order)
        setPublished(data.published)
        setLoading(false)
      })
  }, [id])

  const save = useCallback(async (overrides?: Partial<DocData>) => {
    setSaving(true)
    setSaved(false)
    const res = await fetch(`/api/admin/docs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: titleRef.current,
        slug: slugRef.current,
        content: contentRef.current,
        parentPath: parentPathRef.current,
        order: orderRef.current,
        published: publishedRef.current,
        ...overrides,
      }),
    })
    setSaving(false)
    if (res.ok) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
  }, [id])

  const handlePublishToggle = useCallback(async (newPublished: boolean) => {
    setPublished(newPublished)
    publishedRef.current = newPublished
    await save({ published: newPublished })
  }, [save])

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

  if (loading) {
    return <div className="py-8 text-center text-muted-foreground">Loading editor...</div>
  }

  if (!doc) {
    return <div className="py-8 text-center text-muted-foreground">Doc not found</div>
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="w-fit">
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold truncate">{doc.libraryVersion.library.name}</h1>
            <p className="text-xs text-muted-foreground truncate">
              {doc.libraryVersion.version} / {doc.parentPath ? `${doc.parentPath}/` : ""}{doc.title}
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <Switch
              id="published"
              checked={published}
              onCheckedChange={handlePublishToggle}
              disabled={saving}
            />
            <Label htmlFor="published" className="text-sm whitespace-nowrap">
              {published ? "Published" : "Draft"}
            </Label>
          </div>
          <Button onClick={() => save()} disabled={saving} className="w-full sm:w-auto">
            <Save className="mr-2 size-4" />
            {saving ? "Saving..." : saved ? "Saved!" : "Save"}
          </Button>
        </div>
      </div>

      {/* Metadata fields */}
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

      {/* Markdown Editor */}
      <TiptapEditor
        content={content}
        onChange={setContent}
        placeholder="Start writing documentation..."
      />
    </div>
  )
}
