// @ts-check
/**
 * Helpers for `npm run local` (bin/ensemble-local.mjs): run the built app on
 * this machine, so the browser calls local model servers from
 * http://localhost and neither mixed content rules, the local network
 * permission prompt, nor OLLAMA_ORIGINS get in the way.
 */
import path from "node:path";

/**
 * @typedef {object} LocalRunOptions
 * @property {number} port Port to serve on.
 * @property {string} host Address to bind; loopback only, so the app is not
 *   exposed to the network.
 * @property {boolean} rebuild Build again even when a build exists.
 * @property {boolean} help Print usage and exit.
 */

/** Usage text for --help. */
export const USAGE = `Usage: npm run local -- [--port <port>] [--rebuild]

Runs Ensemble on http://localhost so it can use local model servers
(Ollama, LM Studio, llama.cpp, vLLM) with no browser permission prompts.

Options:
  --port <port>  Port to serve on (default 3000, or PORT)
  --rebuild      Build the app again before starting
  -h, --help     Show this help`;

/**
 * @param {string} value
 * @returns {number}
 */
function toPort(value) {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid port: ${value}`);
  }
  return port;
}

/**
 * Parse the command line.
 * @param {readonly string[]} argv arguments after the script name
 * @param {Record<string, string | undefined>} env environment (reads PORT)
 * @returns {LocalRunOptions}
 */
export function parseLocalRunArgs(argv, env) {
  /** @type {LocalRunOptions} */
  const options = {
    port: env.PORT ? toPort(env.PORT) : 3000,
    host: "127.0.0.1",
    rebuild: false,
    help: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i] ?? "";
    if (arg === "--port") {
      options.port = toPort(argv[i + 1] ?? "");
      i += 1;
    } else if (arg.startsWith("--port=")) {
      options.port = toPort(arg.slice("--port=".length));
    } else if (arg === "--rebuild") {
      options.rebuild = true;
    } else if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }
  return options;
}

/**
 * Where `next build` puts the standalone server, and where its static files
 * and public folder must be copied for it to serve them.
 * @param {string} appDir absolute path of packages/app
 */
export function standalonePaths(appDir) {
  const standaloneApp = path.join(appDir, ".next/standalone/packages/app");
  return {
    server: path.join(standaloneApp, "server.js"),
    serverDir: standaloneApp,
    staticSource: path.join(appDir, ".next/static"),
    staticTarget: path.join(standaloneApp, ".next/static"),
    publicSource: path.join(appDir, "public"),
    publicTarget: path.join(standaloneApp, "public"),
  };
}

/**
 * What to print once the server starts.
 * @param {number} port
 * @returns {string}
 */
export function startupMessage(port) {
  return [
    `Ensemble is running at http://localhost:${port}`,
    "",
    "Local model servers on this machine work from here without extra setup:",
    "Ollama allows http://localhost pages by default, so OLLAMA_ORIGINS is not needed.",
    "Open the configuration page, choose Free mode, and add Ollama or another local server.",
    "Press Ctrl+C to stop.",
  ].join("\n");
}

/**
 * @typedef {object} BuildMarker
 * @property {boolean} mockMode NEXT_PUBLIC_MOCK_MODE of the build; always
 *   false for a build made by `npm run local`.
 * @property {string | null} gitHead commit the build was made from, or null
 *   outside a git checkout.
 */

/**
 * Where `npm run local` records the build it made. `next build` empties
 * .next, so a later build by any other command removes the marker too.
 * @param {string} appDir absolute path of packages/app
 * @returns {string}
 */
export function buildMarkerPath(appDir) {
  return path.join(appDir, ".next/standalone/.ensemble-local.json");
}

/**
 * The marker to write after a successful build.
 * @param {string | null} gitHead
 * @returns {BuildMarker}
 */
export function buildMarker(gitHead) {
  return { mockMode: false, gitHead };
}

/**
 * Why the app must be built before it runs, or null to reuse the build.
 * NEXT_PUBLIC_MOCK_MODE is fixed at build time, so a build this command did
 * not make (perhaps a mock mode build) or one from an older commit is not
 * reused. Uncommitted changes are not detected; use --rebuild for those.
 * @param {object} state
 * @param {boolean} state.rebuild --rebuild was given
 * @param {boolean} state.serverExists the standalone server.js exists
 * @param {unknown} state.marker parsed marker file, or null when missing or
 *   unreadable
 * @param {string | null} state.gitHead current commit, or null
 * @returns {string | null}
 */
export function buildReason({ rebuild, serverExists, marker, gitHead }) {
  if (rebuild) return "Building Ensemble (--rebuild)...";
  if (!serverExists) {
    return "Building Ensemble (first run only; this takes a few minutes)...";
  }
  const recorded = /** @type {Partial<BuildMarker> | null} */ (
    marker && typeof marker === "object" ? marker : null
  );
  if (!recorded || recorded.mockMode !== false) {
    return "Building Ensemble again: the existing build was not made by npm run local...";
  }
  if ((recorded.gitHead ?? null) !== gitHead) {
    return "Building Ensemble again: the code has changed since the last build...";
  }
  return null;
}
