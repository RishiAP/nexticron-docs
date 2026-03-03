import { NextRequest, NextResponse } from "next/server"
import { resolveUserFromCookieString } from "@/lib/auth/session"

function isAdminRoute(pathname: string): boolean {
  return pathname.startsWith("/admin") || pathname.startsWith("/api/admin")
}

function isPublicRoute(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname === "/sign-in" ||
    pathname.startsWith("/api/auth")
  )
}

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const cookieHeader = req.headers.get("cookie")
  const user = await resolveUserFromCookieString(cookieHeader)

  // Admin routes require admin role
  if (isAdminRoute(pathname)) {
    if (!user) {
      return NextResponse.redirect(new URL("/sign-in", req.url))
    }
    if (!user.isAdmin) {
      return NextResponse.redirect(new URL("/", req.url))
    }
    return NextResponse.next()
  }

  // Public routes are always accessible
  if (isPublicRoute(pathname)) {
    return NextResponse.next()
  }

  // All other routes require authentication
  if (!user) {
    return NextResponse.redirect(new URL("/sign-in", req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
}
