/**
 * Takes a screenshot of every Storybook story.
 *
 * Story ids come from the Storybook index, so the list never goes stale.
 * The index is read from a running Storybook (STORYBOOK_URL/index.json),
 * or from a static build if STORYBOOK_INDEX points at its index.json file.
 *
 * Usage:
 *   npm run storybook            # in another terminal
 *   npx tsx scripts/screenshot-stories.ts [id-prefix]
 *
 * The optional id prefix limits the run, for example "atoms-".
 */
import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { storiesFromIndex, type StoryIndex } from './story-index';

const STORYBOOK_URL = process.env.STORYBOOK_URL ?? 'http://localhost:6006';
const STORYBOOK_INDEX = process.env.STORYBOOK_INDEX;
const OUTPUT_DIR = './screenshots';

async function loadIndex(): Promise<StoryIndex> {
  if (STORYBOOK_INDEX) {
    return JSON.parse(fs.readFileSync(STORYBOOK_INDEX, 'utf8')) as StoryIndex;
  }
  const res = await fetch(`${STORYBOOK_URL}/index.json`);
  if (!res.ok) {
    throw new Error(`Could not load ${STORYBOOK_URL}/index.json (HTTP ${res.status}). Is Storybook running?`);
  }
  return (await res.json()) as StoryIndex;
}

async function takeScreenshots() {
  const stories = storiesFromIndex(await loadIndex(), process.argv[2]);

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
  });
  const page = await context.newPage();

  console.log(`Taking screenshots of ${stories.length} Storybook stories...\n`);

  let failures = 0;
  for (const story of stories) {
    try {
      const url = `${STORYBOOK_URL}/iframe.html?id=${story.id}&viewMode=story`;
      await page.goto(url, { waitUntil: 'networkidle' });

      await page.waitForSelector('#storybook-root', { timeout: 5000 });
      await page.waitForTimeout(500); // let animations settle

      const element = await page.$('#storybook-root');
      if (element) {
        const screenshotPath = path.join(OUTPUT_DIR, `${story.name}.png`);
        await element.screenshot({ path: screenshotPath });
        console.log(`ok   ${story.name}`);
      }
    } catch (error) {
      failures += 1;
      const message = error instanceof Error ? error.message : String(error);
      console.error(`fail ${story.name}: ${message}`);
    }
  }

  await browser.close();
  console.log(`\nScreenshots saved to ${OUTPUT_DIR}/ (${failures} failed)`);
  if (failures > 0) process.exitCode = 1;
}

takeScreenshots().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
