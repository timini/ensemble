import Link from "next/link"
import { CreditCard, Gauge, History, Sparkles } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

const panels = [
  {
    title: "Credits",
    description: "Track balance, low-credit warnings, and purchase entrypoints.",
    icon: CreditCard,
  },
  {
    title: "Usage",
    description: "View request history and provider/model cost summaries.",
    icon: Gauge,
  },
  {
    title: "Past chats",
    description: "Browse, reopen, and manage prior Pro chat sessions.",
    icon: History,
  },
]

export default function ProDashboardPage() {
  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <div className="rounded-lg border border-primary/20 bg-primary/10 p-4 text-primary">
        <p className="inline-flex items-center gap-1 text-sm font-medium">
          <Sparkles className="h-4 w-4" />
          Pro Mode placeholder
        </p>
        <h2 className="mt-2 text-2xl font-bold text-foreground">Welcome to your Pro workspace</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          This is the wireframe destination after auth. Credits, usage, and past chats are staged next.
        </p>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {panels.map((panel) => {
          const Icon = panel.icon
          return (
            <Card key={panel.title}>
              <CardContent className="p-6">
                <Icon className="h-5 w-5 text-primary" />
                <h3 className="mt-3 text-lg font-semibold">{panel.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{panel.description}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Button asChild>
          <Link href="/config">Back to configuration</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/ensemble">Continue to ensemble</Link>
        </Button>
      </div>
    </div>
  )
}
