"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Plus, Trash2, Shield } from "lucide-react"
import {
  createPermissionSchema,
  type CreatePermissionInput,
} from "@/lib/schemas"
import {
  usePermissions,
  useLibraries,
  useCreatePermission,
  useDeletePermission,
  type PermissionMapping,
  type Library,
} from "@/lib/queries"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"

const ROLE_OPTIONS = ["EDITOR", "VIEWER"] as const

function roleBadgeVariant(role: string): "default" | "secondary" | "outline" {
  switch (role) {
    case "EDITOR":
      return "default"
    default:
      return "outline"
  }
}

function PermissionsTableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-8 ml-auto" />
        </div>
      ))}
    </div>
  )
}

export default function AdminPage() {
  const { data: mappings = [], isLoading: mappingsLoading } = usePermissions()
  const { data: libraries = [], isLoading: librariesLoading } = useLibraries()
  const createPermission = useCreatePermission()
  const deletePermission = useDeletePermission()

  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean
    id: string
    groupName: string
  }>({ open: false, id: "", groupName: "" })

  const form = useForm<CreatePermissionInput>({
    resolver: zodResolver(createPermissionSchema),
    defaultValues: {
      groupName: "",
      libraryId: "",
      role: "VIEWER",
    },
  })

  const createMapping = async (values: CreatePermissionInput) => {
    try {
      await createPermission.mutateAsync(values)
      form.reset({ groupName: "", libraryId: "", role: "VIEWER" })
      setCreateDialogOpen(false)
    } catch (err) {
      form.setError("root", {
        message: err instanceof Error ? err.message : "Failed to create mapping",
      })
    }
  }

  const deleteMapping = async (id: string, groupName: string) => {
    setDeleteDialog({ open: true, id, groupName })
  }

  const confirmDeleteMapping = async () => {
    await deletePermission.mutateAsync(deleteDialog.id)
    setDeleteDialog({ open: false, id: "", groupName: "" })
  }

  if (mappingsLoading || librariesLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-5 w-96" />
        </div>
        <Card>
          <CardContent className="py-6">
            <PermissionsTableSkeleton />
          </CardContent>
        </Card>
      </div>
    )
  }

  // Group mappings by group name for display
  const groupedByGroup = mappings.reduce<Record<string, PermissionMapping[]>>(
    (acc, m) => {
      if (!acc[m.groupName]) acc[m.groupName] = []
      acc[m.groupName].push(m)
      return acc
    },
    {},
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Permission Mappings</h1>
          <p className="text-sm text-muted-foreground">
            Map FreeIPA groups to library-level roles. Users in these groups will
            inherit the specified permissions.
          </p>
        </div>
        <Dialog
          open={createDialogOpen}
          onOpenChange={(open) => {
            setCreateDialogOpen(open)
            if (!open) form.clearErrors("root")
          }}
        >
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">
              <Plus className="mr-2 size-4" />
              New Mapping
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] rounded-lg sm:w-full">
            <DialogHeader>
              <DialogTitle>Create Permission Mapping</DialogTitle>
              <DialogDescription>
                Map a FreeIPA group to a library with a specific role. Members of
                the group will inherit this permission.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(createMapping)}
                className="space-y-4 py-4"
              >
                {form.formState.errors.root && (
                  <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {form.formState.errors.root.message}
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="groupName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>FreeIPA Group Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. project-tiler-editors"
                          {...field}
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">
                        The exact group name as configured in FreeIPA
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="libraryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Library</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a library" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {libraries.map((lib: Library) => (
                            <SelectItem key={lib.id} value={lib.id}>
                              {lib.name}{" "}
                              <span className="text-muted-foreground">
                                (/{lib.slug})
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {ROLE_OPTIONS.map((role) => (
                            <SelectItem key={role} value={role}>
                              {role}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        ADMIN: full access &middot; EDITOR: can manage docs &middot;
                        VIEWER: read-only
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button type="submit" disabled={createPermission.isPending}>
                    {createPermission.isPending ? "Creating…" : "Create"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {mappings.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <div className="space-y-3">
              <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted">
                <Shield className="size-6 text-muted-foreground" />
              </div>
              <p>
                No permission mappings configured yet. Create one to map a
                FreeIPA group to a library role.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Active Mappings</CardTitle>
            <CardDescription>
              {mappings.length} mapping{mappings.length !== 1 ? "s" : ""} across{" "}
              {Object.keys(groupedByGroup).length} group
              {Object.keys(groupedByGroup).length !== 1 ? "s" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>FreeIPA Group</TableHead>
                  <TableHead>Library</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="w-15" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {mappings.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-mono text-sm">
                      {m.groupName}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span>{m.library.name}</span>
                        <span className="text-xs text-muted-foreground font-mono">
                          /{m.library.slug}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={roleBadgeVariant(m.role)}>
                        {m.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => deleteMapping(m.id, m.groupName)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog((state) => ({ ...state, open }))}
      >
        <DialogContent className="w-[95vw] rounded-lg sm:w-full">
          <DialogHeader>
            <DialogTitle>Delete permission mapping?</DialogTitle>
            <DialogDescription>
              This will remove mapping for <span className="font-medium">{deleteDialog.groupName}</span>.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialog({ open: false, id: "", groupName: "" })}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteMapping}
              disabled={deletePermission.isPending}
            >
              {deletePermission.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
