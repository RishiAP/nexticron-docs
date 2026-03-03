"use client"

import { useRouter } from "next/navigation"
import { LogOut, User } from "lucide-react"
import { useSignOut } from "@/lib/queries"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function UserDropdown({ displayName }: { displayName?: string | null }) {
  const router = useRouter()
  const signOut = useSignOut()

  const handleSignOut = async () => {
    await signOut.mutateAsync()
    router.push("/sign-in")
    router.refresh()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded-md p-1.5 text-sm hover:bg-muted transition-colors"
        >
          <div className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-primary">
            <User className="size-4" />
          </div>
          {displayName && (
            <span className="truncate max-w-[120px] text-xs font-medium">
              {displayName}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8}>
        {displayName && (
          <DropdownMenuItem disabled className="text-xs opacity-70">
            {displayName}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={handleSignOut}>
          <LogOut className="size-3.5 mr-2" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
