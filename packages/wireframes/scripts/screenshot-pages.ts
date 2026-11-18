// Captures every wireframe state at 375, 768 and 1440 px in light and dark.
// Needs the dev server (npm run dev, port 3100). Writes screenshots/<name>-<width>-<theme>.png.
import { chromium } from "playwright"
import { mkdir } from "node:fs/promises"

const BASE = process.env.WIREFRAMES_URL ?? "http://localhost:3100"
const OUT = "./screenshots"

const pages: Array<[string, string]> = [
  ["landing", "/"],
  ["workspace-onboarding", "/workspace?state=new"],
  ["workspace-ready", "/workspace?state=ready"],
  ["workspace-running", "/workspace?state=running"],
  ["workspace-done", "/workspace"],
  ["workspace-method", "/workspace?menu=method"],
  ["workspace-settings", "/workspace?sheet=settings"],
  ["workspace-history", "/workspace?sheet=history"],
  ["workspace-manual", "/workspace?sheet=manual"],
  ["benchmarks", "/benchmarks"],
  ["account", "/account"],
]

async function main() {
  await mkdir(OUT, { recursive: true })
  const browser = await chromium.launch()
  for (const width of [375, 768, 1440]) {
    for (const theme of ["light", "dark"] as const) {
      const context = await browser.newContext({ viewport: { width, height: width < 700 ? 812 : 900 }, colorScheme: theme })
      const page = await context.newPage()
      for (const [name, path] of pages) {
        await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" })
        await page.screenshot({ path: `${OUT}/${name}-${width}-${theme}.png` })
      }
      await context.close()
    }
  }
  await browser.close()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
