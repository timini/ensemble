import type {
  ChatMessageView,
  ChatSessionListItemView,
  CreditBalanceView,
  CreditPurchaseState,
  CreditLevel,
  UsageHistoryItemView,
} from "@/lib/pro-types"

const updatedAt = "Feb 24, 2026 09:12"

const creditBalances: Record<CreditLevel, CreditBalanceView> = {
  healthy: {
    balance: 420,
    lowCreditThreshold: 100,
    level: "healthy",
    updatedAt,
  },
  low: {
    balance: 64,
    lowCreditThreshold: 100,
    level: "low",
    updatedAt,
  },
  insufficient: {
    balance: 0,
    lowCreditThreshold: 100,
    level: "insufficient",
    updatedAt,
  },
}

const purchaseStates: Record<CreditPurchaseState["status"], CreditPurchaseState> = {
  idle: {
    status: "idle",
    packageCredits: 500,
    packagePriceUsd: 10,
    message: "Ready to purchase more credits.",
  },
  loading: {
    status: "loading",
    packageCredits: 500,
    packagePriceUsd: 10,
    message: "Opening Stripe checkout...",
  },
  success: {
    status: "success",
    packageCredits: 500,
    packagePriceUsd: 10,
    message: "Purchase complete. Credits updated.",
  },
  error: {
    status: "error",
    packageCredits: 500,
    packagePriceUsd: 10,
    message: "Checkout failed. Try again or use another card.",
  },
}

const usageHistory: UsageHistoryItemView[] = [
  {
    id: "req_001",
    timestamp: "Feb 24, 2026 08:54",
    provider: "OpenAI",
    model: "GPT-4o",
    promptSummary: "Tradeoffs for LLM ensembles",
    tokens: 1880,
    creditCost: 23,
    status: "complete",
  },
  {
    id: "req_002",
    timestamp: "Feb 24, 2026 08:42",
    provider: "Anthropic",
    model: "Claude 3.5 Sonnet",
    promptSummary: "Migration checklist draft",
    tokens: 1420,
    creditCost: 18,
    status: "complete",
  },
  {
    id: "req_003",
    timestamp: "Feb 24, 2026 08:26",
    provider: "Google",
    model: "Gemini 2.0 Flash",
    promptSummary: "Release notes polish",
    tokens: 770,
    creditCost: 7,
    status: "failed",
  },
]

const sessions: ChatSessionListItemView[] = [
  {
    id: "session-alpha",
    title: "Architecture review with 4-model ensemble",
    preview: "We compared single model vs ensemble reliability and latency...",
    updatedAt: "2h ago",
    messageCount: 18,
    totalCredits: 49,
    status: "active",
  },
  {
    id: "session-beta",
    title: "Prompt optimization for investor FAQ",
    preview: "Drafted concise responses with stricter compliance tone...",
    updatedAt: "Yesterday",
    messageCount: 11,
    totalCredits: 31,
    status: "active",
  },
  {
    id: "session-gamma",
    title: "Archived model benchmark notes",
    preview: "Latency and agreement snapshots from last week benchmark...",
    updatedAt: "3 days ago",
    messageCount: 9,
    totalCredits: 22,
    status: "archived",
  },
]

const messagesBySession: Record<string, ChatMessageView[]> = {
  "session-alpha": [
    {
      id: "m1",
      role: "user",
      provider: "-",
      model: "-",
      content: "Give me the core tradeoffs of running an LLM ensemble in production.",
      createdAt: "08:48",
      status: "sent",
    },
    {
      id: "m2",
      role: "assistant",
      provider: "OpenAI",
      model: "GPT-4o",
      content: "Ensembles improve reliability and perspective diversity, but increase orchestration overhead and cost.",
      createdAt: "08:49",
      status: "sent",
    },
  ],
  "session-beta": [
    {
      id: "m3",
      role: "user",
      provider: "-",
      model: "-",
      content: "Rewrite this FAQ answer to be shorter and less technical.",
      createdAt: "Yesterday",
      status: "sent",
    },
    {
      id: "m4",
      role: "assistant",
      provider: "Anthropic",
      model: "Claude 3.5 Sonnet",
      content: "Here is a customer-facing version with clearer language and fewer implementation details.",
      createdAt: "Yesterday",
      status: "sent",
    },
  ],
}

export function getCreditBalance(level: CreditLevel) {
  return creditBalances[level]
}

export function getCreditPurchaseState(status: CreditPurchaseState["status"]) {
  return purchaseStates[status]
}

export const mockUsageHistory = usageHistory
export const mockChatSessions = sessions
export const mockChatMessagesBySession = messagesBySession
