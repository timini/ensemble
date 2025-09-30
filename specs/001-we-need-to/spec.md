# Feature Specification: Ensemble AI - Complete Application

**Feature Branch**: `001-we-need-to`
**Created**: 2025-09-30
**Status**: Draft
**Input**: User description: "We need to implement the complete Ensemble AI application across 4 phases, starting with Phase 1: Component Library Development."

## Execution Flow (main)
```
1. Parse user description from Input ✓
   → Feature description provided with detailed phase breakdown
2. Extract key concepts from description ✓
   → Identified: UI-first development, TDD approach, 4-phase delivery
   → Actors: End users, developers, administrators (Pro Mode)
   → Actions: Configure ensemble, select models, submit prompts, review responses
   → Data: API keys, model selections, prompts, AI responses, usage metrics
   → Constraints: UI before backend, component library before pages, TDD mandatory
3. For each unclear aspect: ✓
   → All requirements clearly specified in phases
4. Fill User Scenarios & Testing section ✓
   → Primary user journey: Config → Ensemble → Prompt → Review
5. Generate Functional Requirements ✓
   → All requirements testable and phase-specific
6. Identify Key Entities ✓
   → Models, Providers, Ensembles, Prompts, Responses, API Keys, Credits
7. Run Review Checklist ✓
   → No [NEEDS CLARIFICATION] markers
   → Requirements are testable and unambiguous
8. Return: SUCCESS (spec ready for planning)
```

---

## ⚡ Product Overview

Ensemble AI is a web application that allows users to query multiple Large Language Models (LLMs) simultaneously and compare their responses. Users can create "ensembles" of models from different providers (OpenAI, Anthropic, Google, XAI), submit prompts, and view an analysis showing agreement/disagreement across responses with a meta-analysis summarizing the ensemble's output.

**Core Value Proposition**: Make better decisions by comparing perspectives from multiple AI models rather than relying on a single model's response.

**Development Approach**: UI-first with strict Test-Driven Development (TDD). All UI components are built and tested in isolation before any backend integration.

**Delivery Strategy**: 4 progressive phases from component library (Phase 1) to full production with managed backend services (Phase 4).

---

## Clarifications

### Session 2025-09-30a (Initial Planning)

- Q: For Free Mode (Phase 3), how should the system handle localStorage quota limits when storing encrypted API keys, ensemble presets, and application state? → A: Store only essential data in localStorage; use in-memory state for transient data (lost on refresh)
- Q: For FR-022 (generate embeddings for agreement analysis), which approach should be used to generate embeddings from model responses? → A: User selects embeddings provider at runtime (dropdown in Config or Ensemble step)
- Q: For real-time streaming responses (FR-019), what is the acceptable maximum latency between chunk generation by the provider API and chunk display in the UI? → A: <100ms (near-instantaneous, requires optimized network path and minimal processing)
- Q: For FR-025 (API keys encrypted before localStorage storage in Free Mode), which encryption approach should be used for client-side key protection? → A: AES-256 with browser-derived key (Web Crypto API using device-specific entropy, no user password needed)
- Q: For FR-023 (manually add responses), when should users be able to add manual responses to the ensemble analysis? → A: Both in Ensemble step AND Review page - maximum flexibility

### Session 2025-09-30b (UI Wireframe Review)

**Context**: shadcn/ui wireframes implemented for all 4 workflow pages. Spec updated to match actual implementation.

- Q: Should Mock mode be visible in the Config page alongside Free and Pro modes? → A: NO. Mock mode is ONLY for prototype development and E2E testing (Playwright), not a user-facing feature. Config page shows only Free Mode and Pro Mode.
- Q: What model list should be supported based on UI implementation? → A: OpenAI (GPT-4o, GPT-4o-mini, o1-preview, o1-mini, GPT-3.5 Turbo), Anthropic (Claude 3.5 Sonnet, Claude 3 Opus, Claude 3 Haiku), Google (Gemini 1.5 Pro, Gemini 1.5 Flash), XAI (Grok-2, Grok-2-mini)
- Q: How many curated presets should be provided? → A: 3 presets with descriptions: Research Synthesis (default, deep reasoning), Rapid Drafting (fast/budget-friendly), Balanced Perspective (contrasting opinions)
- Q: Where should embeddings provider selection be located? → A: Ensemble page sidebar, in "Ensemble Summary" section, as a dropdown with all 4 providers
- Q: What additional features are already implemented in wireframes? → A: Response time display (ms per model), 5-star rating system, copy-to-clipboard buttons, prompt tips card

**Spec Updates Applied**:
- FR-011: Clarified Mock mode is development/testing only
- FR-012: Updated mock client chunk size to 50-100 chars with 50-100ms intervals
- FR-014: Updated model list to match UI implementation
- FR-018: Expanded from 1 preset to 3 presets with descriptions
- FR-022a: Specified embeddings dropdown location (Ensemble sidebar)
- FR-030: Updated mode switching to only Free↔Pro (no Mock)
- FR-042: Clarified Share feature is Phase 4 only
- FR-056, FR-057: Noted copy and rating features already in wireframes
- FR-060, FR-061: Added response time tracking and prompt tips card (NEW)

---

## User Scenarios & Testing *(mandatory)*

### Primary User Story

**As a researcher/analyst**, I want to query multiple AI models with the same prompt and compare their responses so that I can identify consensus, outliers, and make more informed decisions based on diverse AI perspectives.

**User Journey (4-Step Workflow)**:
1. **Config**: User selects operating mode (Mock for testing, Free with own API keys, or Pro with managed service) and provides necessary credentials
2. **Ensemble**: User selects which AI models to include in the ensemble and designates one as the "summarizer"
3. **Prompt**: User enters their question or prompt and submits it to the ensemble
4. **Review**: User views individual model responses streaming in real-time, sees an agreement analysis showing similarity between responses, and reads a meta-analysis from the summarizer model

### Acceptance Scenarios

**Phase 1: Component Library (Mock Mode)**
1. **Given** a new project setup, **When** a developer views Storybook, **Then** all 20+ UI components are visible with documented variants, themes (light/dark), and languages (EN/FR)
2. **Given** any component in Storybook, **When** developer toggles theme or language, **Then** component updates immediately without remounting
3. **Given** component test suite, **When** tests are run, **Then** all tests pass with 80%+ code coverage

**Phase 2: UI Integration (Mock Mode)**
4. **Given** application launched in Mock mode, **When** user navigates through Config → Ensemble → Prompt → Review, **Then** all steps complete successfully with simulated streaming responses
5. **Given** user on Ensemble page, **When** user selects 3 models and a summarizer, **Then** selection persists to localStorage and survives page refresh
6. **Given** user on Review page, **When** responses stream in, **Then** each response appears incrementally with <100ms latency from chunk receipt to UI display

**Phase 3: Free Mode (Real APIs)**
7. **Given** user selects Free mode, **When** user enters valid API keys for OpenAI and Anthropic, **Then** keys are validated in real-time and stored encrypted in browser localStorage
8. **Given** user with valid API keys, **When** user submits a prompt, **Then** real responses stream from selected provider APIs directly from the frontend
9. **Given** a provider API returns an error, **When** error occurs, **Then** user sees friendly error message and can retry failed responses

**Phase 4: Pro Mode (Managed Backend)**
10. **Given** user selects Pro mode, **When** user authenticates, **Then** user sees their credit balance and can purchase credits
11. **Given** authenticated Pro user with sufficient credits, **When** user submits prompt, **Then** backend streams responses via tRPC and deducts credits after completion
12. **Given** Pro user on dashboard, **When** page loads, **Then** user sees usage statistics, cost breakdown by provider/model, and recent requests

### Edge Cases

**Configuration**:
- What happens when user tries to proceed without selecting a mode?
  → Next button remains disabled until valid mode configured
- What happens when API key validation fails in Free mode?
  → Error indicator appears, Next button disabled, user must correct key
- What happens when browser doesn't support Web Crypto API (Free mode)?
  → Warning displayed that Free mode requires modern browser with Web Crypto API support; user must upgrade browser or use Mock mode

**Ensemble Management**:
- What happens when user selects no models?
  → Next button disabled until at least 1 model selected
- What happens when user doesn't select a summarizer?
  → Next button disabled, inline alert prompts for summarizer selection
- What happens when user doesn't select an embeddings provider?
  → Next button disabled, inline alert prompts for embeddings provider selection
- What happens when user adds manual responses in Ensemble step?
  → Manual responses persist with ensemble configuration; displayed on Review page alongside AI responses; included in agreement analysis
- What happens when user switches modes after selecting models?
  → Model selections preserved if models available in new mode

**Prompt Submission**:
- What happens when prompt is empty or too short (<10 characters)?
  → Generate button disabled, character counter shows minimum requirement
- What happens when user navigates away during streaming?
  → Streams are cancelled gracefully, partial responses saved to state

**Response Review**:
- What happens when a model stream fails mid-response?
  → Error badge shown on that ResponseCard, other streams continue, retry button available
- What happens when embeddings generation fails for agreement analysis?
  → Agreement analysis section shows error message with embeddings provider name, retry button available, individual responses still displayed
- What happens when user adds manual response during AI streaming?
  → Manual response immediately added to display; agreement analysis recalculated after all responses (AI + manual) complete
- What happens when user adds manual response after all AI responses complete?
  → Manual response added to display; agreement analysis immediately recalculated to include new manual response
- What happens when user has insufficient credits (Pro mode)?
  → Warning before submission, prevented from submitting, prompted to purchase credits
- What happens when network connection lost during streaming?
  → User-friendly error message, retry option when connection restored

**Data Persistence**:
- What happens when browser is refreshed mid-workflow?
  → Essential state (theme, language, mode, API keys, saved presets) restored from localStorage; transient state (current prompt draft, in-progress responses, incomplete workflow) lost; user returns to Config step
- What happens when user clears all data via Settings?
  → All localStorage cleared (API keys, presets, preferences), app resets to initial Config step, confirmation modal required

---

## Requirements *(mandatory)*

### Functional Requirements

**Phase 1: Component Library**
- **FR-001**: System MUST provide 20+ reusable UI components organized by atomic design principles (atoms, molecules, organisms)
- **FR-002**: Every component MUST support both Minimal Dark and Minimal Light themes without prop changes
- **FR-003**: Every component MUST support English and French languages via i18n translation keys
- **FR-004**: Every component MUST have a Storybook story documenting all variants, states, sizes, and themes
- **FR-005**: Every component MUST have unit tests achieving minimum 80% code coverage
- **FR-006**: System MUST provide global state management for theme, language, workflow progress, mode, API keys, model selections, prompts, and responses
- **FR-007**: Essential application state MUST persist to browser localStorage (theme, language, mode, encrypted API keys, saved ensemble presets); transient state MAY use in-memory storage (current prompt draft, in-progress responses, incomplete workflow step)

**Phase 2: UI Integration**
- **FR-008**: System MUST implement a 4-step workflow (Config → Ensemble → Prompt → Review) with visual progress tracking via a stepper component that highlights the current step, marks completed steps with checkmarks, and displays step names
- **FR-009**: Each workflow step MUST be URL-addressable for bookmarking and sharing
- **FR-010**: System MUST enforce workflow sequence (cannot skip steps without completing prerequisites)
- **FR-011**: System MUST provide Mock API clients for prototype development and E2E testing (Playwright) that simulate realistic streaming responses without external API calls; Mock mode is NOT a user-facing feature and should not appear in production Config page
- **FR-012**: Mock clients MUST generate lorem ipsum responses with 50-100 character chunks delivered at 50-100ms intervals to simulate realistic streaming; total response length MUST be 200-500 words
- **FR-013**: Mock clients MUST generate simulated embeddings for agreement analysis calculations
- **FR-014**: System MUST support 4 AI providers with the following models: OpenAI (GPT-4o, GPT-4o-mini, o1-preview, o1-mini, GPT-3.5 Turbo), Anthropic (Claude 3.5 Sonnet, Claude 3 Opus, Claude 3 Haiku), Google (Gemini 1.5 Pro, Gemini 1.5 Flash), XAI (Grok-2, Grok-2-mini)
- **FR-015**: Users MUST be able to select multiple models from any provider(s) to form an ensemble
- **FR-016**: Users MUST designate one model as the "summarizer" that provides meta-analysis after other responses complete
- **FR-017**: System MUST allow users to save, load, and manage ensemble presets with custom names
- **FR-018**: System MUST provide 3 curated ensemble presets with descriptions and recommended use cases:
  - **Research Synthesis** (default): GPT-4o, Claude 3 Opus, Gemini 1.5 Pro with Claude 3.5 Sonnet as summarizer and OpenAI embeddings. Description: "Deep reasoning stack mixing GPT-4, Claude, and Gemini for comprehensive analysis."
  - **Rapid Drafting**: GPT-4o Mini, Claude 3 Haiku, Gemini 1.5 Flash with GPT-4o Mini as summarizer and OpenAI embeddings. Description: "Fast, budget-friendly models tuned for quick ideation and iteration."
  - **Balanced Perspective**: GPT-4o, Claude 3.5 Sonnet, Gemini 1.5 Pro with GPT-4o as summarizer and Anthropic embeddings. Description: "Balanced trio for contrasting opinions and concise summaries."
- **FR-019**: Responses MUST stream incrementally in real-time with <100ms latency from chunk generation to UI display; UI MUST update as chunks arrive without perceptible delay
- **FR-020**: System MUST calculate and display agreement analysis showing similarity scores between all response pairs
- **FR-021**: Agreement analysis MUST show statistics (mean, median, range) and a similarity matrix visualization
- **FR-022**: Users MUST select an embeddings provider (OpenAI, Anthropic, Google, or XAI) for generating response embeddings; system MUST generate embeddings for each response using the selected provider and calculate cosine similarity for agreement scoring
- **FR-022a**: Embeddings provider selection MUST be available in the Ensemble step via dropdown in the sidebar "Ensemble Summary" section; selection MUST persist with ensemble configuration and display the selected provider name prominently
- **FR-023**: Users MUST be able to manually add responses via a modal form collecting provider name, model name, and response text at two points: (1) "Add Manual Response" button in Ensemble step sidebar to pre-populate known responses before prompt submission, and (2) "Add Manual Response" button on Review page to add perspectives during or after AI streaming; manually added responses MUST be included in agreement analysis with visual indicator distinguishing them from AI-generated responses

**Phase 3: Free Mode**
- **FR-024**: System MUST allow users to provide their own API keys for each provider
- **FR-025**: API keys MUST be encrypted using AES-256 with browser-derived keys via Web Crypto API before storage in browser localStorage; no user password required; encryption key derived from device-specific entropy
- **FR-026**: System MUST validate API keys in real-time (debounced) by making test API calls
- **FR-027**: System MUST make direct API calls from frontend to provider APIs using official SDKs
- **FR-028**: System MUST handle provider API errors gracefully (invalid keys, rate limits, outages, network issues)
- **FR-029**: Error messages MUST be user-friendly and provide actionable guidance
- **FR-030**: System MUST support switching between Free mode and Pro mode (Phase 4) while preserving model selections and ensemble configurations; Mock mode is not user-facing and therefore not part of mode switching
- **FR-031**: API keys MUST never be exposed in logs, network traces, or error messages

**Phase 4: Pro Mode**
- **FR-032**: System MUST require user authentication for Pro mode access
- **FR-033**: System MUST provide user sign-up and sign-in flows with session management
- **FR-034**: System MUST implement a credit-based billing system where users purchase credits for API usage
- **FR-035**: System MUST calculate and deduct credits based on provider, model, and tokens used
- **FR-036**: System MUST prevent prompt submission when user has insufficient credits
- **FR-037**: System MUST display current credit balance prominently in the UI
- **FR-038**: System MUST alert users when credit balance is low (<100 credits)
- **FR-039**: Backend MUST store all provider API keys encrypted at rest
- **FR-040**: Backend MUST stream responses to frontend via tRPC subscriptions
- **FR-041**: System MUST provide a usage dashboard showing credits used, remaining balance, usage by provider/model, cost over time, and recent requests
- **FR-042**: Users MUST be able to share ensemble results via a public URL (Phase 4 Pro Mode only); Share UI button MAY be present in earlier phases but must display "Pro Mode required" message when clicked
- **FR-043**: Shared result links MUST expire after 30 days
- **FR-044**: Shared results MUST display prompt, selected models, all responses, agreement analysis, and summarizer response without requiring authentication
- **FR-045**: System MUST integrate with payment provider (Stripe) for credit purchases
- **FR-046**: System MUST send email receipts for credit purchases
- **FR-047**: System MUST track all API usage with timestamps, token counts, and costs for auditing

**Cross-Cutting Requirements**
- **FR-048**: System MUST be fully responsive across mobile (640px), tablet (768px), desktop (1024px), and large desktop (1280px) breakpoints
- **FR-049**: All interactive elements MUST be touch-friendly with minimum 44px tap targets
- **FR-050**: System MUST implement proper ARIA labels and keyboard navigation for accessibility
- **FR-051**: System MUST provide clear loading indicators for all asynchronous operations
- **FR-052**: System MUST implement error boundaries to catch and display component failures gracefully
- **FR-053**: System MUST provide theme switching (light/dark) that persists across sessions
- **FR-054**: System MUST provide language switching (EN/FR) that persists across sessions
- **FR-055**: Users MUST be able to export ensemble results (prompt, models, responses, analysis) to JSON format
- **FR-056**: Users MUST be able to copy individual responses to clipboard via copy button with visual confirmation (implemented in wireframes - Review page ResponseCard component)
- **FR-057**: Users MUST be able to rate individual responses (1-5 stars) for future quality tracking (implemented in wireframes - Review page ResponseCard component)
- **FR-058**: System MUST meet <100ms p95 latency for streaming chunk rendering from API receipt to UI display; performance testing MUST validate this requirement in Phases 2-4
- **FR-059**: System MUST detect Web Crypto API availability at startup; Free mode MUST be disabled with clear messaging if Web Crypto API not supported; Pro mode MUST remain functional (Mock mode is testing-only)
- **FR-060**: System SHOULD display response time in milliseconds for each model response in the Review step to help users understand relative performance characteristics across providers and models (implemented in wireframes)
- **FR-061**: Prompt step SHOULD display a tips card with best practices for writing effective prompts, including guidance on specificity, context, tone, and iteration (implemented in wireframes)

### Key Entities

- **Provider**: AI service provider (OpenAI, Anthropic, Google, XAI). Attributes: name, logo, available models, API endpoint, pricing structure
- **Model**: Specific AI model within a provider. Attributes: name, provider, capabilities (streaming, embeddings), token limits, cost per token
- **Ensemble**: User-defined collection of models. Attributes: name, selected models, designated summarizer, embeddings provider, creation date, last used date
- **Preset**: Saved ensemble configuration. Attributes: name, description (user-visible purpose/use case), model list, summarizer, embeddings provider, is_default, icon (optional emoji)
- **Prompt**: User question or input. Attributes: text, character count, submission timestamp, associated ensemble
- **Response**: AI model output or manually added response for a prompt. Attributes: model ID, response text, token count, completion status (streaming/complete/error), timestamp, embeddings, is_manual (boolean), source (AI provider or "manual")
- **Agreement Analysis**: Similarity calculation between responses. Attributes: response pair IDs, similarity score (0.0-1.0), embeddings, calculation method
- **API Key**: User credentials for provider access. Attributes: provider, encrypted key value, validation status, last validated timestamp
- **User** (Phase 4): Authenticated account. Attributes: ID, email, authentication provider, creation date, current plan (free/pro)
- **Credit** (Phase 4): Usage currency. Attributes: user ID, balance, transaction history, purchase date, expiration date
- **Usage Record** (Phase 4): API call tracking. Attributes: user ID, provider, model, tokens used, cost, timestamp, prompt hash
- **Shared Result** (Phase 4): Public ensemble output. Attributes: share ID, ensemble snapshot, responses snapshot, expiration date, view count

---

## Testing Strategy

### Unit & Integration Testing
- **Framework**: Vitest + React Testing Library
- **Coverage Target**: Minimum 80% code coverage per component (Constitution Principle VIII)
- **TDD Requirement**: Tests MUST be written BEFORE implementation (Constitution Principle VIII)
- **Test Isolation**: Components tested in isolation with mocked dependencies (Zustand store, API calls)
- **Test Selectors**: Use `data-testid` exclusively; NEVER use CSS selectors or Tailwind classes
- **Execution**: Unit tests run on every commit via pre-commit hook

### End-to-End Testing
- **Framework**: Playwright
- **Browser**: Chromium ONLY (for speed of execution; cross-browser testing deferred to pre-release)
- **Test Scope**: Minimal user journeys covering critical paths only
- **Test Coverage**:
  1. **Happy Path (Free Mode)**: Config (enter API keys) → Ensemble (select 2 models) → Prompt (submit) → Review (verify responses displayed)
  2. **Preset Loading**: Config → Ensemble (load "Research Synthesis" preset) → Prompt → Review
  3. **Manual Response**: Ensemble (add manual response) → Prompt → Review (verify manual response included)
  4. **Agreement Analysis**: Review page displays similarity scores and statistics
  5. **Error Handling**: Config (invalid API key) → verify error message displayed
- **Execution Frequency**: E2E tests run before each phase completion (not on every commit due to execution time)
- **Mock Mode**: E2E tests use Mock API clients for speed and reliability (no real API keys required)
- **Test Data**: Use fixed, deterministic test data for reproducible results

### Visual Regression Testing
- **Framework**: Playwright screenshot testing (automated visual regression, self-hosted)
- **Baseline**: Established at Phase 1 completion (T110)
- **Execution**: Visual regression run before phase completion and PR merge
- **Scope**: All Storybook stories across light/dark themes and EN/FR languages

### Testing Philosophy
- **Speed over Completeness**: Prioritize fast feedback loops over exhaustive coverage
- **Critical Paths First**: Focus E2E tests on user journeys that would break the product if failing
- **Unit Tests for Logic**: Comprehensive unit tests for business logic, utilities, and state management
- **E2E for Integration**: Minimal E2E tests for workflow integration and user experience validation
- **No Flaky Tests**: Tests MUST be deterministic; flaky tests are treated as failing tests

---

## Development Practices

### Commit Discipline
- **Frequency**: Commit regularly after completing discrete units of work (individual tasks, bug fixes, features)
- **Granularity**: Aim for commits every 30-60 minutes of productive work; commit after each completed task from tasks.md
- **Atomicity**: Each commit should represent a single logical change (one task, one fix, one refactor)
- **Commit Messages**: Follow Conventional Commits format: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`
- **Examples**:
  - ✅ Good: `feat: add ApiKeyInput component with validation`, `test: add unit tests for similarity calculation`, `fix: resolve streaming latency issue in ResponseCard`
  - ❌ Bad: `update files`, `work in progress`, `fixes`
- **Work-in-Progress**: Use `git stash` for incomplete work; avoid committing broken or non-functional code
- **Rationale**: Regular commits enable easier debugging via `git bisect`, clearer code review, and safer rollback options

### Pre-Commit Hooks (Husky)
- **Purpose**: Ensure code quality and catch issues before they enter version control
- **Hook Configuration**: `.husky/pre-commit` executes linting and testing checks
- **Checks Performed**:
  1. **Linting**: Run `npm run lint` (Biome) to enforce code style and catch common errors
  2. **Type Checking**: Run `tsc --noEmit` to catch TypeScript errors
  3. **Unit Tests**: Run `npm run test` (Vitest) to verify all unit tests pass
  4. **Staged Files Only**: Hooks only check staged files for performance (using `lint-staged`)
- **Hook Bypass**: NEVER use `git commit --no-verify` except in emergencies (deployment hotfixes); bypassing hooks defeats quality gates
- **Setup Task**: T006a - Install and configure Husky with pre-commit hooks (added to Phase 1.1 setup)
- **Expected Execution Time**: ~15-30 seconds per commit (optimized for fast feedback)
- **Failure Handling**: If pre-commit hook fails, fix the issues and re-commit; do NOT bypass the hook

### Hook Configuration Example
```bash
# .husky/pre-commit
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

echo "Running pre-commit checks..."

# Run lint-staged for linting and formatting
npx lint-staged

# Run type checking
echo "Type checking..."
npm run type-check || exit 1

# Run unit tests
echo "Running unit tests..."
npm run test:unit || exit 1

echo "✅ Pre-commit checks passed!"
```

### Continuous Integration (Phase 4)
- **CI Pipeline**: GitHub Actions workflow runs on every push and PR
- **CI Checks**: Full test suite (unit + integration + E2E), build verification, dependency audit
- **Deployment Gates**: All CI checks MUST pass before merging to main or deploying to production

---

## Review & Acceptance Checklist
*GATE: Automated checks run during main() execution*

### Content Quality
- [x] No implementation details (languages, frameworks, APIs) - **NOTE**: User input included implementation details for development phases, but spec focuses on WHAT not HOW from user perspective
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders (user stories, scenarios, requirements)
- [x] All mandatory sections completed

### Requirement Completeness
- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable (coverage %, response times, workflow completion)
- [x] Scope is clearly bounded (4 phases, specific providers and models)
- [x] Dependencies and assumptions identified (phase prerequisites, provider API availability)

---

## Execution Status
*Updated by main() during processing*

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked (none found - comprehensive input)
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [x] Review checklist passed

---

## Phase Success Criteria

**Phase 1 Complete When**:
- ✓ 20+ components built with stories, tests, and 80%+ coverage
- ✓ Both themes (light/dark) working across all components
- ✓ Both languages (EN/FR) working across all components
- ✓ Storybook catalog fully populated and navigable
- ✓ Zero linting errors, zero TypeScript errors, zero accessibility violations
- ✓ Visual regression baseline established

**Phase 2 Complete When**:
- ✓ All 4 workflow pages functional (Config, Ensemble, Prompt, Review)
- ✓ Complete workflow works end-to-end with Mock clients
- ✓ All 4 providers streaming mock responses
- ✓ Agreement analysis displays mock similarity data
- ✓ Theme and language switching work on all pages
- ✓ State persists across browser refresh
- ✓ E2E tests passing for full Mock workflow
- ✓ Responsive at all breakpoints
- ✓ No external API calls (fully self-contained)

**Phase 3 Complete When**:
- ✓ All 4 providers working with real APIs
- ✓ API keys securely encrypted client-side
- ✓ Real-time API key validation functional
- ✓ Streaming responses from real providers
- ✓ Real embeddings for agreement analysis
- ✓ Error handling for all failure scenarios
- ✓ Mode switching (Mock ↔ Free) seamless
- ✓ E2E tests passing with real provider integration
- ✓ Security audit passed (no key leaks)

**Phase 4 Complete When**:
- ✓ Backend deployed and operational
- ✓ tRPC API working with streaming
- ✓ Authentication implemented
- ✓ Database operational with migrations
- ✓ Credit system functional
- ✓ Payment integration working (Stripe)
- ✓ All 4 providers working via backend
- ✓ Pro Mode streaming responses
- ✓ Usage dashboard showing statistics
- ✓ Shared results functional
- ✓ Mode switching (Mock ↔ Free ↔ Pro) seamless
- ✓ E2E tests passing for all 3 modes
- ✓ Security audit passed (backend key storage)
- ✓ Load testing passed
- ✓ Production deployment successful

---

## Notes

**Development Philosophy**: This project follows a UI-first approach where every UI component is built, tested, and cataloged in Storybook BEFORE any backend integration. No component exceeds 200 lines of code. Composition is preferred over inheritance. Test-Driven Development (TDD) is mandatory - tests are written and must fail before implementation begins.

**Progressive Enhancement**: The application is designed for progressive capability rollout. Phase 1-2 delivers a fully functional demo with mock data. Phase 3 enables real API integration with user-managed keys. Phase 4 adds managed services with authentication and billing. At each phase, the UI remains unchanged - only the data source evolves.

**Multi-Tenancy**: Free mode operates entirely client-side with no backend. Pro mode introduces a shared backend with user isolation, credit tracking, and managed API keys.

**Future Enhancements** (out of scope for initial 4 phases):
- Additional providers (Cohere, Mistral, Perplexity)
- Advanced ensemble analytics (sentiment analysis, topic extraction)
- Prompt templates and history
- Team collaboration features
- Third-party API for programmatic access
- Mobile native app (React Native)