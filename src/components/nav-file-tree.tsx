"use client"

import Link from "next/link"
import type { ReactNode } from "react"
import { ChevronRight, FileText, Folder } from "lucide-react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
} from "@/components/ui/sidebar"

export type FileTreeNode = {
  name: string
  url?: string
  children?: FileTreeNode[]
}

function sortTreeNodes(nodes: FileTreeNode[]): FileTreeNode[] {
  return [...nodes]
    .map((node) => ({
      ...node,
      children: node.children ? sortTreeNodes(node.children) : undefined,
    }))
    .sort((a, b) => {
      const aIsFolder = (a.children?.length ?? 0) > 0
      const bIsFolder = (b.children?.length ?? 0) > 0

      if (aIsFolder !== bIsFolder) {
        return aIsFolder ? -1 : 1
      }

      return a.name.localeCompare(b.name, undefined, {
        sensitivity: "base",
        numeric: true,
      })
    })
}

function TreeNode({ node, depth }: { node: FileTreeNode; depth: number }) {
  const hasChildren = node.children !== undefined
  const paddingLeft = `${8 + depth * 14}px`

  if (!hasChildren) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton asChild tooltip={node.name} style={{ paddingLeft }}>
          <Link href={node.url ?? "#"}>
            <FileText />
            <span>{node.name}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    )
  }

  return (
    <Collapsible asChild defaultOpen={depth === 0}>
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton className="group/file-tree-trigger" tooltip={node.name} style={{ paddingLeft }}>
            <Folder />
            <span>{node.name}</span>
            <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/file-tree-trigger:rotate-90" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {node.children?.map((child) => (
              <TreeNode key={`${node.name}-${child.name}`} node={child} depth={depth + 1} />
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  )
}

export function NavFileTree({
  items,
  topContent,
}: {
  items: FileTreeNode[]
  topContent?: ReactNode
}) {
  const sortedItems = sortTreeNodes(items)

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>com.nexticron</SidebarGroupLabel>
      {topContent}
      <SidebarMenu>
        {sortedItems.map((item) => (
          <TreeNode key={item.name} node={item} depth={0} />
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}
