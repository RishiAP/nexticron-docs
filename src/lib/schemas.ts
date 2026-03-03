import { z } from "zod"

// ── Auth ────────────────────────────────────────────────────

export const signInSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
})

export type SignInInput = z.infer<typeof signInSchema>

// ── Libraries ───────────────────────────────────────────────

export const createLibrarySchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z
    .string()
    .min(1, "Slug is required")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be URL-safe lowercase"),
})

export type CreateLibraryInput = z.infer<typeof createLibrarySchema>

// ── Versions ────────────────────────────────────────────────

export const createVersionSchema = z.object({
  version: z.string().min(1, "Version is required"),
  libraryId: z.string().min(1, "Library ID is required"),
})

export type CreateVersionInput = z.infer<typeof createVersionSchema>

// ── Docs ────────────────────────────────────────────────────

export const createDocSchema = z.object({
  title: z.string().min(1, "Title is required"),
  slug: z.string().min(1, "Slug is required"),
  parentPath: z.string(),
  libraryVersionId: z.string().min(1, "Version ID is required"),
  content: z.string(),
})

export type CreateDocInput = z.infer<typeof createDocSchema>

export const updateDocSchema = z.object({
  title: z.string().min(1, "Title is required").optional(),
  slug: z.string().min(1, "Slug is required").optional(),
  content: z.string().optional(),
  parentPath: z.string().optional(),
  order: z.number().int().min(0).optional(),
  published: z.boolean().optional(),
})

export type UpdateDocInput = z.infer<typeof updateDocSchema>

// ── Permissions ─────────────────────────────────────────────

export const createPermissionSchema = z.object({
  groupName: z.string().min(1, "Group name is required"),
  libraryId: z.string().min(1, "Library is required"),
  role: z.enum(["EDITOR", "VIEWER"]),
})

export type CreatePermissionInput = z.infer<typeof createPermissionSchema>
