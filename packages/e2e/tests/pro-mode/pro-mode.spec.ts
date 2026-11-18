import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { FIRESTORE_EMULATOR, PROJECT_ID } from '../../fixtures/proEnv';
import {
  askAndFinish,
  composerChips,
  dollars,
  paidSession,
  refundedCharge,
  sendStripeEvent,
  onboardingFinished,
  setBalance,
  signInWithEmailLink,
  startProFromLanding,
  stubCheckout,
  uidFor,
  uniqueEmail,
} from './proHelpers';

/**
 * Pro mode end to end (replaces T297 and T298): sign-in through the Auth
 * emulator, credits bought through the real webhook route with signed test
 * events, ensembles run and billed on the server against the mock upstream,
 * and the deduction checked on /account and in the account menu. Run with
 * `npm run test:pro`, which starts the Firebase emulators.
 */

test.describe.configure({ mode: 'serial' });

test.setTimeout(180_000);

/** Usage records of a user's settled runs, read from the Firestore emulator. */
async function settledRuns(request: APIRequestContext, uid: string): Promise<number> {
  const res = await request.post(
    `http://${FIRESTORE_EMULATOR}/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery`,
    {
      headers: { Authorization: 'Bearer owner' },
      data: {
        structuredQuery: {
          from: [{ collectionId: 'usage' }],
          where: { fieldFilter: { field: { fieldPath: 'uid' }, op: 'EQUAL', value: { stringValue: uid } } },
        },
      },
    },
  );
  const rows = (await res.json()) as { document?: unknown }[];
  return rows.filter((r) => r.document).length;
}

/** The balance stored for a user, in micro-dollars. */
async function storedBalance(request: APIRequestContext, uid: string): Promise<number> {
  const res = await request.get(
    `http://${FIRESTORE_EMULATOR}/v1/projects/${PROJECT_ID}/databases/(default)/documents/users/${uid}`,
    { headers: { Authorization: 'Bearer owner' } },
  );
  const doc = (await res.json()) as { fields?: { balanceMicros?: { integerValue?: string } } };
  return Number(doc.fields?.balanceMicros?.integerValue ?? 0);
}

async function waitForSettledRuns(request: APIRequestContext, uid: string, count: number) {
  // A run settles once its calls have been idle for a few seconds, or on Stop.
  await expect.poll(() => settledRuns(request, uid), { timeout: 60_000 }).toBe(count);
}

/** The balance in the workspace account menu (FR-037). */
async function menuBalance(page: Page): Promise<number> {
  await page.getByTestId('account-menu-trigger').click();
  const panel = page.getByTestId('account-menu-panel');
  const text = await panel.getByTestId('credit-notice-message').textContent();
  await page.keyboard.press('Escape');
  return dollars(text);
}

/** The credit notice under the composer (not the copies in the account menu or settings). */
function composerNotice(page: Page) {
  return page.getByTestId('workspace').getByTestId('credit-notice');
}

/** Sign in on /workspace?start=pro and enter Pro with the starter ensemble. */
async function signInToPro(page: Page, label: string) {
  const email = uniqueEmail(label);
  await page.goto('/workspace?start=pro');
  const sheet = page.getByTestId('onboarding-sheet');
  await signInWithEmailLink(page, sheet, email);
  // Signed in but not yet in Pro: the Pro path already shows the balance.
  await expect(sheet.getByTestId('credit-notice')).toBeVisible();
  await sheet.getByTestId('onboarding-start').click();
  await expect(composerChips(page)).toHaveCount(3);
  await onboardingFinished(page);
  return { email, uid: await uidFor(page.request, email) };
}

test('a new user signs in for Pro, buys credits, runs three models and sees the deduction', async ({ page }) => {
  const email = uniqueEmail('buyer');
  await startProFromLanding(page, email);

  // Onboarding filled a starter ensemble of models Pro can bill.
  await expect(composerChips(page)).toHaveCount(3);

  // No credits yet: Ask is blocked and the packs are offered (FR-036).
  await page.getByTestId('composer-prompt').fill('Why is the sky blue?');
  const notice = composerNotice(page);
  await expect(notice).toHaveAttribute('data-variant', 'insufficient');
  await expect(page.getByTestId('composer-blocked-hint')).toBeVisible();
  await expect(page.getByTestId('composer-submit')).toBeDisabled();

  // Buy the $5 pack. Checkout is stubbed; Stripe's webhook is replayed, signed.
  const checkouts = await stubCheckout(page);
  await notice.getByTestId('credit-notice-buy-usd-5').click();
  await expect(page).toHaveURL(/checkout=success/);
  expect(checkouts).toEqual([{ packId: 'usd-5', authorized: true }]);
  const uid = await uidFor(page.request, email);
  const purchase = paidSession(uid, 'usd-5', 500, `buyer${Date.now()}`);
  expect((await sendStripeEvent(page.request, purchase)).result).toBe('credited');
  expect((await sendStripeEvent(page.request, purchase)).result).toBe('duplicate');

  await page.reload();
  await expect(composerChips(page)).toHaveCount(3);
  expect(await menuBalance(page)).toBe(5);

  await askAndFinish(page, 'Why is the sky blue?', 3);
  await waitForSettledRuns(page.request, uid, 1);

  // The run was charged: less than the reservation, more than nothing.
  const left = await storedBalance(page.request, uid);
  const chargedMicros = 5_000_000 - left;
  expect(chargedMicros).toBeGreaterThan(0);
  expect(chargedMicros).toBeLessThan(100_000);

  // The account menu shows the balance after the charge (FR-037).
  await page.reload();
  expect(await menuBalance(page)).toBeCloseTo(left / 1e6, 2);

  // The dashboard shows the balance, the purchase, the run and usage by model.
  await page.goto('/account');
  await expect(page.getByTestId('account-dashboard-user')).toContainText(email);
  expect(dollars(await page.getByTestId('credit-balance-amount').textContent())).toBeCloseTo(left / 1e6, 2);
  await expect(page.getByTestId('credit-balance')).toHaveAttribute('data-state', 'ok');
  const purchases = page.getByTestId('purchase-history-list').getByRole('listitem');
  await expect(purchases).toHaveCount(1);
  await expect(purchases.first()).toContainText('$5 credit pack');
  await expect(purchases.first()).toContainText('+$5.00');
  const runs = page.getByTestId('run-history-list').getByRole('listitem');
  await expect(runs).toHaveCount(1);
  await expect(runs.first()).toContainText('GPT-6 Luna');
  // Small charges show with four decimals.
  expect(dollars(await runs.first().getByTestId(/run-history-amount/).textContent())).toBeCloseTo(
    chargedMicros / 1e6,
    4,
  );
  const models = page.getByTestId('model-usage-list').getByRole('listitem');
  expect(await models.count()).toBeGreaterThanOrEqual(3);
});

test('warns under the low-balance threshold (FR-038) and still runs', async ({ page }) => {
  const { uid } = await signInToPro(page, 'low');
  await setBalance(page.request, uid, 500_000);
  await page.reload();
  await page.getByTestId('composer-prompt').fill('Name three primary colours.');
  const notice = composerNotice(page);
  await expect(notice).toHaveAttribute('data-variant', 'low');
  await expect(notice).toContainText('$0.50');
  await expect(page.getByTestId('composer-submit')).toBeEnabled();
  await askAndFinish(page, 'Name three primary colours.', 3);
});

test('Stop cancels the run and settles what it used', async ({ page }) => {
  const { uid } = await signInToPro(page, 'stop');
  await setBalance(page.request, uid, 5_000_000);
  await page.reload();
  await page.getByTestId('composer-prompt').fill('Write a long essay on the history of tea.');
  await page.getByTestId('composer-submit').click();
  await expect(page.locator('[data-testid="answer-card"][data-status="streaming"]').first()).toBeVisible({
    timeout: 30_000,
  });
  await page.getByTestId('composer-stop').click();

  await expect(page.locator('[data-error-kind="cancelled"]').first()).toBeVisible();
  await expect(page.getByTestId('composer-submit')).toBeVisible();
  await waitForSettledRuns(page.request, uid, 1);

  // Billed for the prompts and the text produced before Stop, and nothing is left reserved.
  const chargedMicros = 5_000_000 - (await storedBalance(page.request, uid));
  expect(chargedMicros).toBeGreaterThan(0);
  expect(chargedMicros).toBeLessThan(100_000);

  await page.goto('/account');
  const runs = page.getByTestId('run-history-list').getByRole('listitem');
  await expect(runs).toHaveCount(1);
  expect(dollars(await runs.first().getByTestId(/run-history-amount/).textContent())).toBeCloseTo(
    chargedMicros / 1e6,
    4,
  );
});

test('a refund takes the credits back and a negative balance blocks Pro', async ({ page }) => {
  const { uid } = await signInToPro(page, 'refund');
  const id = `refund${Date.now()}`;
  expect((await sendStripeEvent(page.request, paidSession(uid, 'usd-5', 500, id))).result).toBe('credited');
  await page.reload();
  await askAndFinish(page, 'What is the boiling point of water?', 3);
  await waitForSettledRuns(page.request, uid, 1);

  expect((await sendStripeEvent(page.request, refundedCharge(id, 500))).result).toBe('reversed');
  expect((await sendStripeEvent(page.request, refundedCharge(id, 500))).result).toBe('duplicate');

  await page.reload();
  await page.getByTestId('composer-prompt').fill('Another question');
  const notice = composerNotice(page);
  await expect(notice).toHaveAttribute('data-variant', 'negative');
  await expect(page.getByTestId('composer-submit')).toBeDisabled();

  await page.goto('/account');
  await expect(page.getByTestId('credit-balance')).toHaveAttribute('data-state', 'negative');
  expect(dollars(await page.getByTestId('credit-balance-amount').textContent())).toBeLessThan(0);
  const entries = page.getByTestId('purchase-history-list').getByRole('listitem');
  await expect(entries).toHaveCount(2);
  await expect(entries.first()).toContainText('Refund');
  await expect(entries.first()).toContainText('-$5.00');
});

test('the account page asks a signed-out visitor to sign in, then shows the dashboard', async ({ page }) => {
  const email = uniqueEmail('account');
  await page.goto('/account');
  const card = page.getByTestId('pro-sign-in');
  await expect(card).toBeVisible();
  await signInWithEmailLink(page, card, email);
  await expect(page).toHaveURL(/\/account/);
  await expect(page.getByTestId('account-dashboard-user')).toContainText(email);
  await expect(page.getByTestId('credit-balance-amount')).toHaveText('$0.00');
  await expect(page.getByTestId('purchase-history-empty')).toBeVisible();
  await expect(page.getByTestId('run-history-empty')).toBeVisible();
});
