import type { DefaultSession } from "@clerk/nextjs/server"

declare global {
  interface CustomJwtSessionClaims {
    metadata: {
      role?: "super-admin"
    }
  }
}

export {}
