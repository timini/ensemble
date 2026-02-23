"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { AlertCircle, Loader2, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { GoogleIcon } from "@/components/auth/google-icon"

type AuthState = "idle" | "loading" | "error" | "success"

export default function SignInPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [state, setState] = useState<AuthState>("idle")

  const goNext = () => {
    setState("success")
    setTimeout(() => {
      router.push("/pro/dashboard")
    }, 500)
  }

  const handleGoogleSignIn = () => {
    setState("loading")
    setTimeout(() => {
      goNext()
    }, 700)
  }

  const handleEmailSignIn = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!email.trim() || !password.trim()) {
      setState("error")
      return
    }

    setState("loading")
    setTimeout(() => {
      goNext()
    }, 700)
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="mb-6 text-center">
          <p className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Fastest way in
          </p>
          <h2 className="mt-3 text-2xl font-bold">Sign in to Pro Mode</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Continue with Google for the smoothest sign-in experience.
          </p>
        </div>

        {state === "error" && (
          <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>Enter both email and password, or use Google to continue.</p>
            </div>
          </div>
        )}

        {state === "success" && (
          <div className="mb-4 rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-700">
            Signed in successfully. Taking you to your Pro dashboard...
          </div>
        )}

        <Button className="w-full" onClick={handleGoogleSignIn} disabled={state === "loading"}>
          {state === "loading" ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Signing in...
            </>
          ) : (
            <>
              <GoogleIcon />
              Continue with Google
            </>
          )}
        </Button>

        <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-wide text-muted-foreground">
          <div className="h-px flex-1 bg-border" />
          <span>or use email</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <form className="space-y-4" onSubmit={handleEmailSignIn}>
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium">
              Email
            </label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium">
              Password
            </label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
            />
          </div>

          <div className="flex items-center justify-between text-sm">
            <Link href="/auth/forgot-password" className="text-primary hover:underline">
              Forgot password?
            </Link>
            <Link href="/auth/sign-up" className="text-primary hover:underline">
              Create account
            </Link>
          </div>

          <Button type="submit" variant="outline" className="w-full" disabled={state === "loading"}>
            Sign in with email
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
