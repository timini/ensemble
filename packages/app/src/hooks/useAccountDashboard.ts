import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import type { AccountDashboardProps } from "@/components/organisms/AccountDashboard";
import type { AccountListStatus } from "@/components/molecules/AccountSection";
import { api } from "~/trpc/react";
import { useAuth } from "~/app/_components/AuthProvider";
import { formatCredits, formatPackPrice } from "~/lib/credits";
import {
  balanceState,
  toModelUsageItems,
  toPurchaseItems,
  toRunItems,
} from "~/lib/accountView";
import { useCreditCheckout } from "./useCreditCheckout";

/** Period of usage by model, in days. */
export const USAGE_DAYS = 30;
const PAGE_SIZE = 10;

function listStatus(q: {
  isPending: boolean;
  isError: boolean;
}): AccountListStatus {
  if (q.isError) return "error";
  return q.isPending ? "loading" : "ready";
}

/**
 * The /account dashboard (FR-041) from the credits router: balance, packs,
 * usage by model over 30 days, and purchases and runs ten at a time with
 * Show more. Queries run only while signed in and reload when the user
 * changes. Values come back formatted for AccountDashboard.
 */
export function useAccountDashboard(): Omit<AccountDashboardProps, "email"> {
  const { i18n } = useTranslation("common");
  const lang = i18n.language;
  const auth = useAuth();
  const enabled = auth.status === "signedIn";
  const utils = api.useUtils();
  const account = api.credits.account.useQuery(undefined, { enabled });
  const packs = api.credits.packs.useQuery(undefined, { staleTime: Infinity });
  const usage = api.credits.usageByModel.useQuery(
    { days: USAGE_DAYS },
    { enabled },
  );
  const paging = {
    enabled,
    getNextPageParam: (last: { nextCursor: string | null }) =>
      last.nextCursor ?? undefined,
  };
  const purchases = api.credits.purchases.useInfiniteQuery(
    { limit: PAGE_SIZE },
    paging,
  );
  const runs = api.credits.runs.useInfiniteQuery({ limit: PAGE_SIZE }, paging);
  const checkout = useCreditCheckout();

  const uid = auth.user?.uid ?? null;
  useEffect(() => {
    void utils.credits.invalidate();
  }, [uid, utils]);

  const packList = packs.data ?? [];
  const more = (q: typeof runs | typeof purchases) => ({
    hasMore: q.hasNextPage,
    loadingMore: q.isFetchingNextPage,
    onLoadMore: () => void q.fetchNextPage(),
  });

  return {
    balance: account.data
      ? {
          state: balanceState(account.data),
          balance: formatCredits(account.data.balanceMicros, lang),
          packs: packList.map((p) => ({
            id: p.id,
            label: formatPackPrice(p.amountCents, lang),
          })),
          ...checkout,
        }
      : null,
    balanceError: account.isError,
    usage: {
      status: listStatus(usage),
      days: USAGE_DAYS,
      truncated: usage.data?.truncated ?? false,
      items: toModelUsageItems(usage.data?.models ?? [], lang),
    },
    purchases: {
      status: listStatus(purchases),
      items: toPurchaseItems(
        purchases.data?.pages.flatMap((p) => p.items) ?? [],
        packList,
        lang,
      ),
      ...more(purchases),
    },
    runs: {
      status: listStatus(runs),
      items: toRunItems(runs.data?.pages.flatMap((p) => p.items) ?? [], lang),
      ...more(runs),
    },
  };
}
