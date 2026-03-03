import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query"
import api, { setAccessToken } from "@/lib/api"

// ── Types ───────────────────────────────────────────────────

export type LibraryVersion = {
  id: string
  version: string
}

export type Library = {
  id: string
  name: string
  slug: string
  order: number
  versions: LibraryVersion[]
}

export type LibrarySimple = {
  id: string
  name: string
  slug: string
}

export type DocSummary = {
  id: string
  title: string
  slug: string
  parentPath: string
  order: number
  published: boolean
  updatedAt: string
}

export type DocData = {
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

export type PermissionMapping = {
  id: string
  groupName: string
  role: "EDITOR" | "VIEWER"
  library: LibrarySimple
  createdAt: string
}

// ── Query Keys ──────────────────────────────────────────────

export const queryKeys = {
  libraries: ["libraries"] as const,
  library: (id: string) => ["libraries", id] as const,
  docs: (versionId: string) => ["docs", versionId] as const,
  doc: (id: string) => ["doc", id] as const,
  permissions: ["permissions"] as const,
}

// ── Library Queries ─────────────────────────────────────────

export function useLibraries(
  options?: Partial<UseQueryOptions<Library[]>>,
) {
  return useQuery({
    queryKey: queryKeys.libraries,
    queryFn: async () => {
      const { data } = await api.get<Library[]>("/api/admin/libraries")
      return data
    },
    ...options,
  })
}

export function useCreateLibrary() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { name: string; slug: string }) => {
      const { data } = await api.post<Library>("/api/admin/libraries", input)
      return data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.libraries })
    },
  })
}

export function useDeleteLibrary() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/admin/libraries/${id}`)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.libraries })
    },
  })
}

// ── Version Mutations ───────────────────────────────────────

export function useCreateVersion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { version: string; libraryId: string }) => {
      const { data } = await api.post("/api/admin/versions", input)
      return data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.libraries })
    },
  })
}

export function useDeleteVersion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/admin/versions/${id}`)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.libraries })
    },
  })
}

// ── Doc Queries ─────────────────────────────────────────────

export function useDocs(
  versionId: string,
  options?: Partial<UseQueryOptions<DocSummary[]>>,
) {
  return useQuery({
    queryKey: queryKeys.docs(versionId),
    queryFn: async () => {
      const { data } = await api.get<DocSummary[]>(
        `/api/edit/docs?libraryVersionId=${versionId}`,
      )
      return data
    },
    enabled: !!versionId,
    ...options,
  })
}

export function useDoc(
  id: string,
  options?: Partial<UseQueryOptions<DocData>>,
) {
  return useQuery({
    queryKey: queryKeys.doc(id),
    queryFn: async () => {
      const { data } = await api.get<DocData>(`/api/edit/docs/${id}`)
      return data
    },
    enabled: !!id,
    ...options,
  })
}

export function useCreateDoc() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      title: string
      slug: string
      parentPath?: string
      libraryVersionId: string
      content?: string
    }) => {
      const { data } = await api.post<DocData>("/api/edit/docs", input)
      return data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["docs"] })
    },
  })
}

export function useUpdateDoc(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      title?: string
      slug?: string
      content?: string
      parentPath?: string
      order?: number
      published?: boolean
    }) => {
      const { data } = await api.patch<DocData>(`/api/edit/docs/${id}`, input)
      return data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.doc(id) })
      void queryClient.invalidateQueries({ queryKey: ["docs"] })
    },
  })
}

export function useDeleteDoc() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/edit/docs/${id}`)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["docs"] })
    },
  })
}

// ── Permission Queries ──────────────────────────────────────

export function usePermissions(
  options?: Partial<UseQueryOptions<PermissionMapping[]>>,
) {
  return useQuery({
    queryKey: queryKeys.permissions,
    queryFn: async () => {
      const { data } = await api.get<PermissionMapping[]>(
        "/api/admin/permissions",
      )
      return data
    },
    ...options,
  })
}

export function useCreatePermission() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      groupName: string
      libraryId: string
      role: string
    }) => {
      const { data } = await api.post<PermissionMapping>(
        "/api/admin/permissions",
        input,
      )
      return data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.permissions })
    },
  })
}

export function useDeletePermission() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/admin/permissions/${id}`)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.permissions })
    },
  })
}

// ── Auth Mutations ──────────────────────────────────────────

export function useSignIn() {
  return useMutation({
    mutationFn: async (input: { username: string; password: string }) => {
      const { data } = await api.post<{
        success: boolean
        accessToken: string
        user: {
          id: string
          username: string
          email: string
          isAdmin: boolean
        }
      }>("/api/auth/sign-in", input)
      // Store access token in memory
      setAccessToken(data.accessToken)
      return data
    },
  })
}

export function useSignOut() {
  return useMutation({
    mutationFn: async () => {
      await api.post("/api/auth/sign-out")
      // Clear in-memory access token
      setAccessToken(null)
    },
  })
}
