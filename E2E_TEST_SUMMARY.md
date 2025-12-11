# E2E Test Suite Summary

## Test Architecture

E2E tests are located in `packages/e2e/` and organized into three test suites:

### Test Suites

| Suite | Directory | Server Mode | Purpose |
|-------|-----------|-------------|---------|
| **mock-mode** | `tests/mock-mode/` | `NEXT_PUBLIC_MOCK_MODE=true` | UI testing with mock API clients |
| **free-mode** | `tests/free-mode/` | `NEXT_PUBLIC_MOCK_MODE=false` | Integration testing with real APIs |
| **pro-mode** | `tests/pro-mode/` | Backend services | Phase 4 (placeholder) |

### Configuration

The Playwright configuration (`packages/e2e/playwright.config.ts`) dynamically selects the server mode based on the `E2E_MODE` environment variable:

- `E2E_MODE=mock` (default): Starts server with `npm run dev:mock`
- `E2E_MODE=free`: Starts server with `npm run dev:free`

## Running Tests

### Mock Mode (Default)
```bash
# No API keys required
npm run test:mock --workspace=packages/e2e
```

### Free Mode
```bash
# Requires API keys in environment or .env.local
npm run test:free --workspace=packages/e2e
```

### Interactive Mode
```bash
# UI mode for debugging
npm run test:ui --workspace=packages/e2e

# Headed browser
npx playwright test --headed --project=mock-mode

# Debug mode
npx playwright test --debug --project=mock-mode
```

## Mock Mode Tests (68 tests)

### Test Files

| File | Tests | Description |
|------|-------|-------------|
| `config-page.spec.ts` | 9 | Mode selection, API key configuration |
| `ensemble-page.spec.ts` | 12 | Model selection (2-6), summarizer designation |
| `prompt-page.spec.ts` | 12 | Prompt input, validation, navigation |
| `review-page.spec.ts` | 12 | Response display, navigation buttons |
| `full-workflow-mock.spec.ts` | 3 | Complete user journey |
| `theme-persistence.spec.ts` | 8 | Light/dark theme switching |
| `language-persistence.spec.ts` | 12 | EN/FR language switching |

### Coverage

- All 4 workflow pages
- State persistence (localStorage)
- Theme switching
- Language switching (i18n)
- Cross-page navigation
- Streaming responses (mock)
- Consensus generation (mock)

## CI Configuration

### GitHub Actions (`.github/workflows/ci.yml`)

**Mock Mode Job** (always runs):
```yaml
app-e2e-mock:
  env:
    E2E_MODE: 'mock'
    NEXT_PUBLIC_MOCK_MODE: 'true'
```

**Free Mode Job** (runs when secrets configured):
```yaml
app-e2e-free:
  if: ${{ github.event_name == 'push' || github.event.pull_request.head.repo.full_name == github.repository }}
  env:
    E2E_MODE: 'free'
    NEXT_PUBLIC_MOCK_MODE: 'false'
    TEST_OPENAI_API_KEY: ${{ secrets.TEST_OPENAI_API_KEY }}
    TEST_ANTHROPIC_API_KEY: ${{ secrets.TEST_ANTHROPIC_API_KEY }}
    TEST_GOOGLE_API_KEY: ${{ secrets.TEST_GOOGLE_API_KEY }}
    TEST_XAI_API_KEY: ${{ secrets.TEST_XAI_API_KEY }}
```

## Environment Variables

| Variable | Description | Required For |
|----------|-------------|--------------|
| `E2E_MODE` | Test mode (`mock`, `free`, `pro`) | All tests |
| `TEST_OPENAI_API_KEY` | OpenAI API key | Free mode |
| `TEST_ANTHROPIC_API_KEY` | Anthropic API key | Free mode |
| `TEST_GOOGLE_API_KEY` | Google API key | Free mode |
| `TEST_XAI_API_KEY` | XAI API key | Free mode |

## Pre-Push Hook

The pre-push hook (`.husky/pre-push`) runs mock-mode E2E tests before push:

```bash
npm run test:mock --workspace=packages/e2e
```

## Debugging Failed Tests

### View HTML Report
```bash
cd packages/e2e
npx playwright show-report
```

### Run Single Test File
```bash
npx playwright test tests/mock-mode/config-page.spec.ts --project=mock-mode
```

### Check Server Logs
The Playwright webServer logs are visible during test runs. Look for:
- `GET /config 200` - Pages loading successfully
- Compilation errors
- API client errors

## Adding New Tests

1. Create test file in appropriate directory (`tests/mock-mode/`, `tests/free-mode/`)
2. Use `data-testid` selectors for reliability
3. Follow existing patterns for setup (beforeEach with state configuration)
4. Run locally before committing
