import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import type { ReactNode } from "react";
import { useResetCreditsOnUserChange } from "../useResetCreditsOnUserChange";

const BALANCE_KEY = [["credits", "account"], { type: "query" }];
const OTHER_KEY = [["provider", "listTextModels"], { type: "query" }];

function setup() {
  const client = new QueryClient();
  client.setQueryData(BALANCE_KEY, { balanceMicros: 5 });
  client.setQueryData(OTHER_KEY, ["model"]);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, wrapper };
}

describe("useResetCreditsOnUserChange", () => {
  it("keeps cached credits while the same user stays signed in", () => {
    const { client, wrapper } = setup();
    const { rerender } = renderHook(
      ({ uid }) => useResetCreditsOnUserChange(uid),
      { wrapper, initialProps: { uid: "a" as string | null } },
    );
    rerender({ uid: "a" });
    expect(client.getQueryData(BALANCE_KEY)).toEqual({ balanceMicros: 5 });
  });

  it("drops one user's credits when another signs in or they sign out", () => {
    const { client, wrapper } = setup();
    const { rerender } = renderHook(
      ({ uid }) => useResetCreditsOnUserChange(uid),
      { wrapper, initialProps: { uid: "a" as string | null } },
    );
    rerender({ uid: null });
    expect(client.getQueryData(BALANCE_KEY)).toBeUndefined();
    expect(client.getQueryData(OTHER_KEY)).toEqual(["model"]);
  });
});
