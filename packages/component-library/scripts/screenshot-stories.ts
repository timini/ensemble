import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

const STORYBOOK_URL = 'http://localhost:6006';
const OUTPUT_DIR = './screenshots';

// List of all stories to screenshot
const stories = [
  // Button stories
  { id: 'ui-button--default', name: 'Button-Default' },
  { id: 'ui-button--destructive', name: 'Button-Destructive' },
  { id: 'ui-button--outline', name: 'Button-Outline' },
  { id: 'ui-button--secondary', name: 'Button-Secondary' },
  { id: 'ui-button--ghost', name: 'Button-Ghost' },
  { id: 'ui-button--link', name: 'Button-Link' },
  { id: 'ui-button--small', name: 'Button-Small' },
  { id: 'ui-button--large', name: 'Button-Large' },
  { id: 'ui-button--icon', name: 'Button-Icon' },
  { id: 'ui-button--disabled', name: 'Button-Disabled' },
  { id: 'ui-button--all-variants', name: 'Button-AllVariants' },

  // Card stories
  { id: 'ui-card--default', name: 'Card-Default' },
  { id: 'ui-card--without-header', name: 'Card-WithoutHeader' },
  { id: 'ui-card--without-footer', name: 'Card-WithoutFooter' },
  { id: 'ui-card--multiple-actions', name: 'Card-MultipleActions' },
  { id: 'ui-card--content-only', name: 'Card-ContentOnly' },

  // Badge stories
  { id: 'ui-badge--default', name: 'Badge-Default' },
  { id: 'ui-badge--secondary', name: 'Badge-Secondary' },
  { id: 'ui-badge--destructive', name: 'Badge-Destructive' },
  { id: 'ui-badge--outline', name: 'Badge-Outline' },
  { id: 'ui-badge--all-variants', name: 'Badge-AllVariants' },

  // Input stories
  { id: 'ui-input--default', name: 'Input-Default' },
  { id: 'ui-input--email', name: 'Input-Email' },
  { id: 'ui-input--password', name: 'Input-Password' },
  { id: 'ui-input--disabled', name: 'Input-Disabled' },
  { id: 'ui-input--with-value', name: 'Input-WithValue' },
  { id: 'ui-input--number', name: 'Input-Number' },

  // Textarea stories
  { id: 'ui-textarea--default', name: 'Textarea-Default' },
  { id: 'ui-textarea--disabled', name: 'Textarea-Disabled' },
  { id: 'ui-textarea--with-value', name: 'Textarea-WithValue' },
  { id: 'ui-textarea--custom-height', name: 'Textarea-CustomHeight' },
  { id: 'ui-textarea--with-label', name: 'Textarea-WithLabel' },

  // ProgressSteps stories
  { id: 'components-progresssteps--config', name: 'ProgressSteps-Config' },
  { id: 'components-progresssteps--ensemble', name: 'ProgressSteps-Ensemble' },
  { id: 'components-progresssteps--prompt', name: 'ProgressSteps-Prompt' },
  { id: 'components-progresssteps--review', name: 'ProgressSteps-Review' },

  // EnsembleHeader stories
  { id: 'components-ensembleheader--default', name: 'EnsembleHeader-Default' },
  { id: 'components-ensembleheader--with-page', name: 'EnsembleHeader-WithPage' },
];

async function takeScreenshots() {
  // Create output directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
  });
  const page = await context.newPage();

  console.log('🎨 Taking screenshots of all Storybook stories...\n');

  for (const story of stories) {
    try {
      const url = `${STORYBOOK_URL}/iframe.html?id=${story.id}&viewMode=story`;
      await page.goto(url, { waitUntil: 'networkidle' });

      // Wait for story to render
      await page.waitForSelector('#storybook-root', { timeout: 5000 });
      await page.waitForTimeout(500); // Additional wait for animations

      // Take screenshot of the story content
      const element = await page.$('#storybook-root');
      if (element) {
        const screenshotPath = path.join(OUTPUT_DIR, `${story.name}.png`);
        await element.screenshot({ path: screenshotPath });
        console.log(`✓ ${story.name}`);
      }
    } catch (error) {
      console.error(`✗ ${story.name}: ${error.message}`);
    }
  }

  await browser.close();
  console.log(`\n✅ Screenshots saved to ${OUTPUT_DIR}/`);
}

takeScreenshots().catch(console.error);
