import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Clean version string: remove 'v' prefix if present
 * e.g. "v1.2.3" → "1.2.3", "1.2.3" → "1.2.3"
 */
export function cleanVersion(version: string): string {
  return version.replace(/^v/, "").trim()
}

/**
 * Format version string: add 'v' prefix if not present
 * e.g. "1.2.3" → "v1.2.3", "v1.2.3" → "v1.2.3"
 */
export function formatVersion(version: string): string {
  const cleaned = cleanVersion(version)
  return `v${cleaned}`
}
