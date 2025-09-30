# Tasks: Ensemble AI - Complete Application

**Input**: Design documents from `/specs/001-we-need-to/`
**Prerequisites**: plan.md (✓), spec.md (✓), constitution.md (✓)

## Execution Flow (main)
```
1. Load plan.md from feature directory → ✓ COMPLETE
   → Extracted: Next.js 14, React 19, TypeScript 5.x, Tailwind v4, Zustand, tRPC v11
   → Structure: Single project evolving to full-stack (src/components, src/providers, src/store)
2. Load optional design documents:
   → spec.md: 59 functional requirements across 4 phases → ✓ LOADED
   → data-model.md: 12 entities (embedded in plan.md) → ✓ LOADED
   → contracts/: 5 tRPC routers (referenced in plan.md) → ✓ LOADED
3. Generate tasks by category:
   → Setup: Project init, dependencies, linting, Storybook, testing infrastructure
   → Component: 20+ components (atoms, molecules, organisms) with stories + tests
   → Page: 4 pages (Config, Ensemble, Prompt, Review) with E2E tests
   → Provider: AIProvider interface + 4 implementations with 3 client modes each
   → Backend: tRPC routers, database, authentication, credit system (Phase 4)
   → Testing: E2E suites, visual regression, accessibility audits
   → Documentation: /docs files, README updates, SPEC.md versioning
4. Apply task rules:
   → Different files = mark [P] for parallel
   → Same file = sequential (no [P])
   → Tests before implementation (TDD mandatory per Constitution Principle VIII)
   → Atoms before molecules before organisms (dependency order)
5. Number tasks sequentially (T001, T002...) → ✓ READY
6. Generate dependency graph → ✓ BELOW
7. Create parallel execution examples → ✓ BELOW
8. Validate task completeness:
   → All components have story + test + implementation? → ✓ YES
   → All pages have E2E test first? → ✓ YES
   → All providers implemented? → ✓ YES
9. Return: SUCCESS (tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
- **Single project structure**: `src/`, `tests/`, `public/` at repository root
- Paths shown below assume single project - structure evolves from simple to full-stack

## Development Practices

### Commit Discipline
- **Frequency**: Commit after completing each discrete task (aim for every 30-60 minutes of productive work)
- **Atomicity**: One commit per task from this file (e.g., T001, T002, etc.)
- **Pre-Commit Hooks**: Husky hooks run linting, type checking, and unit tests before every commit (~15-30s)
- **Hook Bypass**: NEVER use `--no-verify` except in emergencies
- **Commit Messages**: Use Conventional Commits format (`feat:`, `fix:`, `test:`, `refactor:`, `docs:`)
- **Examples**:
  - ✅ `feat: add ApiKeyInput component with validation (T062)`
  - ✅ `test: add unit tests for similarity calculation (T106)`
  - ❌ `update files`, `wip`, `fixes`

### Testing Strategy
- **Unit Tests**: Vitest + React Testing Library, 80%+ coverage, run on every commit via pre-commit hook
- **E2E Tests**: Playwright, chromium ONLY (for speed), Mock mode by default, minimal critical path coverage
- **TDD Required**: Write tests BEFORE implementation (Constitution Principle VIII)
- **E2E Execution**: Before phase completion only (not every commit due to execution time)
- **Visual Regression**: Chromatic on phase completion and PR merge

### Pre-Commit Hook (Husky)
Configured in T006a-T006c, runs automatically on every commit:
1. Linting (Biome) on staged files
2. Type checking (`tsc --noEmit`)
3. Unit tests (`npm run test:unit`)
4. Expected time: 15-30 seconds

---

## Phase 1: Component Library Development (4 weeks, ~80 tasks)

### Phase 1.1: Setup & Infrastructure (Week 1, Days 1-5)

- [X] T001 Create Next.js 14 project with TypeScript: `npx create-next-app@latest ensemble-ai --typescript --tailwind --app` (T3 stack with Next.js 15, already created)
- [X] T002 Initialize Git repository and create .gitignore for Next.js (already initialized)
- [X] T003 [P] Install dependencies: `npm install zustand react-i18next i18next` (zustand v5.0.8, react-i18next v16.0.0, i18next v25.5.2)
- [X] T004 [P] Install dev dependencies: `npm install -D @storybook/nextjs @storybook/addon-a11y vitest @testing-library/react @testing-library/user-event @vitest/ui jsdom` (Storybook v9.1.9, Vitest v3.2.4, Testing Library installed)
- [X] T005 [P] Install Playwright: `npm install -D @playwright/test` (Playwright v1.55.1)
- [X] T006 [P] Install Biome: `npm install -D @biomejs/biome` (ADAPTED: Using existing ESLint + Prettier instead of Biome)
- [X] T006a [P] Install Husky and lint-staged: `npm install -D husky lint-staged && npx husky init` (husky v9.1.7, lint-staged v16.2.3)
- [X] T006b Configure lint-staged in package.json for staged file linting and formatting (ESLint + Prettier on TypeScript/JavaScript files)
- [X] T006c Create .husky/pre-commit hook with linting, type checking, and unit test execution (15-30s target execution time) (lint-staged + typecheck configured, unit tests pending Phase 1.2)
- [X] T007 Configure Biome linter in biome.json with TypeScript, React, and Next.js rules (ADAPTED: Using existing ESLint configuration from T3 stack)
- [X] T008 Configure Tailwind CSS v4 in tailwind.config.js with custom theme tokens (card, cardBorder, cardHover, primary, secondary, danger, ghost colors) (Configured in globals.css using Tailwind v4 @theme directive)
- [X] T009 Create src/styles/globals.css with Tailwind imports and CSS variables for light/dark themes (Completed with full light/dark theme support and all custom colors)
- [X] T010 [P] Initialize Storybook: `npx storybook@latest init` (Storybook v9.1.9 with Vite builder initialized in packages/component-library, includes a11y and vitest addons)
- [ ] T011 Configure Storybook for Next.js in .storybook/main.ts with addons: a11y, docs, controls
- [ ] T012 Create .storybook/preview.ts with theme decorator and i18n decorator
- [ ] T013 [P] Create .storybook/decorators/ThemeDecorator.tsx for light/dark theme switching
- [ ] T014 [P] Create .storybook/decorators/I18nDecorator.tsx for EN/FR language switching
- [ ] T015 Configure Vitest in vitest.config.ts with jsdom environment and React Testing Library
- [ ] T016 Configure Playwright in playwright.config.ts with chromium ONLY (for speed; cross-browser testing deferred to pre-release)
- [ ] T017 Create src/store/index.ts with Zustand root store and persistence middleware
- [ ] T018 [P] Create src/store/slices/themeSlice.ts with light/dark theme state
- [ ] T019 [P] Create src/store/slices/languageSlice.ts with EN/FR language state
- [ ] T020 [P] Create src/store/middleware/persistenceMiddleware.ts for localStorage sync
- [ ] T021 Create public/locales/en/common.json with initial EN translations (app name, navigation, common labels)
- [ ] T022 Create public/locales/fr/common.json with initial FR translations
- [ ] T023 Configure react-i18next in src/lib/i18n.ts with EN/FR resources
- [ ] T024 Create src/app/layout.tsx with root layout, theme provider, i18n provider, and Zustand provider
- [ ] T025 Create src/app/page.tsx with landing page redirecting to /config
- [ ] T026 Create package.json scripts: `dev`, `build`, `start`, `storybook`, `test`, `test:unit`, `test:e2e`, `lint`, `type-check`, `prepare` (Husky)
- [ ] T027 Create README.md with project overview, setup instructions, available scripts, and commit discipline guidelines
- [ ] T028 [P] Create docs/TAILWIND_DESIGN_SYSTEM.md documenting custom theme tokens and usage
- [ ] T029 [P] Create docs/COMPONENT_DEVELOPMENT_GUIDE.md with TDD workflow from Constitution Principle XIII
- [ ] T030 Run `npm run lint` and fix any errors
- [ ] T031 Run `npm run build` and verify successful build
- [ ] T032 Commit Phase 1.1 setup: "feat: initialize Next.js 14 project with Tailwind, Storybook, Vitest, Playwright"

### Phase 1.2: Atomic Components (Week 2, Days 6-10)

#### T033-T035: BaseCard Component
- [ ] T033 Write Storybook story src/components/atoms/BaseCard.stories.tsx with variants: default, hover, bordered, elevated
- [ ] T034 Write unit tests src/components/atoms/BaseCard.test.tsx testing: renders, applies hover styles, theme variants (light/dark), accessibility (ARIA)
- [ ] T035 Implement src/components/atoms/BaseCard.tsx with TypeScript interface, JSDoc comments, data-testid attribute

#### T036-T038: Button Component
- [ ] T036 Write Storybook story src/components/atoms/Button.stories.tsx with variants: primary, secondary, danger, ghost, sizes: sm/md/lg, states: default/hover/disabled
- [ ] T037 Write unit tests src/components/atoms/Button.test.tsx testing: renders, onClick handler, disabled state, keyboard navigation (Enter/Space)
- [ ] T038 Implement src/components/atoms/Button.tsx (max 200 lines per Constitution Principle II)

#### T039-T041: Input Component
- [ ] T039 Write Storybook story src/components/atoms/Input.stories.tsx with types: text/password/email, sizes: sm/md/lg, states: default/error/disabled
- [ ] T040 Write unit tests src/components/atoms/Input.test.tsx testing: renders, onChange handler, value updates, error state, ARIA labels
- [ ] T041 Implement src/components/atoms/Input.tsx with TypeScript interface

#### T042-T044: Icon Component
- [ ] T042 Write Storybook story src/components/atoms/Icon.stories.tsx with icon types: provider logos (OpenAI, Anthropic, Google, XAI), UI icons (check, error, info, warning)
- [ ] T043 Write unit tests src/components/atoms/Icon.test.tsx testing: renders correct icon, size variants, color variants
- [ ] T044 Implement src/components/atoms/Icon.tsx using SVG sprites or icon library

#### T045-T047: LoadingSpinner Component
- [ ] T045 Write Storybook story src/components/atoms/LoadingSpinner.stories.tsx with sizes: sm/md/lg, colors: primary/secondary
- [ ] T046 Write unit tests src/components/atoms/LoadingSpinner.test.tsx testing: renders, animation runs, size variants
- [ ] T047 Implement src/components/atoms/LoadingSpinner.tsx with CSS animation

#### T048-T050: Badge Component
- [ ] T048 Write Storybook story src/components/atoms/Badge.stories.tsx with variants: default/success/warning/error, sizes: sm/md
- [ ] T049 Write unit tests src/components/atoms/Badge.test.tsx testing: renders text, variant colors, theme support
- [ ] T050 Implement src/components/atoms/Badge.tsx

#### T051-T053: Tag Component
- [ ] T051 Write Storybook story src/components/atoms/Tag.stories.tsx with variants: selected/unselected, removable: true/false
- [ ] T052 Write unit tests src/components/atoms/Tag.test.tsx testing: renders label, onClick handler, onRemove handler, selected state
- [ ] T053 Implement src/components/atoms/Tag.tsx

#### T054-T056: InlineAlert Component
- [ ] T054 Write Storybook story src/components/atoms/InlineAlert.stories.tsx with types: info/success/warning/error, dismissible: true/false
- [ ] T055 Write unit tests src/components/atoms/InlineAlert.test.tsx testing: renders message, icon matches type, onDismiss handler
- [ ] T056 Implement src/components/atoms/InlineAlert.tsx

- [ ] T057 Run `npm run test` and verify 80%+ coverage for all atomic components
- [ ] T058 Run `npm run storybook` and visually validate all atomic components in light/dark themes and EN/FR languages
- [ ] T059 Commit Phase 1.2 atomic components: "feat: add 8 atomic components with stories and tests"

### Phase 1.3: Molecular Components (Week 3, Days 11-15)

#### T060-T062: ApiKeyInput Component
- [ ] T060 Write Storybook story src/components/molecules/ApiKeyInput.stories.tsx with provider types: OpenAI/Anthropic/Google/XAI, validation states: valid/invalid/validating
- [ ] T061 Write unit tests src/components/molecules/ApiKeyInput.test.tsx testing: renders Input + Icons, validation indicator updates, masked/unmasked toggle
- [ ] T062 Implement src/components/molecules/ApiKeyInput.tsx composing Input + Icon atoms (Constitution Principle II: composition over inheritance)

#### T063-T065: ModelCard Component
- [ ] T063 Write Storybook story src/components/molecules/ModelCard.stories.tsx with states: unselected/selected/summarizer, provider types: OpenAI/Anthropic/Google/XAI
- [ ] T064 Write unit tests src/components/molecules/ModelCard.test.tsx testing: renders BaseCard + Badge + Button, onClick selection, summarizer indicator
- [ ] T065 Implement src/components/molecules/ModelCard.tsx composing BaseCard + Badge + Icon + Button atoms

#### T066-T068: PromptInput Component
- [ ] T066 Write Storybook story src/components/molecules/PromptInput.stories.tsx with character counts: 0/50/500/5000, validation: valid (10+ chars)/invalid (<10)
- [ ] T067 Write unit tests src/components/molecules/PromptInput.test.tsx testing: renders textarea, character counter updates, validation state changes at 10 chars
- [ ] T068 Implement src/components/molecules/PromptInput.tsx with debounced onChange (Constitution Principle X: performance)

#### T069-T071: ResponseCard Component
- [ ] T069 Write Storybook story src/components/molecules/ResponseCard.stories.tsx with states: streaming/complete/error, response types: AI/manual
- [ ] T070 Write unit tests src/components/molecules/ResponseCard.test.tsx testing: renders BaseCard + Badge + LoadingSpinner, streaming animation, manual response indicator
- [ ] T071 Implement src/components/molecules/ResponseCard.tsx with real-time text streaming support

#### T072-T074: ModeSelectionCard Component
- [ ] T072 Write Storybook story src/components/molecules/ModeSelectionCard.stories.tsx with modes: Mock/Free/Pro, states: unselected/selected/disabled
- [ ] T073 Write unit tests src/components/molecules/ModeSelectionCard.test.tsx testing: renders BaseCard + Badge + Icon, onClick selection, disabled state
- [ ] T074 Implement src/components/molecules/ModeSelectionCard.tsx

- [ ] T075 Run `npm run test` and verify 80%+ coverage for all molecular components
- [ ] T076 Run `npm run storybook` and visually validate all molecular components
- [ ] T077 Commit Phase 1.3 molecular components: "feat: add 5 molecular components with stories and tests"

### Phase 1.4: Organism Components (Week 4, Days 16-20)

#### T078-T080: WorkflowNavigator Component
- [ ] T078 Write Storybook story src/components/organisms/WorkflowNavigator.stories.tsx with steps: Config/Ensemble/Prompt/Review, current step: 1/2/3/4
- [ ] T079 Write unit tests src/components/organisms/WorkflowNavigator.test.tsx testing: renders 4 steps, highlights current step, navigation click handlers, responsive layout
- [ ] T080 Implement src/components/organisms/WorkflowNavigator.tsx composing Button + Badge atoms

#### T081-T083: ModelSelectionList Component
- [ ] T081 Write Storybook story src/components/organisms/ModelSelectionList.stories.tsx with provider filters: All/OpenAI/Anthropic/Google/XAI, selection count: 0/3/6
- [ ] T082 Write unit tests src/components/organisms/ModelSelectionList.test.tsx testing: renders multiple ModelCards, selection state updates, summarizer designation, max selection limit
- [ ] T083 Implement src/components/organisms/ModelSelectionList.tsx composing ModelCard molecules (Constitution Principle IX: props-driven behavior)

#### T084-T086: EnsembleManagementPanel Component
- [ ] T084 Write Storybook story src/components/organisms/EnsembleManagementPanel.stories.tsx with preset actions: load/save/delete, preset count: 0/1/5
- [ ] T085 Write unit tests src/components/organisms/EnsembleManagementPanel.test.tsx testing: renders preset list, load preset updates selections, save creates new preset, delete removes preset
- [ ] T086 Implement src/components/organisms/EnsembleManagementPanel.tsx with Zustand integration for preset management

#### T087-T089: SettingsModal Component
- [ ] T087 Write Storybook story src/components/organisms/SettingsModal.stories.tsx with tabs: Theme/Language/Advanced, modal states: open/closed
- [ ] T088 Write unit tests src/components/organisms/SettingsModal.test.tsx testing: renders modal, theme toggle updates Zustand, language toggle updates Zustand, close handler
- [ ] T089 Implement src/components/organisms/SettingsModal.tsx with keyboard navigation (Esc to close, Tab trap)

#### T090-T092: ManualResponseModal Component
- [ ] T090 Write Storybook story src/components/organisms/ManualResponseModal.stories.tsx with textarea states: empty/filled, validation: valid/invalid
- [ ] T091 Write unit tests src/components/organisms/ManualResponseModal.test.tsx testing: renders modal with PromptInput, submit adds response to Zustand, cancel closes modal
- [ ] T092 Implement src/components/organisms/ManualResponseModal.tsx

#### T093-T095: AgreementAnalysis Component
- [ ] T093 Write Storybook story src/components/organisms/AgreementAnalysis.stories.tsx with agreement levels: high (>0.8)/medium (0.5-0.8)/low (<0.5), response count: 2/4/6
- [ ] T094 Write unit tests src/components/organisms/AgreementAnalysis.test.tsx testing: renders similarity matrix, color-coded agreement scores, outlier identification
- [ ] T095 Implement src/components/organisms/AgreementAnalysis.tsx with cosine similarity calculations (src/lib/similarity.ts)

#### T096-T098: PageHero Component
- [ ] T096 Write Storybook story src/components/organisms/PageHero.stories.tsx with page types: Config/Ensemble/Prompt/Review, breadcrumb paths
- [ ] T097 Write unit tests src/components/organisms/PageHero.test.tsx testing: renders title, description, breadcrumb navigation
- [ ] T098 Implement src/components/organisms/PageHero.tsx

- [ ] T099 Run `npm run test` and verify 80%+ coverage for all organism components
- [ ] T100 Run `npm run storybook` and visually validate all organism components
- [ ] T101 Commit Phase 1.4 organism components: "feat: add 7 organism components with stories and tests"

### Phase 1.5: Utilities & Documentation (Week 4, Days 21-25)

- [ ] T102 [P] Create src/lib/encryption.ts with AES-256-GCM encryption/decryption utilities using Web Crypto API (placeholder for Phase 3)
- [ ] T103 [P] Create src/lib/embeddings.ts with embeddings generation utilities (placeholder for Phase 3)
- [ ] T104 [P] Create src/lib/similarity.ts with cosine similarity calculation function
- [ ] T105 [P] Create src/lib/streaming.ts with AsyncIterator streaming utilities (placeholder for Phase 2-3)
- [ ] T106 Write unit tests tests/unit/lib/similarity.test.ts testing cosine similarity edge cases: identical vectors (1.0), orthogonal vectors (0.0), opposite vectors (-1.0)
- [ ] T107 [P] Create docs/STATE_MANAGEMENT.md documenting Zustand store architecture and slice responsibilities
- [ ] T108 [P] Create docs/PROVIDER_ARCHITECTURE.md documenting AIProvider interface and 3 client modes (Mock/Free/Pro)
- [ ] T109 [P] Create docs/MOCK_CLIENT_SPECIFICATION.md with lorem ipsum streaming behavior specification
- [ ] T110 Run Chromatic visual regression baseline: `npx chromatic --project-token=<token>` (establishes Phase 1 baseline)
- [ ] T111 Run full test suite: `npm run test` and verify 80%+ overall coverage
- [ ] T112 Run E2E placeholder test: `npm run test:e2e` (basic smoke test, real tests in Phase 2)
- [ ] T113 Run accessibility audit in Storybook (a11y addon) and fix any violations
- [ ] T114 Update README.md with Phase 1 completion status and Storybook catalog link
- [ ] T115 Update spec.md to Version 1.0: mark Phase 1 functional requirements (FR-001 to FR-015) as COMPLETED with date
- [ ] T116 Commit Phase 1.5 utilities and docs: "feat: add utility libraries and technical documentation"
- [ ] T117 Git tag Phase 1 completion: `git tag v1.0.0-phase1`

---

## Phase 2: UI Integration with Mock API Clients (3 weeks, ~40 tasks)

### Phase 2.1: Provider Architecture (Week 5, Days 26-30)

#### T118-T120: AIProvider Interface
- [ ] T118 Create src/providers/interfaces/AIProvider.ts with abstract interface: `streamResponse`, `generateEmbeddings`, `validateApiKey`, `listAvailableModels`
- [ ] T119 Write unit tests tests/unit/providers/AIProvider.test.ts testing interface contract compliance
- [ ] T120 Create docs/STREAMING_ARCHITECTURE.md documenting AsyncIterator pattern for streaming responses

#### T121-T123: ProviderRegistry Singleton
- [ ] T121 Create src/providers/ProviderRegistry.ts with singleton pattern: register, getProvider, listProviders methods
- [ ] T122 Write unit tests tests/unit/providers/ProviderRegistry.test.ts testing: singleton instance, provider registration, retrieval by name
- [ ] T123 Update docs/PROVIDER_ARCHITECTURE.md with ProviderRegistry usage examples

#### T124-T126: MockAPIClient
- [ ] T124 Create src/providers/clients/MockAPIClient.ts implementing AIProvider interface with lorem ipsum streaming (50 chars/chunk, 100ms delay)
- [ ] T125 Write unit tests tests/unit/providers/MockAPIClient.test.ts testing: streamResponse yields chunks, generateEmbeddings returns mock vectors, validateApiKey always true
- [ ] T126 Update docs/MOCK_CLIENT_SPECIFICATION.md with implementation details

#### T127-T135: Provider Implementations (4 providers with MockAPIClient)
- [ ] T127 [P] Create src/providers/implementations/XAIProvider.ts with MockAPIClient for Grok models (grok-1, grok-2)
- [ ] T128 [P] Create src/providers/implementations/OpenAIProvider.ts with MockAPIClient for GPT models (gpt-4o, gpt-4o-mini, o1-preview, o1-mini)
- [ ] T129 [P] Create src/providers/implementations/GoogleProvider.ts with MockAPIClient for Gemini models (gemini-1.5-pro, gemini-1.5-flash)
- [ ] T130 [P] Create src/providers/implementations/AnthropicProvider.ts with MockAPIClient for Claude models (claude-3.5-sonnet, claude-3-opus, claude-3-haiku)
- [ ] T131 [P] Write integration tests tests/integration/providers/XAIProvider.test.ts testing mock streaming
- [ ] T132 [P] Write integration tests tests/integration/providers/OpenAIProvider.test.ts testing mock streaming
- [ ] T133 [P] Write integration tests tests/integration/providers/GoogleProvider.test.ts testing mock streaming
- [ ] T134 [P] Write integration tests tests/integration/providers/AnthropicProvider.test.ts testing mock streaming
- [ ] T135 Update src/providers/ProviderRegistry.ts to register all 4 providers at initialization

- [ ] T136 Run integration tests: `npm run test` and verify all provider tests pass
- [ ] T137 Commit Phase 2.1 provider architecture: "feat: implement AIProvider interface and 4 providers with MockAPIClient"

### Phase 2.2: State Management Integration (Week 5-6, Days 31-35)

- [ ] T138 [P] Create src/store/slices/workflowSlice.ts with current step state (Config/Ensemble/Prompt/Review), navigation actions
- [ ] T139 [P] Create src/store/slices/modeSlice.ts with selected mode (Mock/Free/Pro), mode validation
- [ ] T140 [P] Create src/store/slices/apiKeysSlice.ts with encrypted API key storage (empty in Mock mode, used in Phase 3)
- [ ] T141 [P] Create src/store/slices/modelsSlice.ts with selected models, summarizer designation, embeddings provider
- [ ] T142 [P] Create src/store/slices/promptSlice.ts with prompt text, character count, validation state
- [ ] T143 [P] Create src/store/slices/responsesSlice.ts with response array, streaming status, completion tracking
- [ ] T144 Update src/store/index.ts to combine all slices with persistence middleware
- [ ] T145 [P] Write unit tests tests/unit/store/workflowSlice.test.ts testing navigation actions
- [ ] T146 [P] Write unit tests tests/unit/store/modeSlice.test.ts testing mode selection
- [ ] T147 [P] Write unit tests tests/unit/store/modelsSlice.test.ts testing model selection, summarizer designation
- [ ] T148 [P] Write unit tests tests/unit/store/promptSlice.test.ts testing prompt updates, validation
- [ ] T149 [P] Write unit tests tests/unit/store/responsesSlice.test.ts testing response additions, streaming updates
- [ ] T150 Write integration tests tests/integration/store/persistence.test.ts testing localStorage sync, state rehydration after refresh
- [ ] T151 Commit Phase 2.2 state management: "feat: implement Zustand store with 8 slices and persistence"

### Phase 2.3: Page Implementation (Week 6-7, Days 36-45)

#### T152-T156: Config Page (/config)
- [ ] T152 Write E2E test tests/e2e/config-page.spec.ts (chromium only, Mock mode) testing: page loads, mode selection (Free), Next button disabled until mode selected, navigation to /ensemble
- [ ] T153 Create src/app/config/page.tsx composing PageHero + ModeSelectionCard + WorkflowNavigator organisms
- [ ] T154 Wire src/app/config/page.tsx to modeSlice and workflowSlice in Zustand store
- [ ] T155 Add translations to public/locales/en/common.json and public/locales/fr/common.json for Config page
- [ ] T156 Run E2E test: `npm run test:e2e tests/e2e/config-page.spec.ts` and verify passing

#### T157-T161: Ensemble Page (/ensemble)
- [ ] T157 Write E2E test tests/e2e/ensemble-page.spec.ts (chromium only, Mock mode) testing: page loads, model selection (min 2, max 6), summarizer designation, embeddings provider selection, Next button enabled when valid
- [ ] T158 Create src/app/ensemble/page.tsx composing PageHero + ModelSelectionList + EnsembleManagementPanel + WorkflowNavigator organisms
- [ ] T159 Wire src/app/ensemble/page.tsx to modelsSlice and workflowSlice in Zustand store
- [ ] T160 Add translations for Ensemble page (model names, provider names, validation messages)
- [ ] T161 Run E2E test: `npm run test:e2e tests/e2e/ensemble-page.spec.ts` and verify passing

#### T162-T166: Prompt Page (/prompt)
- [ ] T162 Write E2E test tests/e2e/prompt-page.spec.ts (chromium only, Mock mode) testing: page loads, prompt input (min 10 chars), character counter updates, Submit button disabled until valid, manual response modal opens, navigation to /review
- [ ] T163 Create src/app/prompt/page.tsx composing PageHero + PromptInput + ManualResponseModal + WorkflowNavigator organisms
- [ ] T164 Wire src/app/prompt/page.tsx to promptSlice, responsesSlice, and workflowSlice
- [ ] T165 Add translations for Prompt page (placeholders, validation, manual response labels)
- [ ] T166 Run E2E test: `npm run test:e2e tests/e2e/prompt-page.spec.ts` and verify passing

#### T167-T171: Review Page (/review)
- [ ] T167 Write E2E test tests/e2e/review-page.spec.ts (chromium only, Mock mode) testing: page loads, responses stream in (MockAPIClient), agreement analysis displays, meta-analysis displays, manual response can be added, New Prompt button navigates to /prompt
- [ ] T168 Create src/app/review/page.tsx composing PageHero + ResponseCard (multiple) + AgreementAnalysis + ManualResponseModal + WorkflowNavigator organisms
- [ ] T169 Wire src/app/review/page.tsx to responsesSlice, promptSlice, modelsSlice for real-time streaming updates
- [ ] T170 Add translations for Review page (agreement labels, similarity scores, meta-analysis header)
- [ ] T171 Run E2E test: `npm run test:e2e tests/e2e/review-page.spec.ts` and verify passing

- [ ] T172 Run full E2E suite (chromium only): `npm run test:e2e` and verify all 4 pages pass
- [ ] T173 Test responsive design (chromium only): Run E2E tests on mobile (375px), tablet (768px), desktop (1440px) viewports
- [ ] T174 Commit Phase 2.3 pages: "feat: implement 4-step workflow pages with E2E tests"

### Phase 2.4: Integration Testing & Polish (Week 7, Days 46-50)

- [ ] T175 Write E2E test tests/e2e/full-workflow-mock.spec.ts (chromium only, Mock mode) testing complete user journey: Config → Ensemble (3 models) → Prompt (submit) → Review (streaming + analysis)
- [ ] T176 Test theme persistence: Verify light/dark theme selection persists across page refreshes
- [ ] T177 Test language persistence: Verify EN/FR language selection persists across page refreshes
- [ ] T178 Test preset management: Verify ensemble presets can be saved, loaded, deleted, and persist to localStorage
- [ ] T179 Test manual response: Verify manual responses can be added in Prompt page and Review page
- [ ] T180 Test agreement analysis: Verify similarity matrix displays correctly for 2, 3, 4, 5, 6 responses
- [ ] T181 Run accessibility audit on all 4 pages: `npm run test:e2e -- --project=accessibility`
- [ ] T182 Fix any accessibility violations (WCAG 2.1 AA compliance required per plan.md)
- [ ] T183 Run Chromatic visual regression: `npx chromatic` and review diffs from Phase 1 baseline
- [ ] T184 Update README.md with Phase 2 quickstart instructions (how to run Mock mode workflow)
- [ ] T185 Update spec.md to Version 2.0: mark Phase 2 functional requirements (FR-016 to FR-024) as COMPLETED
- [ ] T186 Create docs/FREE_MODE_GUIDE.md as placeholder for Phase 3 (not yet implemented)
- [ ] T187 Run full test suite: `npm run test && npm run test:e2e` and verify all passing
- [ ] T188 Run production build: `npm run build` and verify no errors
- [ ] T189 Commit Phase 2.4 integration: "feat: complete Phase 2 with full Mock mode workflow and E2E tests"
- [ ] T190 Git tag Phase 2 completion: `git tag v2.0.0-phase2`

---

## Phase 3: Free Mode - Real Provider API Integration (3 weeks, ~30 tasks)

### Phase 3.1: Security & Encryption (Week 8, Days 51-53)

- [ ] T191 Implement src/lib/encryption.ts with AES-256-GCM encryption using Web Crypto API: `encrypt(plaintext)`, `decrypt(ciphertext)`, `deriveKey()`
- [ ] T192 Write unit tests tests/unit/lib/encryption.test.ts testing: encryption/decryption round-trip, key derivation consistency, error handling (unsupported browser)
- [ ] T193 Update src/store/slices/apiKeysSlice.ts to use encryption utilities before localStorage storage
- [ ] T194 Write integration tests tests/integration/store/apiKeysSlice.test.ts testing: API keys stored encrypted in localStorage, keys decrypted on retrieval
- [ ] T195 Create src/lib/webCryptoDetection.ts with feature detection for Web Crypto API support
- [ ] T196 Update src/app/config/page.tsx to disable Free mode with InlineAlert if Web Crypto API not supported (FR-059)
- [ ] T197 Commit Phase 3.1 security: "feat: implement AES-256-GCM encryption for API keys with Web Crypto API"

### Phase 3.2: FreeAPIClient Implementation (Week 8-9, Days 54-60)

- [ ] T198 Install provider SDKs: `npm install openai @anthropic-ai/sdk @google/generative-ai axios`
- [ ] T199 Create src/providers/clients/FreeAPIClient.ts implementing AIProvider interface with real API calls, retry logic, error handling
- [ ] T200 Write unit tests tests/unit/providers/FreeAPIClient.test.ts testing: streamResponse with mocked SDK, validateApiKey success/failure
- [ ] T201 Update src/providers/implementations/XAIProvider.ts to use FreeAPIClient (axios for Grok API)
- [ ] T202 Update src/providers/implementations/OpenAIProvider.ts to use FreeAPIClient (openai SDK)
- [ ] T203 Update src/providers/implementations/GoogleProvider.ts to use FreeAPIClient (@google/generative-ai SDK)
- [ ] T204 Update src/providers/implementations/AnthropicProvider.ts to use FreeAPIClient (@anthropic-ai/sdk)
- [ ] T205 [P] Write integration tests tests/integration/providers/XAIProvider.free.test.ts with test API key (skipped in CI if no key)
- [ ] T206 [P] Write integration tests tests/integration/providers/OpenAIProvider.free.test.ts with test API key
- [ ] T207 [P] Write integration tests tests/integration/providers/GoogleProvider.free.test.ts with test API key
- [ ] T208 [P] Write integration tests tests/integration/providers/AnthropicProvider.free.test.ts with test API key
- [ ] T209 Implement src/lib/embeddings.ts with real embeddings generation using selected provider's API
- [ ] T210 Write unit tests tests/unit/lib/embeddings.test.ts testing embeddings generation with mocked provider
- [ ] T211 Update src/components/organisms/AgreementAnalysis.tsx to use real embeddings instead of mock data
- [ ] T212 Commit Phase 3.2 Free mode clients: "feat: implement FreeAPIClient with real provider SDK integrations"

### Phase 3.3: Free Mode UI Integration (Week 9-10, Days 61-67)

- [ ] T213 Update src/app/config/page.tsx to add API key inputs (ApiKeyInput molecules) when Free mode selected
- [ ] T214 Implement real-time API key validation in src/app/config/page.tsx using provider `validateApiKey` method
- [ ] T215 Add loading states (LoadingSpinner) during API key validation
- [ ] T216 Add error handling (InlineAlert) for invalid API keys, network errors, rate limits (429)
- [ ] T217 Update src/app/review/page.tsx to handle streaming errors from real APIs (display error in ResponseCard)
- [ ] T218 Implement retry mechanism for failed responses in src/app/review/page.tsx (Constitution Principle X: performance)
- [ ] T219 Update src/components/molecules/ResponseCard.tsx to display token counts from real API responses
- [ ] T220 Add translations for Free mode (API key labels, validation messages, error messages)
- [ ] T221 Write E2E test tests/e2e/free-mode.spec.ts (chromium only, Mock mode) testing: Free mode selection, API key entry, validation success, streaming responses, error handling (mocked 429 error)
- [ ] T222 Update docs/FREE_MODE_GUIDE.md with setup instructions, API key acquisition, supported providers
- [ ] T223 Commit Phase 3.3 Free mode UI: "feat: integrate Free mode with real API key validation and streaming"

### Phase 3.4: Testing & Documentation (Week 10, Days 68-73)

- [ ] T224 Write E2E test tests/e2e/full-workflow-free.spec.ts (chromium only, Mock mode for CI; optional real API test with test keys in .env.local) testing complete Free mode workflow
- [ ] T225 Run security audit: Verify API keys encrypted in localStorage, not exposed in network traces, not exposed in error logs
- [ ] T226 Test error scenarios: 401 (invalid key), 429 (rate limit), 503 (service unavailable), network timeout
- [ ] T227 Test streaming latency: Verify <100ms p95 latency from API chunk receipt to UI display (FR-058)
- [ ] T228 Create docs/API_KEY_SECURITY.md documenting encryption approach, browser-derived keys, security best practices
- [ ] T229 Update README.md with Free mode quickstart (how to obtain API keys, .env.local setup)
- [ ] T230 Update spec.md to Version 3.0: mark Phase 3 functional requirements (FR-025 to FR-031) as COMPLETED
- [ ] T231 Run full test suite: `npm run test && npm run test:e2e` (with test API keys)
- [ ] T232 Run production build: `npm run build` and verify no errors
- [ ] T233 Commit Phase 3.4 testing: "feat: complete Phase 3 with Free mode and security audit"
- [ ] T234 Git tag Phase 3 completion: `git tag v3.0.0-phase3`

---

## Phase 4: Pro Mode - Backend + tRPC + Managed Providers (4 weeks, ~50 tasks)

### Phase 4.1: Backend Infrastructure (Week 11, Days 74-80)

#### T235-T240: Authentication Setup
- [ ] T235 Install NextAuth.js: `npm install next-auth @auth/prisma-adapter`
- [ ] T236 Create src/app/api/auth/[...nextauth]/route.ts with NextAuth.js configuration (Google, GitHub OAuth providers)
- [ ] T237 Create environment variables in .env: `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`
- [ ] T238 Write integration tests tests/integration/auth/nextauth.test.ts testing OAuth flow (mocked providers)
- [ ] T239 Create docs/AUTHENTICATION.md documenting OAuth setup, session management
- [ ] T240 Commit Phase 4.1a authentication: "feat: implement NextAuth.js with Google and GitHub OAuth"

#### T241-T247: Database Setup
- [ ] T241 Install Prisma: `npm install prisma @prisma/client && npx prisma init`
- [ ] T242 Create prisma/schema.prisma with User, Credit, UsageRecord, SharedResult models per data-model.md
- [ ] T243 Create environment variable in .env: `DATABASE_URL=postgresql://...`
- [ ] T244 Run Prisma migration: `npx prisma migrate dev --name init`
- [ ] T245 Create prisma/seed.ts with initial test data (1 user, 100 credits)
- [ ] T246 Run seed: `npx prisma db seed`
- [ ] T247 Create docs/DATABASE_SCHEMA.md documenting all models, relationships, migrations
- [ ] T248 Commit Phase 4.1b database: "feat: set up Prisma with PostgreSQL and initial schema"

#### T249-T255: tRPC Setup
- [ ] T249 Install tRPC: `npm install @trpc/server @trpc/client @trpc/react-query @trpc/next @tanstack/react-query`
- [ ] T250 Create src/server/api/trpc.ts with tRPC context (user session, database client)
- [ ] T251 Create src/server/api/root.ts with root router combining all sub-routers
- [ ] T252 Create src/app/api/trpc/[trpc]/route.ts with Next.js App Router handler
- [ ] T253 Create src/lib/trpc.ts with tRPC client configuration
- [ ] T254 Update src/app/layout.tsx to wrap app with TRPCProvider and QueryClientProvider
- [ ] T255 Write integration tests tests/integration/trpc/context.test.ts testing session extraction, database client
- [ ] T256 Create docs/TRPC_API.md documenting router structure, subscription pattern
- [ ] T257 Commit Phase 4.1c tRPC: "feat: set up tRPC v11 with Next.js App Router integration"

#### T258-T263: tRPC Routers (5 routers per contracts/ specification)
- [ ] T258 [P] Create src/server/api/routers/auth.ts with procedures: `session`, `signOut`
- [ ] T259 [P] Create src/server/api/routers/user.ts with procedures: `getProfile`, `updateProfile`
- [ ] T260 [P] Create src/server/api/routers/provider.ts with procedures: `streamResponse` (subscription), `generateEmbeddings`, `listModels`
- [ ] T261 [P] Create src/server/api/routers/ensemble.ts with procedures: `create`, `list`, `delete`, `updatePreset`
- [ ] T262 [P] Create src/server/api/routers/billing.ts with procedures: `getCreditBalance`, `purchaseCredits`, `getUsageHistory`
- [ ] T263 Update src/server/api/root.ts to export all 5 routers
- [ ] T264 [P] Write integration tests tests/integration/trpc/routers/auth.test.ts
- [ ] T265 [P] Write integration tests tests/integration/trpc/routers/user.test.ts
- [ ] T266 [P] Write integration tests tests/integration/trpc/routers/provider.test.ts testing subscription streaming
- [ ] T267 [P] Write integration tests tests/integration/trpc/routers/ensemble.test.ts
- [ ] T268 [P] Write integration tests tests/integration/trpc/routers/billing.test.ts
- [ ] T269 Commit Phase 4.1d routers: "feat: implement 5 tRPC routers with streaming subscription"

### Phase 4.2: Pro Mode Client & Credit System (Week 12, Days 81-87)

#### T270-T275: ProAPIClient Implementation
- [ ] T270 Create src/providers/clients/ProAPIClient.ts implementing AIProvider interface using tRPC subscriptions
- [ ] T271 Write unit tests tests/unit/providers/ProAPIClient.test.ts testing tRPC subscription streaming, error handling
- [ ] T272 Update all 4 provider implementations (XAI, OpenAI, Google, Anthropic) to support ProAPIClient
- [ ] T273 Write integration tests tests/integration/providers/ProAPIClient.test.ts testing end-to-end tRPC streaming with test database
- [ ] T274 Update src/providers/ProviderRegistry.ts to select client mode (Mock/Free/Pro) based on modeSlice state
- [ ] T275 Commit Phase 4.2a ProAPIClient: "feat: implement ProAPIClient with tRPC streaming subscriptions"

#### T276-T282: Credit System
- [ ] T276 Create src/server/services/creditSystem.ts with functions: `deductCredits`, `addCredits`, `checkBalance`, `calculateCost`
- [ ] T277 Write unit tests tests/unit/services/creditSystem.test.ts testing credit calculations, balance checks
- [ ] T278 Update src/server/api/routers/provider.ts to deduct credits after streaming completion
- [ ] T279 Create src/server/db/client.ts with Prisma client singleton
- [ ] T280 Write integration tests tests/integration/services/creditSystem.test.ts testing credit transactions with test database
- [ ] T281 Create docs/CREDIT_SYSTEM.md documenting pricing model, credit calculations
- [ ] T282 Commit Phase 4.2b credit system: "feat: implement credit system with usage tracking"

#### T283-T288: Stripe Integration
- [ ] T283 Install Stripe: `npm install stripe @stripe/stripe-js`
- [ ] T284 Create src/server/services/stripe.ts with Stripe client configuration
- [ ] T285 Create environment variables in .env: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- [ ] T286 Create src/app/api/stripe/checkout/route.ts for checkout session creation
- [ ] T287 Create src/app/api/stripe/webhook/route.ts for payment confirmation webhook
- [ ] T288 Update src/server/api/routers/billing.ts to integrate Stripe checkout and webhooks
- [ ] T289 Write integration tests tests/integration/billing/stripe.test.ts with Stripe test mode
- [ ] T290 Create docs/BILLING.md documenting Stripe setup, webhook configuration, test mode
- [ ] T291 Commit Phase 4.2c Stripe: "feat: integrate Stripe for credit purchases"

#### T292-T297: Pro Mode UI
- [ ] T292 Update src/app/config/page.tsx to add authentication flow (sign in/sign up) when Pro mode selected
- [ ] T293 Create src/app/dashboard/page.tsx for usage statistics, credit balance, purchase credits button
- [ ] T294 Update src/components/organisms/WorkflowNavigator.tsx to display credit balance badge
- [ ] T295 Add loading states and error handling for tRPC calls in all pages
- [ ] T296 Add translations for Pro mode (authentication, credit system, billing)
- [ ] T297 Write E2E test tests/e2e/pro-mode-auth.spec.ts testing: sign up, sign in, session persistence
- [ ] T298 Write E2E test tests/e2e/pro-mode-credits.spec.ts testing: credit balance display, purchase flow (Stripe test mode), credit deduction after prompt
- [ ] T299 Create docs/USAGE_DASHBOARD.md documenting dashboard features
- [ ] T300 Commit Phase 4.2d Pro mode UI: "feat: implement Pro mode with authentication and credit system UI"

### Phase 4.3: Features & Testing (Week 13, Days 88-94)

#### T301-T305: Shared Results Feature
- [ ] T301 Update prisma/schema.prisma to add SharedResult model with public URL, expiration date (30 days)
- [ ] T302 Run Prisma migration: `npx prisma migrate dev --name add-shared-results`
- [ ] T303 Create src/server/api/routers/shared.ts with procedures: `createSharedResult`, `getSharedResult`
- [ ] T304 Create src/app/shared/[id]/page.tsx for public shared result view (no authentication required)
- [ ] T305 Update src/app/review/page.tsx to add Share button (Pro mode only) generating public link
- [ ] T306 Write E2E test tests/e2e/shared-results.spec.ts testing: create shared result, access public link, verify expiration
- [ ] T307 Commit Phase 4.3a shared results: "feat: implement shared results with 30-day expiration"

#### T308-T313: Backend Testing
- [ ] T308 Write unit tests for all tRPC routers: verify input validation, authorization checks, error responses
- [ ] T309 Write integration tests for complete Pro mode workflow: auth → ensemble → prompt → streaming → credit deduction
- [ ] T310 Run load testing: Simulate 50 concurrent users streaming responses (use tool like k6 or Artillery)
- [ ] T311 Run security audit: Verify API keys stored server-side, no SQL injection vulnerabilities, CSRF protection
- [ ] T312 Test Stripe webhook reliability: Verify credit additions after successful payments
- [ ] T313 Commit Phase 4.3b backend tests: "test: add comprehensive backend unit and integration tests"

#### T314-T318: Mode Switching & Final Integration
- [ ] T314 Implement seamless mode switching in src/app/config/page.tsx: Mock ↔ Free ↔ Pro without data loss
- [ ] T315 Write E2E test tests/e2e/mode-switching.spec.ts testing: switch from Mock to Free (enter keys), switch from Free to Pro (sign in)
- [ ] T316 Update README.md with all 3 mode quickstart instructions
- [ ] T317 Update spec.md to Version 4.0: mark Phase 4 functional requirements (FR-032 to FR-059) as COMPLETED
- [ ] T318 Run full test suite: `npm run test && npm run test:e2e` (all modes)
- [ ] T319 Commit Phase 4.3c final integration: "feat: complete Phase 4 with all 3 modes integrated"

### Phase 4.4: Deployment & Completion (Week 14, Days 95-100)

- [ ] T320 Set up Vercel project and link repository
- [ ] T321 Configure environment variables in Vercel dashboard (all secrets, API keys, database URL)
- [ ] T322 Set up Vercel Postgres database (or Supabase PostgreSQL)
- [ ] T323 Run Prisma migrations in production: `npx prisma migrate deploy`
- [ ] T324 Configure custom domain (if applicable)
- [ ] T325 Set up Sentry error tracking: `npm install @sentry/nextjs && npx @sentry/wizard -i nextjs`
- [ ] T326 Configure Stripe webhook endpoint in Stripe dashboard (production webhook secret)
- [ ] T327 Deploy to production: `vercel --prod`
- [ ] T328 Run smoke tests on production: Test all 3 modes (Mock, Free with test keys, Pro with test account)
- [ ] T329 Set up monitoring: Vercel Analytics, Sentry error tracking, uptime monitoring
- [ ] T330 Create docs/DEPLOYMENT.md documenting production setup, environment variables, deployment process
- [ ] T331 Run final accessibility audit on production URL
- [ ] T332 Run final performance audit: Lighthouse score (aim for 90+ performance, 100 accessibility)
- [ ] T333 Update README.md with production URL and deployment badge
- [ ] T334 Update spec.md with final project status: ALL 59 functional requirements COMPLETED
- [ ] T335 Create project retrospective document in docs/RETROSPECTIVE.md (lessons learned, future improvements)
- [ ] T336 Commit Phase 4.4 deployment: "deploy: launch Ensemble AI to production"
- [ ] T337 Git tag Phase 4 completion: `git tag v4.0.0-production`
- [ ] T338 Celebrate project launch 🎉

---

## Dependencies

**Phase 1 (Component Library)**:
- T001-T032 (Setup) before all component tasks
- T033-T056 (Atoms) before T060-T074 (Molecules)
- T060-T074 (Molecules) before T078-T098 (Organisms)
- T102-T105 (Utilities) can run parallel with components
- T110-T117 (Documentation & tagging) requires all Phase 1 tasks complete

**Phase 2 (UI Integration)**:
- T118-T123 (AIProvider interface) before T124-T135 (Provider implementations)
- T138-T150 (State slices) before T152-T171 (Page implementation)
- T124-T135 (Provider implementations) before T152-T171 (Pages need providers)
- T152-T171 (Pages) before T175-T189 (Integration testing)

**Phase 3 (Free Mode)**:
- T191-T197 (Security) before T198-T212 (FreeAPIClient needs encryption)
- T198-T212 (FreeAPIClient) before T213-T223 (UI integration needs real clients)
- T213-T223 (UI integration) before T224-T234 (Testing needs UI)

**Phase 4 (Pro Mode)**:
- T235-T240 (Auth) before T270-T275 (ProAPIClient needs session)
- T241-T248 (Database) before T258-T269 (Routers need database)
- T249-T257 (tRPC setup) before T258-T269 (Routers need tRPC)
- T276-T282 (Credit system) before T283-T291 (Stripe needs credit logic)
- T270-T275 (ProAPIClient) before T292-T300 (UI needs ProAPIClient)
- T301-T307 (Shared results) before T314-T319 (Final integration)
- T320-T338 (Deployment) requires all Phase 4 tasks complete

---

## Parallel Execution Examples

### Phase 1.2: Atomic Components (Week 2)
```
# Launch T036-T056 component tasks in parallel (different files, no dependencies):
Task: "Write Storybook story src/components/atoms/Button.stories.tsx with variants"
Task: "Write Storybook story src/components/atoms/Input.stories.tsx with types"
Task: "Write Storybook story src/components/atoms/Icon.stories.tsx with icon types"
Task: "Write Storybook story src/components/atoms/LoadingSpinner.stories.tsx with sizes"
Task: "Write Storybook story src/components/atoms/Badge.stories.tsx with variants"
Task: "Write Storybook story src/components/atoms/Tag.stories.tsx with variants"
Task: "Write Storybook story src/components/atoms/InlineAlert.stories.tsx with types"
```

### Phase 2.1: Provider Implementations (Week 5)
```
# Launch T127-T134 provider tasks in parallel (4 providers, independent):
Task: "Create src/providers/implementations/XAIProvider.ts with MockAPIClient"
Task: "Create src/providers/implementations/OpenAIProvider.ts with MockAPIClient"
Task: "Create src/providers/implementations/GoogleProvider.ts with MockAPIClient"
Task: "Create src/providers/implementations/AnthropicProvider.ts with MockAPIClient"
Task: "Write integration tests tests/integration/providers/XAIProvider.test.ts"
Task: "Write integration tests tests/integration/providers/OpenAIProvider.test.ts"
Task: "Write integration tests tests/integration/providers/GoogleProvider.test.ts"
Task: "Write integration tests tests/integration/providers/AnthropicProvider.test.ts"
```

### Phase 2.2: State Slices (Week 5-6)
```
# Launch T138-T143 slice tasks in parallel (different files):
Task: "Create src/store/slices/workflowSlice.ts with current step state"
Task: "Create src/store/slices/modeSlice.ts with selected mode"
Task: "Create src/store/slices/apiKeysSlice.ts with encrypted API key storage"
Task: "Create src/store/slices/modelsSlice.ts with selected models"
Task: "Create src/store/slices/promptSlice.ts with prompt text"
Task: "Create src/store/slices/responsesSlice.ts with response array"
```

### Phase 4.1: tRPC Routers (Week 11)
```
# Launch T258-T262 router tasks in parallel (5 independent routers):
Task: "Create src/server/api/routers/auth.ts with procedures: session, signOut"
Task: "Create src/server/api/routers/user.ts with procedures: getProfile, updateProfile"
Task: "Create src/server/api/routers/provider.ts with streamResponse subscription"
Task: "Create src/server/api/routers/ensemble.ts with CRUD procedures"
Task: "Create src/server/api/routers/billing.ts with credit procedures"
```

---

## Notes

- **[P] tasks** = different files, no dependencies, safe for parallel execution
- **TDD enforced**: All test tasks (stories, unit tests) MUST be completed before implementation tasks
- **200-line limit**: All component implementations MUST comply with Constitution Principle II
- **80% coverage**: All phases MUST achieve 80%+ test coverage per Constitution Principle VIII
- **Commit after each phase**: Phases 1.1-1.5, 2.1-2.4, 3.1-3.4, 4.1-4.4 each have dedicated commit tasks
- **Git tags**: v1.0.0-phase1, v2.0.0-phase2, v3.0.0-phase3, v4.0.0-production mark major milestones
- **Avoid**: Vague task descriptions, same-file conflicts in parallel tasks, skipping tests
- **Constitution compliance**: All tasks designed to align with Ensemble AI Constitution v1.0.0

---

## Task Summary Statistics

**Total Tasks**: 338 tasks across 4 phases
- **Phase 1 (Component Library)**: 117 tasks (T001-T117) - 4 weeks
- **Phase 2 (UI Integration)**: 73 tasks (T118-T190) - 3 weeks
- **Phase 3 (Free Mode)**: 44 tasks (T191-T234) - 3 weeks
- **Phase 4 (Pro Mode)**: 104 tasks (T235-T338) - 4 weeks

**Estimated Duration**: 14 weeks (75 working days across 4 phases)

**Parallel Task Opportunities**:
- Phase 1: ~60 tasks can run in parallel (atoms, molecules, organisms in same tier)
- Phase 2: ~25 tasks can run in parallel (provider implementations, state slices)
- Phase 3: ~15 tasks can run in parallel (provider integrations, tests)
- Phase 4: ~30 tasks can run in parallel (routers, tests, documentation)

**Critical Path**:
- Phase 1: Setup → Atoms → Molecules → Organisms → Documentation (sequential tiers)
- Phase 2: AIProvider → Providers → State → Pages → Testing (sequential integration)
- Phase 3: Security → FreeAPIClient → UI → Testing (sequential feature build)
- Phase 4: Infrastructure → Credit System → Pro Client → Deployment (sequential stack)

---

*Tasks generated: 2025-09-30*
*Based on: plan.md v1.0, spec.md v1.0, constitution.md v1.0.0*
*Ready for: Phase 1 execution starting with T001*