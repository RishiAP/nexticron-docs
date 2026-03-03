/**
 * GET /api/auth/me
 *
 * Returns the current authenticated user's identity and permissions.
 * Reads the access token from the Authorization header (Bearer JWT).
 */
import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth/helpers"

export async function GET() {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 })
  }

  return NextResponse.json({ user })
}
