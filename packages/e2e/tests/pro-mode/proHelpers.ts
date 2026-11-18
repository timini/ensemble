import { expect, type APIRequestContext, type Locator, type Page } from '@playwright/test';
import Stripe from 'stripe';
import { AUTH_EMULATOR, FIRESTORE_EMULATOR, PRO_E2E_WEBHOOK_SECRET, PROJECT_ID } from '../../fixtures/proEnv';

/**
 * Steps shared by the pro-mode suite. Sign-in goes through the Auth
 * emulator (the emailed link is read from its out-of-band codes), credits
 * through the real webhook route with events signed like Stripe signs them,
 * and balances can be set directly in the Firestore emulator. Nothing here
 * reaches Stripe, Firebase or a model provider.
 */

/** Admin access to the emulators, which accept this token in place of credentials. */
const OWNER = { Authorization: 'Bearer owner' };
const stripe = new Stripe('fake-stripe-key-unused');

/** A new address per test, so tests never share a user or a balance. */
export function uniqueEmail(label: string): string {
  return `${label}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
}

interface OobCode {
  email: string;
  requestType: string;
  oobLink: string;
}

/** The newest sign-in link the Auth emulator "sent" to this address. */
async function signInLinkFor(request: APIRequestContext, email: string): Promise<string> {
  let link: string | undefined;
  await expect
    .poll(async () => {
      const res = await request.get(`http://${AUTH_EMULATOR}/emulator/v1/projects/${PROJECT_ID}/oobCodes`);
      const { oobCodes } = (await res.json()) as { oobCodes: OobCode[] };
      link = oobCodes.filter((c) => c.email === email && c.requestType === 'EMAIL_SIGNIN').at(-1)?.oobLink;
      return Boolean(link);
    })
    .toBe(true);
  return link!;
}

/**
 * Sign in with an email link from the sign-in panel inside `scope` (the
 * account menu, the onboarding Pro path, the account page). Opens the
 * emailed link in the same tab, as a user would on this device.
 */
export async function signInWithEmailLink(page: Page, scope: Locator, email: string) {
  await scope.getByTestId('sign-in-email-input').fill(email);
  await scope.getByTestId('sign-in-email-submit').click();
  await expect(scope.getByTestId('sign-in-email-sent')).toBeVisible();
  const link = new URL(await signInLinkFor(page.request, email));
  // The emulator's link carries the app URL to continue at; open it with the code.
  const target = new URL(link.searchParams.get('continueUrl') ?? '/workspace', page.url());
  for (const name of ['mode', 'oobCode', 'apiKey', 'lang']) {
    const value = link.searchParams.get(name);
    if (value) target.searchParams.set(name, value);
  }
  await page.goto(target.toString());
  await expect(page.getByTestId('account-menu-trigger')).toHaveAttribute('data-status', 'signedIn', {
    timeout: 20_000,
  });
}

/** The Firebase uid of a signed-in address. */
export async function uidFor(request: APIRequestContext, email: string): Promise<string> {
  const res = await request.post(
    `http://${AUTH_EMULATOR}/identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}/accounts:lookup`,
    { headers: OWNER, data: { email: [email] } },
  );
  const { users } = (await res.json()) as { users?: { localId: string }[] };
  const uid = users?.[0]?.localId;
  if (!uid) throw new Error(`No Auth emulator user for ${email}`);
  return uid;
}

/** Set a user's cached balance in the Firestore emulator (a test shortcut past the ledger). */
export async function setBalance(request: APIRequestContext, uid: string, micros: number) {
  const fields = 'updateMask.fieldPaths=balanceMicros&updateMask.fieldPaths=uid';
  const res = await request.patch(
    `http://${FIRESTORE_EMULATOR}/v1/projects/${PROJECT_ID}/databases/(default)/documents/users/${uid}?${fields}`,
    {
      headers: OWNER,
      data: { fields: { uid: { stringValue: uid }, balanceMicros: { integerValue: String(micros) } } },
    },
  );
  expect(res.ok()).toBe(true);
}

/** Post an event to the app's webhook route, signed with the test secret as Stripe would. */
export async function sendStripeEvent(request: APIRequestContext, event: Record<string, unknown>) {
  const payload = JSON.stringify(event);
  const signature = stripe.webhooks.generateTestHeaderString({ payload, secret: PRO_E2E_WEBHOOK_SECRET });
  const res = await request.post('/api/stripe/webhook', {
    headers: { 'stripe-signature': signature, 'content-type': 'application/json' },
    data: payload,
  });
  expect(res.status()).toBe(200);
  return (await res.json()) as { result: string };
}

/** checkout.session.completed for a paid credit pack, as Stripe sends it after a test-mode payment. */
export function paidSession(uid: string, packId: string, cents: number, id: string) {
  return {
    id: `evt_${id}`,
    object: 'event',
    type: 'checkout.session.completed',
    data: {
      object: {
        id: `cs_test_${id}`,
        object: 'checkout.session',
        payment_status: 'paid',
        amount_total: cents,
        currency: 'usd',
        client_reference_id: uid,
        payment_intent: `pi_${id}`,
        metadata: { uid, packId, creditMicros: String(cents * 10_000) },
      },
    },
  };
}

/** charge.refunded for the whole payment of a session made with paidSession. */
export function refundedCharge(id: string, cents: number) {
  return {
    id: `evt_refund_${id}`,
    object: 'event',
    type: 'charge.refunded',
    data: {
      object: {
        id: `ch_${id}`,
        object: 'charge',
        payment_intent: `pi_${id}`,
        amount: cents,
        amount_refunded: cents,
        currency: 'usd',
      },
    },
  };
}

/**
 * Stub the Stripe Checkout redirect: /api/stripe/checkout answers with the
 * success URL instead of a Stripe page. Returns the requests it saw.
 */
export async function stubCheckout(page: Page) {
  const seen: { packId: string; authorized: boolean }[] = [];
  await page.route('**/api/stripe/checkout', async (route) => {
    const body = route.request().postDataJSON() as { packId: string };
    seen.push({ packId: body.packId, authorized: /^Bearer .+/.test(route.request().headers().authorization ?? '') });
    await route.fulfill({ json: { url: '/workspace?checkout=success' } });
  });
  return seen;
}

/** A shown amount such as "$4.99" or "-$0.01" in dollars. */
export function dollars(text: string | null): number {
  const match = /(-?)\$(-?)([\d,]+(?:\.\d+)?)/.exec(text ?? '');
  if (!match) throw new Error(`No amount in "${text}"`);
  const sign = match[1] || match[2] ? -1 : 1;
  return sign * Number(match[3]!.replace(/,/g, ''));
}

/** Sign in and enter Pro the way a new user does: the landing page's Pro link, then onboarding. */
export async function startProFromLanding(page: Page, email: string) {
  await page.goto('/');
  await page.getByTestId('ways-in-pro').click();
  await expect(page).toHaveURL(/\/workspace\?start=pro/);
  const sheet = page.getByTestId('onboarding-sheet');
  await expect(sheet.getByTestId('onboarding-panel-pro')).toBeVisible();
  await signInWithEmailLink(page, sheet, email);
  // The link returns to the Pro path, now signed in, so Pro can start.
  await expect(sheet.getByTestId('onboarding-path-pro')).toHaveAttribute('aria-checked', 'true');
  await expect(sheet.getByTestId('onboarding-start')).toBeEnabled();
  await sheet.getByTestId('onboarding-start').click();
  await expect(sheet).toBeHidden();
  await onboardingFinished(page);
}

/**
 * Wait until onboarding has dropped `?start=` from the URL. A reload before
 * that opens onboarding again and replaces what the test typed.
 */
export async function onboardingFinished(page: Page) {
  await expect(page).not.toHaveURL(/[?&]start=/);
}

/** The models in the composer. */
export function composerChips(page: Page): Locator {
  return page.getByTestId('composer').getByTestId('model-chip');
}

/** Ask in the composer and wait for every answer and the consensus. */
export async function askAndFinish(page: Page, prompt: string, answers: number) {
  await page.getByTestId('composer-prompt').fill(prompt);
  await page.getByTestId('composer-submit').click();
  await expect(page.locator('[data-testid="answer-card"][data-status="complete"]')).toHaveCount(answers, {
    timeout: 60_000,
  });
  await expect(page.getByTestId('consensus-answer')).toHaveAttribute('data-status', 'success', { timeout: 60_000 });
}
