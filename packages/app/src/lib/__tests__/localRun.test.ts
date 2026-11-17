import { describe, expect, it } from "vitest";
import path from "node:path";
import {
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
});
