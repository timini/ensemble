# Ensemble AI: Deployment

How to set up the hosted app for sign-in, credits and Stripe payments. Free mode needs none of this: with no Firebase web config the app builds and runs, and the account menu says sign-in is not set up. The full production checklist (domain, alerts, launch) is roadmap M6; this document covers what M5 added.

Nothing here runs automatically. Every step that changes a cloud resource is for the owner to run by hand.

## Environment variables

Server variables are validated in `packages/app/src/env.js`; all are optional, and a feature whose variables are missing is switched off rather than failing the build.

| Variable | Where | Purpose |
|---|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | build and runtime | Firebase web config. Public values, inlined into the client bundle at build time. All three of API key, auth domain and project id must be set for sign-in to show. |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | build and runtime | Usually `<project-id>.firebaseapp.com`. |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | build and runtime | The Firebase project id. |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | build and runtime | Optional web app id. |
| `NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST` | local only | `127.0.0.1:9099` sends client sign-in to the Auth emulator. With no other config it uses the `demo-ensemble` project. Never set it in production. |
| `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` | runtime | Service account for firebase-admin outside Google Cloud. On App Hosting leave them unset: the backend's service account is used. |
| `STRIPE_SECRET_KEY` | runtime, secret | `sk_test_...` until launch, then `sk_live_...`. Without it `/api/stripe/checkout` answers 503. |
| `STRIPE_WEBHOOK_SECRET` | runtime, secret | The `whsec_...` signing secret of the webhook endpoint. Without it `/api/stripe/webhook` answers 503. |
| `CREDIT_MARGIN_PERCENT` | runtime | Charged over model cost. Default `30`. |
| `CREDIT_LOW_BALANCE_USD` | runtime | Low-balance warning threshold (FR-038). Default `1`. |
| `CREDIT_PACKS_USD` | runtime | Credit packs on sale, comma-separated dollars, each at least $1. Default `5,20,50`. |
| `APP_URL` | runtime | Public origin for the Stripe return links. Optional; the request origin is used when unset. Set it once the custom domain is live. |
| `OPENROUTER_API_KEY` | runtime, secret | Server key for Pro model calls (roadmap Decision 6). Without it Pro calls answer `SERVICE_UNAVAILABLE`. Set a monthly spend limit on it (see Pro mode below). |
| `OPENROUTER_BASE_URL` | runtime | Default `https://openrouter.ai/api/v1`. Only for tests against a fake server. |
| `PRO_MAX_RUN_TOKENS` | runtime | Most tokens (input and output, all calls) one Pro run may use. Default `200000`. |
| `PRO_MAX_CALL_OUTPUT_TOKENS` | runtime | `max_tokens` of each Pro call, lowered to what is left of the run's budget. Default `8192`. |
| `PRO_MAX_CALLS_PER_RUN` | runtime | Most model and embedding calls in one run, retries included. Default `150`. |
| `PRO_RATE_LIMIT_RUNS`, `PRO_RATE_LIMIT_WINDOW_SECONDS` | runtime | Runs one user may start per window. Default `10` per `60` seconds. |
| `PRO_MOCK_UPSTREAM` | local and CI only | `true` answers Pro calls from the mock client instead of OpenRouter, so Pro can be tested without spending. Mock mode (`NEXT_PUBLIC_MOCK_MODE=true`) turns it on too. Never set it in production. |
| `APP_CHECK_ENFORCE` | runtime | `true` refuses Pro calls without a valid Firebase App Check token. Default off. |
| `NEXT_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY` | build and runtime | reCAPTCHA Enterprise site key. When set, the client starts App Check and sends its token with Pro calls. |
| `NEXT_PUBLIC_FIREBASE_APP_CHECK_DEBUG_TOKEN` | local and CI only | App Check debug token registered in the console, for browsers without reCAPTCHA (tests). |

`apphosting.yaml` declares these by reference. The Firebase and Stripe values are Secret Manager secrets; the credit settings are plain values.

Important: App Hosting fails the build if a secret named in `apphosting.yaml` does not exist. Create every secret below before the next deploy from `main`.

## Credits and money

Balances and ledger amounts are integers in micro-dollars: 1 USD is 1,000,000. A cheap model call costs a fraction of a cent, so cents would round most calls up to a whole cent. A credit pack adds exactly what was paid: the $5 pack adds 5,000,000 micro-dollars. The margin is applied when a run is priced, not at purchase.

A Pro run reserves the high end of the pre-run estimate plus the margin, then settles at the actual token cost plus the margin, never more than the reservation, and gives back the difference. A failed run is refunded in full. Every step is an append-only entry in `creditLedger`, idempotent by run id.

When Stripe refunds a payment or the buyer opens a dispute, the webhook takes the purchase's credits back with a `reversal` entry: the refunded or disputed amount, never more than the purchase added, however many events arrive. If the credits were already spent the balance goes below zero, the workspace and `/account` say why, and Pro runs are refused until a purchase brings it back above zero. A dispute that is later won is not credited back automatically; give the credits back by hand with `grantCredits` if you want to.

## Pro mode (OpenRouter)

Pro model calls go from the server to OpenRouter with one key. To set it up:

1. Create an account at openrouter.ai and add credit.
2. Create an API key for this app only, and give it a **monthly credit limit** (OpenRouter dashboard, Keys, edit the key, Credit limit). This is the hard cap on what Pro can spend in a month, whatever happens in the app: rate limits and token budgets bound each user, the key limit bounds everyone together. Pick a figure you can afford to lose to abuse or a bug, and raise it as paid usage grows. Also set an email alert on the account balance.
3. Store the key as a secret and grant the backend access:

   ```bash
   firebase apphosting:secrets:set OPENROUTER_API_KEY
   firebase apphosting:secrets:grantaccess OPENROUTER_API_KEY --backend ensemble-app
   ```

When the key limit is reached OpenRouter refuses calls; the answers show as provider errors and the runs are refunded or settled for what was used.

Abuse controls, all on the server:

- Every Pro call needs a signed-in user and an open run with credits reserved (`proRun.start`).
- Each user may start `PRO_RATE_LIMIT_RUNS` runs per `PRO_RATE_LIMIT_WINDOW_SECONDS`. The counter is in Firestore (`rateLimits/{uid}`), so it holds across App Hosting instances.
- Each run has a token budget (`PRO_MAX_RUN_TOKENS`), a call budget (`PRO_MAX_CALLS_PER_RUN`) and a per-call output limit (`PRO_MAX_CALL_OUTPUT_TOKENS`). A call id can be used once, so a reconnecting client cannot repeat a call.
- Prompts longer than 200,000 characters are refused.
- Firebase App Check, below.

Run records are in `proRuns/{uid}__{runId}` (status, budget, calls and their usage); a stream's prompt waits in its `streams` subcollection between `prepareStream` and the subscription and is deleted when the stream starts. A run the client never finished (a closed tab, a crash) is settled the next time the same user starts a run, 30 minutes after it started.

## Firebase App Check

App Check makes Pro calls prove they come from this web app. It is off until configured, and the server only checks tokens when `APP_CHECK_ENFORCE` is `true`.

1. In the Google Cloud console, enable the reCAPTCHA Enterprise API and create a website key for the app's domains.
2. In the Firebase console, App Check, Apps: register the web app with the reCAPTCHA Enterprise provider and that site key.
3. Store the site key and uncomment its entry in `apphosting.yaml`:

   ```bash
   firebase apphosting:secrets:set NEXT_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY
   firebase apphosting:secrets:grantaccess NEXT_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY --backend ensemble-app
   ```

4. Deploy and watch App Check, APIs, in the Firebase console until nearly all requests carry valid tokens. Then set `APP_CHECK_ENFORCE` to `"true"` in `apphosting.yaml` and deploy again.

For local runs and CI with enforcement on, create a debug token in App Check, Apps, Manage debug tokens, and set `NEXT_PUBLIC_FIREBASE_APP_CHECK_DEBUG_TOKEN`.

## Firebase Auth providers

In the Firebase console, for the project that `infra/terraform` created:

1. Authentication, Sign-in method: enable **Google**. Set the public-facing name and support email.
2. Enable **Email/Password**, then turn on **Email link (passwordless sign-in)** inside it. Password sign-in itself is not used by the app.
3. Authentication, Settings, Authorized domains: add the App Hosting domain (`<backend>--<project>.<region>.hosted.app`) and later the custom domain. `localhost` is there by default.
4. Project settings, General, Your apps: add a web app if there is none and copy its `apiKey`, `authDomain`, `projectId` and `appId`.

Create the App Hosting secrets from those values (they are public, but secrets keep them in one place):

```bash
firebase apphosting:secrets:set NEXT_PUBLIC_FIREBASE_API_KEY
firebase apphosting:secrets:set NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
firebase apphosting:secrets:set NEXT_PUBLIC_FIREBASE_PROJECT_ID
firebase apphosting:secrets:set NEXT_PUBLIC_FIREBASE_APP_ID
firebase apphosting:secrets:grantaccess NEXT_PUBLIC_FIREBASE_API_KEY,NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,NEXT_PUBLIC_FIREBASE_PROJECT_ID,NEXT_PUBLIC_FIREBASE_APP_ID --backend ensemble-app
```

## Firestore

1. Create the Firestore database in Native mode, in the same region as App Hosting, if it does not exist.
2. Deploy the rules and indexes from the repo root:

   ```bash
   firebase deploy --only firestore:rules,firestore:indexes --project <project-id>
   ```

   `firestore.rules`: the server writes everything through firebase-admin; a signed-in user may read only their own `users/{uid}`, `creditLedger` and `usage` documents; every other path, including `stripeEvents`, `stripeReversals`, `proRuns` and `rateLimits`, is closed. `firestore.indexes.json` holds the indexes of the `/account` lists (ledger by user and date, ledger by user, type and date, usage by user and date); deploy them before the first visit to `/account`, or its lists fail until the indexes are built.
3. The App Hosting backend's service account needs the `Cloud Datastore User` role (`roles/datastore.user`) to read and write Firestore through firebase-admin.

Collections:

| Collection | Document | Written by |
|---|---|---|
| `users/{uid}` | `balanceMicros` (cache of the ledger sum), `createdAt`, `updatedAt` | every ledger transaction |
| `creditLedger/{id}` | `uid`, `type` (`purchase`, `reserve`, `settle`, `refund`, `grant`, `reversal`), signed `amountMicros`, `balanceAfterMicros`, `createdAt`, and per-type fields (a purchase keeps its `stripePaymentIntentId`) | credit service, Stripe webhook |
| `usage/{uid}__{runId}` | the calls and tokens of a settled run, its cost and charge | `settleRun` |
| `stripeEvents/{eventId}` | Stripe events already handled | Stripe webhook |
| `stripeReversals/{sessionId}` | refund total and disputed amounts of a purchase, and the credits already taken back | Stripe webhook |
| `proRuns/{uid}__{runId}` | an open or closed Pro run: budget, call ids, calls and usage, outcome | Pro run path |
| `rateLimits/{uid}` | the user's current rate-limit window | `proRun.start` |

## Stripe (test mode)

Use test mode until launch. No Stripe CLI is needed.

1. In the Stripe dashboard, switch to **Test mode**. Developers, API keys: copy the secret key (`sk_test_...`).
2. Developers, Webhooks (Event destinations): add an endpoint.
   - URL: `https://<app domain>/api/stripe/webhook`
   - Events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `charge.refunded` and `charge.dispute.created`.
   - After saving, reveal the signing secret (`whsec_...`).
3. Store both as App Hosting secrets:

   ```bash
   firebase apphosting:secrets:set STRIPE_SECRET_KEY
   firebase apphosting:secrets:set STRIPE_WEBHOOK_SECRET
   firebase apphosting:secrets:grantaccess STRIPE_SECRET_KEY,STRIPE_WEBHOOK_SECRET --backend ensemble-app
   ```

4. Settings, Business: set the public business name and support email, which Stripe shows on the Checkout page and the receipt. Settings, Emails: turn on receipts for successful payments (FR-046).
5. Test a purchase after deploying: sign in, start a checkout for the $5 pack, pay with card `4242 4242 4242 4242`, any future expiry and any CVC. The webhook's delivery log in the dashboard should show a 200 with `{"received":true,"result":"credited"}`, and `users/{uid}.balanceMicros` should be 5000000. Resending the event from the dashboard answers `"duplicate"` and adds nothing. Refunding that payment in the dashboard sends `charge.refunded`, which answers `{"received":true,"result":"reversed"}` and takes the $5 back. The `/account` page shows the purchase, the refund, each run and usage by model.

Credit packs are created per Checkout Session from `CREDIT_PACKS_USD`, so no Products or Prices need to exist in Stripe. The webhook credits a session only when its amount matches a configured pack.

For live mode, repeat steps 1 to 3 with live keys and a live webhook endpoint, and decide tax handling first (roadmap open question 4).

## Local testing

Emulator-backed tests need Java and the Firebase CLI. They use the `demo-ensemble` project, which needs no cloud access:

```bash
npm run test:emulator --workspace=packages/app
```

This starts the Auth and Firestore emulators (`firebase.json`: ports 9099 and 8080), runs `src/**/*.emulator.test.ts` (Firestore rules, the credit ledger, refunds and disputes, the `/account` queries, the Stripe webhook against Firestore, token verification, the Pro run path with a mocked OpenRouter fetch) and stops them.

To try sign-in by hand against the Auth emulator:

```bash
firebase emulators:start --only auth,firestore --project demo-ensemble
NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 \
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 \
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 \
FIREBASE_PROJECT_ID=demo-ensemble \
npm run dev:mock --workspace=packages/app
```

In mock mode Pro calls are answered by the mock client on the server (no OpenRouter call), but runs still reserve and settle credits in the Firestore emulator. Give a test user credits with `grantCredits` (`src/server/credits/grants.ts`) from a script or test.

The emulator does not send email. Sign-in links are listed at `http://127.0.0.1:9099/emulator/v1/projects/demo-ensemble/oobCodes`.

Webhook tests sign events with the Stripe SDK's `webhooks.generateTestHeaderString` and mock the Stripe client for Checkout Session creation, so no Stripe account or network call is involved.

### Pro mode end to end

The `pro-mode` Playwright suite runs the whole Pro path against the emulators, with no Stripe, Firebase or OpenRouter account:

```bash
npm run test:pro --workspace=packages/e2e
```

It wraps Playwright in `firebase emulators:exec` (Auth and Firestore, `demo-ensemble`) and starts the app on port 3200 with the settings in `packages/e2e/fixtures/proEnv.ts`: the Auth and Firestore emulator hosts, `PRO_MOCK_UPSTREAM=true` and a test-only `STRIPE_WEBHOOK_SECRET`, with no Stripe key. Sign-in uses the email links listed by the Auth emulator. A purchase stubs the Checkout redirect in the browser and posts a `checkout.session.completed` event to `/api/stripe/webhook`, signed with that secret by the Stripe SDK's `generateTestHeaderString`; refunds are posted the same way. CI runs it in the App E2E (Pro Mode) job.
