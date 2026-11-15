"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { CreditBadge } from "@/components/pro/credit-badge"
import { getCreditBalance } from "@/lib/pro-mock-data"

const proLinks = [
  { href: "/pro/dashboard", label: "Dashboard" },
  { href: "/pro/usage", label: "Usage" },
  { href: "/pro/history", label: "History" },
]

const lowCredit = getCreditBalance("low")

export function ProTopNav() {
  const pathname = usePathname()

  return (
    <>
      {proLinks.map((link) => {
        const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`)
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`text-sm transition-colors ${
              isActive ? "font-semibold text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {link.label}
          </Link>
        )
      })}
      <CreditBadge credit={lowCredit} compact />
    </>
  )
}
