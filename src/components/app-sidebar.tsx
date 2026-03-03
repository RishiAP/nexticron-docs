"use client";

import * as React from "react";
import { useRouter } from "next/navigation"
import { useNavigation } from "@/components/navigation-provider";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Edit,
  FileText,
  FilePlus,
  Folder,
  LogOut,
  Settings,
  Trash2,
  User,
} from "lucide-react";
import Link from "next/link";
import { cleanVersion, formatVersion } from "@/lib/utils";
import { useSignOut, useCreateDoc, useDeleteDoc } from "@/lib/queries";

import { ThemeSwitcher } from "@/components/theme-switcher";
import { DeleteDocDialog } from "@/components/delete-doc-dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { LibraryWithVersions } from "@/app/[[...version]]/page";
import Logo from "./Logo";

function getLatestVersion(lib: LibraryWithVersions): string | null {
  return lib.versions[0]?.version ?? null;
}

// ─── File Tree Types ────────────────────────────────────────

type FileTreeNode = {
  id?: string;
  name: string;
  url?: string;
  isDraft?: boolean;
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
    const versionSegment = isLatest ? "" : `/${version}`;
    const parentSegment = doc.parentPath ? `${doc.parentPath}/` : "";
    const url = `/${lib.slug}${versionSegment}/${parentSegment}${doc.slug}`;

    const node: FileTreeNode = {
      id: doc.id,
      name: doc.title,
      url,
      isDraft: !doc.published,
    };

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

// ─── Create File Dialog ─────────────────────────────────────

type CreateFileDialogState = {
  open: boolean;
  librarySlug: string;
  version: string;
  versionId: string;
  parentPath: string;
  isLatest: boolean;
};

type DeleteDocDialogState = {
  open: boolean;
  docId: string;
  docTitle: string;
  docUrl?: string;
};

function CreateFileDialog({
  state,
  onClose,
  libraries,
}: {
  state: CreateFileDialogState;
  onClose: () => void;
  libraries: LibraryWithVersions[];
}) {
  const router = useRouter();
  const createDoc = useCreateDoc();
  const [title, setTitle] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [autoSlug, setAutoSlug] = React.useState(true);

  // Collect existing slugs and titles for the target version + parentPath
  const { existingSlugs, existingTitles } = React.useMemo(() => {
    const slugs = new Set<string>();
    const titles = new Set<string>();
    for (const lib of libraries) {
      for (const ver of lib.versions) {
        if (ver.id === state.versionId) {
          for (const doc of ver.docs) {
            if (doc.parentPath === state.parentPath) {
              slugs.add(doc.slug);
              titles.add(doc.title.toLowerCase());
            }
          }
        }
      }
    }
    return { existingSlugs: slugs, existingTitles: titles };
  }, [libraries, state.versionId, state.parentPath]);

  const titleConflict = title.trim() !== "" && existingTitles.has(title.trim().toLowerCase());
  const slugConflict = slug.trim() !== "" && existingSlugs.has(slug.trim());

  React.useEffect(() => {
    if (state.open) {
      setTitle("");
      setSlug("");
      setAutoSlug(true);
    }
  }, [state.open]);

  React.useEffect(() => {
    if (autoSlug) {
      // Extract file extension before stripping it (e.g. "java" from "Cell.java")
      const extMatch = title.match(/\.([a-zA-Z0-9]+)$/);
      const ext = extMatch ? extMatch[1].toLowerCase() : null;

      let base = title
        .replace(/\.[a-zA-Z0-9]+$/, "") // strip file extension
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");

      // If slug already exists, append the file extension as suffix
      if (base && existingSlugs.has(base) && ext) {
        base = `${base}-${ext}`;
      }

      setSlug(base);
    }
  }, [title, autoSlug, existingSlugs]);

  async function handleCreate() {
    if (!title.trim() || !slug.trim()) return;
    const doc = await createDoc.mutateAsync({
      title: title.trim(),
      slug: slug.trim(),
      parentPath: state.parentPath,
      libraryVersionId: state.versionId,
      content: "",
    });
    onClose();
    // Navigate to the new doc in edit mode
    const parentSegment = doc.parentPath ? `${doc.parentPath}/` : "";
    const versionSegment = state.isLatest ? "" : `/${state.version}`;
    router.push(
      `/${state.librarySlug}${versionSegment}/${parentSegment}${doc.slug}/edit`,
    );
    router.refresh();
  }

  return (
    <Dialog open={state.open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Document</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-1.5">
            <Label htmlFor="new-doc-title">Title</Label>
            <Input
              id="new-doc-title"
              placeholder="Getting Started"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
            {titleConflict && (
              <p className="text-xs text-destructive">
                A document with this title already exists in this location.
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-doc-slug">Slug</Label>
            <Input
              id="new-doc-slug"
              placeholder="getting-started"
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setAutoSlug(false);
              }}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
            {slugConflict && (
              <p className="text-xs text-destructive">
                A document with this slug already exists in this location.
              </p>
            )}
          </div>
          {state.parentPath && (
            <p className="text-xs text-muted-foreground">
              Parent folder: <span className="font-mono">{state.parentPath}</span>
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!title.trim() || !slug.trim() || titleConflict || slugConflict || createDoc.isPending}
          >
            {createDoc.isPending ? "Creating..." : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Tree Node Component ───────────────────────────────────

function TreeNode({
  node,
  depth,
  canEdit,
  onNewFile,
  onDeleteFile,
}: {
  node: FileTreeNode;
  depth: number;
  canEdit: boolean;
  onNewFile?: (parentPath: string) => void;
  onDeleteFile?: (docId: string, docTitle: string, docUrl?: string) => void;
}) {
  const { effectivePathname } = useNavigation();
  const hasChildren = node.children !== undefined;
  const isActive = node.url ? effectivePathname === node.url : false;

  if (!hasChildren) {
    const fileContent = (
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
            {node.isDraft && (
              <Badge
                variant="outline"
                className="ml-auto text-[9px] px-1 py-0 h-4 opacity-60"
              >
                Draft
              </Badge>
            )}
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );

    if (!canEdit) return fileContent;

    return (
      <ContextMenu>
        <ContextMenuTrigger asChild>{fileContent}</ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem asChild>
            <Link href={`${node.url}/edit`}>
              <Edit className="size-3.5 mr-2" />
              Edit
            </Link>
          </ContextMenuItem>
          {node.id && onDeleteFile && (
            <ContextMenuItem
              onClick={() => onDeleteFile(node.id as string, node.name, node.url)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="size-3.5 mr-2" />
              Delete
            </ContextMenuItem>
          )}
        </ContextMenuContent>
      </ContextMenu>
    );
  }

  // Folder node
  const folderContent = (
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
                canEdit={canEdit}
                onNewFile={onNewFile}
                onDeleteFile={onDeleteFile}
              />
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );

  if (!canEdit || !onNewFile) return folderContent;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{folderContent}</ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={() => onNewFile(node.name)}>
          <FilePlus className="size-3.5 mr-2" />
          New File in {node.name}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
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
  canEdit,
  onNewFile,
  onDeleteFile,
}: {
  lib: LibraryWithVersions;
  activeVersion: string;
  canEdit: boolean;
  onNewFile: (version: string, versionId: string, parentPath: string) => void;
  onDeleteFile: (docId: string, docTitle: string, docUrl?: string) => void;
}) {
  const matchingVersion = lib.versions.find((v) => v.version === activeVersion);
  const versionId = matchingVersion?.id ?? "";

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

  const handleNewFile = React.useCallback(
    (parentPath: string) => onNewFile(activeVersion, versionId, parentPath),
    [activeVersion, versionId, onNewFile],
  );

  const sectionContent = (
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
                    No docs yet
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ) : (
                sortedTree.map((item) => (
                  <TreeNode
                    key={item.name}
                    node={item}
                    depth={0}
                    canEdit={canEdit}
                    onNewFile={handleNewFile}
                    onDeleteFile={onDeleteFile}
                  />
                ))
              )}
            </SidebarMenuSub>
          </CollapsibleContent>
        </SidebarMenuItem>
      </Collapsible>
    </SidebarGroup>
  );

  if (!canEdit) return sectionContent;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{sectionContent}</ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={() => handleNewFile("")}>
          <FilePlus className="size-3.5 mr-2" />
          New File in {lib.name}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

// ─── Main Sidebar ───────────────────────────────────────────

export function AppSidebar({
  libraries = [],
  isAdmin = false,
  displayName,
  libraryPermissions = {},
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  libraries?: LibraryWithVersions[];
  isAdmin?: boolean;
  displayName?: string | null;
  libraryPermissions?: Record<string, boolean>;
}) {
  const { effectivePathname } = useNavigation();
  const router = useRouter();
  const signOut = useSignOut();
  const deleteDoc = useDeleteDoc();

  // Derive selectedVersions from current URL (use effectivePathname for instant updates)
  const selectedVersions = React.useMemo(() => {
    const map: Record<string, string> = {};
    const segments = effectivePathname.split("/").filter(Boolean);
    // Strip trailing "edit" segment
    if (segments[segments.length - 1] === "edit") {
      segments.pop();
    }
    const currentLibSlug = segments[0] || null;

    for (const lib of libraries) {
      const latest = getLatestVersion(lib);
      if (lib.slug === currentLibSlug) {
        // Check if second segment is a known version
        if (segments.length > 1) {
          const cleaned = cleanVersion(segments[1]);
          if (lib.versions.some((v) => v.version === cleaned)) {
            map[lib.slug] = cleaned;
            continue;
          }
        }
        // No version in URL → latest
        if (latest) map[lib.slug] = latest;
      } else {
        if (latest) map[lib.slug] = latest;
      }
    }
    return map;
  }, [effectivePathname, libraries]);

  const [createDialog, setCreateDialog] = React.useState<CreateFileDialogState>(
    {
      open: false,
      librarySlug: "",
      version: "",
      versionId: "",
      parentPath: "",
      isLatest: true,
    },
  );
  const [deleteDialog, setDeleteDialog] = React.useState<DeleteDocDialogState>({
    open: false,
    docId: "",
    docTitle: "",
    docUrl: undefined,
  });

  const handleNewFile = React.useCallback(
    (libSlug: string, version: string, versionId: string, parentPath: string, isLatest: boolean) => {
      setCreateDialog({
        open: true,
        librarySlug: libSlug,
        version,
        versionId,
        parentPath,
        isLatest,
      });
    },
    [],
  );

  async function handleSignOut() {
    await signOut.mutateAsync();
    router.push("/sign-in");
    router.refresh();
  }

  const handleDeleteRequest = React.useCallback(
    (docId: string, docTitle: string, docUrl?: string) => {
      setDeleteDialog({
        open: true,
        docId,
        docTitle,
        docUrl,
      });
    },
    [],
  );

  const handleConfirmDelete = React.useCallback(async () => {
    if (!deleteDialog.docId) return;

    const isCurrentDoc =
      !!deleteDialog.docUrl &&
      (effectivePathname === deleteDialog.docUrl || effectivePathname === `${deleteDialog.docUrl}/edit`);

    const deletedDocUrl = deleteDialog.docUrl;
    await deleteDoc.mutateAsync(deleteDialog.docId);

    setDeleteDialog({
      open: false,
      docId: "",
      docTitle: "",
      docUrl: undefined,
    });

    if (isCurrentDoc && deletedDocUrl) {
      const segments = deletedDocUrl.split("/").filter(Boolean);
      const nextPath = segments[0] ? `/${segments[0]}` : "/";
      router.push(nextPath);
    }

    router.refresh();
  }, [deleteDialog.docId, deleteDialog.docUrl, deleteDoc, effectivePathname, router]);

  return (
    <>
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
                  <div className="dark:bg-primary dark:text-primary-foreground bg-transparent text-primary flex aspect-square size-8 items-center justify-center rounded-lg">
                    <Logo className="size-7" />
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
              canEdit={!!libraryPermissions[lib.slug]}
              onNewFile={(version, versionId, parentPath) =>
                handleNewFile(lib.slug, version, versionId, parentPath, version === getLatestVersion(lib))
              }
              onDeleteFile={handleDeleteRequest}
            />
          ))}
        </SidebarContent>

        <SidebarFooter>
          <SidebarMenu>
            {isAdmin && (
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
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="flex items-center gap-2 rounded-md p-1 text-sm hover:bg-muted transition-colors"
                    >
                      <div className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <User className="size-4" />
                      </div>
                      {displayName && (
                        <span className="truncate max-w-30 text-xs font-medium group-data-[collapsible=icon]:hidden">
                          {displayName}
                        </span>
                      )}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" sideOffset={8}>
                    {displayName && (
                      <DropdownMenuItem disabled className="text-xs opacity-70">
                        {displayName}
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={handleSignOut}>
                      <LogOut className="size-3.5 mr-2" />
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <ThemeSwitcher />
              </div>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <CreateFileDialog
        state={createDialog}
        onClose={() =>
          setCreateDialog((s) => ({ ...s, open: false }))
        }
        libraries={libraries}
      />
      <DeleteDocDialog
        open={deleteDialog.open}
        title={deleteDialog.docTitle}
        onClose={() =>
          setDeleteDialog((s) => ({
            ...s,
            open: false,
          }))
        }
        onConfirm={handleConfirmDelete}
        isPending={deleteDoc.isPending}
      />
    </>
  );
}
