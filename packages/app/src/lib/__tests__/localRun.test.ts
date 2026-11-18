import { describe, expect, it } from "vitest";
import path from "node:path";
import {
  buildMarker,
  buildMarkerPath,
  buildReason,
  parseLocalRunArgs,
  standalonePaths,
  startupMessage,
} from "../../../scripts/localRun.mjs";

describe("local run", () => {
  it("serves on localhost:3000 by default, bound to loopback only", () => {
    expect(parseLocalRunArgs([], {})).toEqual({
      port: 3000,
      host: "127.0.0.1",
      rebuild: false,
      help: false,
    });
  });

  it("reads the port from --port, --port=, or PORT", () => {
    expect(parseLocalRunArgs(["--port", "4000"], {}).port).toBe(4000);
    expect(parseLocalRunArgs(["--port=4100"], {}).port).toBe(4100);
    expect(parseLocalRunArgs([], { PORT: "4200" }).port).toBe(4200);
  });

  it("accepts --rebuild and --help", () => {
    expect(parseLocalRunArgs(["--rebuild"], {}).rebuild).toBe(true);
    expect(parseLocalRunArgs(["-h"], {}).help).toBe(true);
  });

  it("rejects a bad port and unknown options", () => {
    expect(() => parseLocalRunArgs(["--port", "x"], {})).toThrow(/port/i);
    expect(() => parseLocalRunArgs(["--port", "70000"], {})).toThrow(/port/i);
    expect(() => parseLocalRunArgs(["--nope"], {})).toThrow(/--nope/);
  });

  it("finds the standalone server of the app build", () => {
    const paths = standalonePaths("/repo/packages/app");
    expect(paths.server).toBe(
      path.join("/repo/packages/app/.next/standalone/packages/app/server.js"),
    );
    expect(paths.staticTarget).toBe(
      path.join(
        "/repo/packages/app/.next/standalone/packages/app/.next/static",
      ),
    );
    expect(paths.publicTarget).toBe(
      path.join("/repo/packages/app/.next/standalone/packages/app/public"),
    );
  });

  it("tells the user where the app runs and that Ollama needs no extra setting", () => {
    const message = startupMessage(3000);
    expect(message).toContain("http://localhost:3000");
    expect(message).toContain("OLLAMA_ORIGINS");
    expect(message).not.toMatch(/[–—]/);
  });

  it("keeps a marker next to the standalone build it made", () => {
    expect(buildMarkerPath("/repo/packages/app")).toBe(
      path.join("/repo/packages/app", ".next/standalone/.ensemble-local.json"),
    );
    expect(buildMarker("abc123")).toEqual({
      mockMode: false,
      gitHead: "abc123",
    });
  });

  it("reuses only a build it made itself, in real mode, at the same commit", () => {
    const ok = {
      rebuild: false,
      serverExists: true,
      marker: buildMarker("abc123"),
      gitHead: "abc123",
    };
    expect(buildReason(ok)).toBeNull();
    expect(
      buildReason({ ...ok, gitHead: null, marker: buildMarker(null) }),
    ).toBeNull();
    expect(buildReason({ ...ok, rebuild: true })).toMatch(/--rebuild/);
    expect(buildReason({ ...ok, serverExists: false })).toMatch(/first run/);
    // A build made by `npm run build` (maybe in mock mode) has no marker.
    expect(buildReason({ ...ok, marker: null })).toMatch(
      /not made by npm run local/,
    );
    expect(
      buildReason({ ...ok, marker: { mockMode: true, gitHead: "abc123" } }),
    ).toMatch(/not made by npm run local/);
    expect(buildReason({ ...ok, gitHead: "def456" })).toMatch(
      /code has changed/,
    );
  });
});
