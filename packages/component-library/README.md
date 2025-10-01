# @ai-ensemble/component-library

Production-ready React component library built with TypeScript, Tailwind CSS, and Storybook. Follows [shadcn/ui](https://ui.shadcn.com/) patterns and **[Atomic Design](https://bradfrost.com/blog/post/atomic-web-design/)** principles with full test coverage and visual regression testing.

## 📦 Components (Atomic Design)

This library follows **Atomic Design** principles, organizing components from simple to complex:

### 🔹 Atoms (12) - Basic Building Blocks
- **Button** - All variants (default, destructive, outline, secondary, ghost, link) and sizes
- **Card** - Flexible container with Header, Footer, Title, Description, and Content subcomponents
- **Input** - Text input with validation states and accessibility
- **Badge** - Status badges with multiple variants
- **Icon** - Icon wrapper with variants (lucide-react)
- **LoadingSpinner** - Loading indicator with size variants
- **Tag** - Chip/tag for filters and selections (removable, selectable)
- **InlineAlert** - Inline messages (info, success, warning, error)
- **Textarea** - Multiline text input with auto-resize
- **Label** - Semantic form labels with proper `htmlFor` association
- **Progress** - Animated progress bars with variants
- **Separator** - Horizontal and vertical dividers

### 🔸 Molecules (2) - Simple Combinations
- **EnsembleHeader** - Application header with branding
- **ProgressSteps** - Workflow stepper (Config → Ensemble → Prompt → Review)

### 🔶 Organisms (Planned)
- Navbar, DataTable, Modal, Dropdown, Tabs, CommandPalette

### 📄 Templates (Planned)
- DashboardLayout, AuthLayout, WizardLayout

### Utilities
- **cn()** - Smart className merger using `clsx` + `tailwind-merge` for conflict resolution

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start Storybook development server
npm run storybook

# Run tests
npm run test

# Run tests in watch mode
npm test

# Build TypeScript
npm run build

# Run linting
npm run lint

# Fix linting issues
npm run lint:fix
```

## 📖 Usage

```tsx
import { Button, Card, CardHeader, CardTitle, CardContent } from '@ai-ensemble/component-library';

function MyComponent() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Welcome</CardTitle>
      </CardHeader>
      <CardContent>
        <Button variant="default" size="lg">
          Click me
        </Button>
      </CardContent>
    </Card>
  );
}
```

## 🎨 Design System

All components use Tailwind CSS with a custom theme:

- **Colors**: CSS variables for theming (`--color-primary`, `--color-secondary`, etc.)
- **Spacing**: Tailwind's default spacing scale
- **Typography**: System font stack with proper line heights
- **Radius**: Consistent border radius via `--radius` CSS variable

## 🧪 Testing

### Test Stack
- **Unit Tests**: Vitest + React Testing Library
- **Visual Regression**: Playwright screenshot testing (59 stories)
- **Storybook Tests**: Interaction testing via test-runner
- **Coverage Target**: 80%+ (currently 127 tests passing)

### Running Tests

```bash
# Run all unit tests
npm run test:unit

# Run Storybook tests
npm run test:storybook

# Run Storybook tests in CI (with static build)
npm run test:storybook:ci

# Take visual regression screenshots
npx tsx scripts/screenshot-stories.ts
```

### Test Structure
```
src/components/
  ui/
    Button/
      Button.tsx              # Implementation
      Button.test.tsx         # Unit tests
      Button.stories.tsx      # Storybook stories
      Button.snapshot.test.tsx # Snapshot tests (optional)
      index.ts                # Public exports
```

## 📐 Component Development

### TDD Workflow (Required)
1. **Write Storybook story** - Define component API and variants
2. **Write unit tests** - Test behavior, accessibility, edge cases
3. **Implement component** - Build component to pass tests
4. **Take screenshots** - Capture visual regression baseline

### Component Guidelines
- **Composition over inheritance** - Use CVA (class-variance-authority) for variants
- **TypeScript first** - Full type safety with exported types
- **Accessibility** - WCAG 2.1 AA compliance required
- **200-line limit** - Keep components focused and maintainable
- **Forwardable refs** - All components support `React.forwardRef`

### Example: Creating a New Component

```tsx
// 1. Define variants with CVA
import { cva, type VariantProps } from 'class-variance-authority';

const componentVariants = cva(
  'base-classes',
  {
    variants: {
      variant: {
        default: 'default-classes',
        outline: 'outline-classes',
      },
      size: {
        sm: 'small-classes',
        md: 'medium-classes',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

// 2. Define props interface
export interface ComponentProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof componentVariants> {}

// 3. Implement component
export const Component = React.forwardRef<HTMLDivElement, ComponentProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(componentVariants({ variant, size }), className)}
        {...props}
      />
    );
  }
);
Component.displayName = 'Component';
```

## 🔧 Available Scripts

| Script | Description |
|--------|-------------|
| `npm run storybook` | Start Storybook dev server on port 6006 |
| `npm run build-storybook` | Build static Storybook for deployment |
| `npm run build` | Type-check TypeScript (no output) |
| `npm test` | Run Vitest in watch mode |
| `npm run test:unit` | Run all unit tests once |
| `npm run test:storybook` | Run Storybook interaction tests |
| `npm run test:storybook:ci` | Run Storybook tests in CI mode |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Fix ESLint issues automatically |
| `npm run typecheck` | Run TypeScript compiler check |

## 📁 Project Structure

Organized following **Atomic Design** principles:

```
packages/component-library/
├── .storybook/              # Storybook configuration
│   ├── main.ts             # Storybook main config
│   └── preview.ts          # Global decorators and parameters
├── docs/                    # Documentation
│   ├── ATOMIC_DESIGN_ARCHITECTURE.md  # Atomic design guide
│   ├── COMPONENT_DEVELOPMENT_GUIDE.md # TDD workflow
│   └── TAILWIND_DESIGN_SYSTEM.md      # Design tokens
├── src/
│   ├── components/
│   │   ├── atoms/          # Level 1: Basic building blocks
│   │   │   ├── Button/     # Action trigger
│   │   │   ├── Card/       # Container component
│   │   │   ├── Input/      # Text input
│   │   │   ├── Badge/      # Status indicator
│   │   │   ├── Icon/       # Icon wrapper
│   │   │   ├── LoadingSpinner/
│   │   │   ├── Tag/        # Chip/filter tag
│   │   │   ├── InlineAlert/
│   │   │   ├── Textarea/
│   │   │   ├── Label/
│   │   │   ├── Progress/
│   │   │   └── Separator/
│   │   ├── molecules/      # Level 2: Simple combinations
│   │   │   ├── EnsembleHeader/
│   │   │   └── ProgressSteps/
│   │   ├── organisms/      # Level 3: Complex components (planned)
│   │   └── templates/      # Level 4: Page layouts (planned)
│   ├── lib/
│   │   └── utils.ts        # Utility functions (cn, etc.)
│   ├── styles/
│   │   └── globals.css     # Global styles and CSS variables
│   └── index.ts            # Public API exports
├── scripts/
│   └── screenshot-stories.ts # Visual regression script
├── screenshots/             # Visual regression baselines (59 PNGs)
├── package.json
├── tailwind.config.ts
├── tsconfig.json
├── vitest.config.ts
└── README.md
```

## 🎯 Coverage Status

- **Total Components**: 10 (8 atoms + 2 composites)
- **Unit Tests**: 127 passing
- **Storybook Stories**: 59 with full documentation
- **Visual Regression**: 59 baseline screenshots
- **Test Coverage**: 80%+ on all components

## 🔄 Commit Discipline

This project follows strict commit discipline for quality:

- **Frequency**: Commit after each discrete task (every 30-60 minutes)
- **Format**: Use Conventional Commits (`feat:`, `fix:`, `test:`, `refactor:`, `docs:`)
- **Pre-Commit Hooks**: Linting, type checking, and unit tests run automatically
- **Never bypass**: Don't use `--no-verify` except in emergencies

### Good Commit Examples
```bash
git commit -m "feat: add Progress component with variants (T095)"
git commit -m "test: add unit tests for Label component (T049)"
git commit -m "fix: correct Button disabled state styling"
git commit -m "docs: update README with testing instructions"
```

## 🤝 Contributing

1. **Follow TDD**: Write tests before implementation
2. **Run tests**: Ensure all tests pass before committing
3. **Check coverage**: Maintain 80%+ test coverage
4. **Update docs**: Document new components and APIs
5. **Take screenshots**: Update visual regression baselines

## 📚 Documentation

- **[ATOMIC_DESIGN_ARCHITECTURE.md](docs/ATOMIC_DESIGN_ARCHITECTURE.md)** - Atomic design principles and component organization
- **[COMPONENT_DEVELOPMENT_GUIDE.md](docs/COMPONENT_DEVELOPMENT_GUIDE.md)** - TDD workflow and best practices
- **[TAILWIND_DESIGN_SYSTEM.md](docs/TAILWIND_DESIGN_SYSTEM.md)** - Design tokens and styling guidelines
- **Storybook** - Interactive component documentation at `http://localhost:6006`
- **tailwind.config.ts** - Tailwind theme configuration

## 🏗️ Tech Stack

- **React 19** - UI library
- **TypeScript 5.8** - Type safety
- **Tailwind CSS 3.4** - Utility-first styling
- **Storybook 9.1** - Component development and documentation
- **Vitest 3.2** - Unit testing framework
- **Playwright 1.55** - Screenshot testing and E2E
- **CVA** - Variant management
- **Lucide React** - Icon library

## 📄 License

Private package for @ai-ensemble project.

---

**Version**: 0.1.0
**Last Updated**: 2025-09-30
**Status**: Phase 1.1 Complete ✅
