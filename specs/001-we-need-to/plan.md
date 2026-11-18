# Implementation Plan: Ensemble AI - Complete Application

> **Status (2026-11-15):** Historical. Phases 1 to 3 are largely built. The active plan is [docs/ROADMAP.md](../../docs/ROADMAP.md), which supersedes the Phase 4 tasks (T235 onward) and replaces NextAuth, Prisma, Postgres and Vercel with Firebase Auth, Firestore and Firebase App Hosting. Product direction is in [docs/PRODUCT_VISION.md](../../docs/PRODUCT_VISION.md).

**Branch**: `001-we-need-to` | **Date**: 2025-09-30 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-we-need-to/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path → ✓ COMPLETE
   Feature spec loaded with 59 functional requirements across 4 phases
2. Fill Technical Context → ✓ COMPLETE
   Project Type: Web application (frontend + backend in Phase 4)
   Structure Decision: Single project structure evolving to full-stack
3. Fill Constitution Check section → ✓ COMPLETE
   Based on Ensemble AI Constitution v1.0.0
4. Evaluate Constitution Check → ✓ PASS
   No violations detected; UI-first approach aligns with Principle I
   Component modularity enforced via Principle II (200-line limit)
   TDD mandatory per Principle VIII
5. Execute Phase 0 → research.md → ✓ COMPLETE
   All technical decisions clarified in spec clarifications section
6. Execute Phase 1 → contracts, data-model.md, quickstart.md → ✓ COMPLETE
   Data model defined, no API contracts needed until Phase 4
7. Re-evaluate Constitution Check → ✓ PASS
   Design maintains constitutional principles
8. Plan Phase 2 → Task generation approach documented
9. STOP - Ready for /tasks command → ✓ READY
```

**IMPORTANT**: The /plan command STOPS at step 7. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

---

## Summary

**Ensemble AI** is a comprehensive web application enabling users to query multiple Large Language Models simultaneously, compare responses with agreement analysis, and receive meta-analyses from a designated summarizer model. The project follows strict UI-first development with Test-Driven Development (TDD) across 4 progressive phases:

1. **Phase 1 (4 weeks)**: Component Library - 20+ UI components in Storybook with 80%+ test coverage
2. **Phase 2 (3 weeks)**: UI Integration - Functional application using Mock API clients
3. **Phase 3 (3 weeks)**: Free Mode - Real provider API integration with client-side encrypted API keys
4. **Phase 4 (4 weeks)**: Pro Mode - Backend services, credit system, managed APIs via tRPC

**Core Value Proposition**: Make better decisions by comparing perspectives from multiple AI models (OpenAI, Anthropic, Google, XAI) rather than relying on a single model's response.

**Primary User Journey**: Config → Ensemble → Prompt → Review (4-step workflow)

**Key Architectural Decisions** (from clarifications):
- Storage: Essential data persists (theme, API keys, presets); transient data in-memory only
- Embeddings: User-selectable provider at runtime (Config/Ensemble step)
- Streaming: <100ms p95 latency requirement
- Security: AES-256 with Web Crypto API for API key encryption
- Manual Responses: Available in both Ensemble step (pre-populate) and Review page (add anytime)

---

## Technical Context

**Language/Version**: TypeScript 5.x, JavaScript ES2022+
**Primary Dependencies**:
- Next.js 14 (App Router)
- React 19
- Tailwind CSS v4
- Zustand (state management with persistence)
- tRPC v11 (backend communication, Phase 4)
- Storybook 8+
- Vitest + React Testing Library
- Playwright (E2E testing)
- Biome (linting/formatting)
- react-i18next (internationalization)

**Provider SDKs** (Phase 3):
- openai (OpenAI GPT models)
- @anthropic-ai/sdk (Claude models)
- @google/generative-ai (Gemini models)
- axios (XAI Grok models)

**Backend Dependencies** (Phase 4):
- Prisma or Drizzle ORM
- PostgreSQL/MongoDB/PlanetScale
- NextAuth.js/Clerk/Auth0 (authentication)
- Stripe (payment processing)
- Sentry (error tracking)

**Storage**:
- Phase 1-3: Browser localStorage (essential data encrypted), in-memory (transient)
- Phase 4: Database (PostgreSQL/MongoDB/PlanetScale)

**Testing**:
- Vitest + React Testing Library (unit/integration)
- Playwright (E2E testing + visual screenshots)
- Storybook interaction tests
- Screenshot testing (automated visual regression, replaces Chromatic)

**Target Platform**:
- Modern web browsers with Web Crypto API support
- Responsive design: mobile (640px), tablet (768px), desktop (1024px+)

**Project Type**: Web application (single → full-stack evolution)

**Performance Goals**:
- <100ms p95 latency for streaming chunk rendering (FR-058)
- 80%+ test coverage minimum (Constitution Principle VIII)
- WCAG 2.1 AA accessibility compliance

**Constraints**:
- No component exceeds 200 lines (Constitution Principle II)
- UI components built BEFORE backend integration (Constitution Principle I)
- TDD mandatory: tests written BEFORE implementation (Constitution Principle VIII)
- Web Crypto API required for Free Mode (FR-059)

**Scale/Scope**:
- 20+ reusable UI components (atoms, molecules, organisms)
- 4 AI providers with 10+ models total
- 4-step workflow: Config → Ensemble → Prompt → Review
- 3 operating modes: Mock, Free, Pro
- Support for English and French languages
- Light and Dark themes

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. UI-First Development Philosophy
✅ **PASS**: Phase 1 dedicates 4 weeks to component library in Storybook before any backend work
✅ **PASS**: Mock API clients (Phase 2) simulate data before real API integration (Phase 3)
✅ **PASS**: Backend development deferred to Phase 4, after UI is production-ready

### II. Component Modularity Principles (CRITICAL)
✅ **PASS**: Atomic design enforced (atoms → molecules → organisms → pages)
✅ **PASS**: 200-line limit per component specified in Phase 1 documentation requirements
✅ **PASS**: Composition pattern: ApiKeyInput = Input + Icons; ModelCard = BaseCard + Badge + Button

### III. Component Structure Requirements
✅ **PASS**: Every component requires .tsx + .stories.tsx + .test.tsx + TypeScript interface + JSDoc
✅ **PASS**: Storybook stories must document all variants, states, sizes, themes, languages

### IV. Storybook as Component Catalog
✅ **PASS**: Storybook is SSOT for component library (Phase 1 success metrics)
✅ **PASS**: Stories demonstrate all visual states, size variants, theme variants (light/dark), languages (EN/FR)

### V. Provider Architecture (Frontend)
✅ **PASS**: AIProvider abstract class with Mock/Free/Pro client implementations
✅ **PASS**: 4 providers: XAI, OpenAI, Google, Anthropic
✅ **PASS**: Interface methods: streamResponse, generateEmbeddings, validateApiKey, listAvailableModels

### VI. Development Phases
✅ **PASS**: Strict 4-phase sequence enforced in plan
✅ **PASS**: Phase 1 (Component Library) → Phase 2 (UI Integration/Mock) → Phase 3 (Free Mode) → Phase 4 (Pro Mode)

### VII. Design System Rules (Tailwind CSS)
✅ **PASS**: Tailwind CSS v4 configured in Phase 1 Day 2
✅ **PASS**: Custom theme tokens in tailwind.config.js
✅ **PASS**: Minimal Dark/Light themes via dark: variant
✅ **PASS**: Semantic colors defined (card, cardBorder, cardHover, primary)
✅ **PASS**: i18n support (EN/FR) from day one

### VIII. Component Testing Requirements (TDD)
✅ **PASS**: TDD flow enforced: Write tests FIRST, then implementation
✅ **PASS**: Vitest + React Testing Library tooling
✅ **PASS**: 80%+ coverage goal per component (Phase 1 success metrics)
✅ **PASS**: data-testid selectors exclusively (no CSS selectors in tests)
✅ **PASS**: Mocks for external dependencies (Zustand store, API calls)
✅ **PASS**: Storybook interaction tests for complex behaviors

### IX. Component Reusability Rules
✅ **PASS**: Props-driven component behavior (no hardcoded logic)
✅ **PASS**: Variant prop pattern (e.g., Button variant="primary|secondary|danger|ghost")
✅ **PASS**: Children and render props for flexibility

### X. Code Quality
✅ **PASS**: Biome linter/formatter configured (Phase 1 Day 2)
✅ **PASS**: No hardcoded colors (theme tokens) or text strings (i18n keys)
✅ **PASS**: TypeScript interfaces for all props and providers
✅ **PASS**: ARIA labels and keyboard navigation (FR-050)
✅ **PASS**: Performance prioritized (streaming, debounced inputs, optimistic UI)

### XI. Documentation Requirements (CRITICAL)
✅ **PASS**: SPEC.md updated at each phase milestone (Versions 1.0, 2.0, 3.0, 4.0)
✅ **PASS**: Component docs via Storybook stories with JSDoc
✅ **PASS**: Pre-development documentation (this plan document)
✅ **PASS**: Architecture diagrams using Mermaid syntax
✅ **PASS**: /docs structure: TAILWIND_DESIGN_SYSTEM.md, COMPONENT_DEVELOPMENT_GUIDE.md, STATE_MANAGEMENT.md, etc.

### XII. Documentation Structure
✅ **PASS**: SPEC.md as SSOT for requirements
✅ **PASS**: /docs for technical documentation (10+ planned documents)
✅ **PASS**: README.md as entry point (updated at each phase)
✅ **PASS**: Component Stories for API documentation

### XIII. Development & Spec Maintenance Workflows
✅ **PASS**: Component Development Workflow:
  1. Define requirements and props interface
  2. Create component file with TypeScript interface
  3. Write Storybook story with all variants FIRST
  4. Write unit tests BEFORE implementation
  5. Implement until tests pass
  6. Visual validation in Storybook
  7. Run screenshot testing (npx tsx scripts/screenshot-stories.ts)
  8. Update SPEC.md to mark COMPLETE
  9. Then may be used in pages

✅ **PASS**: SPEC Maintenance Workflow:
  - Before: Add requirements to SPEC.md
  - During: Update implementation status
  - After: Mark COMPLETED with date
  - Create /docs entry for complex patterns
  - Update README.md if workflow changes
  - Increment SPEC.md version

### XIV. Application Workflow Integrity
✅ **PASS**: 4-step workflow: Config → Ensemble → Prompt → Review
✅ **PASS**: Each step URL-addressable (FR-009)
✅ **PASS**: Zustand state persists to localStorage (FR-007)
✅ **PASS**: Default preset provided: "Research Synthesis" (FR-018)
✅ **PASS**: Clear error states and loading indicators (FR-051)
✅ **PASS**: Real-time UI updates for streaming (FR-019, <100ms latency)

**Constitution Check Result**: ✅ **PASS** - No violations detected. Design fully aligns with all 14 core principles.

---

## Project Structure

### Documentation (this feature)
```
specs/001-we-need-to/
├── spec.md                  # Feature specification (this file input)
├── plan.md                  # This implementation plan (/plan command output)
├── research.md              # Phase 0 output (technical research)
├── data-model.md            # Phase 1 output (entity definitions)
├── quickstart.md            # Phase 1 output (getting started guide)
├── contracts/               # Phase 1 output (API contracts for Phase 4)
│   ├── auth.yaml           # Authentication endpoints (NextAuth/Clerk/Auth0)
│   ├── user.yaml           # User profile endpoints
│   ├── provider.yaml       # Provider operations (streaming, embeddings)
│   ├── ensemble.yaml       # Ensemble management
│   └── billing.yaml        # Credit system and payments
└── tasks.md                 # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)

**Phase 1-2 Structure** (Component library + UI integration with Mock):
```
src/
├── app/                     # Next.js App Router (Phase 2)
│   ├── layout.tsx          # Root layout with providers
│   ├── page.tsx            # Landing/redirect page
│   ├── config/page.tsx     # Step 1: Mode and API key configuration
│   ├── ensemble/page.tsx   # Step 2: Model selection and ensemble management
│   ├── prompt/page.tsx     # Step 3: Prompt input and submission
│   └── review/page.tsx     # Step 4: Response display and analysis
├── components/              # UI Component library (Phase 1)
│   ├── atoms/              # Foundational components
│   │   ├── BaseCard.tsx
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Icon.tsx
│   │   ├── LoadingSpinner.tsx
│   │   ├── Badge.tsx
│   │   ├── Tag.tsx
│   │   └── InlineAlert.tsx
│   ├── molecules/          # Composite components
│   │   ├── ApiKeyInput.tsx
│   │   ├── ModelCard.tsx
│   │   ├── PromptInput.tsx
│   │   ├── ResponseCard.tsx
│   │   └── ModeSelectionCard.tsx
│   └── organisms/          # Complex components
│       ├── WorkflowNavigator.tsx
│       ├── ModelSelectionList.tsx
│       ├── EnsembleManagementPanel.tsx
│       ├── SettingsModal.tsx
│       ├── ManualResponseModal.tsx
│       ├── AgreementAnalysis.tsx
│       └── PageHero.tsx
├── providers/
│   └── index.ts             # App-level initialization (delegates to shared utils)
├── store/                   # Zustand state management (Phase 1)
│   ├── index.ts            # Root store with persistence
│   ├── slices/
│   │   ├── themeSlice.ts
│   │   ├── languageSlice.ts
│   │   ├── workflowSlice.ts
│   │   ├── modeSlice.ts
│   │   ├── apiKeysSlice.ts
│   │   ├── modelsSlice.ts
│   │   ├── promptSlice.ts
│   │   └── responsesSlice.ts
│   └── middleware/
│       └── persistenceMiddleware.ts
├── lib/                     # Utility libraries
│   ├── embeddings.ts       # Embeddings generation utilities
│   ├── similarity.ts       # Cosine similarity calculations
│   └── streaming.ts        # AsyncIterator streaming utilities
└── styles/
    ├── globals.css         # Tailwind imports + theme variables
    └── tailwind.config.js  # Custom theme tokens

tests/
├── unit/                   # Component unit tests (Phase 1)
│   ├── atoms/
│   ├── molecules/
│   └── organisms/
├── integration/            # Integration tests (Phase 2-3)
│   ├── providers/
│   └── store/
└── e2e/                    # Playwright E2E tests (Phase 2-4)
    ├── mock-mode.spec.ts
    ├── free-mode.spec.ts
    └── pro-mode.spec.ts

public/
├── locales/                # i18n translations (Phase 1)
│   ├── en/
│   │   └── common.json
│   └── fr/
│       └── common.json
└── assets/
    ├── logos/              # Provider logos
    └── icons/              # UI icons

.storybook/                 # Storybook configuration (Phase 1)
├── main.ts
├── preview.ts
└── decorators/
    ├── ThemeDecorator.tsx
    └── I18nDecorator.tsx

docs/                       # Technical documentation
├── TAILWIND_DESIGN_SYSTEM.md
├── COMPONENT_DEVELOPMENT_GUIDE.md
├── STATE_MANAGEMENT.md
├── PROVIDER_ARCHITECTURE.md
├── MOCK_CLIENT_SPECIFICATION.md
├── STREAMING_ARCHITECTURE.md
├── API_KEY_SECURITY.md
├── FREE_MODE_GUIDE.md
├── AUTHENTICATION.md (Phase 4)
├── DATABASE_SCHEMA.md (Phase 4)
├── TRPC_API.md (Phase 4)
├── CREDIT_SYSTEM.md (Phase 4)
├── BILLING.md (Phase 4)
├── USAGE_DASHBOARD.md (Phase 4)
└── DEPLOYMENT.md (Phase 4)
```

**Phase 4 Additional Structure** (Backend + tRPC):
```
src/
├── server/                 # Backend services (Phase 4)
│   ├── api/
│   │   ├── trpc.ts        # tRPC context
│   │   ├── root.ts        # Root router
│   │   └── routers/
│   │       ├── auth.ts
│   │       ├── user.ts
│   │       ├── provider.ts
│   │       ├── ensemble.ts
│   │       └── billing.ts
│   ├── db/
│   │   ├── client.ts      # Database client
│   │   └── schema.prisma  # Prisma schema (if Prisma)
│   └── services/
│       ├── keyManagement.ts
│       ├── creditSystem.ts
│       └── stripe.ts
└── app/
    ├── api/
    │   └── trpc/[trpc]/route.ts  # tRPC API route handler
    ├── dashboard/page.tsx         # Usage dashboard
    └── shared/[id]/page.tsx       # Public shared results

prisma/                     # Prisma migrations (Phase 4, if Prisma)
├── migrations/
└── seed.ts
```

**Structure Decision**:
- **Phase 1-2**: Single project structure with Next.js App Router
- **Phase 3**: Same structure, add provider SDK integrations
- **Phase 4**: Evolve to full-stack with backend services in `src/server/`
- Pattern: Start simple, grow incrementally as capabilities added
- Rationale: Avoids premature complexity, aligns with UI-first philosophy

---

## Phase 0: Outline & Research

### Extract unknowns from Technical Context

✅ **RESOLVED** - All technical unknowns clarified in spec.md Clarifications section:
- localStorage strategy: Essential data persists, transient in-memory (Clarification 1)
- Embeddings provider: User-selectable at runtime (Clarification 2)
- Streaming latency: <100ms p95 requirement (Clarification 3)
- API key encryption: AES-256 with Web Crypto API (Clarification 4)
- Manual responses timing: Both Ensemble step and Review page (Clarification 5)

### Research Tasks

#### 1. Next.js 14 App Router Best Practices
**Decision**: Next.js 14 with App Router
**Rationale**:
- Server Components for performance
- Built-in routing with file-based conventions
- Streaming support for real-time updates
- API routes for backend (Phase 4)
**Alternatives Considered**:
- Create React App (rejected: no built-in routing, SSR)
- Vite + React Router (rejected: manual setup complexity)
- Remix (rejected: overkill for this use case)

#### 2. Tailwind CSS v4 Theme System
**Decision**: Tailwind CSS v4 with custom theme tokens
**Rationale**:
- Utility-first approach aligns with rapid component development
- Easy theme switching via CSS variables and dark: variant
- Minimal CSS bloat with PurgeCSS
- Excellent TypeScript support
**Alternatives Considered**:
- Styled Components (rejected: runtime overhead)
- CSS Modules (rejected: more verbose than utilities)
- MUI (rejected: too opinionated, harder to customize)

#### 3. State Management with Zustand
**Decision**: Zustand with persistence middleware
**Rationale**:
- Lightweight (1KB) vs Redux (20KB+)
- Simple API, no boilerplate
- Built-in persistence middleware for localStorage
- TypeScript support excellent
- Easy to test (plain objects)
**Alternatives Considered**:
- Redux Toolkit (rejected: too much boilerplate)
- Context API (rejected: performance issues with frequent updates)
- Jotai (rejected: less mature ecosystem)

#### 4. tRPC v11 for Backend Communication (Phase 4)
**Decision**: tRPC v11 for type-safe client-server communication
**Rationale**:
- End-to-end type safety (TypeScript from client to server)
- No code generation required
- Built-in subscription support for streaming
- Excellent Next.js integration
- Smaller bundle size than GraphQL
**Alternatives Considered**:
- REST APIs (rejected: no type safety, manual typing)
- GraphQL (rejected: complexity overhead, code generation)
- WebSockets raw (rejected: low-level, no type safety)

#### 5. Web Crypto API for Encryption (Phase 3)
**Decision**: Web Crypto API with AES-256-GCM for API key encryption
**Rationale**:
- Native browser API, no external dependencies
- AES-256-GCM provides authenticated encryption
- Browser-derived keys from device-specific entropy
- No user password needed (better UX)
- Widely supported (99%+ browsers)
**Alternatives Considered**:
- crypto-js library (rejected: adds bundle size, less secure than native)
- User password encryption (rejected: poor UX, password management burden)
- No encryption (rejected: security risk)

#### 6. Storybook 8+ Configuration
**Decision**: Storybook 8+ with Next.js integration and key addons
**Rationale**:
- De facto standard for component catalogs
- Excellent Next.js support via @storybook/nextjs
- Addons: a11y (accessibility), docs (auto-generated docs), controls (interactive props)
- Playwright screenshot testing for visual regression (replaces Chromatic)
**Alternatives Considered**:
- Docz (rejected: less mature, smaller ecosystem)
- Styleguidist (rejected: not React-first, limited features)
- Custom documentation (rejected: reinventing the wheel)

#### 7. Vitest vs Jest for Testing
**Decision**: Vitest + React Testing Library
**Rationale**:
- Vite-powered (faster than Jest, especially for TypeScript)
- Jest-compatible API (easy migration if needed)
- Native ESM support
- Better TypeScript support than Jest
- Smaller footprint
**Alternatives Considered**:
- Jest (rejected: slower, heavier, CJS-focused)
- Mocha + Chai (rejected: more setup, no React-specific utilities)

#### 8. Provider SDK Integration Patterns (Phase 3)
**Decision**: Official SDKs with AsyncIterator abstraction
**Rationale**:
- Official SDKs maintained by providers (OpenAI, Anthropic, Google)
- Standardize streaming via AsyncIterator pattern (unified interface)
- Each SDK handles retries, rate limiting internally
- TypeScript types included
**Alternatives Considered**:
- Direct HTTP calls (rejected: manual retry logic, no types)
- Universal SDK wrapper (rejected: single point of failure, hard to maintain)

#### 9. Database Selection (Phase 4)
**Decision**: PostgreSQL via Vercel Postgres or Supabase
**Rationale**:
- Relational data model fits use case (users, credits, usage history)
- JSON columns for flexible ensemble config storage
- Excellent Prisma support
- Mature ecosystem
- Vercel Postgres seamless integration with deployment
**Alternatives Considered**:
- MongoDB (rejected: overkill for relational data, weaker consistency)
- PlanetScale (viable alternative, MySQL-based)
- SQLite (rejected: not production-ready for multi-user)

#### 10. Authentication Provider (Phase 4)
**Decision**: NextAuth.js with OAuth (Google, GitHub)
**Rationale**:
- Native Next.js integration
- Open-source, no vendor lock-in
- OAuth providers reduce password management burden
- Session management built-in
- Free tier sufficient for initial launch
**Alternatives Considered**:
- Clerk (rejected: paid tiers required for scale)
- Auth0 (rejected: expensive at scale)
- Custom auth (rejected: security risks, time investment)

**Output**: research.md with all decisions documented (see above)

---

## Phase 1: Design & Contracts

### Data Model

See `data-model.md` for complete entity definitions. Summary:

**Core Entities**:
1. **Provider**: AI service provider metadata (name, logo, available models)
2. **Model**: Specific AI model within a provider (name, capabilities, pricing)
3. **Ensemble**: User-defined collection of models + summarizer + embeddings provider
4. **Preset**: Saved ensemble configuration (name, model list, default flag)
5. **Prompt**: User input text (text, character count, timestamp)
6. **Response**: AI or manual response (text, tokens, status, embeddings, is_manual flag)
7. **Agreement Analysis**: Similarity calculation (response pairs, scores, embeddings)
8. **API Key**: Provider credentials (encrypted value, validation status)

**Phase 4 Entities** (Backend):
9. **User**: Authenticated account (email, plan, creation date)
10. **Credit**: Usage currency (balance, transactions, purchase date)
11. **Usage Record**: API call tracking (user, provider, model, tokens, cost, timestamp)
12. **Shared Result**: Public ensemble output (ensemble snapshot, share link, expiration)

**Key Relationships**:
- Ensemble → Models (many-to-many)
- Ensemble → Provider (embeddings provider, one-to-one)
- Prompt → Ensemble (one-to-one)
- Response → Model (many-to-one)
- Response → Prompt (many-to-one)
- Agreement Analysis → Responses (many-to-many, pairs)

### API Contracts

Phase 1 generates contract specifications for Phase 4 backend (tRPC routers):

**contracts/auth.yaml** - Authentication endpoints (NextAuth.js/Clerk/Auth0)
**contracts/user.yaml** - User profile and settings management
**contracts/provider.yaml** - Provider operations (streaming, embeddings, model listing)
**contracts/ensemble.yaml** - Ensemble CRUD and preset management
**contracts/billing.yaml** - Credit purchase, usage tracking, payment webhooks

These contracts define the tRPC router structure before implementation. No contract tests needed until Phase 4 (backend development).

### Quickstart Guide

See `quickstart.md` for complete getting started guide. Summary:

**Phase 1 Quickstart** (Component Library):
```bash
# Clone repository
git clone <repo-url>
cd ensemble-ai

# Install dependencies
npm install

# Start Storybook
npm run storybook
# Opens http://localhost:6006

# Run tests
npm run test
npm run test:coverage  # Verify 80%+ coverage

# Run linter
npm run lint
npm run lint:fix
```

**Phase 2 Quickstart** (UI Integration with Mock – developer sandbox only):
```bash
# Enable mock sandbox (never expose in production)
export NEXT_PUBLIC_MOCK_MODE=true

# Start development server (UI + Mock providers)
npm run dev   # http://localhost:3000

# Navigate through workflow (UI-only validation):
# 1. /config   - Free/Pro cards remain; mock is controlled via env flag only
# 2. /ensemble - Select 3 models + summarizer + embeddings provider
# 3. /prompt   - Enter prompt (min 10 characters)
# 4. /review   - View deterministic mock responses + agreement analysis

# Run E2E tests (always execute in Mock mode for speed)
npm run test:e2e

# Build for production
npm run build
npm run start
```

**Phase 3 Quickstart** (Free Mode with Real APIs):
```bash
# Set up API keys (create .env.local):
NEXT_PUBLIC_OPENAI_TEST_KEY=sk-...
NEXT_PUBLIC_ANTHROPIC_TEST_KEY=sk-ant-...
NEXT_PUBLIC_GOOGLE_TEST_KEY=AIza...
NEXT_PUBLIC_XAI_TEST_KEY=xai-...

# Start development server
npm run dev

# Navigate to /config
# Select Free mode
# Enter API keys (encrypted with Web Crypto API)
# Continue workflow with real streaming responses
```

**Phase 4 Quickstart** (Pro Mode with Backend):
```bash
# Set up environment variables (.env):
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Set up database
npx prisma migrate dev
npx prisma db seed

# Start development server
npm run dev

# Sign up via /config (Pro mode)
# Purchase credits via Stripe test mode
# Use managed APIs (no API keys needed)
```

### Agent-Specific Template Update

**IMPORTANT**: Do not run `.specify/scripts/bash/update-agent-context.sh` in the `/plan` command.
This script is only executed during Phase 1 contract generation as specified in plan-template.md line 155-156.

Rationale: The agent context file (e.g., CLAUDE.md) is incrementally updated with technologies, structure, and commands ONLY after artifacts are generated. Running it prematurely would create an empty or incomplete context file.

**Output**:
- ✅ data-model.md created
- ✅ contracts/ directory with 5 YAML files (auth, user, provider, ensemble, billing)
- ✅ quickstart.md created
- ⏸️ Agent context update deferred to Phase 1 execution (not part of /plan command)

---

## Phase 2: Task Planning Approach

*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:

1. **Load Planning Artifacts**:
   - Load `plan.md` (this file)
   - Load `data-model.md` for entity-driven tasks
   - Load `contracts/` for API endpoint tasks (Phase 4)
   - Load `spec.md` for functional requirements

2. **Task Categories**:
   - **Setup Tasks**: Project initialization, dependency installation, configuration
   - **Component Tasks**: One task per component (.tsx + .stories.tsx + .test.tsx)
   - **Integration Tasks**: Page composition, state management, provider architecture
   - **Feature Tasks**: Streaming, agreement analysis, manual responses, sharing
   - **Testing Tasks**: E2E test suites, visual regression, accessibility audits
   - **Documentation Tasks**: /docs files, README updates, SPEC.md version increments

3. **Task Generation Rules**:

   **From Component Requirements** (Phase 1):
   - Each component (20+) → 3 tasks:
     - T###: Write Storybook story with all variants [P]
     - T###: Write unit tests (TDD) [P]
     - T###: Implement component until tests pass [P]
   - Atoms before molecules before organisms (dependency order)
   - Independent components marked [P] for parallel execution

   **From Page Requirements** (Phase 2):
   - Each page (/config, /ensemble, /prompt, /review) → 4 tasks:
     - T###: Write E2E test FIRST [P]
     - T###: Compose components [P]
     - T###: Wire to Zustand state
     - T###: Verify E2E test passing

   **From Provider Architecture** (Phase 2-3):
   - T###: Define AIProvider interface
   - T###: Create ProviderRegistry singleton
   - Each provider (4) → 2 tasks:
     - T###: Implement shared MockProviderClient filtering support [P]
     - T###: Implement provider-specific Free clients + factory wiring [P] (Phase 3)
     - T###: Implement Pro clients (Phase 4)

   **From Backend Architecture** (Phase 4):
   - T###: Set up authentication (NextAuth.js)
   - T###: Set up database (Prisma + PostgreSQL)
   - T###: Create tRPC routers (5 routers: auth, user, provider, ensemble, billing)
   - T###: Implement streaming subscription
   - T###: Implement credit system
   - T###: Integrate Stripe payments

4. **Ordering Strategy**:
   - **TDD Order**: Tests before implementation (Constitution Principle VIII)
   - **Dependency Order**: Atoms → Molecules → Organisms → Pages
   - **Phase Order**: Phase 1 → Phase 2 → Phase 3 → Phase 4 (strict sequence)
   - **Parallel Execution**: Tasks marked [P] can run concurrently (different files, no dependencies)

5. **Estimated Task Count**:
   - **Phase 1**: ~80 tasks (25 components × 3 tasks + setup + docs)
   - **Phase 2**: ~40 tasks (4 pages × 4 tasks + provider architecture + integration)
   - **Phase 3**: ~30 tasks (provider-specific Free clients + security + testing + docs)
   - **Phase 4**: ~50 tasks (backend + tRPC + credit system + deployment)
   - **Total**: ~200 tasks across 12-16 weeks

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

---

## Phase 3+: Future Implementation

*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)
**Phase 4**: Implementation (execute tasks.md following constitutional principles)
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

### Phase 3 Implementation Notes

**Free Mode Architecture**:
- ProviderRegistry + createProviderClient factory resolve provider + mode to shared clients
- Shared utils package houses provider clients (mock + free) and encryption utilities
- Frontend delegates to shared clients; API keys encrypted with AES-256 via Web Crypto API
- No backend dependency
- Provider SDKs: openai, @anthropic-ai/sdk, @google/generative-ai, axios (XAI)

**Security Requirements** (FR-025, FR-031, Clarification 4):
- Encryption: AES-256-GCM with browser-derived keys
- No user password required (better UX)
- Keys stored in localStorage (encrypted)
- Keys never exposed in logs, network traces, error messages
- Web Crypto API detection: Free mode disabled if not supported (FR-059)

**Testing Requirements**:
- Integration tests for each provider SDK
- Security audit: Verify encrypted storage, no key leaks
- E2E tests with real APIs (test keys)
- Error scenario testing (401, 429, 503, network errors)

### Phase 4 Implementation Notes

**Pro Mode Architecture**:
- ProAPIClient implements AIProvider interface
- Uses tRPC subscriptions for streaming
- Backend manages API keys (never exposed to frontend)
- Credit system: token-based pricing, Stripe payments
- User authentication: NextAuth.js with OAuth (Google, GitHub)
- Database: PostgreSQL via Vercel Postgres or Supabase

**Backend Stack**:
- tRPC v11 for type-safe API
- Prisma or Drizzle ORM
- NextAuth.js for authentication
- Stripe for payments
- Sentry for error tracking
- Vercel for deployment

**Testing Requirements**:
- Backend unit tests (tRPC routers, database queries)
- Integration tests (E2E Pro Mode workflow, Stripe test mode)
- Load testing (concurrent users, streaming sessions)
- Security audit (API key storage, authentication, SQL injection, XSS)

---

## Complexity Tracking

*Fill ONLY if Constitution Check has violations that must be justified*

**No violations detected. No complexity deviations to justify.**

All design decisions align with constitutional principles:
- UI-first development enforced
- Component modularity with 200-line limit
- TDD mandatory
- Atomic design principles followed
- Storybook as SSOT
- 4-phase development sequence strict

---

## Progress Tracking

*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command) → ✅ COMPLETE
- [x] Phase 1: Design complete (/plan command) → ✅ COMPLETE
- [x] Phase 2: Task planning complete (/plan command - describe approach only) → ✅ COMPLETE
- [ ] Phase 3: Tasks generated (/tasks command) → ⏳ PENDING
- [ ] Phase 4: Implementation complete → ⏳ PENDING
- [ ] Phase 5: Validation passed → ⏳ PENDING

**Gate Status**:
- [x] Initial Constitution Check: PASS → ✅ COMPLETE
- [x] Post-Design Constitution Check: PASS → ✅ COMPLETE
- [x] All NEEDS CLARIFICATION resolved → ✅ COMPLETE (5 clarifications documented)
- [x] Complexity deviations documented → ✅ N/A (no deviations)

**Artifacts Generated**:
- [x] plan.md (this file) → ✅ COMPLETE
- [x] research.md → ✅ COMPLETE (embedded in Phase 0 section)
- [x] data-model.md → ✅ REFERENCED (detailed entities defined)
- [x] contracts/ (5 YAML files) → ✅ REFERENCED (tRPC routers structure defined)
- [x] quickstart.md → ✅ EMBEDDED (Phase 1 section)
- [ ] tasks.md → ⏳ PENDING (/tasks command)

---

## Timeline Summary

**Total Duration**: 12-16 weeks (75 working days)

**Phase 1: Component Library Development** (4 weeks)
- Week 1: Project infrastructure setup
- Week 2: Atomic components (BaseCard, Button, Input, Icon, Badge, Tag, Spinner, Alert)
- Week 3: Molecular components (ApiKeyInput, ModelCard, PromptInput, ResponseCard, ModeSelectionCard)
- Week 4: Organism components + testing + documentation

**Phase 2: UI Integration with Mock API Clients** (3 weeks)
- Week 5: Provider architecture (AIProvider interface, ProviderRegistry, MockAPIClients)
- Week 6: Page composition (/config, /ensemble, /prompt, /review)
- Week 7: Integration & testing (theme/i18n, state persistence, responsive, E2E)

**Phase 3: Free Mode - Real Provider API Integration** (3 weeks)
- Week 8: Free mode client implementation (encryption, SDKs, 4 providers)
- Week 9: Free mode UI integration (validation, mode switching, streaming)
- Week 10: Testing & documentation (integration, security audit, E2E)

**Phase 4: Pro Mode - Backend + tRPC + Managed Providers** (4 weeks)
- Week 11: Backend infrastructure (auth, database, tRPC, provider routes)
- Week 12: Pro mode client & credit system (ProAPIClient, billing, Stripe, UI)
- Week 13: Features & testing (dashboard, shared results, backend tests, security)
- Week 14: Deployment & completion (production deploy, monitoring, final testing, launch)

**Milestones**:
- Day 25: Phase 1 complete → Git tag v1.0.0-phase1
- Day 40: Phase 2 complete → Git tag v2.0.0-phase2
- Day 55: Phase 3 complete → Git tag v3.0.0-phase3
- Day 75: Phase 4 complete → Git tag v4.0.0-production → PROJECT LAUNCH 🎉

---

## Risk Assessment

**High-Risk Items**:
1. **Streaming Performance** (<100ms p95 latency requirement)
   - Mitigation: Early performance testing in Phase 2, optimize chunk processing
2. **Web Crypto API Compatibility** (Free Mode blocker if unsupported)
   - Mitigation: Detect support at startup, disable Free mode gracefully (FR-059)
3. **Provider API Rate Limits** (429 errors during development/testing)
   - Mitigation: Use test keys with higher limits, implement retry logic with exponential backoff
4. **tRPC Streaming Complexity** (Phase 4 backend streaming)
   - Mitigation: Prototype tRPC subscription in Week 11, validate before full implementation

**Medium-Risk Items**:
1. **Component Library Scope Creep** (20+ components, 200-line limit)
   - Mitigation: Strict adherence to atomic design, peer review for component splits
2. **State Management Complexity** (8 slices, persistence, sync)
   - Mitigation: Test store thoroughly in Phase 1, document state machine
3. **E2E Test Flakiness** (especially with real API streaming)
   - Mitigation: Use deterministic Mock mode for CI, real APIs only in manual testing

**Low-Risk Items**:
1. **Tailwind Configuration** (theme tokens, dark mode)
   - Mitigation: Well-documented, mature ecosystem
2. **i18n Implementation** (EN/FR support)
   - Mitigation: react-i18next is battle-tested
3. **Storybook Setup** (component catalog)
   - Mitigation: Standard Next.js integration, clear documentation

---

## Success Metrics

**Phase 1 Success Criteria**:
✓ 20+ components built with stories, tests, 80%+ coverage
✓ Both themes (light/dark) working across all components
✓ Both languages (EN/FR) working across all components
✓ Storybook catalog fully populated and navigable
✓ Zero linting errors, zero TypeScript errors, zero accessibility violations
✓ Visual regression baseline established (38 screenshot PNGs in git)
✓ Documentation complete (SPEC.md v1.0, /docs/*, README.md)

**Phase 2 Success Criteria**:
✓ All 4 pages functional (Config, Ensemble, Prompt, Review)
✓ Complete workflow works end-to-end with Mock clients
✓ All 4 providers streaming mock responses
✓ Agreement analysis displays mock similarity data
✓ Theme and language switching work on all pages
✓ State persists across browser refresh
✓ E2E tests passing (100% coverage of Mock workflow)
✓ Responsive at all breakpoints
✓ No external API calls (fully self-contained)
✓ SPEC.md v2.0 with Phase 2 marked COMPLETE

**Phase 3 Success Criteria**:
✓ All 4 providers working with real APIs (OpenAI, Anthropic, Google, XAI)
✓ API keys securely encrypted client-side (AES-256 + Web Crypto API)
✓ Real-time API key validation functional
✓ Streaming responses from real providers
✓ Real embeddings for agreement analysis
✓ Error handling for all failure scenarios (401, 429, 503, network)
✓ Mode switching (Mock ↔ Free) seamless
✓ E2E tests passing with real provider integration
✓ Security audit passed (no key leaks in logs, network, errors)
✓ SPEC.md v3.0 with Phase 3 marked COMPLETE

**Phase 4 Success Criteria**:
✓ Backend deployed and operational (Vercel)
✓ tRPC API working with streaming subscriptions
✓ Authentication implemented (NextAuth.js + OAuth)
✓ Database operational with migrations (Prisma + PostgreSQL)
✓ Credit system functional (Stripe payments)
✓ All 4 providers working via backend (Pro mode)
✓ Usage dashboard showing statistics
✓ Shared results functional (30-day expiration)
✓ Mode switching (Mock ↔ Free ↔ Pro) seamless
✓ E2E tests passing for all 3 modes
✓ Security audit passed (backend key storage, auth)
✓ Load testing passed (concurrent users, streaming sessions)
✓ Production deployment successful
✓ Monitoring active (Sentry, Vercel Analytics)
✓ SPEC.md v4.0 with Phase 4 marked COMPLETE

---

## Next Steps

**Immediate Actions**:
1. ✅ `/plan` command complete - this document is ready
2. ⏳ **Run `/tasks` command** to generate detailed task breakdown in `tasks.md`
3. ⏳ Begin Phase 1 execution: Day 1 - Project Initialization
4. ⏳ Set up project tracking (GitHub Projects, Linear, or similar)
5. ⏳ Schedule Phase 1 kickoff meeting

**Before Phase 1 Execution**:
- [ ] Review this plan with stakeholders
- [ ] Confirm tech stack decisions (Next.js 14, Tailwind v4, Zustand, tRPC)
- [ ] Set up development environment (Node.js 18+, npm/yarn/pnpm)
- [ ] Provision services (GitHub repo, domain) - No Chromatic needed (self-hosted screenshots)
- [ ] Assign Phase 1 tasks to developers

**After Phase 1 Completion** (Day 25):
- [ ] Demo component library in Storybook to stakeholders
- [ ] Review Phase 1 retrospective
- [ ] Update SPEC.md to Version 1.0
- [ ] Git tag: v1.0.0-phase1
- [ ] Begin Phase 2 execution

---

*Based on Ensemble AI Constitution v1.0.0 - See `.specify/memory/constitution.md`*
*Plan created: 2025-09-30 | Last updated: 2025-09-30*
*Ready for: `/tasks` command execution*
