"use client"

import type { ReactNode } from "react"
import { useNavigation } from "@/components/navigation-provider"

/**
 * Shows a fallback skeleton immediately when a client-side navigation
 * begins, and renders the real children once the server content arrives.
 *
 * All navigation-state tracking is done by {@link NavigationProvider} —
 * this component simply reads the context.
 *
 * SSR is unaffected: on initial load `isNavigating` is always `false`.
 */
export function RouteTransition({
  children,
  fallback,
}: {
  children: ReactNode
  fallback: ReactNode
}) {
  const { isNavigating } = useNavigation()
  return isNavigating ? <>{fallback}</> : <>{children}</>
}
