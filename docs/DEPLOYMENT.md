# Ensemble AI: Deployment

How to run the hosted app in production, from an empty Google Cloud project to a launch on its own domain. Free mode needs none of the server pieces: with no Firebase web config the app builds and runs, and the account menu says sign-in is not set up.

Nothing here runs automatically. Every step that changes a cloud resource, a DNS record or a payment account is for the owner to run by hand. The launch checklist at the end lists them in order.

## Environment variables

Server variables are validated in `packages/app/src/env.js`; all are optional, and a feature whose variables are missing is switched off rather than failing the build (except `APP_URL`, which checkout needs in production).

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
| `APP_URL` | build and runtime | Public origin of the site, such as `https://ensemble.example.com`. Canonical URLs, `sitemap.xml`, `robots.txt`, Open Graph image URLs and the Stripe return links are built from it. Required in production: `/api/stripe/checkout` answers 503 without it. Needed at build time because the landing page, `robots.txt` and `sitemap.xml` are rendered then. Locally it defaults to `http://localhost:3000`. |
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
| `SHARE_RATE_LIMIT_PER_HOUR` | runtime | Share links one user may create per hour. Default `20`. |
| `NEXT_PUBLIC_SENTRY_DSN` | build and runtime | Sentry project DSN. Sentry is off without it. |
| `NEXT_PUBLIC_SENTRY_ENVIRONMENT` | build and runtime | Environment tag on Sentry events, `production` in `apphosting.yaml`. |
| `NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE` | build and runtime | Share of requests traced, 0 to 1. Default `0.1` in production. |
| `SENTRY_CAPTURE_HANDLED_TRPC_ERRORS` | runtime | `false` reports handled tRPC errors (sign-in needed, rate limits) as warnings grouped by code instead of as exceptions. Default on. |
| `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` | CI build | Source map upload from the deploy workflow. |


`apphosting.yaml` declares these by reference. The Firebase, Stripe and OpenRouter values are Secret Manager secrets; the rest are plain values.

Important: App Hosting fails the build if a secret named in `apphosting.yaml` does not exist. Create every secret below before the next deploy from `main`.

## Production setup from zero

### 1. Google Cloud project and Terraform

1. Create a Google Cloud project, link a billing account, and install the Firebase CLI and Terraform 1.5 or later.
2. Copy `infra/terraform/terraform.tfvars.example` to `terraform.tfvars` and set `project_id`, `region` (`us-central1` matches the deploy workflow) and `github_repo`.
3. From `infra/terraform`: `terraform init`, `terraform plan`, then `terraform apply`. This enables the APIs, creates the Firebase project and web app, the App Hosting backend `ensemble-app` (matching `firebase.json`), its service account and roles, and GitHub Workload Identity for the deploy workflow. If the backend already exists, import it first instead of letting Terraform create a second one.
4. Note the outputs: `app_hosting_url`, `workload_identity_provider`, `github_actions_service_account`, `firebase_web_app_id`.
5. In GitHub, repository settings, set the variables `FIREBASE_PROJECT_ID`, `WORKLOAD_IDENTITY_PROVIDER`, `DEPLOY_SERVICE_ACCOUNT`, and for Sentry `SENTRY_ORG`, `SENTRY_PROJECT`, `NEXT_PUBLIC_SENTRY_DSN` and the secret `SENTRY_AUTH_TOKEN`.

### 2. App Hosting backend

`apphosting.yaml` sets 1 vCPU, 1 GiB, `minInstances: 0` and `maxInstances: 3`, so nothing is billed while idle and the first request after a quiet spell pays a cold start of a few seconds. Pushes to `main` deploy through `.github/workflows/deploy.yml` once CI passes.

Set `APP_URL` in `apphosting.yaml` (the entry is there, commented out) to the `app_hosting_url` output now, with `BUILD` and `RUNTIME` availability, and change it to the custom domain in step 9.

### 3. Secrets

Create each secret and grant the backend access. The values come from the steps below.

```bash
firebase apphosting:secrets:set NEXT_PUBLIC_SENTRY_DSN
firebase apphosting:secrets:set NEXT_PUBLIC_FIREBASE_API_KEY
firebase apphosting:secrets:set NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
firebase apphosting:secrets:set NEXT_PUBLIC_FIREBASE_PROJECT_ID
firebase apphosting:secrets:set NEXT_PUBLIC_FIREBASE_APP_ID
firebase apphosting:secrets:set STRIPE_SECRET_KEY
firebase apphosting:secrets:set STRIPE_WEBHOOK_SECRET
firebase apphosting:secrets:set OPENROUTER_API_KEY
firebase apphosting:secrets:grantaccess NEXT_PUBLIC_SENTRY_DSN,NEXT_PUBLIC_FIREBASE_API_KEY,NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,NEXT_PUBLIC_FIREBASE_PROJECT_ID,NEXT_PUBLIC_FIREBASE_APP_ID,STRIPE_SECRET_KEY,STRIPE_WEBHOOK_SECRET,OPENROUTER_API_KEY --backend ensemble-app
```

### 4. Firestore: database, rules, indexes and the share TTL policy

1. Create the Firestore database in Native mode, in the same region as App Hosting, if it does not exist.
2. Deploy the rules and indexes from the repo root:

   ```bash
   firebase deploy --only firestore:rules,firestore:indexes --project <project-id>
   ```

   `firestore.rules`: the server writes everything through firebase-admin; a signed-in user may read only their own `users/{uid}`, `creditLedger` and `usage` documents; every other path, including `shares`, `history`, `presets`, `stripeEvents`, `stripeReversals`, `proRuns` and `rateLimits`, is closed to clients. `firestore.indexes.json` holds the composite indexes of the `/account` lists and of synced history and presets (by user and `updatedAt`). Deploy them before the first visit to `/account` or the first sign-in with sync, or those queries fail until the indexes are built.
3. The share TTL policy. `firestore.indexes.json` declares a field override on `shares.expiresAt` with `"ttl": true`, so the deploy above creates the policy. To check it, or to create it by hand instead:

   ```bash
   gcloud firestore fields ttls list --project <project-id>
   # by hand, if it is missing:
   gcloud firestore fields ttls update expiresAt --collection-group=shares --enable-ttl --project <project-id>
   ```

   The console has the same setting under Firestore, Time-to-live. Firestore deletes an expired share within about 24 hours of `expiresAt`; until then the server already treats it as gone, so an expired link never shows. TTL deletes are free of charge apart from the delete operations, which are counted like any other delete.
4. The App Hosting backend's service account needs the `Cloud Datastore User` role (`roles/datastore.user`) to read and write Firestore through firebase-admin, if its Firebase roles do not already cover it.

### 5. Firebase Auth providers and authorized domains

In the Firebase console, for the project Terraform created:

1. Authentication, Sign-in method: enable **Google**. Set the public-facing name and support email.
2. Enable **Email/Password**, then turn on **Email link (passwordless sign-in)** inside it. Password sign-in itself is not used by the app.
3. Authentication, Settings, Authorized domains: add the App Hosting domain (`ensemble-app--<project-id>.<region>.hosted.app`) and, in step 9, the custom domain. `localhost` is there by default.
4. Project settings, General, Your apps: copy the web app's `apiKey`, `authDomain`, `projectId` and `appId` into the `NEXT_PUBLIC_FIREBASE_*` secrets from step 3.

### 6. Stripe, test mode first

Use test mode until launch. No Stripe CLI is needed.

1. In the Stripe dashboard, switch to **Test mode**. Developers, API keys: copy the secret key (`sk_test_...`) into `STRIPE_SECRET_KEY`.
2. Developers, Webhooks (Event destinations): add an endpoint.
   - URL: `https://<app domain>/api/stripe/webhook`
   - Events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `charge.refunded` and `charge.dispute.created`.
   - After saving, reveal the signing secret (`whsec_...`) and store it in `STRIPE_WEBHOOK_SECRET`.
3. Settings, Business: set the public business name and support email, which Stripe shows on the Checkout page and the receipt. Settings, Emails: turn on receipts for successful payments (FR-046).
4. Test a purchase after deploying: sign in, start a checkout for the $5 pack, pay with card `4242 4242 4242 4242`, any future expiry and any CVC. The webhook's delivery log in the dashboard should show a 200 with `{"received":true,"result":"credited"}`, and `users/{uid}.balanceMicros` should be 5000000. Resending the event from the dashboard answers `"duplicate"` and adds nothing. Refunding that payment in the dashboard sends `charge.refunded`, which answers `{"received":true,"result":"reversed"}` and takes the $5 back. The `/account` page shows the purchase, the refund, each run and usage by model.

Credit packs are created per Checkout Session from `CREDIT_PACKS_USD`, so no Products or Prices need to exist in Stripe. The webhook credits a session only when its amount matches a configured pack. Bodies over 256 KiB are refused before the signature check.

**Switching to live mode** (at launch, after tax handling is decided, roadmap open question 4):

1. Activate the Stripe account (business details, bank account).
2. Switch the dashboard to live mode and repeat steps 1 and 2 there: a live secret key (`sk_live_...`) and a live webhook endpoint with the same four events, on the custom domain.
3. Replace the two secrets with the live values (`firebase apphosting:secrets:set STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` create new versions) and redeploy.
4. Make one real $5 purchase with your own card, check the balance and the dashboard, then refund it from Stripe and check the reversal.

### 7. OpenRouter key and spend cap

1. Create an account at openrouter.ai and add credit.
2. Create an API key for this app only, and give it a **monthly credit limit** (Keys, edit the key, Credit limit). This is the hard cap on what Pro can spend in a month, whatever happens in the app. Pick a figure you can afford to lose to abuse or a bug, and raise it as paid usage grows. Also set an email alert on the account balance.
3. Store it in `OPENROUTER_API_KEY` (step 3).

### 8. Budget alert

Either in the console (Billing, Budgets and alerts: a monthly budget of $10 on this project with email alerts at 50%, 90% and 100%), or with Terraform: set `billing_account_id`, `alert_email` and `monthly_budget_usd` in `terraform.tfvars` and apply. `infra/terraform/monitoring.tf` then creates the budget and enables the Billing Budget API. The account running Terraform needs the Billing Account Administrator or Costs Manager role on the billing account.

### 9. Custom domain

1. Buy the domain (roadmap open question 3).
2. Firebase console, App Hosting, the `ensemble-app` backend, Settings, Domains: add a custom domain. The console lists DNS records to create at the registrar: an `A` record (and `AAAA` where shown) for the domain, and a `TXT` record that proves ownership. For a `www.` subdomain it lists a `CNAME` instead.
3. Create those records, wait for the console to show the domain as connected and the certificate as issued (minutes to a few hours).
4. Set `APP_URL` in `apphosting.yaml` to `https://<domain>` with `BUILD` and `RUNTIME` availability, and deploy. Canonical links, the sitemap, Open Graph images and the Stripe return links then use the domain.
5. Firebase Auth, Settings, Authorized domains: add the domain, or sign-in fails there.
6. Stripe: change the webhook endpoint URL to `https://<domain>/api/stripe/webhook` in test and live mode (or add a second endpoint and remove the old one once events arrive).
7. App Check (if set up): add the domain to the reCAPTCHA Enterprise key's allowed domains.
8. Uptime check (step 11): set `uptime_check_host` to the domain.
9. Keep the `hosted.app` URL working; the deploy workflow's smoke test uses it.

### 10. Sentry

The app reports errors to Sentry when `NEXT_PUBLIC_SENTRY_DSN` is set (`packages/app/sentry.*.config.ts`, loaded by `src/instrumentation.ts`). Every event passes through `src/lib/sentryScrub.ts`, which removes auth tokens, App Check tokens, Stripe signatures, cookies, request bodies (prompts) and query strings. Session Replay records 1% of sessions and every session with an error, with all text and inputs masked. The deploy workflow uploads source maps when `SENTRY_AUTH_TOKEN` is set.

Alert rules live in Sentry, not in this repo. Create them by hand (Alerts, Create Alert) in the project:

1. **New issue**: an issue alert, "A new issue is created", environment `production`, action: email the owner. Catches any new kind of error.
2. **Error spike**: a metric alert on number of errors, environment `production`, critical above 20 in 5 minutes (adjust once you know the normal rate), action: email.
3. **Payments and Pro**: an issue alert with the filter "The event's tags match `trpcPath` starts with `proRun`", or the message contains `Stripe`, action: email at once. Handled tRPC errors carry the `trpcPath` and `trpcCode` tags.
4. Optionally a **cron or uptime monitor** in Sentry instead of the Google Cloud uptime check below.

Settings that are configurable without code: `NEXT_PUBLIC_SENTRY_ENVIRONMENT`, `NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE` and `SENTRY_CAPTURE_HANDLED_TRPC_ERRORS` (see the table above). On the Sentry free plan, keep the traces sample rate low.

### 11. Uptime check

`GET /api/health` answers `{"ok":true}` with no database or provider call. `infra/terraform/monitoring.tf` defines an uptime check on it every 5 minutes from three regions and an alert policy that emails when it fails from two regions for 10 minutes. It is off until `uptime_check_host` and `alert_email` are set in `terraform.tfvars`; then `terraform apply` enables the Monitoring API and creates the check, the alert and the email channel. Confirm the email channel from the message Google sends. Each check wakes the backend from zero, so the cost is a few seconds of Cloud Run time every 5 minutes, inside the free allowance.

### 12. App Check

Optional but recommended before launch: see the App Check section below.

## Credits and money

Balances and ledger amounts are integers in micro-dollars: 1 USD is 1,000,000. A cheap model call costs a fraction of a cent, so cents would round most calls up to a whole cent. A credit pack adds exactly what was paid: the $5 pack adds 5,000,000 micro-dollars. The margin is applied when a run is priced, not at purchase.

A Pro run reserves the high end of the pre-run estimate plus the margin, then settles at the actual token cost plus the margin, never more than the reservation, and gives back the difference. A failed run is refunded in full. Every step is an append-only entry in `creditLedger`, idempotent by run id.

When Stripe refunds a payment or the buyer opens a dispute, the webhook takes the purchase's credits back with a `reversal` entry: the refunded or disputed amount, never more than the purchase added, however many events arrive. If the credits were already spent the balance goes below zero, the workspace and `/account` say why, and Pro runs are refused until a purchase brings it back above zero. A dispute that is later won is not credited back automatically; give the credits back by hand with `grantCredits` if you want to. A refund or dispute whose purchase is not recorded yet (its own event still being retried) answers 500, so Stripe delivers it again; Stripe gives up after about three days, and the error log names the PaymentIntent.

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

## Firestore collections

| Collection | Document | Written by |
|---|---|---|
| `users/{uid}` | `balanceMicros` (cache of the ledger sum), `createdAt`, `updatedAt` | every ledger transaction |
| `creditLedger/{id}` | `uid`, `type` (`purchase`, `reserve`, `settle`, `refund`, `grant`, `reversal`), signed `amountMicros`, `balanceAfterMicros`, `createdAt`, and per-type fields (a purchase keeps its `stripePaymentIntentId`) | credit service, Stripe webhook |
| `usage/{uid}__{runId}` | the calls and tokens of a settled run, its cost and charge | `settleRun` |
| `stripeEvents/{eventId}` | Stripe events already handled | Stripe webhook |
| `stripeReversals/{sessionId}` | refund total and disputed amounts of a purchase, and the credits already taken back | Stripe webhook |
| `proRuns/{uid}__{runId}` | an open or closed Pro run: budget, call ids, calls and usage, outcome | Pro run path |
| `rateLimits/{key}` | a fixed rate-limit window: `{uid}` for Pro runs, `share__{uid}` for share links, `sync__{uid}` for sync writes | `proRun.start`, `share.create`, `sync.upsert` and `sync.remove` |
| `shares/{id}` | a shared run: `uid`, `runId`, `payload` (the run as JSON), `createdAt`, `expiresAt` (TTL field) | `share.create`, `share.delete` |
| `history/{uid}__{runId}` | a synced run: `uid`, `id`, `updatedAt`, `deleted`, `payload` (JSON, or null for a tombstone) | `sync.upsert`, `sync.remove` |
| `presets/{uid}__{presetId}` | a synced preset, same fields as `history` | `sync.upsert`, `sync.remove` |

## Sharing and synced history

- A signed-in user (Free or Pro) can share a finished run from the consensus card or a history row. The server stores a snapshot that passes a strict schema (prompt, answers, agreement, consensus and display names, nothing else) under a random 22-character id (128 bits), one link per run, valid for 30 days. Sharing the same run again refreshes the snapshot and the 30 days. The owner can delete the link from the same dialog. `SHARE_RATE_LIMIT_PER_HOUR` limits new links per user; a run over 400,000 bytes as JSON is refused. Provider error messages are not shared, since they can hold key fragments or local URLs.
- `/s/[id]` reads the share with firebase-admin on the server and renders it for anyone, signed in or not. It sets `noindex` (shared runs are user content that expires) but keeps Open Graph tags and an image (`/s/[id]/opengraph-image`) so link previews work. An unknown, expired or deleted id answers 404.
- Signed in, run history (IndexedDB) and presets (localStorage) are merged with the account's copy on sign-in: the newer copy of an item wins, a deleted item stays deleted everywhere (run and preset ids are never reused), and items only the account has are added. Later changes are sent after 1.5 seconds. A browser that last synced with a different account takes the new account's items instead of uploading its own. Signed out, nothing is sent. A run too large to sync whole (over 800,000 bytes as JSON) is sent without its embedding vectors. A run is written again only when its content changes, so reopening the page does not upload it again. Deletes made while signed out are not sent, so those runs come back at the next sign-in; runs made while signed out are dropped if a different account then signs in on that browser. Keys are never part of a run or preset; the client strips and the server refuses any field named like a key or token.

## Lighthouse

Targets for the landing page (T331, T332): performance 90 or more, accessibility 100.

Measured on 2026-11-18 against a local production build (`npm run build` in `packages/app`, then the standalone server on port 3410), with Lighthouse 12.8.2 and the Playwright headless Chromium shell, default settings (mobile emulation with simulated slow 4G and 4x CPU throttling) unless noted:

| Run | Performance | Accessibility | Best practices | SEO | FCP | LCP | TBT | CLS |
|---|---|---|---|---|---|---|---|---|
| Mobile, run 1 | 94 | 100 | 100 | 100 | 0.8 s | 2.9 s | 120 ms | 0 |
| Mobile, run 2 | 96 | 100 | 100 | 100 | 0.8 s | 2.7 s | 100 ms | 0 |
| Mobile, run 3 | 96 | 100 | 100 | 100 | 0.8 s | 2.7 s | 100 ms | 0 |
| Desktop preset | 100 | 100 | 100 | 100 | | | | |

The largest remaining cost is JavaScript the landing page loads but does not use (about 250 KiB, mostly the shared app bundle). A local run has no network latency to App Hosting and no cold start, so check again on the live domain (launch checklist).

To repeat it:

```bash
npm run build --workspace=packages/app
cd packages/app && cp -R public .next/standalone/packages/app/ && cp -R .next/static .next/standalone/packages/app/.next/
(cd .next/standalone && PORT=3410 node packages/app/server.js) &
CHROME_PATH=<path to chrome or chrome-headless-shell> npx lighthouse http://localhost:3410/ \
  --only-categories=performance,accessibility,best-practices,seo --chrome-flags="--headless=new"
```

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

## Launch checklist

Tick these in order. Items marked (owner) need an account, a payment or a DNS change.

- [ ] (owner) Google Cloud project with billing, `terraform apply` done, GitHub variables and secrets set (steps 1 and 2).
- [ ] (owner) Every secret in `apphosting.yaml` created and granted to the backend (step 3).
- [ ] (owner) Firestore database created; `firebase deploy --only firestore:rules,firestore:indexes` run; the `shares.expiresAt` TTL policy shows as active (step 4).
- [ ] (owner) Google and email link sign-in enabled; App Hosting domain authorized (step 5).
- [ ] (owner) Stripe test mode: webhook endpoint with the four events, a test purchase credited, a refund reversed (step 6).
- [ ] (owner) OpenRouter key created with a monthly credit limit and a balance alert (step 7).
- [ ] (owner) Budget alert at $10 a month (step 8).
- [ ] (owner) `APP_URL` set in `apphosting.yaml` with BUILD and RUNTIME availability. Checkout answers 503 until it is.
- [ ] Deploy from `main`; CI, the smoke test and the post-deploy E2E pass.
- [ ] Signed out, open the landing page, `/robots.txt` and `/sitemap.xml`; they name the right origin.
- [ ] Sign in, run an ensemble, share it, open the link in a private window (no account), check the preview in a link preview tool, delete the link and see it stop working.
- [ ] Sign in on a second browser and see the history and presets arrive.
- [ ] (owner) Sentry DSN set, a test error seen in Sentry, the three alert rules created (step 10).
- [ ] (owner) Uptime check and alert applied with Terraform, email channel confirmed (step 11).
- [ ] (owner) App Check registered, tokens seen in the console, then `APP_CHECK_ENFORCE` set to `true` (App Check section).
- [ ] (owner) Domain bought and connected; DNS records created; certificate issued (step 9).
- [ ] (owner) `APP_URL` changed to the domain; domain added to Firebase Auth authorized domains, the Stripe webhook URL, App Check and the uptime check (step 9).
- [ ] (owner) Tax handling decided; Stripe switched to live keys and a live webhook; one real purchase made and refunded (step 6).
- [ ] Lighthouse on the live landing page: performance 90 or more, accessibility 100.
- [ ] (owner) Benchmark results published on `/benchmarks` and in the devblog post (`docs/launch/devblog-post.md`), then the post published.
