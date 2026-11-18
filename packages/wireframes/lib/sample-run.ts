// Placeholder data for the wireframes. Nothing here calls a provider, and none
// of it comes from a real run: the answers, scores, timings and costs are
// illustrative. The app replaces this with a real recorded run (ROADMAP M4).

export type AgreementLevel = "high" | "mixed" | "low"

export interface SampleModel {
  id: string
  name: string
  provider: string
  initials: string
}

export interface SampleAnswer {
  model: SampleModel
  seconds: number
  cost: string
  text: string[]
}

export const models: SampleModel[] = [
  { id: "gpt-6-astra", name: "GPT-6 Astra", provider: "OpenAI", initials: "G" },
  { id: "claude-opus-5-5", name: "Claude Opus 5.5", provider: "Anthropic", initials: "C" },
  { id: "gemini-4-carbon", name: "Gemini 4 Carbon", provider: "Google", initials: "Ge" },
]

export const prompt =
  "At what temperature does water boil at the summit of Everest, and why is it lower than at sea level?"

export const answers: SampleAnswer[] = [
  {
    model: models[0],
    seconds: 3.1,
    cost: "$0.0021",
    text: [
      "About 70 °C. Air pressure at the summit is roughly 34 kPa, a third of sea level pressure.",
      "Water boils when its vapour pressure matches the pressure around it. With less air pressing down, that happens at a lower temperature.",
    ],
  },
  {
    model: models[1],
    seconds: 4.4,
    cost: "$0.0063",
    text: [
      "Roughly 68 to 71 °C, depending on the weather that day.",
      "Boiling starts when the vapour pressure of the water equals the surrounding air pressure. At 8,849 m the air pressure is about a third of what it is at sea level, so far less heat is needed.",
    ],
  },
  {
    model: models[2],
    seconds: 2.7,
    cost: "$0.0018",
    text: [
      "Around 71 °C.",
      "Lower atmospheric pressure means water molecules escape into vapour more easily, so the boiling point drops by about 1 °C for every 300 m of altitude.",
    ],
  },
]

export const consensus = [
  "Water boils at about 70 °C on the summit of Everest (68 to 71 °C, depending on the weather).",
  "Boiling happens when the water's vapour pressure equals the air pressure around it. At 8,849 m the air pressure is about a third of sea level pressure (around 34 kPa), so the water reaches that point at a much lower temperature.",
]

export const agreement = {
  score: 0.86,
  level: "high" as AgreementLevel,
  pairs: [
    { a: "GPT-6 Astra", b: "Claude Opus 5.5", score: 0.91 },
    { a: "GPT-6 Astra", b: "Gemini 4 Carbon", score: 0.84 },
    { a: "Claude Opus 5.5", b: "Gemini 4 Carbon", score: 0.83 },
  ],
  embeddings: "text-embedding-3-small",
}

// Calls per run for 3 models: 3 answers, 3 embedding calls for the agreement
// score, plus the method's own calls (see estimateRun in shared-utils).
export const methods = [
  { id: "standard", name: "Standard", detail: "One model merges the answers.", calls: "7 calls", cost: "about $0.01" },
  { id: "majority", name: "Majority", detail: "Votes on short answers, merges the rest.", calls: "7 to 9 calls", cost: "about $0.01" },
  { id: "elo", name: "ELO ranking", detail: "Models judge each other in pairs.", calls: "13 calls", cost: "$0.02 to $0.06" },
  { id: "council", name: "Council", detail: "Critique, rebuttal and a vote. Slowest.", calls: "25 calls", cost: "$0.04 to $0.20" },
]

export const presets = [
  { name: "Three frontier models", count: 3 },
  { name: "Local only (Ollama)", count: 3 },
  { name: "Cheap and fast", count: 4 },
]

export const history = [
  { group: "Today", items: [
    { prompt: "Boiling point of water on Everest", level: "high" as AgreementLevel, when: "2 min" },
    { prompt: "Is a 30-year fixed mortgage better than a tracker in 2027?", level: "low" as AgreementLevel, when: "1 h" },
  ] },
  { group: "This week", items: [
    { prompt: "Does vitamin D help with winter colds?", level: "mixed" as AgreementLevel, when: "Mon" },
    { prompt: "Postgres vs SQLite for a single-user desktop app", level: "high" as AgreementLevel, when: "Sun" },
    { prompt: "Translate the lease clause about break dates", level: "mixed" as AgreementLevel, when: "Sat" },
  ] },
]

export const levelLabel: Record<AgreementLevel, string> = {
  high: "High agreement",
  mixed: "Mixed agreement",
  low: "Low agreement",
}

// A shared link for the sample run. Links are public to anyone who has them
// and expire 30 days after they are made.
export const sharedRun = {
  id: "k3v9q2tx",
  url: "https://ensemble.example.app/s/k3v9q2tx",
  created: "18 November 2026",
  expires: "18 December 2026",
}
