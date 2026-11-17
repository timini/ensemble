# E2E Test Suite Summary

Last checked against the code: 2026-11-17.

## Suites

Tests live in `packages/e2e/` (Playwright). `playwright.config.ts` picks the server mode from `E2E_MODE`.

| Suite | Directory | Server mode | Purpose |
|---|---|---|---|
| mock-mode | `tests/mock-mode/` | `npm run dev:mock` (`NEXT_PUBLIC_MOCK_MODE=true`) | UI behaviour with mock providers. No keys needed. |
| free-mode | `tests/free-mode/` | `npm run dev:free` | Real provider calls with test keys |
| pro-mode | `tests/pro-mode/` | none | Placeholder until roadmap M5 |

Set `E2E_BASE_URL` to run against a deployed URL instead of starting a local server.

## Running

```bash
npm run test:mock --workspace=packages/e2e   # no keys needed
npm run test:free --workspace=packages/e2e   # needs TEST_*_API_KEY in env or .env.local
npm run test:ui --workspace=packages/e2e     # Playwright UI

cd packages/e2e
npx playwright test --headed --project=mock-mode
npx playwright test --debug --project=mock-mode
npx playwright test tests/mock-mode/config-page.spec.ts --project=mock-mode
npx playwright show-report
```

## Mock-mode tests (135 tests)

| File | Tests | Covers |
|---|---|---|
| `about-page.spec.ts` | 8 | About page content |
| `agreement-matrix.spec.ts` | 5 | Agreement analysis for 2, 3, 4, 5 and 6 answers (T180) |
| `config-page.spec.ts` | 11 | Mode selection, API key entry, embeddings provider |
| `consensus-presets-mock.spec.ts` | 2 | Consensus methods, majority vote breakdown |
| `ensemble-page.spec.ts` | 17 | Model selection, summarizer |
| `features-page.spec.ts` | 12 | Features page content |
| `full-workflow-mock.spec.ts` | 3 | Full journey across the four pages |
| `language-persistence.spec.ts` | 9 | EN and FR switching |
| `manual-responses.spec.ts` | 3 | Manual answers added on `/prompt` and on `/review`, scored in agreement and consensus (T179) |
| `model-id-api-call.spec.ts` | 2 | Model ids passed to provider calls |
| `not-found-page.spec.ts` | 6 | 404 page |
| `presets.spec.ts` | 5 | Saved ensembles: save, load, replace, delete, kept in localStorage (T178) |
| `prompt-page.spec.ts` | 17 | Prompt input, validation, navigation, cost estimate |
| `provider-errors.spec.ts` | 5 | One model failing with 401, 429, 503 or a timeout, and retry (T226) |
| `provider-errors-all.spec.ts` | 2 | Every model failing, then recovering on retry (T226) |
| `review-page.spec.ts` | 16 | Responses, consensus, cost, navigation |
| `review-persistence.spec.ts` | 5 | Last run kept after a reload |
| `theme-persistence.spec.ts` | 7 | Light and dark themes |

Error scenarios are simulated with the mock-only `?mockErrors=` query parameter (`packages/app/src/lib/mockErrorScenarios.ts`), so they run in CI without keys.

## Free-mode tests (6 tests)

`consensus-presets.spec.ts`, `free-mode.spec.ts` (2), `google-only.spec.ts`, `happy-path.spec.ts`, `perplexity-only.spec.ts`.

## CI

- `.github/workflows/ci.yml` runs the mock-mode suite on pull requests and pushes.
- `.github/workflows/deploy.yml` deploys `main` to Firebase App Hosting, then runs an HTTP smoke check of the deployed URL and `google-only.spec.ts` (one test, no retries, skipped when `TEST_GOOGLE_API_KEY` is not set). The full free-mode suite runs only when the workflow is dispatched by hand with `full_e2e` enabled.
- The Husky `pre-push` hook is empty. Nothing runs on push locally.

## Environment variables

| Variable | Purpose |
|---|---|
| `E2E_MODE` | `mock`, `free` or `pro` |
| `E2E_BASE_URL` | Run against this URL instead of a local server |
| `TEST_OPENAI_API_KEY`, `TEST_ANTHROPIC_API_KEY`, `TEST_GOOGLE_API_KEY`, `TEST_XAI_API_KEY`, and the other `TEST_*` keys | Free-mode provider keys |

## Adding tests

1. Put the file in `tests/mock-mode/` or `tests/free-mode/`.
2. Use `data-testid` selectors only.
3. Follow the existing `beforeEach` setup patterns.
4. Run locally before committing.
