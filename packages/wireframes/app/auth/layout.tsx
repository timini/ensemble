import Link from "next/link"

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <div className="mx-auto w-full max-w-md">
        <Link href="/config" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          ← Back to configuration
        </Link>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  )
}
