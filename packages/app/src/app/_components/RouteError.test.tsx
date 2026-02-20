import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import RouteError from "./RouteError";

const { captureException } = vi.hoisted(() => ({
  captureException: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => ({
  captureException,
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "errors.routeError.title": "Something went wrong",
        "errors.routeError.description": "Please try your action again.",
        "errors.routeError.tryAgain": "Try Again",
      };
      return translations[key] ?? key;
    },
  }),
}));

describe("RouteError", () => {
  const error = new Error("Route crash");

  beforeEach(() => {
    captureException.mockClear();
  });

  it("renders translated content", () => {
    render(<RouteError error={error} reset={vi.fn()} />);

    expect(screen.getByTestId("route-error-boundary")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Something went wrong" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Please try your action again."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Try Again" }),
    ).toBeInTheDocument();
  });

  it("captures the error with Sentry on mount", () => {
    render(<RouteError error={error} reset={vi.fn()} />);

    expect(captureException).toHaveBeenCalledWith(error);
  });

  it("calls reset when Try Again is clicked", async () => {
    const user = userEvent.setup();
    const reset = vi.fn();
    render(<RouteError error={error} reset={reset} />);

    await user.click(screen.getByRole("button", { name: "Try Again" }));

    expect(reset).toHaveBeenCalledTimes(1);
  });
});
