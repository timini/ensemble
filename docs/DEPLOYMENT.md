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

`apphosting.yaml` declares these by reference. The Firebase and Stripe values are Secret Manager secrets; the credit settings are plain values.

Important: App Hosting fails the build if a secret named in `apphosting.yaml` does not exist. Create every secret below before the next deploy from `main`.

## Credits and money

Balances and ledger amounts are integers in micro-dollars: 1 USD is 1,000,000. A cheap model call costs a fraction of a cent, so cents would round most calls up to a whole cent. A credit pack adds exactly what was paid: the $5 pack adds 5,000,000 micro-dollars. The margin is applied when a run is priced, not at purchase.

A Pro run reserves the high end of the pre-run estimate plus the margin, then settles at the actual token cost plus the margin, never more than the reservation, and gives back the difference. A failed run is refunded in full. Every step is an append-only entry in `creditLedger`, idempotent by run id.

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

   `firestore.rules`: the server writes everything through firebase-admin; a signed-in user may read only their own `users/{uid}`, `creditLedger` and `usage` documents; every other path, including `stripeEvents`, is closed.
3. The App Hosting backend's service account needs the `Cloud Datastore User` role (`roles/datastore.user`) to read and write Firestore through firebase-admin.

Collections:

| Collection | Document | Written by |
|---|---|---|
| `users/{uid}` | `balanceMicros` (cache of the ledger sum), `createdAt`, `updatedAt` | every ledger transaction |
| `creditLedger/{id}` | `uid`, `type` (`purchase`, `reserve`, `settle`, `refund`, `grant`), signed `amountMicros`, `balanceAfterMicros`, `createdAt`, and per-type fields | credit service, Stripe webhook |
| `usage/{uid}__{runId}` | the calls and tokens of a settled run, its cost and charge | `settleRun` |
| `stripeEvents/{eventId}` | Stripe events already handled | Stripe webhook |

## Stripe (test mode)

Use test mode until launch. No Stripe CLI is needed.

1. In the Stripe dashboard, switch to **Test mode**. Developers, API keys: copy the secret key (`sk_test_...`).
2. Developers, Webhooks (Event destinations): add an endpoint.
   - URL: `https://<app domain>/api/stripe/webhook`
   - Events: `checkout.session.completed` and `checkout.session.async_payment_succeeded`.
   - After saving, reveal the signing secret (`whsec_...`).
3. Store both as App Hosting secrets:

   ```bash
   firebase apphosting:secrets:set STRIPE_SECRET_KEY
   firebase apphosting:secrets:set STRIPE_WEBHOOK_SECRET
   firebase apphosting:secrets:grantaccess STRIPE_SECRET_KEY,STRIPE_WEBHOOK_SECRET --backend ensemble-app
   ```

4. Settings, Business: set the public business name and support email, which Stripe shows on the Checkout page and the receipt. Settings, Emails: turn on receipts for successful payments (FR-046).
5. Test a purchase after deploying: sign in, start a checkout for the $5 pack, pay with card `4242 4242 4242 4242`, any future expiry and any CVC. The webhook's delivery log in the dashboard should show a 200 with `{"received":true,"result":"credited"}`, and `users/{uid}.balanceMicros` should be 5000000. Resending the event from the dashboard answers `"duplicate"` and adds nothing.

Credit packs are created per Checkout Session from `CREDIT_PACKS_USD`, so no Products or Prices need to exist in Stripe. The webhook credits a session only when its amount matches a configured pack.

For live mode, repeat steps 1 to 3 with live keys and a live webhook endpoint, and decide tax handling first (roadmap open question 4).

## Local testing

Emulator-backed tests need Java and the Firebase CLI. They use the `demo-ensemble` project, which needs no cloud access:

```bash
npm run test:emulator --workspace=packages/app
```

This starts the Auth and Firestore emulators (`firebase.json`: ports 9099 and 8080), runs `src/**/*.emulator.test.ts` (Firestore rules, the credit ledger, the Stripe webhook against Firestore, token verification) and stops them.

To try sign-in by hand against the Auth emulator:

```bash
firebase emulators:start --only auth,firestore --project demo-ensemble
NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 \
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 \
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 \
FIREBASE_PROJECT_ID=demo-ensemble \
npm run dev:mock --workspace=packages/app
```

The emulator does not send email. Sign-in links are listed at `http://127.0.0.1:9099/emulator/v1/projects/demo-ensemble/oobCodes`.

Webhook tests sign events with the Stripe SDK's `webhooks.generateTestHeaderString` and mock the Stripe client for Checkout Session creation, so no Stripe account or network call is involved.
