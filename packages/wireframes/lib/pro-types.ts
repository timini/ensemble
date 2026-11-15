export type ProAuthStatus = "signed-out" | "loading" | "signed-in" | "error"
export type CreditLevel = "healthy" | "low" | "insufficient"
export type AsyncViewState = "idle" | "loading" | "empty" | "error" | "success"

export interface ProAuthState {
  status: ProAuthStatus
  provider: "google" | "email" | null
  email?: string
  message?: string
}

export interface CreditBalanceView {
  balance: number
  lowCreditThreshold: number
  level: CreditLevel
  updatedAt: string
}

export interface CreditPurchaseState {
  status: "idle" | "loading" | "success" | "error"
  packageCredits: number
  packagePriceUsd: number
  message: string
}

export interface UsageHistoryItemView {
  id: string
  timestamp: string
  provider: string
  model: string
  promptSummary: string
  tokens: number
  creditCost: number
  status: "complete" | "failed"
}

export interface ChatSessionListItemView {
  id: string
  title: string
  preview: string
  updatedAt: string
  messageCount: number
  totalCredits: number
  status: "active" | "archived"
}

export interface ChatMessageView {
  id: string
  role: "user" | "assistant"
  provider: string
  model: string
  content: string
  createdAt: string
  status: "sent" | "streaming" | "failed"
}
