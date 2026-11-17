import { describe, expect, it } from "vitest";
import {
  WORKSPACE_PATH,
  legacyRouteTarget,
  readWorkspacePanel,
  workspaceHref,
} from "../workspaceRoutes";

describe("workspaceHref", () => {
  it("is the workspace alone without a panel", () => {
    expect(workspaceHref()).toBe(WORKSPACE_PATH);
    expect(WORKSPACE_PATH).toBe("/workspace");
  });

  it("names the panel to open", () => {
    expect(workspaceHref("settings")).toBe("/workspace?panel=settings");
  });

  it("keeps other query parameters, such as the mock error scenarios", () => {
    expect(
      workspaceHref("models", { mockErrors: "gpt-6-luna:401", panel: "x" }),
    ).toBe("/workspace?mockErrors=gpt-6-luna%3A401&panel=models");
  });

  it("keeps repeated parameters and drops empty ones", () => {
    expect(workspaceHref(undefined, { a: ["1", "2"], b: undefined })).toBe(
      "/workspace?a=1&a=2",
    );
  });
});

describe("legacyRouteTarget", () => {
  it("sends each wizard step to the matching part of the workspace", () => {
    expect(legacyRouteTarget("config")).toBe("settings");
    expect(legacyRouteTarget("ensemble")).toBe("models");
    expect(legacyRouteTarget("prompt")).toBe("prompt");
    // The workspace shows the last run by default.
    expect(legacyRouteTarget("review")).toBeUndefined();
  });
});

describe("readWorkspacePanel", () => {
  it("reads a known panel", () => {
    expect(readWorkspacePanel("settings")).toBe("settings");
    expect(readWorkspacePanel("models")).toBe("models");
    expect(readWorkspacePanel("prompt")).toBe("prompt");
  });

  it("ignores unknown or missing panels", () => {
    expect(readWorkspacePanel("nope")).toBeNull();
    expect(readWorkspacePanel(null)).toBeNull();
  });
});
