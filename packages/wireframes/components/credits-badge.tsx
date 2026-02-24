"use client"

import { useState } from "react"
import { Coins } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface CreditsBadgeProps {
  credits?: number
  isSignedIn?: boolean
}

export function CreditsBadge({ credits = 47, isSignedIn = false }: CreditsBadgeProps) {
  const [open, setOpen] = useState(false)

  if (!isSignedIn) return null

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-1.5 rounded-md px-2 py-1 transition-colors hover:bg-accent"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Coins className="h-4 w-4 text-muted-foreground" />
        <Badge variant="secondary">Credits: {credits}</Badge>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-md border border-border bg-background p-4 shadow-md">
          <h3 className="text-sm font-semibold text-foreground">Credit Summary</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center justify-between">
              <span>Credits remaining</span>
              <span className="font-medium text-foreground">{credits}</span>
            </li>
            <li className="flex items-center justify-between">
              <span>Usage this month</span>
              <span className="font-medium text-foreground">153 requests</span>
            </li>
          </ul>
          <div className="mt-4 border-t border-border pt-3">
            <Button variant="outline" size="sm" className="w-full">
              Buy more credits
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
