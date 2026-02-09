/**
 * Flattens the Next.js standalone output for Firebase App Hosting compatibility.
 *
 * In a monorepo, Next.js nests the standalone output under the app's relative path
 * (e.g., .next/standalone/packages/app/). The Firebase adapter expects a flat layout
 * (.next/standalone/.next/, .next/standalone/server.js). This script copies the
 * nested files to the expected flat locations and ensures the root package.json
 * has "type": "module" for the ESM server entry point.
 */
import { cpSync, readFileSync, writeFileSync, existsSync, rmSync, lstatSync } from "fs";

const standalone = ".next/standalone";
const nestedApp = `${standalone}/packages/app`;

if (existsSync(`${nestedApp}/.next`)) {
    // Remove old symlinks or stale copies
    if (existsSync(`${standalone}/.next`)) {
        const stat = lstatSync(`${standalone}/.next`);
        if (stat.isSymbolicLink()) {
            rmSync(`${standalone}/.next`);
        } else {
            rmSync(`${standalone}/.next`, { recursive: true });
        }
    }
    if (existsSync(`${standalone}/server.js`)) {
        rmSync(`${standalone}/server.js`);
    }

    // Copy nested output to flat locations
    cpSync(`${nestedApp}/.next`, `${standalone}/.next`, { recursive: true });
    cpSync(`${nestedApp}/server.js`, `${standalone}/server.js`);

    // Ensure package.json has "type": "module" for ESM server.js
    const pkgPath = `${standalone}/package.json`;
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
    if (!pkg.type) {
        pkg.type = "module";
        writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
    }

    console.log("Standalone output flattened for Firebase App Hosting adapter");
}
