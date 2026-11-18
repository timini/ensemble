import { expect, test, type APIRequestContext, type Browser, type Page } from '@playwright/test';
import { FIRESTORE_EMULATOR, PRO_APP_PORT, PROJECT_ID } from '../../fixtures/proEnv';
import {
  askAndFinish,
  composerChips,
  onboardingFinished,
  setBalance,
  signInWithEmailLink,
  uidFor,
  uniqueEmail,
} from './proHelpers';

/**
 * Share links (FR-042 to FR-044) and synced history and presets, against
 * the Firebase emulators. Runs are Pro runs on the mock upstream, since
 * sharing and sync need a signed-in user either way. Run with
 * `npm run test:pro`.
 */

test.describe.configure({ mode: 'serial' });
test.setTimeout(180_000);

const BASE = `http://localhost:${PRO_APP_PORT}`;

/** Sign in on the Pro onboarding path in a fresh browser and give the user credits. */
async function signedInWorkspace(page: Page, email: string) {
  await page.goto('/workspace?start=pro');
  const sheet = page.getByTestId('onboarding-sheet');
  await signInWithEmailLink(page, sheet, email);
  await sheet.getByTestId('onboarding-start').click();
  await expect(composerChips(page)).toHaveCount(3);
  await onboardingFinished(page);
  await setBalance(page.request, await uidFor(page.request, email), 5_000_000);
  await page.reload();
  await expect(composerChips(page)).toHaveCount(3);
}

/** A second browser with nothing stored, as on another device. */
async function otherDevice(browser: Browser): Promise<Page> {
  const context = await browser.newContext({ baseURL: BASE });
  return context.newPage();
}

/** Ids of a user's synced items (not tombstones), read from the Firestore emulator. */
async function syncedIds(request: APIRequestContext, collectionId: string, uid: string): Promise<string[]> {
  const res = await request.post(
    `http://${FIRESTORE_EMULATOR}/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery`,
    {
      headers: { Authorization: 'Bearer owner' },
      data: {
        structuredQuery: {
          from: [{ collectionId }],
          where: {
            fieldFilter: {
              field: { fieldPath: 'uid' },
              op: 'EQUAL',
              value: { stringValue: uid },
            },
          },
        },
      },
    },
  );
  const rows = (await res.json()) as {
    document?: {
      fields: {
        id: { stringValue: string };
        deleted: { booleanValue: boolean };
      };
    };
  }[];
  return rows
    .filter((r) => r.document && !r.document.fields.deleted.booleanValue)
    .map((r) => r.document!.fields.id.stringValue);
}

const historyItem = (page: Page, text: string) => page.getByTestId('history-item').filter({ hasText: text });

test('a signed-in user shares a run, a signed-out visitor opens it, and the owner deletes it', async ({
  page,
  browser,
}) => {
  await signedInWorkspace(page, uniqueEmail('share'));
  const prompt = 'Which planet has the most moons?';
  await askAndFinish(page, prompt, 3);

  await page.getByTestId('consensus-answer-share').click();
  const dialog = page.getByTestId('share-dialog');
  await expect(dialog).toHaveAttribute('data-status', 'create');
  await expect(dialog).toContainText('API keys are never included');
  await dialog.getByTestId('share-create').click();
  await expect(dialog).toHaveAttribute('data-status', 'ready');
  const url = await dialog.getByTestId('share-url').inputValue();
  expect(url).toMatch(new RegExp(`^${BASE}/s/[A-Za-z0-9_-]{22}$`));
  await expect(dialog.getByTestId('share-expiry')).toContainText('Works until');

  // Sharing the same run again gives the same link.
  await dialog.getByTestId('share-done').click();
  await historyItem(page, prompt).getByTestId('history-share').click();
  await expect(dialog).toHaveAttribute('data-status', 'ready');
  await expect(dialog.getByTestId('share-url')).toHaveValue(url);

  // A visitor with no account sees the run, rendered on the server.
  const visitor = await otherDevice(browser);
  // A link preview crawler gets the Open Graph tags in the HTML head.
  const html = await (
    await visitor.request.get(url, {
      headers: { 'user-agent': 'facebookexternalhit/1.1' },
    })
  ).text();
  expect(html).toContain(prompt);
  expect(html).toMatch(/<meta name="robots" content="noindex, nofollow"/);
  expect(html).toMatch(/<meta property="og:image" content="[^"]*\/s\/[A-Za-z0-9_-]{22}\/opengraph-image/);
  await visitor.goto(url);
  await expect(visitor.getByTestId('shared-run-prompt')).toHaveText(prompt);
  await expect(visitor.getByTestId('answer-card')).toHaveCount(3);
  await expect(visitor.getByTestId('consensus-answer')).toHaveAttribute('data-status', 'success');
  await expect(visitor.getByTestId('agreement-summary')).toBeVisible();
  const image = await visitor.request.get(`${new URL(url).pathname}/opengraph-image`);
  expect(image.status()).toBe(200);
  expect(image.headers()['content-type']).toBe('image/png');

  // The owner deletes the link; it stops working at once.
  await dialog.getByTestId('share-delete').click();
  await expect(dialog).toHaveAttribute('data-status', 'create');
  expect((await visitor.request.get(url)).status()).toBe(404);
  await visitor.goto(url);
  await expect(visitor.getByTestId('shared-run-missing')).toBeVisible();
  await visitor.context().close();
});

test('an unguessable link that does not exist answers 404', async ({ page }) => {
  const res = await page.request.get('/s/AAAAAAAAAAAAAAAAAAAAAA');
  expect(res.status()).toBe(404);
  expect((await page.request.get('/s/not-an-id')).status()).toBe(404);
});

test('signed-out visitors see no share button and history stays in the browser', async ({ page }) => {
  await page.goto('/workspace');
  await expect(page.getByTestId('history-sync')).toHaveAttribute('data-status', 'local');
  await expect(page.getByTestId('history-share')).toHaveCount(0);
});

test('history and presets follow the account to another device, and deletes propagate', async ({ page, browser }) => {
  const email = uniqueEmail('sync');
  await signedInWorkspace(page, email);
  const prompt = 'How far is the Moon from the Earth?';
  await askAndFinish(page, prompt, 3);
  await expect(historyItem(page, prompt)).toHaveCount(1);
  await expect(page.getByTestId('history-sync')).toHaveAttribute('data-status', 'synced');

  await page.getByTestId('composer-options-trigger').click();
  await page.getByTestId('composer-option-preset').click();
  const save = page.getByTestId('save-preset-dialog');
  await save.getByTestId('preset-name-input').fill('Synced trio');
  await save.getByTestId('preset-save-button').click();
  await expect(page.getByTestId('history-preset').filter({ hasText: 'Synced trio' })).toBeVisible();
  const uid = await uidFor(page.request, email);
  await expect.poll(() => syncedIds(page.request, 'history', uid), { timeout: 15_000 }).toHaveLength(1);
  await expect.poll(() => syncedIds(page.request, 'presets', uid), { timeout: 15_000 }).toHaveLength(1);

  // Another device, same account: the run and the preset arrive.
  const other = await otherDevice(browser);
  await other.goto('/workspace?start=pro');
  const sheet = other.getByTestId('onboarding-sheet');
  await signInWithEmailLink(other, sheet, email);
  await sheet.getByTestId('onboarding-start').click();
  await expect(sheet).toBeHidden();
  await onboardingFinished(other);
  await expect(historyItem(other, prompt)).toHaveCount(1, { timeout: 20_000 });
  await expect(other.getByTestId('history-preset').filter({ hasText: 'Synced trio' })).toBeVisible();

  // Deleting it there removes it here after a reload.
  await historyItem(other, prompt)
    .getByRole('button', { name: `Delete "${prompt}"` })
    .click();
  await expect(historyItem(other, prompt)).toHaveCount(0);
  await expect.poll(() => syncedIds(page.request, 'history', uid), { timeout: 15_000 }).toHaveLength(0);
  await other.context().close();

  await page.reload();
  await expect(page.getByTestId('history-sync')).toHaveAttribute('data-status', 'synced', { timeout: 20_000 });
  await expect(historyItem(page, prompt)).toHaveCount(0, { timeout: 20_000 });
  await expect(page.getByTestId('history-preset').filter({ hasText: 'Synced trio' })).toBeVisible();
});
