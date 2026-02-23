"use client"

import React, { useState } from "react"
import { Check, Copy } from "lucide-react"

function extractText(node: React.ReactNode): string {
  if (typeof node === "string") return node
  if (typeof node === "number") return String(node)
  if (!node) return ""
  if (Array.isArray(node)) return node.map(extractText).join("")
  if (typeof node === "object" && "props" in node) {
    const element = node as React.ReactElement<{ children?: React.ReactNode }>
    return extractText(element.props.children)
  }
  return ""
}

export function CodeBlockWithCopy({
  children,
  ...props
}: React.HTMLAttributes<HTMLPreElement>) {
  const [copied, setCopied] = useState(false)

  // Extract language from data-language attribute (set by rehype-pretty-code)
  const dataLang =
    (props as Record<string, unknown>)["data-language"] as string | undefined

  const handleCopy = () => {
    const text = extractText(children)
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="group relative rounded-lg border border-border bg-card overflow-hidden my-4 shadow-sm">
      {/* Header bar with language tag and copy button */}
      <div className="flex items-center justify-between px-4 py-2 bg-muted border-b border-border">
        {dataLang ? (
          <span className="text-[11px] font-medium text-muted-foreground select-none">
            {dataLang}
          </span>
        ) : (
          <span />
        )}
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-accent"
        >
          {copied ? (
            <>
              <Check className="size-3.5 text-green-500" />
              <span className="text-green-500">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="size-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre
        {...props}
        className="overflow-x-auto p-4 text-sm leading-relaxed m-0! rounded-none! border-0! bg-card!"
      >
        {children}
      </pre>
    </div>
  )
}
