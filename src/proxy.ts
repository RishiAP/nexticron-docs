import { clerkClient, clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

const isAdminRoute = createRouteMatcher([
  "/admin(.*)",
  "/api/admin(.*)",
])

const isPublicRoute = createRouteMatcher([
  '/',
  "/sign-in",
  "/sign-up"
])

export default clerkMiddleware(async (auth, req) => {
  // Admin routes require authentication — role authorization is handled in the admin layout
  if (isAdminRoute(req)) {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.redirect(new URL("/", req.url))
    }
    const user = await (await clerkClient()).users.getUser(userId)
    const role= user.publicMetadata.role
    if (role !== "super-admin") {
      return NextResponse.redirect(new URL("/", req.url))
    }
  }

  if(!isPublicRoute(req)) {
    auth.protect() // Protect all non-public routes, but allow them to handle redirection if unauthenticated
  }

  // All other routes (including root) are public — pages handle auth inline
  return NextResponse.next()
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
}
