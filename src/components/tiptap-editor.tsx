"use client"

import { useEditor, EditorContent, NodeViewWrapper, NodeViewContent, ReactNodeViewRenderer } from "@tiptap/react"
import { Node as ProseMirrorNode } from "@tiptap/pm/model"
import StarterKit from "@tiptap/starter-kit"
import Placeholder from "@tiptap/extension-placeholder"
import Link from "@tiptap/extension-link"
import Image from "@tiptap/extension-image"
import Underline from "@tiptap/extension-underline"
import TextAlign from "@tiptap/extension-text-align"
import Highlight from "@tiptap/extension-highlight"
import { Table } from "@tiptap/extension-table"
import { TableRow } from "@tiptap/extension-table-row"
import { TableHeader } from "@tiptap/extension-table-header"
import { TableCell } from "@tiptap/extension-table-cell"
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight"
import { Markdown } from "tiptap-markdown"
import { common, createLowlight } from "lowlight"
import { useCallback, useEffect, useRef, useState } from "react"
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Minus,
  Link as LinkIcon,
  Image as ImageIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Highlighter,
  Undo,
  Redo,
  Table as TableIcon,
  CodeSquare,
  Pilcrow,
  Copy,
  Check,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const lowlight = createLowlight(common)

// CodeBlock component with language label and copy button
function CodeBlockComponent({
  node,
  updateAttributes,
  extension,
}: {
  node: ProseMirrorNode
  updateAttributes: (attributes: Record<string, string>) => void
  extension: { options: { lowlight: ReturnType<typeof createLowlight> } }
}) {
  const [copied, setCopied] = useState(false)  

  const handleCopyCode = useCallback(() => {
    const code = node.textContent
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [node])

  const handleLanguageChange = useCallback(
    (value: string) => {
      updateAttributes({ language: value })
    },
    [updateAttributes]
  )

  const languages = extension.options.lowlight.listLanguages()
  const currentLanguage = node.attrs.language || "plaintext"

  return (
    <NodeViewWrapper className="relative group shadow-sm rounded-lg">
      <div className="flex items-center justify-between bg-muted border border-b-0 border-border px-3 py-1.5 rounded-t-md">
        <div contentEditable={false}>
          <Select value={currentLanguage} onValueChange={handleLanguageChange}>
            <SelectTrigger className="h-7 min-w-30 border-0 bg-transparent shadow-none text-xs text-muted-foreground hover:text-foreground focus:ring-0 px-2 gap-1">
              <SelectValue placeholder="Language" />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              <SelectItem value="plaintext" className="text-xs">Plain Text</SelectItem>
              {languages.sort().map((lang) => (
                <SelectItem key={lang} value={lang} className="text-xs">
                  {lang}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <button
          onClick={handleCopyCode}
          className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded hover:bg-accent"
          contentEditable={false}
          type="button"
        >
          {copied ? (
            <Check className="size-4 text-green-500" />
          ) : (
            <Copy className="size-4" />
          )}
        </button>
      </div>
      <pre className="mt-0! rounded-t-none!">
        <NodeViewContent />
      </pre>
    </NodeViewWrapper>
  )
}

type TiptapEditorProps = {
  content: string
  onChange: (markdown: string) => void
  placeholder?: string
}

function ToolbarButton({
  onClick,
  active = false,
  disabled = false,
  tooltip,
  children,
}: {
  onClick: () => void
  active?: boolean
  disabled?: boolean
  tooltip: string
  children: React.ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant={active ? "secondary" : "ghost"}
          size="icon"
          className="size-8"
          onClick={onClick}
          disabled={disabled}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  )
}

function EditorToolbar({ editor }: { editor: ReturnType<typeof useEditor> }) {
  const addLink = useCallback(() => {
    if (!editor) return
    const previousUrl = editor.getAttributes("link").href
    const url = window.prompt("URL", previousUrl)
    if (url === null) return
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run()
  }, [editor])

  const addImage = useCallback(() => {
    if (!editor) return
    const url = window.prompt("Image URL")
    if (url) {
      editor.chain().focus().setImage({ src: url }).run()
    }
  }, [editor])

  const insertTable = useCallback(() => {
    if (!editor) return
    editor
      .chain()
      .focus()
      .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
      .run()
  }, [editor])

  if (!editor) return null

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-border border-b bg-muted/30 px-2 py-1.5 rounded-t-lg">
      {/* Undo/Redo */}
      <ToolbarButton
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        tooltip="Undo"
      >
        <Undo className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        tooltip="Redo"
      >
        <Redo className="size-4" />
      </ToolbarButton>

      <Separator orientation="vertical" className="mx-1 h-6" />

      {/* Text formatting */}
      <ToolbarButton
        onClick={() => editor.chain().focus().setParagraph().run()}
        active={editor.isActive("paragraph")}
        tooltip="Paragraph"
      >
        <Pilcrow className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        active={editor.isActive("heading", { level: 1 })}
        tooltip="Heading 1"
      >
        <Heading1 className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        active={editor.isActive("heading", { level: 2 })}
        tooltip="Heading 2"
      >
        <Heading2 className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        active={editor.isActive("heading", { level: 3 })}
        tooltip="Heading 3"
      >
        <Heading3 className="size-4" />
      </ToolbarButton>

      <Separator orientation="vertical" className="mx-1 h-6" />

      {/* Inline formatting */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive("bold")}
        tooltip="Bold"
      >
        <Bold className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive("italic")}
        tooltip="Italic"
      >
        <Italic className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        active={editor.isActive("underline")}
        tooltip="Underline"
      >
        <UnderlineIcon className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        active={editor.isActive("strike")}
        tooltip="Strikethrough"
      >
        <Strikethrough className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleCode().run()}
        active={editor.isActive("code")}
        tooltip="Inline Code"
      >
        <Code className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHighlight().run()}
        active={editor.isActive("highlight")}
        tooltip="Highlight"
      >
        <Highlighter className="size-4" />
      </ToolbarButton>

      <Separator orientation="vertical" className="mx-1 h-6" />

      {/* Alignment */}
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
        active={editor.isActive({ textAlign: "left" })}
        tooltip="Align Left"
      >
        <AlignLeft className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
        active={editor.isActive({ textAlign: "center" })}
        tooltip="Align Center"
      >
        <AlignCenter className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
        active={editor.isActive({ textAlign: "right" })}
        tooltip="Align Right"
      >
        <AlignRight className="size-4" />
      </ToolbarButton>

      <Separator orientation="vertical" className="mx-1 h-6" />

      {/* Block elements */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={editor.isActive("bulletList")}
        tooltip="Bullet List"
      >
        <List className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={editor.isActive("orderedList")}
        tooltip="Ordered List"
      >
        <ListOrdered className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        active={editor.isActive("blockquote")}
        tooltip="Blockquote"
      >
        <Quote className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        active={editor.isActive("codeBlock")}
        tooltip="Code Block"
      >
        <CodeSquare className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        tooltip="Horizontal Rule"
      >
        <Minus className="size-4" />
      </ToolbarButton>

      <Separator orientation="vertical" className="mx-1 h-6" />

      {/* Insert */}
      <ToolbarButton onClick={addLink} active={editor.isActive("link")} tooltip="Link">
        <LinkIcon className="size-4" />
      </ToolbarButton>
      <ToolbarButton onClick={addImage} tooltip="Image">
        <ImageIcon className="size-4" />
      </ToolbarButton>
      <ToolbarButton onClick={insertTable} tooltip="Insert Table">
        <TableIcon className="size-4" />
      </ToolbarButton>
    </div>
  )
}

export function TiptapEditor({ content, onChange, placeholder }: TiptapEditorProps) {
  const isInitialMount = useRef(true)

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
      }),
      Placeholder.configure({
        placeholder: placeholder ?? "Start writing documentation...",
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-primary underline cursor-pointer",
        },
      }),
      Image.configure({
        inline: false,
        allowBase64: true,
      }),
      Underline,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Highlight.configure({
        multicolor: false,
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      CodeBlockLowlight.extend({
        addNodeView() {
          return ReactNodeViewRenderer(CodeBlockComponent)
        },
      }).configure({
        lowlight,
        defaultLanguage: "plaintext",
      }),
      Markdown.configure({
        html: true,
        tightLists: true,
        bulletListMarker: "-",
        transformPastedText: true,
        transformCopiedText: true,
      }),
    ],
    content,
    editorProps: {
      attributes: {
        class:
          "tiptap prose prose-neutral dark:prose-invert max-w-none min-h-[500px] px-6 py-4 focus:outline-none prose-headings:scroll-mt-20 prose-pre:bg-muted prose-pre:text-foreground prose-code:text-primary prose-code:before:content-none prose-code:after:content-none",
      },
    },
    onUpdate: ({ editor }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const md = (editor.storage as any).markdown.getMarkdown()
      onChange(md)
    },
  })

  // Update content when it changes externally (initial load)
  useEffect(() => {
    if (editor && isInitialMount.current && content) {
      isInitialMount.current = false
    }
  }, [editor, content])

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-background">
      {editor && <EditorToolbar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  )
}
