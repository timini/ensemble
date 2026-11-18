#!/usr/bin/env node
// @ts-check
/**
 * `npm run local`: build Ensemble if needed and serve it on
 * http://localhost:3000 (bound to 127.0.0.1), so local model servers can be
 * used without the browser blocking calls from the hosted HTTPS site. See
 * docs/LOCAL_MODELS.md.
 */
import { spawn, spawnSync } from "node:child_process";
import { cpSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  USAGE,
  buildMarker,
  buildMarkerPath,
  buildReason,
  parseLocalRunArgs,
  standalonePaths,
  startupMessage,
} from "../scripts/localRun.mjs";

const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(appDir, "../..");

/** @type {ReturnType<typeof parseLocalRunArgs>} */
let options;
try {
  options = parseLocalRunArgs(process.argv.slice(2), process.env);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  console.error(USAGE);
  process.exit(1);
}
if (options.help) {
  console.log(USAGE);
  process.exit(0);
}

/** @returns {string | null} */
function currentGitHead() {
  const result = spawnSync("git", ["rev-parse", "HEAD"], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  return result.status === 0 ? result.stdout.trim() : null;
}

/** @returns {unknown} */
function readMarker() {
  try {
    return JSON.parse(readFileSync(markerPath, "utf8"));
  } catch {
    return null;
  }
}

const paths = standalonePaths(appDir);
const markerPath = buildMarkerPath(appDir);
const gitHead = currentGitHead();
const reason = buildReason({
  rebuild: options.rebuild,
  serverExists: existsSync(paths.server),
  marker: readMarker(),
  gitHead,
});
if (reason) {
  console.log(reason);
  const npm = process.platform === "win32" ? "npm.cmd" : "npm";
  const build = spawnSync(npm, ["run", "build"], {
    cwd: repoRoot,
    stdio: "inherit",
    env: { ...process.env, NEXT_PUBLIC_MOCK_MODE: "false" },
    shell: process.platform === "win32",
  });
  if (build.status !== 0 || !existsSync(paths.server)) {
    console.error(
      "The build failed. Run `npm install` at the repository root and try again.",
    );
    process.exit(build.status ?? 1);
  }
  writeFileSync(markerPath, `${JSON.stringify(buildMarker(gitHead))}\n`);
}

cpSync(paths.staticSource, paths.staticTarget, { recursive: true });
if (existsSync(paths.publicSource)) {
  cpSync(paths.publicSource, paths.publicTarget, { recursive: true });
}

const server = spawn(process.execPath, [paths.server], {
  cwd: paths.serverDir,
  stdio: "inherit",
  env: {
    ...process.env,
    NODE_ENV: "production",
    PORT: String(options.port),
    HOSTNAME: options.host,
  },
});
console.log(startupMessage(options.port));
server.on("exit", (code) => process.exit(code ?? 0));
for (const signal of /** @type {const} */ (["SIGINT", "SIGTERM"])) {
  process.on(signal, () => server.kill(signal));
}
