# Component Development Guide

> **TDD Workflow**: This guide documents the Test-Driven Development workflow mandated by Constitution Principle VIII.

## Overview

All components in the Ensemble AI component library follow a strict **Test-Driven Development (TDD)** workflow. This ensures high code quality, comprehensive test coverage (80%+ required), and consistent component APIs.

## TDD Workflow

### The Golden Rule

**Write tests BEFORE implementation. Implementation comes LAST.**

```
Story → Tests → Implementation → Validation
```

### Step-by-Step Process

#### 1. Create Component Files

```bash
cd packages/component-library

# Example: Creating a new Button component
mkdir -p src/components/ui/Button
touch src/components/ui/Button/Button.tsx
touch src/components/ui/Button/Button.stories.tsx
touch src/components/ui/Button/Button.test.tsx
touch src/components/ui/Button/index.ts
```

#### 2. Write Storybook Story FIRST

**File**: `Button.stories.tsx`

Define all variants, states, and use cases in Storybook BEFORE writing any tests or implementation:

```tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

const meta = {
  title: 'UI/Button',
  component: Button,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'],
    },
    size: {
      control: 'select',
      options: ['sm', 'default', 'lg', 'icon'],
    },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

// Document ALL variants
export const Default: Story = {
  args: {
    children: 'Button',
  },
};

export const Destructive: Story = {
  args: {
    variant: 'destructive',
    children: 'Delete',
  },
};

export const Outline: Story = {
  args: {
    variant: 'outline',
    children: 'Outline',
  },
};

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'Secondary',
  },
};

export const Ghost: Story = {
  args: {
    variant: 'ghost',
    children: 'Ghost',
  },
};

export const Link: Story = {
  args: {
    variant: 'link',
    children: 'Link',
  },
};

// Document ALL sizes
export const Small: Story = {
  args: {
    size: 'sm',
    children: 'Small',
  },
};

export const Large: Story = {
  args: {
    size: 'lg',
    children: 'Large',
  },
};

export const Icon: Story = {
  args: {
    size: 'icon',
    children: '→',
  },
};

// Document states
export const Disabled: Story = {
  args: {
    disabled: true,
    children: 'Disabled',
  },
};

export const Loading: Story = {
  args: {
    children: 'Loading...',
    // Add loading prop if needed
  },
};
```

**Story Requirements:**
- ✅ All variants documented
- ✅ All sizes documented
- ✅ All states documented (disabled, loading, error, etc.)
- ✅ Both themes visible via Storybook theme decorator
- ✅ Both languages testable via Storybook i18n decorator
- ✅ `autodocs` tag enabled for automatic documentation

#### 3. Write Unit Tests BEFORE Implementation

**File**: `Button.test.tsx`

Write comprehensive tests that WILL FAIL initially (because implementation doesn't exist yet):

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './Button';

describe('Button', () => {
  describe('rendering', () => {
    it('renders with default variant', () => {
      render(<Button>Click me</Button>);
      expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
    });

    it('renders with destructive variant', () => {
      render(<Button variant="destructive">Delete</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-destructive');
    });

    it('renders with outline variant', () => {
      render(<Button variant="outline">Outline</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('border');
    });

    it('renders with small size', () => {
      render(<Button size="sm">Small</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('h-9');
    });

    it('renders with large size', () => {
      render(<Button size="lg">Large</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('h-11');
    });

    it('renders as disabled', () => {
      render(<Button disabled>Disabled</Button>);
      expect(screen.getByRole('button')).toBeDisabled();
    });
  });

  describe('interactions', () => {
    it('calls onClick handler when clicked', async () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Click me</Button>);

      await userEvent.click(screen.getByRole('button'));
      expect(handleClick).toHaveBeenCalledOnce();
    });

    it('does not call onClick when disabled', async () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick} disabled>Disabled</Button>);

      await userEvent.click(screen.getByRole('button'));
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('accessibility', () => {
    it('supports keyboard navigation (Enter)', async () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Press me</Button>);

      const button = screen.getByRole('button');
      button.focus();
      await userEvent.keyboard('{Enter}');

      expect(handleClick).toHaveBeenCalledOnce();
    });

    it('supports keyboard navigation (Space)', async () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Press me</Button>);

      const button = screen.getByRole('button');
      button.focus();
      await userEvent.keyboard(' ');

      expect(handleClick).toHaveBeenCalledOnce();
    });

    it('has proper ARIA attributes', () => {
      render(<Button aria-label="Close dialog">×</Button>);
      expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Close dialog');
    });
  });

  describe('snapshots', () => {
    it('matches snapshot for default variant', () => {
      const { container } = render(<Button>Default</Button>);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('matches snapshot for destructive variant', () => {
      const { container } = render(<Button variant="destructive">Delete</Button>);
      expect(container.firstChild).toMatchSnapshot();
    });
  });
});
```

**Test Requirements:**
- ✅ Test all variants
- ✅ Test all sizes
- ✅ Test all states (disabled, loading, error)
- ✅ Test onClick handler
- ✅ Test keyboard navigation (Enter, Space)
- ✅ Test ARIA attributes
- ✅ Snapshot tests for visual regression
- ✅ Use `data-testid` for complex queries (NOT CSS classes)
- ✅ Target: 80%+ code coverage

**Run Tests (They WILL FAIL)**:
```bash
npm run test:unit
```

Expected output: **ALL TESTS FAILING** (implementation doesn't exist yet)

#### 4. Implement Component Until Tests Pass

**File**: `Button.tsx`

Now implement the component to make ALL tests pass:

```tsx
import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

/**
 * Button component with multiple variants and sizes.
 *
 * @example
 * ```tsx
 * <Button variant="default">Click me</Button>
 * <Button variant="destructive" size="sm">Delete</Button>
 * <Button variant="outline" disabled>Disabled</Button>
 * ```
 */
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
```

**Implementation Requirements:**
- ✅ TypeScript interface with proper types
- ✅ JSDoc comments with usage examples
- ✅ `React.forwardRef` for ref forwarding
- ✅ CVA (class-variance-authority) for variant management
- ✅ `cn()` utility for className merging
- ✅ Max 200 lines (Constitution Principle II)
- ✅ No hardcoded colors (use semantic tokens)
- ✅ No hardcoded text (use i18n keys if needed)

**Export Component**:

**File**: `index.ts`
```tsx
export { Button, buttonVariants, type ButtonProps } from './Button';
```

**Run Tests Again (They SHOULD PASS)**:
```bash
npm run test:unit
```

Expected output: **ALL TESTS PASSING** ✅

#### 5. Visual Validation in Storybook

```bash
npm run storybook
```

**Visual Checklist:**
- ✅ All variants render correctly
- ✅ All sizes render correctly
- ✅ Dark mode works (toggle theme in Storybook toolbar)
- ✅ French translations work (if using i18n keys)
- ✅ Hover states work
- ✅ Focus states show ring
- ✅ Disabled state shows opacity
- ✅ Responsive behavior (if applicable)

#### 6. Coverage Verification

```bash
npm run test -- --coverage
```

**Coverage Requirements:**
- ✅ Statements: 80%+
- ✅ Branches: 80%+
- ✅ Functions: 80%+
- ✅ Lines: 80%+

If coverage is below 80%, add more tests until threshold is met.

#### 7. Commit

```bash
git add src/components/ui/Button/
git commit -m "feat: add Button component with variants and tests

- Implemented Button component with 6 variants (default, destructive, outline, secondary, ghost, link)
- Added 4 sizes (sm, default, lg, icon)
- Full dark mode support
- Keyboard navigation (Enter/Space)
- ARIA attributes for accessibility
- 25 unit tests with 85% coverage
- Storybook stories with all variants

Closes T038"
```

## Component Requirements Checklist

Before marking a component complete, verify:

### Code Quality
- [ ] Max 200 lines per file
- [ ] TypeScript interface defined
- [ ] JSDoc comments with examples
- [ ] `React.forwardRef` used
- [ ] `displayName` set

### Styling
- [ ] Uses semantic design tokens (no hardcoded colors)
- [ ] Dark mode support (dark: variants)
- [ ] Responsive design (if applicable)
- [ ] Matches wireframe patterns (refer to `packages/wireframes/`)

### Testing
- [ ] Storybook story with all variants
- [ ] Unit tests with 80%+ coverage
- [ ] Keyboard navigation tested
- [ ] ARIA attributes tested
- [ ] Snapshot tests for visual regression

### Internationalization
- [ ] No hardcoded text (use i18n keys)
- [ ] Tested in both EN and FR (if using text)

### Accessibility
- [ ] Proper ARIA labels
- [ ] Keyboard navigation (Tab, Enter, Space, Escape)
- [ ] Focus ring visible
- [ ] Color contrast WCAG 2.1 AA compliant (4.5:1)
- [ ] Touch targets 44px+ (mobile)

## Common Patterns

### CVA (Class Variance Authority)

Use CVA for managing variants:

```tsx
import { cva, type VariantProps } from 'class-variance-authority';

const componentVariants = cva(
  'base-classes',
  {
    variants: {
      variant: {
        default: 'default-classes',
        primary: 'primary-classes',
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

export interface ComponentProps extends VariantProps<typeof componentVariants> {
  // Additional props
}
```

### Composition Pattern

Prefer composition over inheritance:

```tsx
// Good: Compose smaller components
function ApiKeyInput({ provider, ...props }: ApiKeyInputProps) {
  return (
    <div>
      <Label>{provider}</Label>
      <Input type="password" {...props} />
      <Icon name={provider} />
    </div>
  );
}

// Bad: Monolithic component
function ApiKeyInput({ provider, label, icon, ...props }: ApiKeyInputProps) {
  return (
    <div>
      <span>{label}</span>
      <input type="password" {...props} />
      {icon && <img src={icon} />}
    </div>
  );
}
```

### Props-Driven Behavior

Components should be fully controlled via props:

```tsx
// Good: Props-driven
function Toggle({ checked, onCheckedChange }: ToggleProps) {
  return <input type="checkbox" checked={checked} onChange={(e) => onCheckedChange(e.target.checked)} />;
}

// Bad: Internal state for controlled behavior
function Toggle() {
  const [checked, setChecked] = useState(false);
  return <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} />;
}
```

## Testing Best Practices

### Do ✅

```tsx
// Use semantic queries
screen.getByRole('button', { name: /submit/i })
screen.getByLabelText(/email address/i)
screen.getByText(/welcome/i)

// Test user interactions
await userEvent.click(button)
await userEvent.type(input, 'hello')
await userEvent.keyboard('{Enter}')

// Use data-testid for complex queries only
screen.getByTestId('complex-widget')

// Mock Zustand store
vi.mock('@/store', () => ({
  useStore: vi.fn(() => ({ theme: 'dark' })),
}))
```

### Don't ❌

```tsx
// Don't use CSS selectors
container.querySelector('.bg-blue-500') // WRONG

// Don't test implementation details
expect(component.state.count).toBe(5) // WRONG

// Don't use index selectors
screen.getAllByRole('button')[2] // WRONG - brittle

// Don't skip accessibility tests
it('renders', () => {
  render(<Button />);
}); // WRONG - no interaction or ARIA tests
```

## Storybook Best Practices

### Story Organization

```tsx
// Group related stories
export default {
  title: 'UI/Form/Input',  // Nested categories
  component: Input,
} satisfies Meta<typeof Input>;

// Document props with argTypes
argTypes: {
  variant: {
    control: 'select',
    options: ['default', 'error'],
    description: 'Visual variant of the input',
  },
  size: {
    control: 'select',
    options: ['sm', 'md', 'lg'],
    description: 'Size of the input',
  },
}
```

### Interactive Stories

```tsx
// Use actions for event handlers
import { action } from '@storybook/addon-actions';

export const WithClick: Story = {
  args: {
    onClick: action('clicked'),
    children: 'Click me',
  },
};

// Use play function for interactions
import { userEvent, within } from '@storybook/testing-library';
import { expect } from '@storybook/jest';

export const Interaction: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button');
    await userEvent.click(button);
    expect(button).toHaveFocus();
  },
};
```

## Troubleshooting

### Tests Failing After Implementation

1. **Check className matching**: CVA generates dynamic classes, use `toHaveClass()` instead of exact string match
2. **Mock external dependencies**: Zustand store, API calls, etc.
3. **Wait for async updates**: Use `waitFor()` or `findBy*` queries

### Coverage Below 80%

1. **Add edge case tests**: Empty states, error states, loading states
2. **Test all branches**: `if` statements, ternaries, switches
3. **Test error boundaries**: Try/catch blocks
4. **Test keyboard navigation**: Tab, Enter, Space, Escape

### Storybook Not Showing Dark Mode

1. **Check ThemeDecorator**: Must be added to `.storybook/preview.ts`
2. **Check globals.css import**: Storybook must import Tailwind CSS
3. **Toggle theme toolbar**: Click theme icon in Storybook toolbar

## References

- **Constitution**: `.specify/memory/constitution.md` - Principle VIII (TDD)
- **Design System**: `TAILWIND_DESIGN_SYSTEM.md` - Styling guidelines
- **Wireframes**: `packages/wireframes/` - Design source of truth
- **Testing Library Docs**: https://testing-library.com/docs/react-testing-library/intro
- **Vitest Docs**: https://vitest.dev/guide/
- **Storybook Docs**: https://storybook.js.org/docs/react/get-started/introduction

---

**Version**: 1.0.0
**Last Updated**: 2025-09-30
**TDD Enforcement**: Constitution Principle VIII
