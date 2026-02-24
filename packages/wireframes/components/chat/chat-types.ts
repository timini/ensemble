/* ------------------------------------------------------------------ */
/*  Shared types & seed data for the continuous-chat wireframe        */
/* ------------------------------------------------------------------ */

export type Provider = "openai" | "anthropic" | "google" | "xai" | "deepseek" | "perplexity"
export type EnsembleMode = "standard" | "elo" | "majority" | "council"

export interface Model {
  id: string
  provider: Provider
  name: string
}

export const providerLabels: Record<Provider, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google",
  xai: "xAI",
  deepseek: "DeepSeek",
  perplexity: "Perplexity",
}

export const providerColors: Record<Provider, string> = {
  openai: "bg-emerald-100 border-emerald-300 dark:bg-emerald-950 dark:border-emerald-800",
  anthropic: "bg-orange-100 border-orange-300 dark:bg-orange-950 dark:border-orange-800",
  google: "bg-blue-100 border-blue-300 dark:bg-blue-950 dark:border-blue-800",
  xai: "bg-neutral-100 border-neutral-300 dark:bg-neutral-900 dark:border-neutral-700",
  deepseek: "bg-indigo-100 border-indigo-300 dark:bg-indigo-950 dark:border-indigo-800",
  perplexity: "bg-cyan-100 border-cyan-300 dark:bg-cyan-950 dark:border-cyan-800",
}

/** Badge color for model response cards (lighter, text-based) */
export const providerBadgeColors: Record<Provider, string> = {
  openai: "text-emerald-700 bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-950",
  anthropic: "text-orange-700 bg-orange-100 dark:text-orange-300 dark:bg-orange-950",
  google: "text-blue-700 bg-blue-100 dark:text-blue-300 dark:bg-blue-950",
  xai: "text-neutral-700 bg-neutral-100 dark:text-neutral-300 dark:bg-neutral-800",
  deepseek: "text-indigo-700 bg-indigo-100 dark:text-indigo-300 dark:bg-indigo-950",
  perplexity: "text-cyan-700 bg-cyan-100 dark:text-cyan-300 dark:bg-cyan-950",
}

/** Left-border accent colour for model response cards */
export const providerBorderLeft: Record<Provider, string> = {
  openai: "border-l-emerald-500",
  anthropic: "border-l-orange-500",
  google: "border-l-blue-500",
  xai: "border-l-neutral-500",
  deepseek: "border-l-indigo-500",
  perplexity: "border-l-cyan-500",
}

export const models: Model[] = [
  { id: "gpt-4o", provider: "openai", name: "GPT-4o" },
  { id: "gpt-4o-mini", provider: "openai", name: "GPT-4o Mini" },
  { id: "claude-3.5-sonnet", provider: "anthropic", name: "Claude 3.5 Sonnet" },
  { id: "claude-3-haiku", provider: "anthropic", name: "Claude 3 Haiku" },
  { id: "gemini-2.0-flash", provider: "google", name: "Gemini 2.0 Flash" },
  { id: "gemini-1.5-pro", provider: "google", name: "Gemini 1.5 Pro" },
  { id: "grok-2", provider: "xai", name: "Grok 2" },
  { id: "deepseek-chat", provider: "deepseek", name: "DeepSeek Chat" },
  { id: "sonar", provider: "perplexity", name: "Perplexity Sonar" },
]

export const ensembleModes: { id: EnsembleMode; name: string; description: string; minModels: number }[] = [
  { id: "standard", name: "Standard Summarisation", description: "All models respond, one synthesises a unified answer.", minModels: 2 },
  { id: "majority", name: "Majority Voting", description: "Favours the majority position across responses.", minModels: 2 },
  { id: "elo", name: "ELO Ranked", description: "Pairwise ranking with Top N synthesis.", minModels: 3 },
  { id: "council", name: "Council Debate", description: "Multi-round debate with critique and rebuttal.", minModels: 3 },
]

export const presets = [
  { id: "research", name: "Research Synthesis", models: ["gpt-4o", "claude-3.5-sonnet", "gemini-2.0-flash"] },
  { id: "rapid", name: "Rapid Drafting", models: ["gpt-4o-mini", "gemini-2.0-flash"] },
]

/* ---- Response / result types ---- */

export interface ModelResponse {
  modelId: string
  modelName: string
  provider: Provider
  content: string
  responseTime: string
}

export interface AgreementPair {
  a: string
  b: string
  pct: number
  conf: number
}

export interface AgreementData {
  overall: number
  label: string
  pairs: AgreementPair[]
  avgConfidence: number
}

export interface StandardResult {
  type: "standard"
  responses: ModelResponse[]
  synthesis: string
  synthesizedBy: string
  agreement: AgreementData
}

export interface CouncilRound {
  roundNumber: number
  label: string
  responses: ModelResponse[]
}

export interface CouncilResult {
  type: "council"
  rounds: CouncilRound[]
  finalSynthesis: string
  synthesizedBy: string
  agreement: AgreementData
}

export interface MajorityResult {
  type: "majority"
  responses: ModelResponse[]
  votes: Record<string, string>
  majorityPosition: string
  voteTally: Record<string, number>
  agreement: AgreementData
}

export interface EloRanking {
  modelId: string
  modelName: string
  eloScore: number
  rank: number
}

export interface EloResult {
  type: "elo"
  responses: ModelResponse[]
  rankings: EloRanking[]
  topNSynthesis: string
  synthesizedBy: string
  agreement: AgreementData
}

export type TurnResult = StandardResult | CouncilResult | MajorityResult | EloResult

export interface EnsembleConfig {
  selectedModels: string[]
  leadModel: string
  mode: EnsembleMode
}

export interface ChatTurn {
  id: string
  userMessage: string
  config: EnsembleConfig
  result: TurnResult
}

/* ---- Seed data ---- */

const standardAgreement: AgreementData = {
  overall: 78,
  label: "Medium Agreement",
  pairs: [
    { a: "GPT-4o", b: "Claude 3.5 Sonnet", pct: 82, conf: 93 },
    { a: "GPT-4o", b: "Gemini 2.0 Flash", pct: 76, conf: 89 },
    { a: "Claude 3.5 Sonnet", b: "Gemini 2.0 Flash", pct: 74, conf: 91 },
  ],
  avgConfidence: 91,
}

const councilAgreement: AgreementData = {
  overall: 85,
  label: "High Agreement",
  pairs: [
    { a: "GPT-4o", b: "Claude 3.5 Sonnet", pct: 88, conf: 95 },
    { a: "GPT-4o", b: "Gemini 2.0 Flash", pct: 82, conf: 90 },
    { a: "Claude 3.5 Sonnet", b: "Gemini 2.0 Flash", pct: 84, conf: 92 },
  ],
  avgConfidence: 92,
}

const majorityAgreement: AgreementData = {
  overall: 67,
  label: "Moderate Agreement",
  pairs: [
    { a: "GPT-4o", b: "Claude 3.5 Sonnet", pct: 72, conf: 88 },
    { a: "GPT-4o", b: "Gemini 2.0 Flash", pct: 65, conf: 84 },
    { a: "Claude 3.5 Sonnet", b: "Gemini 2.0 Flash", pct: 63, conf: 86 },
  ],
  avgConfidence: 86,
}

const eloAgreement: AgreementData = {
  overall: 71,
  label: "Moderate Agreement",
  pairs: [
    { a: "GPT-4o", b: "Claude 3.5 Sonnet", pct: 79, conf: 92 },
    { a: "GPT-4o", b: "Gemini 2.0 Flash", pct: 68, conf: 87 },
    { a: "Claude 3.5 Sonnet", b: "Gemini 2.0 Flash", pct: 66, conf: 89 },
  ],
  avgConfidence: 89,
}

export const SEED_TURNS: ChatTurn[] = [
  {
    id: "seed-standard",
    userMessage: "Summarize the key tradeoffs between building with a single LLM and an ensemble of LLMs.",
    config: { selectedModels: ["gpt-4o", "claude-3.5-sonnet", "gemini-2.0-flash"], leadModel: "gpt-4o", mode: "standard" },
    result: {
      type: "standard",
      responses: [
        { modelId: "gpt-4o", modelName: "GPT-4o", provider: "openai", responseTime: "1242ms", content: "A single model is simpler and cheaper to orchestrate, but it concentrates failure modes. Ensembles improve robustness and perspective diversity at the cost of latency, complexity, and coordination overhead." },
        { modelId: "claude-3.5-sonnet", modelName: "Claude 3.5 Sonnet", provider: "anthropic", responseTime: "1587ms", content: "Single-model systems offer predictability and lower costs. Ensemble approaches reduce hallucination risk through cross-validation and provide multiple perspectives, but require careful orchestration of model interactions." },
        { modelId: "gemini-2.0-flash", modelName: "Gemini 2.0 Flash", provider: "google", responseTime: "932ms", content: "Single-model systems are easier to debug and deploy. Ensembles can improve quality and reduce hallucination risk through disagreement analysis, but they require stronger observability and budget controls." },
      ],
      synthesis: "Single-model setups optimize for speed and simplicity, while ensembles optimize for resilience and answer quality. The practical decision usually comes down to whether your product values deterministic throughput or decision confidence under uncertainty.",
      synthesizedBy: "GPT-4o",
      agreement: standardAgreement,
    },
  },
  {
    id: "seed-council",
    userMessage: "Should startups adopt microservices from day one, or start monolithic?",
    config: { selectedModels: ["gpt-4o", "claude-3.5-sonnet", "gemini-2.0-flash"], leadModel: "gpt-4o", mode: "council" },
    result: {
      type: "council",
      rounds: [
        {
          roundNumber: 1,
          label: "Initial Responses",
          responses: [
            { modelId: "gpt-4o", modelName: "GPT-4o", provider: "openai", responseTime: "1180ms", content: "Start monolithic. Premature decomposition creates distributed-system problems before you understand your domain boundaries. Extract services only when you have clear scaling or team-boundary reasons." },
            { modelId: "claude-3.5-sonnet", modelName: "Claude 3.5 Sonnet", provider: "anthropic", responseTime: "1340ms", content: "Monolith first is the pragmatic choice for most startups. Your domain model will change rapidly in early stages, and microservices make those pivots expensive. Focus on clean module boundaries within the monolith." },
            { modelId: "gemini-2.0-flash", modelName: "Gemini 2.0 Flash", provider: "google", responseTime: "890ms", content: "Generally monolith-first, but with caveats. If your team already has microservices expertise and your product is clearly multi-domain from day one, selective services can work. Most startups, though, should stay monolithic." },
          ],
        },
        {
          roundNumber: 2,
          label: "Critiques",
          responses: [
            { modelId: "gpt-4o", modelName: "GPT-4o", provider: "openai", responseTime: "1050ms", content: "Gemini raises a good point about prior expertise, but I'd counter that even experienced teams underestimate the ops burden of microservices in a resource-constrained startup. The cost isn't just technical — it's cognitive." },
            { modelId: "claude-3.5-sonnet", modelName: "Claude 3.5 Sonnet", provider: "anthropic", responseTime: "1210ms", content: "I agree with both perspectives but want to emphasize the 'modular monolith' pattern as a middle ground. You get clean boundaries without distributed-system complexity. This wasn't clearly distinguished in the initial responses." },
          ],
        },
        {
          roundNumber: 3,
          label: "Rebuttals",
          responses: [
            { modelId: "gpt-4o", modelName: "GPT-4o", provider: "openai", responseTime: "980ms", content: "Claude's modular monolith suggestion is strong. The key insight is that good architecture is about boundaries, not deployment topology. You can always extract a service later if your module boundaries are clean." },
            { modelId: "gemini-2.0-flash", modelName: "Gemini 2.0 Flash", provider: "google", responseTime: "820ms", content: "Agreed on modular monolith as the consensus recommendation. I'd add that the decision point for extraction should be data-driven: extract when a module's scaling needs diverge from the rest of the system." },
          ],
        },
      ],
      finalSynthesis: "The council strongly agrees: start with a modular monolith. This gives you clean domain boundaries without distributed-system complexity. Extract services later when you have data-driven reasons — divergent scaling needs, team autonomy requirements, or deployment independence. The key insight: good architecture is about boundaries, not deployment topology.",
      synthesizedBy: "GPT-4o",
      agreement: councilAgreement,
    },
  },
  {
    id: "seed-majority",
    userMessage: "Is TypeScript worth the overhead for a small 3-person team building a prototype?",
    config: { selectedModels: ["gpt-4o", "claude-3.5-sonnet", "gemini-2.0-flash"], leadModel: "gpt-4o", mode: "majority" },
    result: {
      type: "majority",
      responses: [
        { modelId: "gpt-4o", modelName: "GPT-4o", provider: "openai", responseTime: "1100ms", content: "Yes, TypeScript is worth it even for prototypes. Modern tooling makes the setup cost minimal, and the type safety catches bugs early. The 'overhead' argument was valid in 2018, but today's TS DX is excellent." },
        { modelId: "claude-3.5-sonnet", modelName: "Claude 3.5 Sonnet", provider: "anthropic", responseTime: "1420ms", content: "Yes, but with a pragmatic approach. Use TypeScript with relaxed settings initially (allow `any` in prototyping code). Tighten the rules as the codebase matures. The IDE support alone justifies the switch." },
        { modelId: "gemini-2.0-flash", modelName: "Gemini 2.0 Flash", provider: "google", responseTime: "870ms", content: "It depends on the team's experience. If all three developers are comfortable with TypeScript, absolutely yes. If they'd need to learn it, the prototype phase isn't the time — use JS and migrate later." },
      ],
      votes: { "gpt-4o": "Yes", "claude-3.5-sonnet": "Yes", "gemini-2.0-flash": "Depends" },
      majorityPosition: "Yes",
      voteTally: { Yes: 2, Depends: 1 },
      agreement: majorityAgreement,
    },
  },
  {
    id: "seed-elo",
    userMessage: "What's the best approach to implement real-time collaboration like Google Docs?",
    config: { selectedModels: ["gpt-4o", "claude-3.5-sonnet", "gemini-2.0-flash"], leadModel: "gpt-4o", mode: "elo" },
    result: {
      type: "elo",
      responses: [
        { modelId: "gpt-4o", modelName: "GPT-4o", provider: "openai", responseTime: "1350ms", content: "Use CRDTs (Conflict-free Replicated Data Types) like Yjs or Automerge. They handle concurrent edits without a central server for conflict resolution. Pair with WebSockets for transport and you get a robust real-time system." },
        { modelId: "claude-3.5-sonnet", modelName: "Claude 3.5 Sonnet", provider: "anthropic", responseTime: "1580ms", content: "The choice is between OT (Operational Transformation) and CRDTs. OT is battle-tested (Google Docs uses it) but complex to implement. CRDTs are simpler conceptually but can have higher memory overhead. For new projects, CRDTs with Yjs are the pragmatic choice." },
        { modelId: "gemini-2.0-flash", modelName: "Gemini 2.0 Flash", provider: "google", responseTime: "920ms", content: "Start with a managed solution like Liveblocks or Convex to validate your UX. Roll your own CRDT layer only if you need fine-grained control. The collaboration protocol is the easy part — cursor presence, undo/redo, and offline support are where the real complexity lives." },
      ],
      rankings: [
        { modelId: "claude-3.5-sonnet", modelName: "Claude 3.5 Sonnet", eloScore: 1580, rank: 1 },
        { modelId: "gpt-4o", modelName: "GPT-4o", eloScore: 1520, rank: 2 },
        { modelId: "gemini-2.0-flash", modelName: "Gemini 2.0 Flash", eloScore: 1470, rank: 3 },
      ],
      topNSynthesis: "The top-ranked responses converge on CRDTs as the modern approach to real-time collaboration. Claude 3.5 Sonnet's comprehensive comparison of OT vs CRDTs, combined with GPT-4o's specific library recommendations (Yjs, Automerge), provides the clearest implementation path. Start with Yjs + WebSockets for the core, but don't underestimate the UX challenges around presence, undo/redo, and offline support.",
      synthesizedBy: "GPT-4o",
      agreement: eloAgreement,
    },
  },
]
