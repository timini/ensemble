import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "~/lib/i18n";

const auth = vi.hoisted(() => ({
  status: "signedOut" as string,
  user: null as { email: string } | null,
}));
vi.mock("~/app/_components/AuthProvider", () => ({
  useAuth: () => ({
    ...auth,
    pending: false,
    error: null,
    emailSentTo: null,
    confirmEmail: false,
    signInWithGoogle: vi.fn(),
    submitEmail: vi.fn(),
    signOut: vi.fn(),
  }),
}));
vi.mock("~/hooks/useAccountDashboard", () => ({
  useAccountDashboard: () => ({
    balance: {
      state: "ok",
      balance: "$5.00",
      packs: [],
      onBuy: vi.fn(),
    },
    usage: { status: "ready", days: 30, items: [] },
    purchases: { status: "ready", items: [] },
    runs: { status: "ready", items: [] },
  }),
}));

import { AccountScreen } from "./AccountScreen";

describe("AccountScreen", () => {
  beforeEach(() => {
    auth.status = "signedOut";
    auth.user = null;
  });

  it("asks a signed-out visitor to sign in, in the app frame", () => {
    render(<AccountScreen />);
    expect(screen.getByTestId("app-shell")).toBeInTheDocument();
    expect(screen.getByTestId("account-workspace-link")).toHaveAttribute(
      "href",
      "/workspace",
    );
    expect(screen.getByTestId("pro-sign-in")).toBeInTheDocument();
    expect(screen.queryByTestId("account-dashboard")).not.toBeInTheDocument();
  });

  it("explains when sign-in is not set up", () => {
    auth.status = "unavailable";
    render(<AccountScreen />);
    expect(screen.getByTestId("account-page")).toHaveTextContent(
      "Sign-in is not set up on this server",
    );
    expect(screen.queryByTestId("pro-sign-in")).not.toBeInTheDocument();
  });

  it("waits for the stored session", () => {
    auth.status = "loading";
    render(<AccountScreen />);
    expect(screen.getByTestId("account-loading")).toBeInTheDocument();
  });

  it("shows the dashboard once signed in", () => {
    auth.status = "signedIn";
    auth.user = { email: "ada@example.com" };
    render(<AccountScreen />);
    expect(screen.getByTestId("account-dashboard-user")).toHaveTextContent(
      "ada@example.com",
    );
    expect(screen.getByTestId("credit-balance-amount")).toHaveTextContent(
      "$5.00",
    );
  });
});
