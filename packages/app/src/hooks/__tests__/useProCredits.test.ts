import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "~/lib/i18n";

const m = vi.hoisted(() => ({
  auth: {
    status: "signedIn" as string,
    user: { uid: "u1" } as { uid: string } | null,
  },
  account: { data: undefined as unknown, isError: false },
  quote: { data: undefined as unknown },
  packs: { data: [{ id: "usd-5", amountCents: 500, creditMicros: 5_000_000 }] },
  invalidate: vi.fn(),
  queries: [] as { name: string; opts: { enabled?: boolean } }[],
  onChange: vi.fn((_cb: () => void) => () => undefined),
  startCheckout: vi.fn(),
}));

vi.mock("~/app/_components/AuthProvider", () => ({ useAuth: () => m.auth }));
vi.mock("~/lib/pro/proEnabled", () => ({ isProEnabled: () => true }));
vi.mock("~/providers/pro/runtime", () => ({
  getProRuntime: () => ({ session: { onChange: m.onChange } }),
}));
vi.mock("~/lib/credits", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  startCheckout: m.startCheckout,
}));
vi.mock("~/trpc/react", () => {
  const query = (name: "account" | "quote" | "packs") => ({
    useQuery: (_input: unknown, opts: { enabled?: boolean }) => {
      m.queries.push({ name, opts });
      return opts.enabled === false
        ? { data: undefined, isError: false }
        : m[name];
    },
  });
  return {
    api: {
      useUtils: () => ({ credits: { invalidate: m.invalidate } }),
      credits: {
        account: query("account"),
        quote: query("quote"),
        packs: query("packs"),
      },
    },
  };
});

import { useStore } from "~/store";
import { useProCredits } from "../useProCredits";

describe("useProCredits", () => {
  beforeEach(() => {
    m.auth = { status: "signedIn", user: { uid: "u1" } };
    m.account = {
      data: { balanceMicros: 5_000_000, lowBalance: false },
      isError: false,
    };
    m.quote = { data: undefined };
    m.queries = [];
    m.startCheckout.mockReset();
    useStore.setState({
      mode: "pro",
      selectedModels: [{ id: "a", provider: "openai", model: "gpt-5-mini" }],
    } as never);
  });

  it("does nothing in Free mode while signed out", () => {
    m.auth = { status: "signedOut", user: null };
    useStore.setState({ mode: "free" } as never);
    const { result } = renderHook(() => useProCredits("Q"));
    expect(result.current).toMatchObject({
      pro: false,
      blockedReason: undefined,
      notice: null,
    });
    expect(m.queries.every((q) => q.opts.enabled === false)).toBe(true);
  });

  it("loads the balance for a signed-in user still in Free mode, for the Pro panel", () => {
    useStore.setState({ mode: "free" } as never);
    const { result } = renderHook(() => useProCredits("Q"));
    expect(result.current).toMatchObject({
      pro: false,
      blockedReason: undefined,
      notice: null,
      balance: { variant: "balance", balance: "$5.00" },
    });
    // The run is not priced outside Pro.
    expect(m.queries.find((q) => q.name === "quote")?.opts.enabled).toBe(false);
  });

  it("blocks Ask until the user signs in", () => {
    m.auth = { status: "signedOut", user: null };
    const { result } = renderHook(() => useProCredits("Q"));
    expect(result.current.blockedReason).toMatch(/Sign in/);
  });

  it("shows the balance with the packs, and buys a pack through Checkout", async () => {
    const assign = vi.fn();
    vi.stubGlobal("location", { ...window.location, assign });
    m.startCheckout.mockResolvedValue("https://checkout.stripe.com/s");
    const { result } = renderHook(() => useProCredits("Q"));
    expect(result.current.balance).toMatchObject({
      variant: "balance",
      balance: "$5.00",
      packs: [{ id: "usd-5", label: "$5" }],
    });
    await act(async () => result.current.balance?.onBuy?.("usd-5"));
    expect(m.startCheckout).toHaveBeenCalledWith("usd-5");
    expect(assign).toHaveBeenCalledWith("https://checkout.stripe.com/s");
    vi.unstubAllGlobals();
  });

  it("reports a checkout that could not start", async () => {
    m.startCheckout.mockRejectedValue(new Error("Payments are not set up"));
    const { result } = renderHook(() => useProCredits("Q"));
    await act(async () => {
      result.current.balance?.onBuy?.("usd-5");
      await Promise.resolve();
    });
    expect(result.current.balance).toMatchObject({
      buyError: true,
      pendingPackId: null,
    });
  });

  it("blocks a run the balance cannot cover and says how much it needs", () => {
    m.quote = {
      data: {
        status: "priced",
        requiredMicros: 2_000_000,
        balanceMicros: 1_000_000,
        canAfford: false,
        lowBalance: false,
      },
    };
    const { result } = renderHook(() => useProCredits("Q"));
    expect(result.current.blockedReason).toMatch(/Not enough credits/);
    expect(result.current.notice).toMatchObject({
      variant: "insufficient",
      required: "$2.00",
      balance: "$1.00",
    });
  });

  it("names models Pro cannot price", () => {
    m.quote = {
      data: { status: "unpriced", models: ["openai/x"], balanceMicros: 1 },
    };
    const { result } = renderHook(() => useProCredits("Q"));
    expect(result.current.notice).toMatchObject({
      variant: "unpriced",
      unpricedModels: ["openai/x"],
    });
  });

  it("reports a balance that failed to load", () => {
    m.account = { data: undefined, isError: true };
    const { result } = renderHook(() => useProCredits("Q"));
    expect(result.current.notice).toEqual({ variant: "error", packs: [] });
  });

  it("refreshes the balance after each reservation and settlement", () => {
    renderHook(() => useProCredits("Q"));
    const listener = m.onChange.mock.calls.at(-1)![0];
    m.invalidate.mockClear();
    listener();
    expect(m.invalidate).toHaveBeenCalled();
  });
});
