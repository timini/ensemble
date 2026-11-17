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
