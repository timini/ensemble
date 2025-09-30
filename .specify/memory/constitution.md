<!--
SYNC IMPACT REPORT
==================
Version Change: 1.0.0 → 1.1.0
Modified Principles: N/A
Added Sections:
  - Repository Structure section documenting monorepo architecture
  - Defines packages/component-library, packages/app, packages/wireframes structure
  - Outlines wireframes → components → application development flow
Removed Sections: N/A
Templates Requiring Updates:
  ✅ plan-template.md - Constitution Check section references verified
  ✅ spec-template.md - No constitution-specific changes needed
  ✅ tasks-template.md - TDD principles align with Principle IX
  ⚠ agent-file-template.md - Pending review for alignment
Follow-up TODOs:
  - Review agent-file-template.md for consistency with new principles
  - Consider creating a /docs/architecture.md for Phase diagrams
  - Update existing specs to reference monorepo package structure
-->

# Ensemble AI Constitution

**Version**: 1.1.0 | **Ratified**: 2025-09-30 | **Last Amended**: 2025-09-30

This document outlines the principles, architecture, and workflows that govern the development of the Ensemble AI project. Adherence to this constitution is mandatory for all contributors to ensure consistency, quality, and maintainability.

---

## Repository Structure

**Architecture**: This project is organized as a monorepo containing multiple interdependent packages.

**Package Structure**:
- **packages/component-library**: The UI component library containing all reusable atomic design components (atoms, molecules, organisms). All components are developed in isolation with Storybook as the primary development environment.
- **packages/app**: The main application that consumes the component library and implements the full user-facing application with routing, state management, and provider integration.
- **packages/wireframes**: Design wireframes and mockups that serve as the single source of truth for UI implementation.

**Development Flow**:
1. Wireframes are created first in `packages/wireframes` to establish design requirements
2. Components are built in `packages/component-library` following the wireframe specifications
3. The application in `packages/app` composes these components into complete user workflows

**Rationale**: The monorepo structure enforces clear separation of concerns, enables independent versioning of the component library, and ensures design-driven development through explicit wireframe → component → application flow.

---

## Core Principles

### I. UI-First Development Philosophy

**Principle**: Build ALL UI components BEFORE any backend integration.

**Requirements**:
- Components are the foundation: build, test, and catalog them in Storybook FIRST
- NO API integration until the UI is complete, validated, and approved
- Utilize mock data for all component development to ensure UI independence
- Every component MUST be considered production-ready before moving to the integration phase

**Rationale**: UI-first development decouples frontend quality from backend availability, enables parallel development, and ensures the user experience is designed deliberately rather than constrained by API limitations.

---

### II. Component Modularity Principles (CRITICAL)

**Principle**: Break down EVERY UI element into the smallest possible reusable components.

**Requirements**:
- **Granularity**: Decompose UI to atomic reusable units
- **Composition over Inheritance**: Build complex components by composing simpler ones
- **Single Responsibility**: Each component MUST do ONE thing and do it well
- **Conciseness**: No component shall exceed 200 lines of code
- **DRY (Don't Repeat Yourself)**: Extract repeated patterns into shared components immediately

**Examples of Required Granularity**:
- Button (base component)
- IconButton (composes Button + Icon)
- LoadingButton (composes Button + LoadingSpinner)
- Card (base component)
- CardHeader, CardBody, CardFooter (card sub-components)
- ModelCard (composes Card + CardHeader + CardBody + Button)
- Input (base component)
- ApiKeyInput (composes Input + ValidationIcon + TooltipIcon)

**Rationale**: Extreme modularity enforces reusability, testability, and maintainability. The 200-line limit prevents component bloat and forces proper decomposition.

---

### III. Component Structure Requirements

**Principle**: Every component MUST have a complete artifact set before it is considered done.

**Requirements**:
Every component MUST include:
1. Component file (.tsx)
2. Storybook story (.stories.tsx) with ALL variants documented
3. Unit test file (.test.tsx) with comprehensive coverage
4. Exported TypeScript interface for its props
5. Documentation via JSDoc comments, visible in Storybook

**Atomic Design Organization**:
- **Atoms**: Button, Input, Icon, Badge, Spinner, etc.
- **Molecules**: ApiKeyInput, ModelCard, SearchBar, etc.
- **Organisms**: ModelSelectionList, SettingsModal, NavigationBar, etc.
- **Templates**: Page layouts and skeletal structures
- **Pages**: Complete views (built last)

**Rationale**: Completeness gates prevent technical debt accumulation. Atomic design principles provide a consistent mental model for component classification and reuse.

---

### IV. Storybook as Component Catalog

**Principle**: Storybook is the single source of truth for the component library and its API.

**Requirements**:
- Every component variant MUST have a corresponding story
- Stories MUST demonstrate:
  - All visual states (default, hover, active, disabled, error, etc.)
  - All size variants (sm, md, lg)
  - All theme variants (light, dark)
  - All language variants (EN, FR)
  - Interactive behaviors (click, focus, typing, etc.)
- Use Storybook controls for dynamic prop testing
- Document component usage, best practices, and accessibility notes in story descriptions

**Rationale**: Storybook as SSOT enables visual regression testing, accelerates onboarding, serves as living documentation, and ensures components are designed in isolation before integration.

---

### V. Provider Architecture (Frontend)

**Principle**: The AIProvider abstract class and its implementations reside in the frontend application.

**Requirements**:
- An abstract AIProvider class MUST be implemented by four providers: XAI, OpenAI, Google (Gemini), and Anthropic
- Each provider MUST support three API client modes:
  - **Mock Client**: Frontend-only, generates lorem ipsum streams for UI development and E2E tests
  - **Free Client**: Frontend-only, makes direct API calls to providers from the client
  - **Pro Client**: Uses tRPC to call the backend, which then streams responses from providers to the frontend (only mode involving backend)

**AIProvider Interface Methods**:
- `streamResponse(prompt: string): AsyncIterator<string>`
- `generateEmbeddings(texts: string[]): Promise<number[][]>`
- `validateApiKey(key: string): Promise<boolean>`
- `listAvailableModels(): Promise<Model[]>`

**API Communication**: Use tRPC for type-safe backend communication (Phase 3+).

**Rationale**: Provider abstraction enables multi-vendor support. Three-mode architecture supports progressive capability rollout (mock → free → pro) without architectural rewrites.

---

### VI. Development Phases

**Principle**: Development MUST progress through strictly ordered phases.

**Required Phase Sequence**:
- **Phase 1: Component Library** - All UI components built and cataloged in Storybook
- **Phase 2: UI Integration** - Compose components into pages using Mock clients
- **Phase 3: Free Mode** - Implement real provider API clients for direct frontend-to-API communication
- **Phase 4: Pro Mode** - Implement the backend, tRPC layer, and managed provider infrastructure

**Rationale**: Phase ordering prevents premature backend coupling, validates UX before infrastructure investment, and ensures each capability tier is production-ready before advancing.

---

### VII. Design System Rules (Tailwind CSS)

**Principle**: All styling MUST use Tailwind utility classes with a centralized design token system.

**Requirements**:
- **Utility-First**: Use Tailwind utility classes for all styling
- **Design Tokens**: Define all colors, spacing, and typography in tailwind.config.js
- **Theming**: Support Minimal Dark & Minimal Light themes from day one via Tailwind's `dark:` variant
- **Custom Colors**: Define semantic colors in tailwind.config.js: card, cardBorder, cardHover, primary, etc.
- **Internationalization (i18n)**: Support English & French from day one. All text MUST use translation keys

**Rationale**: Centralized design tokens ensure consistency, reduce CSS bloat, and make theme changes trivial. Early i18n support prevents costly refactoring.

---

### VIII. Component Testing Requirements (TDD)

**Principle**: Test-Driven Development is mandatory for all component logic.

**Requirements**:
- **TDD Flow**: Write tests BEFORE implementing component logic
- **Isolation**: Test components in isolation, mocking all dependencies
- **Tooling**: Use Vitest + React Testing Library
- **Coverage Areas**:
  - Rendering: Component renders without crashing
  - Props: All prop variants render correctly
  - Interactions: User interactions (clicks, typing) work as expected
  - Accessibility: ARIA labels and keyboard navigation are functional
  - States: Loading, error, success, and disabled states are tested
  - Themes & i18n: Both light/dark modes and EN/FR text are tested
- **Selectors**: Use data-testid selectors exclusively. NEVER use CSS selectors or Tailwind classes in tests
- **Mocks**: Mock all external dependencies, including the Zustand store and API calls
- **Coverage Goal**: Maintain a minimum of 80% code coverage per component
- **Interaction Tests**: Use Storybook interaction tests for complex component behaviors

**Rationale**: TDD enforces design-before-implementation, catches regressions early, and serves as executable documentation. The 80% coverage threshold balances rigor with pragmatism.

---

### IX. Component Reusability Rules

**Principle**: Never duplicate component code. All behavior MUST be props-driven.

**Requirements**:
- **DRY Principle**: NEVER duplicate component code
- **Props-Driven**: Component behavior MUST be controlled by props, not hardcoded logic
- **Flexibility**: Use children and render props patterns for flexible composition
- **Defaults**: Provide default props for common use cases
- **Variants**: Use a `variant` prop to handle different styles (e.g., primary, secondary) instead of creating separate components (PrimaryButton, SecondaryButton)

**Rationale**: Props-driven design maximizes reusability and prevents style/logic duplication. Variant-based differentiation scales better than component proliferation.

---

### X. Code Quality

**Principle**: Enforce consistent code quality through automated tooling and explicit standards.

**Requirements**:
- **Linting & Formatting**: Use Biome (not ESLint/Prettier)
- **No Hardcoding**: Avoid hardcoded colors or text strings. Use theme tokens and i18n keys
- **Typing**: Use comprehensive TypeScript interfaces for all props and providers
- **Accessibility**: Ensure proper ARIA labels and keyboard navigation for all interactive elements
- **Performance**: Prioritize performance with streaming responses, debounced inputs, and optimistic UI updates

**Rationale**: Automated enforcement removes subjective debates, prevents regressions, and ensures accessibility/performance are first-class concerns.

---

### XI. Documentation Requirements (CRITICAL)

**Principle**: SPEC.md MUST be updated with every feature addition or architectural change.

**Requirements**:
- **SPEC.md**: This file MUST be updated with every feature addition or architectural change
- **Component Docs**: All new components require a Storybook story with comprehensive documentation
- **Pre-Development**: Document component requirements and its props interface BEFORE starting any implementation
- **Post-Development**: Update SPEC.md with the component's implementation status
- **Diagrams**: Keep architecture diagrams current using Mermaid syntax in SPEC.md
- **README.md**: Update the README.md with setup instructions for any new dependencies
- **Breaking Changes**: Document all breaking changes and provide clear migration paths
- **Reproducibility**: Specs MUST be detailed enough for another developer to rebuild the project from scratch
- **Versioning**: All spec changes MUST be versioned with a date and version number in SPEC.md

**Rationale**: Documentation drift is the primary cause of architectural decay. Pre-development documentation prevents implementation-driven design. Versioning enables auditing and rollback.

---

### XII. Documentation Structure

**Principle**: Documentation MUST follow a standardized hierarchy with clear separation of concerns.

**Required Documentation Structure**:
- **SPEC.md**: The single source of truth for product requirements and implementation status
- **/docs**: A directory for in-depth technical documentation, guides, and architecture decision records (ADRs)
- **README.md**: The primary entry point for new developers, covering setup and development workflow
- **Component Stories (.stories.tsx)**: The primary source of documentation for component API and usage examples
- **Code Comments**: Use sparingly, only for complex business logic and non-obvious architectural decisions
- **tailwind.config.js Comments**: Document custom theme tokens and design system decisions

**Rationale**: Structured documentation with clear ownership prevents duplication, ensures discoverability, and makes maintenance tractable.

---

### XIII. Development & Spec Maintenance Workflows

**Principle**: Component development and specification maintenance MUST follow prescribed workflows.

**Component Development Workflow**:
1. Define component requirements and props interface in a new SPEC.md section
2. Create the component file (.tsx) with the TypeScript interface
3. Write the Storybook story (.stories.tsx) with all variants FIRST
4. Write unit tests (.test.tsx) for all behaviors BEFORE implementation
5. Implement the component logic until all tests pass
6. Visually validate the component in Storybook across all themes, languages, and states
7. Run visual regression tests (Chromatic)
8. Update SPEC.md to mark the component as COMPLETED with the completion date
9. Only then may the component be used in pages or other components

**SPEC Maintenance Workflow**:
1. **Before**: Add requirements for a new component/feature to SPEC.md
2. **During**: Update the implementation status in SPEC.md as work progresses
3. **After**: Mark the item as COMPLETED in SPEC.md with the date
4. Create a /docs entry for any complex patterns or architectural decisions made
5. Update README.md if the developer workflow changes
6. Increment the version number in SPEC.md (e.g., Document Version: 2.4)

**Rationale**: Prescribed workflows eliminate ambiguity, enforce quality gates, and ensure documentation stays synchronized with implementation.

---

### XIV. Application Workflow Integrity

**Principle**: The application workflow MUST preserve user state and provide clear navigation.

**Requirements**:
- **User Flow**: The application follows a strict 4-step user flow: Config → Ensemble → Prompt → Review
- **Routing**: Each step MUST be URL-addressable
- **State Persistence**: Zustand state MUST be persisted to localStorage
- **Defaults**: Provide smart defaults for new users (e.g., "Research Synthesis" preset with Mock providers)
- **UX**: Implement clear error states and loading indicators for all asynchronous actions
- **Real-time UI**: The UI for streaming responses MUST update in real-time

**Rationale**: Workflow integrity prevents user frustration. URL-addressability enables bookmarking and sharing. State persistence prevents data loss on refresh. Real-time updates are table-stakes for LLM UIs.

---

## Governance

**Constitutional Authority**: This constitution supersedes all other development practices and guidelines for the Ensemble AI project.

**Amendment Procedure**:
1. Proposed amendments MUST be documented with rationale and impact analysis
2. Breaking amendments require a migration plan for existing code
3. Version increments follow semantic versioning:
   - **MAJOR**: Backward incompatible governance/principle removals or redefinitions
   - **MINOR**: New principle/section added or materially expanded guidance
   - **PATCH**: Clarifications, wording, typo fixes, non-semantic refinements
4. All amendments MUST update the LAST_AMENDED_DATE and increment CONSTITUTION_VERSION
5. Amendment approval requires documentation in a /docs/adr-*.md file

**Compliance Review**:
- All PRs and code reviews MUST verify constitutional compliance
- Complexity that violates principles MUST be explicitly justified in implementation plans
- Constitution violations without justification will block PR approval

**Runtime Development Guidance**:
- For AI agent-specific development guidance, see `.specify/templates/agent-file-template.md`
- For implementation planning guidance, see `.specify/templates/plan-template.md`
- For task execution guidance, see `.specify/templates/tasks-template.md`

**Version**: 1.1.0 | **Ratified**: 2025-09-30 | **Last Amended**: 2025-09-30