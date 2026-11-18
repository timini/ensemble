import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "~/lib/i18n";

const m = vi.hoisted(() => ({
  auth: { status: "signedIn" as string, user: { uid: "u1" } as unknown },
  account: { data: undefined as unknown, isError: false, isPending: false },
  packs: { data: [{ id: "usd-5", amountCents: 500, creditMicros: 5_000_000 }] },
  usage: { data: undefined as unknown, isError: false, isPending: true },
  purchases: {} as Record<string, unknown>,
  runs: {} as Record<string, unknown>,
  enabled: [] as (boolean | undefined)[],
  invalidate: vi.fn(),
  fetchNextPage: vi.fn(),
}));

vi.mock("~/app/_components/AuthProvider", () => ({ useAuth: () => m.auth }));
vi.mock("~/trpc/react", () => {
  const query = (name: "account" | "packs" | "usage") => ({
    useQuery: (_input: unknown, opts?: { enabled?: boolean }) => {
      m.enabled.push(opts?.enabled);
      return m[name];
    },
  });
  const infinite = (name: "purchases" | "runs") => ({
    useInfiniteQuery: (_input: unknown, opts: { enabled?: boolean }) => {
      m.enabled.push(opts.enabled);
      return m[name];
    },
  });
  return {
    api: {
      useUtils: () => ({ credits: { invalidate: m.invalidate } }),
      credits: {
        account: query("account"),
        packs: query("packs"),
        usageByModel: query("usage"),
        purchases: infinite("purchases"),
        runs: infinite("runs"),
      },
    },
  };
});

import { useAccountDashboard } from "../useAccountDashboard";

const page = (items: unknown[], nextCursor: string | null) => ({
  data: { pages: [{ items, nextCursor }] },
  isPending: false,
  isError: false,
  hasNextPage: nextCursor !== null,
  isFetchingNextPage: false,
  fetchNextPage: m.fetchNextPage,
});

describe("useAccountDashboard", () => {
  beforeEach(() => {
    m.auth = { status: "signedIn", user: { uid: "u1" } };
    m.account = {
      data: { balanceMicros: -2_000_000, lowBalance: true },
      isError: false,
      isPending: false,
    };
    m.usage = { data: undefined, isError: false, isPending: true };
    m.purchases = page(
      [
        {
          id: "purchase__cs",
          type: "purchase",
          amountMicros: 5_000_000,
          createdAtMs: 1,
          packId: "usd-5",
        },
      ],
      "purchase__cs",
    );
    m.runs = page([], null);
    m.enabled = [];
    m.fetchNextPage.mockReset();
  });

  it("formats the balance, its state and the packs", () => {
    const { result } = renderHook(() => useAccountDashboard());
    expect(result.current.balance).toMatchObject({
      state: "negative",
      balance: "-$2.00",
      packs: [{ id: "usd-5", label: "$5" }],
    });
  });

  it("gives each list its status and paging", () => {
    const { result } = renderHook(() => useAccountDashboard());
    expect(result.current.usage.status).toBe("loading");
    expect(result.current.purchases).toMatchObject({
      status: "ready",
      hasMore: true,
      items: [{ kind: "purchase", pack: "$5", amount: "+$5.00" }],
    });
    act(() => result.current.purchases.onLoadMore?.());
    expect(m.fetchNextPage).toHaveBeenCalled();
    expect(result.current.runs).toMatchObject({ status: "ready", items: [] });
  });

  it("keeps loaded pages when the next page fails", () => {
    m.runs = { ...page([], "run-9"), isError: true };
    const { result } = renderHook(() => useAccountDashboard());
    expect(result.current.runs.status).toBe("ready");
    m.runs = { data: undefined, isPending: false, isError: true };
    const { result: failed } = renderHook(() => useAccountDashboard());
    expect(failed.current.runs.status).toBe("error");
  });

  it("asks for nothing personal while signed out", () => {
    m.auth = { status: "signedOut", user: null };
    renderHook(() => useAccountDashboard());
    // packs is public; the other four wait for sign-in.
    expect(m.enabled.filter((e) => e === false)).toHaveLength(4);
  });
});
