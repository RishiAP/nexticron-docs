"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Check,
  ChevronDown,
  ChevronRight,
  FileText,
  Folder,
  GalleryVerticalEnd,
  Settings,
} from "lucide-react";
import { useAuth, UserButton, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { formatVersion } from "@/lib/utils";

import { ThemeSwitcher } from "@/components/theme-switcher";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarGroup,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import type { LibraryWithVersions } from "@/app/[[...version]]/page";
import { Skeleton } from "./ui/skeleton";

function getLatestVersion(lib: LibraryWithVersions): string | null {
  return lib.versions[0]?.version ?? null;
}

// ─── File Tree Types ────────────────────────────────────────

type FileTreeNode = {
  name: string;
  url?: string;
  children?: FileTreeNode[];
};

// ─── Build file tree for one library at one version ─────────

function buildLibraryTree(
  lib: LibraryWithVersions,
  version: string,
): FileTreeNode[] {
  const matchingVersion = lib.versions.find((v) => v.version === version);
  const docs = matchingVersion?.docs ?? [];
  const isLatest = getLatestVersion(lib) === version;

  const rootDocs: FileTreeNode[] = [];
  const folderMap = new Map<string, FileTreeNode[]>();

  for (const doc of docs) {
    // For latest version, URL has no version segment
    const versionSegment = isLatest ? "" : `/${version}`;
    const parentSegment = doc.parentPath ? `${doc.parentPath}/` : "";
    const url = `/${lib.slug}${versionSegment}/${parentSegment}${doc.slug}`;

    const node: FileTreeNode = { name: doc.title, url };

    if (!doc.parentPath) {
      rootDocs.push(node);
    } else {
      if (!folderMap.has(doc.parentPath)) {
        folderMap.set(doc.parentPath, []);
      }
      folderMap.get(doc.parentPath)!.push(node);
    }
  }

  const folderNodes: FileTreeNode[] = [];
  for (const [folderName, children] of folderMap) {
    folderNodes.push({ name: folderName, children });
  }

  return [...folderNodes, ...rootDocs];
}

// ─── Tree Node Component ───────────────────────────────────

function TreeNode({ node, depth }: { node: FileTreeNode; depth: number }) {
  const pathname = usePathname();
  const hasChildren = node.children !== undefined;
  const isActive = node.url ? pathname === node.url : false;

  if (!hasChildren) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          asChild
          tooltip={node.name}
          isActive={isActive}
          className="text-[13px] pl-3"
        >
          <Link href={node.url ?? "#"}>
            <FileText className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate">{node.name}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  return (
    <Collapsible asChild defaultOpen>
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton
            className="group/tree text-[13px] pl-3 font-medium"
            tooltip={node.name}
          >
            <Folder className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate">{node.name}</span>
            <ChevronRight className="ml-auto size-3.5 transition-transform duration-200 group-data-[state=open]/tree:rotate-90" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub className="ml-3 border-l border-border/50 pl-2">
            {node.children?.map((child) => (
              <TreeNode
                key={`${node.name}-${child.name}`}
                node={child}
                depth={depth + 1}
              />
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}

// ─── Per-Library Version Switcher ───────────────────────────

function LibraryVersionSwitcher({
  lib,
  activeVersion,
}: {
  lib: LibraryWithVersions;
  activeVersion: string;
}) {
  const { isMobile } = useSidebar();
  const router = useRouter();
  const latestVersion = getLatestVersion(lib);

  const handleVersionChange = (nextVersion: string) => {
    if (nextVersion === activeVersion) return;
    const isNextLatest = nextVersion === latestVersion;
    const versionSegment = isNextLatest ? "" : `/${nextVersion}`;
    router.push(`/${lib.slug}${versionSegment}`);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div
          role="button"
          className="flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          tabIndex={0}
        >
          {formatVersion(activeVersion)}
          {activeVersion === latestVersion && (
            <Badge
              variant="secondary"
              className="text-[9px] px-1 py-0 h-4 font-semibold uppercase tracking-wider"
            >
              Latest
            </Badge>
          )}
          <ChevronDown className="size-3" />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        side={isMobile ? "bottom" : "right"}
        sideOffset={4}
        className="min-w-36"
      >
        {lib.versions.map((v) => (
          <DropdownMenuItem
            key={v.version}
            className="gap-2 text-xs"
            onClick={() => handleVersionChange(v.version)}
          >
            <span className="flex-1">{formatVersion(v.version)}</span>
            {v.version === latestVersion && (
              <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">
                Latest
              </Badge>
            )}
            {v.version === activeVersion && <Check className="size-3.5" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Library Section (collapsible folder) ───────────────────

function LibrarySection({
  lib,
  activeVersion,
}: {
  lib: LibraryWithVersions;
  activeVersion: string;
}) {
  const tree = React.useMemo(
    () => buildLibraryTree(lib, activeVersion),
    [lib, activeVersion],
  );

  const sortedTree = React.useMemo(() => {
    return [...tree].sort((a, b) => {
      const aIsFolder = a.children !== undefined;
      const bIsFolder = b.children !== undefined;
      if (aIsFolder !== bIsFolder) return aIsFolder ? -1 : 1;
      return a.name.localeCompare(b.name, undefined, {
        sensitivity: "base",
        numeric: true,
      });
    });
  }, [tree]);

  return (
    <SidebarGroup className="py-0">
      <Collapsible asChild defaultOpen>
        <SidebarMenuItem className="list-none">
          <div className="flex items-center">
            <CollapsibleTrigger asChild>
              <SidebarMenuButton
                className="group/lib flex-1 font-medium text-[13px]"
                tooltip={lib.name}
              >
                <Folder className="size-4 shrink-0 text-muted-foreground" />
                <span className="truncate flex-1">{lib.name}</span>
                <div className="ml-1">
                  <LibraryVersionSwitcher
                    lib={lib}
                    activeVersion={activeVersion}
                  />
                </div>
                <ChevronRight className="ml-1 size-3.5 transition-transform duration-200 group-data-[state=open]/lib:rotate-90" />
              </SidebarMenuButton>
            </CollapsibleTrigger>
          </div>

          <CollapsibleContent>
            <SidebarMenuSub className="ml-4 border-l border-border/50 pl-2">
              {sortedTree.length === 0 ? (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    disabled
                    className="text-xs text-muted-foreground italic"
                  >
                    No published docs
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ) : (
                sortedTree.map((item) => (
                  <TreeNode key={item.name} node={item} depth={0} />
                ))
              )}
            </SidebarMenuSub>
          </CollapsibleContent>
        </SidebarMenuItem>
      </Collapsible>
    </SidebarGroup>
  );
}

// ─── Main Sidebar ───────────────────────────────────────────

export function AppSidebar({
  libraries = [],
  selectedVersions = {},
  isSuperAdmin = false,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  libraries?: LibraryWithVersions[];
  selectedVersions?: Record<string, string>;
  isSuperAdmin?: boolean;
}) {
  const { isLoaded } = useUser();
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              tooltip="NextICron Technologies"
              asChild
            >
              <Link href="/">
                <div className="bg-primary text-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <GalleryVerticalEnd className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">NextICron</span>
                  <span className="truncate text-xs text-muted-foreground">
                    Documentation
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {libraries.map((lib) => (
          <LibrarySection
            key={lib.id}
            lib={lib}
            activeVersion={
              selectedVersions[lib.slug] ?? getLatestVersion(lib) ?? "v1.0.0"
            }
          />
        ))}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          {isSuperAdmin && (
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Admin Panel">
                <Link href="/admin">
                  <Settings className="size-4" />
                  <span>Admin Panel</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          <SidebarMenuItem>
            <div className="flex items-center justify-between px-2 py-1.5">
              {isLoaded ? (
                <UserButton
                  appearance={{
                    elements: {
                      avatarBox: "size-7",
                    },
                  }}
                />
              ) : (
                <Skeleton className="size-7 rounded-full" />
              )}

              <ThemeSwitcher />
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
