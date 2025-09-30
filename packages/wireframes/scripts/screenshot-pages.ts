import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';
import { join } from 'path';

const WIREFRAMES_URL = 'http://localhost:3000';
const OUTPUT_DIR = './screenshots';

const pages = [
  { path: '/config', name: 'Config-Page' },
  { path: '/ensemble', name: 'Ensemble-Page' },
  { path: '/prompt', name: 'Prompt-Page' },
  { path: '/review', name: 'Review-Page' },
];

async function takeScreenshots() {
  console.log('🚀 Starting wireframe screenshot capture...');
  console.log(`📸 Capturing ${pages.length} pages from ${WIREFRAMES_URL}`);

  // Create output directory
  await mkdir(OUTPUT_DIR, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  });
  const page = await context.newPage();

  let successCount = 0;
  let failureCount = 0;

  for (const pageConfig of pages) {
    try {
      const url = `${WIREFRAMES_URL}${pageConfig.path}`;
      console.log(`\n📄 Capturing: ${pageConfig.name}`);
      console.log(`   URL: ${url}`);

      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

      // Wait for React to hydrate
      await page.waitForTimeout(1000);

      const screenshotPath = join(OUTPUT_DIR, `${pageConfig.name}.png`);
      await page.screenshot({
        path: screenshotPath,
        fullPage: true,
      });

      console.log(`   ✅ Saved: ${screenshotPath}`);
      successCount++;
    } catch (error) {
      console.error(`   ❌ Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      failureCount++;
    }
  }

  await browser.close();

  console.log('\n' + '='.repeat(50));
  console.log(`✨ Screenshot capture complete!`);
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ❌ Failed: ${failureCount}`);
  console.log(`   📁 Output: ${OUTPUT_DIR}`);
  console.log('='.repeat(50));
}

takeScreenshots().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
