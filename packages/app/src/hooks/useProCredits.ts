import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { keepPreviousData } from "@tanstack/react-query";
import { useShallow } from "zustand/react/shallow";
import type { CreditNoticeProps } from "@/components/molecules/CreditNotice";
import { api } from "~/trpc/react";
import { useStore } from "~/store";
import { useAuth } from "~/app/_components/AuthProvider";
import { formatCredits, formatPackPrice } from "~/lib/credits";
import { useCreditCheckout } from "./useCreditCheckout";
import { proCreditState } from "~/lib/proCredits";
import { proRunInput } from "~/lib/proMode";
import { getProRuntime } from "~/providers/pro/runtime";
import { isProEnabled } from "~/lib/pro/proEnabled";

/** `value`, updated only after it has been still for `ms`. */
function useDebounced<T>(value: T, ms: number): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return settled;
}

/**
 * Credits in Pro mode: the balance, the quote of the run in the composer,
 * why Ask is blocked (FR-036), the notice under the composer (FR-038) and
 * buying a pack through Stripe Checkout. The run is quoted only in Pro
 * while signed in. The balance and packs also load for a signed-in user
 * still in Free mode, so the Pro panel of onboarding and settings is not
 * empty. The balance refreshes after each reservation and settlement.
 */
export function useProCredits(prompt: string) {
  const { t, i18n } = useTranslation("common");
  const auth = useAuth();
  const pro = useStore((s) => s.mode === "pro");
  const signedIn = auth.status === "signedIn";
  const enabled = pro && signedIn;
  const offersPro = pro || isProEnabled();
  const utils = api.useUtils();
  const account = api.credits.account.useQuery(undefined, {
    enabled: signedIn && offersPro,
  });
  const packs = api.credits.packs.useQuery(undefined, {
    enabled: pro || (signedIn && offersPro),
    staleTime: Infinity,
  });
  const runState = useStore(
    useShallow((s) => ({
      selectedModels: s.selectedModels,
      manualResponses: s.manualResponses,
      consensusMethod: s.consensusMethod,
      summarizerModel: s.summarizerModel,
      eloTopN: s.eloTopN,
      embeddingsProvider: s.embeddingsProvider,
    })),
  );
  const settledPrompt = useDebounced(prompt, 400);
  const quoteInput = useMemo(
    () => proRunInput(runState, settledPrompt),
    [runState, settledPrompt],
  );
  const quote = api.credits.quote.useQuery(quoteInput, {
    enabled: enabled && quoteInput.models.length > 0,
    placeholderData: keepPreviousData,
  });

  const uid = auth.user?.uid ?? null;
  useEffect(() => {
    void utils.credits.invalidate();
  }, [uid, utils]);
  useEffect(() => {
    if (!pro) return;
    return getProRuntime().session.onChange(
      () => void utils.credits.invalidate(),
    );
  }, [pro, utils]);

  const checkout = useCreditCheckout();

  const lang = i18n.language;
  const money = (micros: number) => formatCredits(micros, lang);
  const packOptions = (packs.data ?? []).map((p) => ({
    id: p.id,
    label: formatPackPrice(p.amountCents, lang),
  }));
  const buying = { packs: packOptions, ...checkout };
  const state = proCreditState({
    auth: auth.status,
    account: account.data,
    accountError: account.isError,
    quote: quote.data,
  });

  const n = state.notice;
  const notice: CreditNoticeProps | null = !n
    ? null
    : n.variant === "error"
      ? { variant: "error", packs: [] }
      : {
          variant: n.variant,
          balance: money(n.balanceMicros),
          ...(n.variant === "insufficient"
            ? { required: money(n.requiredMicros) }
            : {}),
          ...(n.variant === "unpriced"
            ? { unpricedModels: n.unpricedModels }
            : {}),
          ...buying,
        };
  const balance: CreditNoticeProps | null = account.data
    ? {
        variant: account.data.balanceMicros < 0 ? "negative" : "balance",
        balance: money(account.data.balanceMicros),
        ...buying,
      }
    : null;

  return {
    /** True in Pro mode. */
    pro,
    blockedReason:
      pro && state.block
        ? t(`pages.workspace.pro.block.${state.block}`)
        : undefined,
    /** Notice under the composer, or null. */
    notice: pro ? notice : null,
    /** The balance with buy buttons, for the account menu and settings. */
    balance,
  };
}
