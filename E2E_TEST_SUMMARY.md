# E2E Test Suite Summary

Last checked against the code: 2026-11-18.

## Suites

Tests live in `packages/e2e/` (Playwright). `playwright.config.ts` picks the server mode from `E2E_MODE`.

| Suite | Directory | Server mode | Purpose |
|---|---|---|---|
| mock-mode | `tests/mock-mode/` | `npm run dev:mock` (`NEXT_PUBLIC_MOCK_MODE=true`) | UI behaviour with mock providers. No keys needed. |
| free-mode | `tests/free-mode/` | `npm run dev:free` | Real provider calls with test keys |
| pro-mode | `tests/pro-mode/` | `next dev` on port 3200 with the Firebase emulators and `PRO_MOCK_UPSTREAM=true` (`fixtures/proEnv.ts`) | Sign-in, credits, Stripe webhooks and billed Pro runs. No real Stripe, Firebase or OpenRouter. |

Set `E2E_BASE_URL` to run against a deployed URL instead of starting a local server.

## Running

```bash
npm run test:mock --workspace=packages/e2e   # no keys needed
npm run test:free --workspace=packages/e2e   # needs TEST_*_API_KEY in env or .env.local
npm run test:pro --workspace=packages/e2e    # needs Java and firebase-tools; starts the emulators
npm run test:ui --workspace=packages/e2e     # Playwright UI

cd packages/e2e
npx playwright test --headed --project=mock-mode
npx playwright test --debug --project=mock-mode
npx playwright test tests/mock-mode/workspace.spec.ts --project=mock-mode
npx playwright show-report
```

## Mock-mode tests (108 tests)

The app's working screen is `/workspace`; the old wizard routes redirect into it. Shared steps (keys in the settings sheet, picking models in the composer, asking, adding an answer by hand) are in `tests/mock-mode/runHelpers.ts`.

| File | Tests | Covers |
|---|---|---|
| `about-page.spec.ts` | 8 | About page content |
| `agreement-matrix.spec.ts` | 5 | Agreement pairs and score for 2, 3, 4, 5 and 6 answers (T180) |
| `benchmarks-page.spec.ts` | 5 | Benchmarks page, not-run state, links to it |
| `consensus-methods.spec.ts` | 3 | Method menu: Ranked and Council need 3 answers, standard consensus, majority vote breakdown |
| `embeddings-unavailable.spec.ts` | 2 | No embedding calls planned and no agreement score without an embeddings provider |
| `features-page.spec.ts` | 12 | Features page content |
| `language-persistence.spec.ts` | 8 | EN and FR switching in settings, kept across reloads, pages and sessions |
| `legacy-routes.spec.ts` | 7 | `/`, `/config`, `/ensemble`, `/prompt` and `/review` land in the workspace with the right part open, query kept |
| `manual-responses.spec.ts` | 4 | Answers added by hand before, during and after a run, scored in agreement and consensus; New question drops them (T179) |
| `not-found-page.spec.ts` | 6 | 404 page |
| `openai-compatible-mock.spec.ts` | 2 | A run on Ollama endpoint models with no keys; removing an endpoint |
| `presets.spec.ts` | 5 | Saved ensembles: save, load, replace, delete, kept in localStorage (T178) |
| `provider-errors.spec.ts` | 5 | One model failing with 401, 429, 503 or a timeout, and retry (T226) |
| `provider-errors-all.spec.ts` | 2 | Every model failing, then recovering on retry (T226) |
| `run-persistence.spec.ts` | 4 | Last run kept after a reload, interrupted streams, a new run replaces the old one |
| `theme-persistence.spec.ts` | 7 | Light and dark themes |
| `workspace-settings.spec.ts` | 7 | Settings sheet: sections, how keys are kept, key count, embeddings provider, clearing data |
| `workspace.spec.ts` | 16 | First visit, model picker (keys gate models, limit of 6, ids stored), composer, cost before and after, a full run, New question |

The `local-endpoint` project (`tests/local-endpoint/local-endpoint.spec.ts`, 3 tests) runs with `test:mock`: Free mode against a fake Ollama, from detection to a 3-model run with real agreement scores at no cost.

Error scenarios are simulated with the mock-only `?mockErrors=` query parameter (`packages/app/src/lib/mockErrorScenarios.ts`), so they run in CI without keys.

## Free-mode tests (6 tests)

`consensus-presets.spec.ts`, `free-mode.spec.ts` (2), `google-only.spec.ts`, `happy-path.spec.ts`, `perplexity-only.spec.ts`. They drive the workspace with the same steps as the mock suite (`tests/free-mode/helpers.ts`).

## Pro-mode tests (5 tests)

`tests/pro-mode/pro-mode.spec.ts` replaces the old tasks T297 and T298. `npm run test:pro` runs Playwright inside `firebase emulators:exec` (Auth and Firestore, project `demo-ensemble`); the app runs in the Free build with sign-in on the Auth emulator, credits in the Firestore emulator and Pro calls answered by the server's mock upstream. Each test signs in a new address, so tests never share a balance. Shared steps are in `tests/pro-mode/proHelpers.ts`: sign-in with the email link read from the Auth emulator's out-of-band codes, Stripe events signed with the Stripe SDK's `generateTestHeaderString` and the test webhook secret, a stubbed Checkout redirect, and direct balance changes in the Firestore emulator.

| Test | Covers |
|---|---|
| New user, purchase, run, deduction | Landing page "Sign in for Pro", email-link sign-in, onboarding fills a 3-model Pro ensemble, Ask blocked with no credits (FR-036), $5 pack bought (stubbed checkout, signed webhook, a repeat answers duplicate), 3-model run with agreement and consensus, the charge in the account menu (FR-037) and on `/account` (balance, purchase, run, usage by model, FR-041) |
| Low balance | The FR-038 warning under the composer, and the run still goes ahead |
| Stop | Stop cancels every answer, nothing starts again, the run settles for what it used |
| Refund | `charge.refunded` takes the $5 back (a repeat answers duplicate), the negative balance blocks Ask, `/account` shows the refund and the negative state |
| Account page signed out | The sign-in panel on `/account`, and the dashboard after the email link returns there |

## CI

- `.github/workflows/ci.yml` runs the mock-mode suite on pull requests and pushes, and the pro-mode suite against the emulators in the App E2E (Pro Mode) job (Java 21 and firebase-tools 15).
- `.github/workflows/deploy.yml` deploys `main` to Firebase App Hosting, then runs an HTTP smoke check of the deployed URL and `google-only.spec.ts` (one test, no retries, skipped when `TEST_GOOGLE_API_KEY` is not set). The full free-mode suite runs only when the workflow is dispatched by hand with `full_e2e` enabled.
- The Husky `pre-push` hook is empty. Nothing runs on push locally.

## Environment variables

| Variable | Purpose |
|---|---|
| `E2E_MODE` | `mock`, `free` or `pro` |
| `E2E_BASE_URL` | Run against this URL instead of a local server |
| `TEST_OPENAI_API_KEY`, `TEST_ANTHROPIC_API_KEY`, `TEST_GOOGLE_API_KEY`, `TEST_XAI_API_KEY`, and the other `TEST_*` keys | Free-mode provider keys |

## Adding tests

1. Put the file in `tests/mock-mode/`, `tests/free-mode/` or `tests/pro-mode/`. Pro tests sign in a new address each (`uniqueEmail`).
2. Use `data-testid` selectors only.
3. Follow the existing `beforeEach` setup patterns.
4. Run locally before committing.
