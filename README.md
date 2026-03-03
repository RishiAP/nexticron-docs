# NextICron Docs Platform

Multi-library documentation platform with versioned docs, role-based access, and in-app editing.

## Features

- **Multi-library support** — manage documentation for multiple libraries (e.g. Tiler, Logger, GDSLib) from a single app
- **Versioned docs** — each library has independent versions; URLs support both explicit version and "latest" routing
- **In-app editing** — Tiptap rich-text editor with markdown storage; edit any doc by appending `/edit` to its URL
- **Role-based access** — two-tier authorization model:
  - **Admin** (global) — full access to every library, the admin panel, and all APIs
  - **Editor** (per-library) — create/edit/delete docs for assigned libraries
  - **Viewer** (per-library) — read-only access to assigned libraries
- **Direct LDAP integration** — authenticate via LDAP bind/search against the FreeIPA directory and map directory groups to library-level permissions via the admin panel
- **Three-token auth** — short-lived access JWT (memory-only), rotating refresh tokens (HTTP-only cookie), and a session identity cookie for SSR
- **Redis session cache** — LDAP groups and admin status are cached in Redis with a TTL matching the refresh token lifetime, refreshed on every sign-in and token rotation
- **Internal user identity** — users are created in an internal `users` table on first login; refresh tokens are hashed (SHA-256) and stored per-user
- **Nested document trees** — docs support `parentPath` for folder-like hierarchy rendered in the sidebar

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, Turbopack) |
| UI | React 19, shadcn/ui, Tailwind CSS 4, Lucide icons |
| Editor | Tiptap 3 + tiptap-markdown |
| Data fetching | TanStack Query, Axios, Zod |
| Auth | Direct LDAP bind/search + three-token system (jose, crypto) |
| Database | PostgreSQL via Prisma 7 (PrismaPg adapter) |
| Cache | Redis via ioredis (≤ 6 compatible commands) |
| Code highlighting | Shiki, rehype-pretty-code, highlight.js |

## Getting Started

### Prerequisites

- Node.js 20+
- Yarn 1.x
- PostgreSQL database
- Redis 6+ server
- LDAP-accessible FreeIPA server (for authentication)

### Setup

```bash
# Install dependencies
yarn install

# Copy environment template and fill in values
cp .env.example .env

# Run database migrations
yarn prisma migrate deploy

# Generate Prisma client
yarn prisma generate

# Start development server
yarn dev
```

The app runs at `http://localhost:3000`.

## Scripts

| Command | Description |
|---------|-------------|
| `yarn dev` | Start dev server with Turbopack |
| `yarn build` | Run migrations + generate Prisma client + build for production |
| `yarn start` | Start production server |
| `yarn lint` | Run ESLint |

## Project Structure

```
src/
├── app/
│   ├── [[...version]]/       # Main docs page (view + edit modes)
│   ├── admin/                 # Admin panel (permissions, libraries)
│   ├── api/
│   │   ├── admin/             # Admin-only APIs (libraries, versions, permissions)
│   │   ├── auth/              # Auth endpoints (sign-in, sign-out, refresh, me)
│   │   ├── docs/              # Public read APIs (tree, doc content)
│   │   └── edit/              # Editor APIs (create/update/delete docs)
│   └── sign-in/               # Sign-in page
├── components/                # React components (sidebar, editor, etc.)
├── generated/prisma/          # Generated Prisma client
├── lib/
│   ├── auth/                  # Auth system (adapter, helpers, session, types)
│   ├── prisma.ts              # Prisma client singleton
│   ├── redis.ts               # Redis client singleton + user cache helpers
│   ├── queries.ts             # TanStack Query hooks + API calls
│   ├── schemas.ts             # Zod validation schemas
│   └── utils.ts               # Utility functions
└── proxy.ts                   # Middleware (route protection)
```

## Routes

### App Routes

| Route | Access | Description |
|-------|--------|-------------|
| `/` | Authenticated | Home / docs landing |
| `/{library}/{doc-path}` | Authenticated | View a document |
| `/{library}/{version}/{doc-path}` | Authenticated | View a specific version |
| `.../{doc-path}/edit` | Editor or Admin | Edit a document |
| `/admin` | Admin only | Library and version management |
| `/admin/permissions` | Admin only | Permission management |
| `/sign-in` | Public | Authentication page |

### API Routes

| Route | Methods | Access | Description |
|-------|---------|--------|-------------|
| `/api/auth/sign-in` | POST | Public | Authenticate via LDAP, issue tokens |
| `/api/auth/sign-out` | POST | Public | Revoke refresh tokens, clear cookies |
| `/api/auth/refresh` | POST | Public | Rotate refresh token, re-query LDAP, issue new access token |
| `/api/auth/me` | GET | Authenticated | Current user info |
| `/api/docs/tree` | GET | Authenticated | Sidebar navigation tree |
| `/api/edit/docs` | GET, POST | Editor/Admin | List or create docs |
| `/api/edit/docs/[id]` | GET, PATCH, DELETE | Editor/Admin | Read, update, or delete a doc |
| `/api/admin/libraries` | GET, POST | Admin | Manage libraries |
| `/api/admin/libraries/[id]` | PATCH, DELETE | Admin | Update or delete a library |
| `/api/admin/versions` | GET, POST | Admin | Manage library versions |
| `/api/admin/versions/[id]` | PATCH, DELETE | Admin | Update or delete a version |
| `/api/admin/permissions` | GET, POST | Admin | Manage group permission mappings |
| `/api/admin/permissions/[id]` | PATCH, DELETE | Admin | Update or delete a mapping |

## Database Schema

### Models

- **Library** — a top-level project (name, slug, sort order)
- **LibraryVersion** — a version of a library (e.g. `1.0.0`); unique per library
- **Doc** — a documentation page (title, slug, markdown content, parentPath for nesting, publish status)
- **User** — internal user identity (UUID id, username mapped from LDAP uid, email)
- **RefreshToken** — hashed refresh tokens linked to a user (tokenHash with UNIQUE constraint, expiry, revoked flag)
- **GroupPermissionMapping** — maps a directory group name to a library with a role (`EDITOR` or `VIEWER`)

### `ProjectRole` enum

| Value | Description |
|-------|-------------|
| `EDITOR` | Can create, edit, and delete docs for the mapped library |
| `VIEWER` | Read-only access to the mapped library |

Admin access is _not_ a per-project role — it is determined globally by membership in the docs admin group (configured via `FREEIPA_DOCS_ADMIN_GROUP`).

## Auth System

Authentication uses a provider-agnostic adapter pattern so the identity backend can be swapped without changing application code.

### Three-Token Architecture

| Token | Lifetime | Storage | Cookie | Purpose |
|-------|----------|---------|--------|---------|
| **Access token** | 15 min (configurable) | Client JS memory only | None — sent via `Authorization: Bearer` header | API authorization |
| **Refresh token** | 7 days (configurable) | SHA-256 hash in PostgreSQL, raw value in HTTP-only cookie | `refresh_token` — `SameSite=Strict`, `path=/api/auth/refresh` | Token rotation without re-authentication |
| **Session cookie** | 7 days (matches refresh) | Signed JWT (HS256) in HTTP-only cookie | `session` — `SameSite=Lax`, `path=/` | SSR identity resolution + middleware route gating |

The access token is **never** stored in cookies, `localStorage`, or `sessionStorage`. It exists only as a JavaScript variable in the client-side Axios module and is lost on page refresh (the client silently calls `/api/auth/refresh` to obtain a new one).

The session cookie embeds the DB record ID of the refresh token that issued it (`refreshTokenId`). On cache miss, the server verifies this refresh token is still valid before granting access — preventing use of old/stolen session cookies after revocation.

### Login Flow

1. User submits credentials to `POST /api/auth/sign-in`
2. `LdapAdapter` binds to LDAP using the user's credentials
3. Reads user profile + groups from LDAP attributes via base-scope search
4. Creates or updates the internal `User` record (upsert on username, stores email only)
5. Caches LDAP groups + admin flag in **Redis** (key `user:cache:{userId}`, TTL = refresh token lifetime)
6. Derives `isAdmin` from docs admin group membership (`FREEIPA_DOCS_ADMIN_GROUP`)
7. Derives per-library permissions by matching groups against `GroupPermissionMapping` records
8. Issues a short-lived **access token** (JWT, default 15 min) — returned in the response body only
9. Generates a cryptographically secure 256-bit **refresh token** — SHA-256 hashed and stored in the DB, raw value set in HTTP-only cookie (`SameSite=Strict`, `path=/api/auth/refresh`)
10. Sets a **session identity cookie** (signed JWT with `sub`, `username`, `isAdmin`, `refreshTokenId`, `purpose=session`) for SSR

### Refresh Flow (`POST /api/auth/refresh`)

1. Reads the refresh token from the HTTP-only cookie (only sent to `/api/auth/refresh`)
2. Hashes it (SHA-256) and looks up the record in the DB
3. Validates: exists, not revoked, not expired
4. **Reuse detection** — if the token was already revoked, all the user's refresh tokens are immediately revoked (compromised session protection)
5. Binds to LDAP using the **service account** (`LDAP_SERVICE_BIND_DN`)
6. Re-fetches the user's current LDAP groups
7. Recomputes `isAdmin` and project permissions from fresh group data
8. Updates the **Redis cache** with latest groups + admin flag
9. Issues a new access token (response body only — no cookie)
10. Rotates the refresh token: revokes the old record, generates a new one, sets new cookie
11. Updates the session identity cookie (reflects latest `isAdmin`)

### SSR Identity Resolution

Server Components resolve user identity via `resolveUserFromSessionCookie()`:

1. Read and verify the signed session cookie JWT
2. Check **Redis cache** (`user:cache:{userId}`)
   - **Cache hit** → use cached groups / isAdmin / email (fast path — no DB or LDAP)
3. **Cache miss** → look up the session cookie's `refreshTokenId` in the database
   - **Refresh token valid** (not revoked, not expired) → re-fetch LDAP groups via service bind → rebuild Redis cache → return user
   - **Refresh token revoked or expired** → return null → redirect to sign-in

This ensures old/stolen session cookies cannot grant access after their linked refresh token is revoked, while keeping the happy path (Redis hit) fast.

### Instant Revocation

To immediately revoke a user's access:

1. Revoke all their refresh tokens in the database
2. Delete their Redis cache (`user:cache:{userId}`)

Next page load: Redis miss → refresh token check → revoked → access denied.

### Security Properties

- Access tokens live only in client memory — XSS cannot steal them from cookies or storage
- Access tokens are short-lived (15 min) — a compromised token expires quickly
- Refresh tokens are rotated on every use — old tokens are immediately revoked
- **Reuse detection** — presenting an already-revoked refresh token triggers revocation of all user sessions
- Refresh tokens are hashed (SHA-256) before database storage — a DB breach does not expose raw tokens
- Refresh cookie is scoped to `/api/auth/refresh` — not sent to any other endpoint
- **Session cookie is bound to a refresh token** — revoking the refresh token invalidates the session cookie on next cache miss
- Session cookie carries only minimal identity claims — no groups, no permissions, no secrets
- LDAP groups are re-queried on every refresh — permission changes propagate within one access token lifetime
- User passwords are never stored — authentication delegates to direct LDAP bind
- Internal user identity uses UUID primary keys — usernames are not used as keys

### Middleware

`src/proxy.ts` runs on every request. It reads the **session cookie** (not the access token or refresh cookie) to determine identity:

- `/admin` and `/api/admin/*` — require admin (checked via session cookie `isAdmin` claim)
- `/sign-in`, `/api/auth/*` — public
- Everything else — require authentication

### Auth Helpers

All auth helpers are importable from `@/lib/auth`:

```typescript
import { getCurrentUser, requireAuth, requireAdmin, isAdmin } from "@/lib/auth"
```

| Helper | Returns | Description |
|--------|---------|-------------|
| `getCurrentUser()` | `AuthUser \| null` | Current user or null |
| `getSession()` | `SessionPayload \| null` | Raw JWT payload or null |
| `requireAuth()` | `AuthUser` | Throws if not authenticated |
| `requireAdmin()` | `AuthUser` | Throws if not admin |
| `isAdmin()` | `boolean` | Check admin status |
| `requireRole(role)` | `AuthUser` | Throws if user has no projects with given role |
| `requireProjectPermission(slug, role)` | `AuthUser` | Throws if no access to specific library |
| `getUserProjectPermissions()` | `ProjectPermission[]` | All per-library permissions |

## Environment Variables

See [.env.example](.env.example) for the full template.

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string (used by Prisma Client at runtime via PrismaPg adapter) |
| `DIRECT_URL` | Yes | PostgreSQL connection string (used by Prisma CLI for migrations via `prisma.config.ts`) |
| `REDIS_URL` | Yes | Redis connection string for session cache (e.g. `redis://localhost:6379`) |
| `JWT_SECRET` | Yes | Secret key for signing JWTs (min 32 characters) |
| `ACCESS_TOKEN_EXPIRY_MINS` | No | Access token lifetime in minutes (default: `15`) |
| `REFRESH_AND_SESSION_TOKEN_EXPIRY_DAYS` | No | Refresh token and session cookie lifetime in days (default: `7`) |
| `LDAP_URL` | Yes | LDAP/LDAPS server URL (e.g. `ldaps://ipa.example.com:636`) |
| `LDAP_BASE_DN` | Yes | Base DN for directory lookups (e.g. `dc=example,dc=com`) |
| `LDAP_USER_DN_TEMPLATE` | No | DN template for user bind; must include `{username}` |
| `LDAP_SERVICE_BIND_DN` | Yes | Service account DN for LDAP read-only lookups (refresh flow) |
| `LDAP_SERVICE_BIND_PASSWORD` | Yes | Service account password |
| `LDAP_GROUP_ATTRIBUTE` | No | Group-membership attribute (default: `memberOf`) |
| `LDAP_UID_ATTRIBUTE` | No | UID attribute (default: `uid`) |
| `LDAP_DISPLAY_NAME_ATTRIBUTE` | No | Display name attribute (default: `cn`) |
| `LDAP_EMAIL_ATTRIBUTE` | No | Email attribute (default: `mail`) |
| `LDAP_ALLOW_INSECURE_TLS` | No | Skip TLS cert validation (default: `false`) |
| `FREEIPA_DOCS_ADMIN_GROUP` | No | Directory group that grants global docs admin (default: `docs-admins`) |

## Security

- Access tokens live **only in client-side JS memory** — never in cookies, `localStorage`, or `sessionStorage`
- Short-lived JWT access tokens (15 min default) limit the blast radius of token theft
- Refresh tokens are hashed (SHA-256) before storage — a database breach does not expose raw tokens
- Refresh tokens are rotated on every use — reuse of an old token is detected and rejected
- **Reuse detection** — presenting a revoked refresh token triggers immediate revocation of all user sessions
- Refresh token cookie uses `SameSite=Strict` and is scoped to `/api/auth/refresh` — not sent to any other endpoint
- Session cookie contains only minimal identity claims (`sub`, `username`, `isAdmin`, `refreshTokenId`) — no groups, secrets, or permissions
- **Session cookies are bound to refresh tokens** — on Redis cache miss, the server verifies the linked refresh token is still valid before granting access
- **Instant revocation** — revoking refresh tokens + deleting Redis cache immediately denies access on next page load
- LDAP groups and admin status are cached in **Redis** (not in the database) and refreshed on every token rotation
- LDAP permissions are re-queried on every refresh — group/role changes propagate within one access token lifetime
- Admin can revoke all sessions for a user by deleting their refresh token records
- Middleware enforces route-level access control before page/API handlers run
- Edit APIs perform per-library authorization checks (admin bypasses all)
- Admin APIs are restricted to global admins only
- Passwords are never stored — authentication delegates to direct LDAP bind
- Internal user identity uses UUID primary keys — usernames are not used as keys
