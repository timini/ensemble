import type { CreditBalanceState } from "@/components/molecules/CreditBalanceCard";
import type { ModelUsageItem } from "@/components/molecules/ModelUsageList";
import type { PurchaseHistoryItem } from "@/components/molecules/PurchaseHistory";
import type { RunHistoryItem } from "@/components/molecules/RunHistory";
import { FALLBACK_MODELS } from "./models";
import { formatCredits, formatPackPrice } from "./credits";

/** credits.purchases items as the client receives them. */
export interface PurchaseEntry {
  id: string;
  type: "purchase" | "reversal" | "grant";
  amountMicros: number;
  createdAtMs: number;
  packId?: string;
  reason?: string;
}

/** credits.runs items. */
export interface RunEntry {
  runId: string;
  createdAtMs: number;
  chargedMicros: number;
  callCount: number;
  inputTokens: number;
  outputTokens: number;
  models: string[];
}

/** credits.usageByModel rows. */
export interface ModelUsageEntry {
  model: string;
  runs: number;
  calls: number;
  inputTokens: number;
  outputTokens: number;
  chargedMicros: number;
}

/** A credit amount with its sign: "+$5.00", "-$5.00". */
export function formatSignedCredits(micros: number, locale: string): string {
  const text = formatCredits(Math.abs(micros), locale);
  return `${micros < 0 ? "-" : "+"}${text}`;
}

/** "950", "182K", "1.5M". */
export function formatTokens(tokens: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    notation: "compact",
    maximumSignificantDigits: 3,
  }).format(tokens);
}

function formatDate(ms: number, locale: string, withTime = false): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    ...(withTime ? { timeStyle: "short" } : {}),
  }).format(new Date(ms));
}

/** Display name of `provider/modelId`: the model list's name, or the id. */
export function modelLabel(model: string): string {
  const slash = model.indexOf("/");
  const provider = model.slice(0, slash);
  const id = model.slice(slash + 1);
  return (
    FALLBACK_MODELS.find((m) => m.provider === provider && m.id === id)?.name ??
    id
  );
}

export function balanceState(account: {
  balanceMicros: number;
  lowBalance: boolean;
}): CreditBalanceState {
  if (account.balanceMicros < 0) return "negative";
  return account.lowBalance ? "low" : "ok";
}

export function toPurchaseItems(
  entries: readonly PurchaseEntry[],
  packs: readonly { id: string; amountCents: number }[],
  locale: string,
): PurchaseHistoryItem[] {
  return entries.map((e) => {
    const pack = packs.find((p) => p.id === e.packId);
    const kind =
      e.type === "reversal"
        ? e.reason === "dispute"
          ? "dispute"
          : "refund"
        : e.type;
    return {
      id: e.id,
      kind,
      ...(pack ? { pack: formatPackPrice(pack.amountCents, locale) } : {}),
      amount: formatSignedCredits(e.amountMicros, locale),
      date: formatDate(e.createdAtMs, locale),
      negative: e.amountMicros < 0,
    };
  });
}

export function toModelUsageItems(
  rows: readonly ModelUsageEntry[],
  locale: string,
): ModelUsageItem[] {
  const total = rows.reduce((sum, r) => sum + r.chargedMicros, 0);
  return rows.map((r) => ({
    id: r.model,
    name: modelLabel(r.model),
    runs: r.runs,
    calls: r.calls,
    tokens: formatTokens(r.inputTokens + r.outputTokens, locale),
    amount: formatCredits(r.chargedMicros, locale),
    share: total > 0 ? r.chargedMicros / total : 0,
  }));
}

export function toRunItems(
  runs: readonly RunEntry[],
  locale: string,
): RunHistoryItem[] {
  return runs.map((r) => ({
    id: r.runId,
    date: formatDate(r.createdAtMs, locale, true),
    models: r.models.map(modelLabel),
    calls: r.callCount,
    amount: formatCredits(r.chargedMicros, locale),
  }));
}
