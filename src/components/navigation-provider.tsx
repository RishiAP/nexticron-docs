"use client"

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"
import { usePathname } from "next/navigation"

type NavigationContextValue = {
  /** The real pathname from Next.js (updates AFTER server responds) */
  pathname: string
  /** The clicked href during a pending transition, or null */
  pendingPathname: string | null
  /** Whether a client-side navigation is in progress */
  isNavigating: boolean
  /**
   * Use this for active-link checks — returns pendingPathname during
   * a transition, otherwise the real pathname.
   */
  effectivePathname: string
}

const NavigationContext = createContext<NavigationContextValue>({
  pathname: "/",
  pendingPathname: null,
  isNavigating: false,
  effectivePathname: "/",
})

export function useNavigation() {
  return useContext(NavigationContext)
}

/**
 * Wrap the entire docs shell (sidebar + content area) with this provider.
 *
 * It intercepts internal link clicks in the capture phase and immediately
 * sets `pendingPathname`.  `isNavigating` is **derived** — true when
 * `pendingPathname` differs from the current `pathname`, false as soon
 * as Next.js pathname catches up.  No effects call setState, so there
 * are no cascading renders.
 *
 * This gives two benefits:
 *   1. Sidebar links can appear "active" the instant they are clicked.
 *   2. A content-area skeleton can be shown immediately (via RouteTransition).
 */
export function NavigationProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const [pendingPathname, setPendingPathname] = useState<string | null>(null)

  // isNavigating is DERIVED — true only when we have a pending target that
  // hasn't resolved yet.  Once pathname catches up, this becomes false
  // automatically with zero additional setState calls.
  const isNavigating =
    pendingPathname !== null && pendingPathname !== pathname

  const effectivePathname = isNavigating ? pendingPathname : pathname

  // Intercept clicks on internal <a> elements (capture phase for speed)
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest<HTMLAnchorElement>(
        "a[href]",
      )
      if (!anchor) return

      // Skip modifier-key clicks (open in new tab, etc.)
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return

      const href = anchor.getAttribute("href")
      if (!href) return

      // Skip external, hash-only, and mailto links
      if (
        href.startsWith("http") ||
        href.startsWith("#") ||
        href.startsWith("mailto:")
      )
        return

      // Compare without query / hash
      const cleanHref = href.split("?")[0].split("#")[0]
      const cleanPathname = pathname.split("?")[0].split("#")[0]

      if (cleanHref !== cleanPathname) {
        setPendingPathname(cleanHref)
      }
    }

    document.addEventListener("click", handleClick, true)
    return () => document.removeEventListener("click", handleClick, true)
  }, [pathname])

  return (
    <NavigationContext.Provider
      value={{ pathname, pendingPathname, isNavigating, effectivePathname }}
    >
      {children}
    </NavigationContext.Provider>
  )
}
