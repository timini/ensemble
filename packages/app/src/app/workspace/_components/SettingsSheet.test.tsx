import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import "~/lib/i18n";
import { SettingsSheet, type SettingsSheetProps } from "./SettingsSheet";

const statuses = {
  openai: "idle",
  anthropic: "idle",
  google: "idle",
  xai: "idle",
  deepseek: "idle",
  perplexity: "idle",
} as const;

function setup(overrides: Partial<SettingsSheetProps> = {}) {
  const props: SettingsSheetProps = {
    open: true,
    onOpenChange: vi.fn(),
    keys: {
      items: [],
      validKeyCount: 0,
      hydratedStatuses: statuses,
      webCryptoSupported: true,
      canRun: false,
      onKeyChange: vi.fn(),
      onToggleShow: vi.fn(),
    } as unknown as SettingsSheetProps["keys"],
    endpoints: {
      items: [],
      presets: [],
      onAdd: vi.fn(),
      onChange: vi.fn(),
      onRemove: vi.fn(),
    } as unknown as SettingsSheetProps["endpoints"],
    ollamaOffer: null,
    onClearData: vi.fn(),
    ...overrides,
  };
  render(<SettingsSheet {...props} />);
  return props;
}

describe("SettingsSheet", () => {
  it("asks before clearing the data, then clears it", () => {
    const props = setup();
    expect(screen.queryByTestId("clear-data-confirm")).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("clear-data-button"));
    expect(screen.getByTestId("clear-data-confirm")).toHaveTextContent(
      "This removes every key, endpoint, preset and the last run from this browser.",
    );
    expect(props.onClearData).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId("clear-data-confirm-button"));
    expect(props.onClearData).toHaveBeenCalledTimes(1);
  });

  it("cancels clearing without clearing anything", () => {
    const props = setup();
    fireEvent.click(screen.getByTestId("clear-data-button"));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByTestId("clear-data-confirm")).not.toBeInTheDocument();
    expect(screen.getByTestId("clear-data-button")).toBeInTheDocument();
    expect(props.onClearData).not.toHaveBeenCalled();
  });

  it("shows the security note and no Web Crypto warning in a current browser", () => {
    setup();
    expect(screen.getByTestId("settings-security-note")).toBeInTheDocument();
    expect(
      screen.queryByText("This browser cannot encrypt keys"),
    ).not.toBeInTheDocument();
  });

  it("warns when the browser cannot encrypt keys", () => {
    setup({
      keys: {
        items: [],
        validKeyCount: 0,
        hydratedStatuses: statuses,
        webCryptoSupported: false,
        canRun: false,
        onKeyChange: vi.fn(),
        onToggleShow: vi.fn(),
      } as unknown as SettingsSheetProps["keys"],
    });
    expect(
      screen.getByText("This browser cannot encrypt keys"),
    ).toBeInTheDocument();
  });
});
