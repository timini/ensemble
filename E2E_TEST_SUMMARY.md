# E2E Test Suite Summary

Last checked against the code: 2026-11-15.

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

## Mock-mode tests (105 tests)

| File | Tests | Covers |
|---|---|---|
| `about-page.spec.ts` | 8 | About page content |
| `config-page.spec.ts` | 10 | Mode selection, API key entry |
| `consensus-presets-mock.spec.ts` | 1 | Consensus presets |
| `ensemble-page.spec.ts` | 17 | Model selection (2 to 6), summarizer |
| `features-page.spec.ts` | 12 | Features page content |
| `full-workflow-mock.spec.ts` | 3 | Full journey across the four pages |
| `language-persistence.spec.ts` | 9 | EN and FR switching |
| `model-id-api-call.spec.ts` | 2 | Model ids passed to provider calls |
| `not-found-page.spec.ts` | 6 | 404 page |
| `prompt-page.spec.ts` | 16 | Prompt input, validation, navigation |
| `review-page.spec.ts` | 14 | Responses, consensus, navigation |
| `theme-persistence.spec.ts` | 7 | Light and dark themes |

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
