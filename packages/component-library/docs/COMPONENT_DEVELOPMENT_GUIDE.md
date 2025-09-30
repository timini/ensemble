# Component Development Guide

Complete guide for developing components in @ai-ensemble/component-library following Test-Driven Development (TDD) principles and best practices.

## TDD Workflow (Required)

All components **MUST** follow this Test-Driven Development workflow:

### 1. Write Storybook Story (API Design)
Define the component's API, variants, and use cases **before** implementation.

### 2. Write Unit Tests (Behavior Specification)
Specify expected behavior, edge cases, and accessibility requirements.

### 3. Implement Component (Pass Tests)
Build the component to satisfy the tests and story requirements.

### 4. Take Screenshots (Visual Regression)
Capture visual baseline for future regression testing.

---

## Step-by-Step Guide

### Step 1: Create Component Directory

```bash
mkdir -p src/components/ui/ComponentName
cd src/components/ui/ComponentName
```

Create these files:
- `ComponentName.tsx` - Implementation
- `ComponentName.test.tsx` - Unit tests
- `ComponentName.stories.tsx` - Storybook stories
- `index.ts` - Public exports

### Step 2: Write Storybook Story

**File**: `ComponentName.stories.tsx`

```tsx
import type { Meta, StoryObj } from '@storybook/react';
import { ComponentName } from './ComponentName';

const meta = {
  title: 'UI/ComponentName',
  component: ComponentName,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'outline', 'ghost'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
  },
} satisfies Meta<typeof ComponentName>;

export default meta;
type Story = StoryObj<typeof meta>;

// Default story
export const Default: Story = {
  args: {
    children: 'Component content',
    variant: 'default',
    size: 'md',
  },
};

// Variant stories
export const Outline: Story = {
  args: {
    ...Default.args,
    variant: 'outline',
  },
};

export const Ghost: Story = {
  args: {
    ...Default.args,
    variant: 'ghost',
  },
};

// Size stories
export const Small: Story = {
  args: {
    ...Default.args,
    size: 'sm',
  },
};

export const Large: Story = {
  args: {
    ...Default.args,
    size: 'lg',
  },
};

// State stories
export const Disabled: Story = {
  args: {
    ...Default.args,
    disabled: true,
  },
};

// Complex composition example
export const WithIcon: Story = {
  render: () => (
    <ComponentName variant="default" size="md">
      <Icon name="check" className="mr-2" />
      With Icon
    </ComponentName>
  ),
};
```

#### Story Best Practices

1. **Use `satisfies Meta`**: Type-safe story configuration
2. **Include `autodocs` tag**: Automatic documentation generation
3. **Add argTypes**: Interactive controls in Storybook
4. **Cover all variants**: One story per variant/size/state
5. **Show compositions**: Demonstrate component with children/icons
6. **Use descriptive names**: `WithIcon`, `Disabled`, `LargeSuccess`

### Step 3: Write Unit Tests

**File**: `ComponentName.test.tsx`

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComponentName } from './ComponentName';

describe('ComponentName', () => {
  // Rendering tests
  it('renders with default props', () => {
    render(<ComponentName>Content</ComponentName>);
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('renders with custom className', () => {
    render(<ComponentName className="custom-class">Content</ComponentName>);
    const element = screen.getByText('Content');
    expect(element).toHaveClass('custom-class');
  });

  // Variant tests
  it('applies default variant styles', () => {
    render(<ComponentName variant="default">Content</ComponentName>);
    const element = screen.getByText('Content');
    expect(element).toHaveClass('bg-primary'); // Check expected classes
  });

  it('applies outline variant styles', () => {
    render(<ComponentName variant="outline">Content</ComponentName>);
    const element = screen.getByText('Content');
    expect(element).toHaveClass('border', 'border-input');
  });

  // Size tests
  it('applies small size styles', () => {
    render(<ComponentName size="sm">Content</ComponentName>);
    const element = screen.getByText('Content');
    expect(element).toHaveClass('h-8'); // Small size class
  });

  it('applies large size styles', () => {
    render(<ComponentName size="lg">Content</ComponentName>);
    const element = screen.getByText('Content');
    expect(element).toHaveClass('h-10'); // Large size class
  });

  // State tests
  it('handles disabled state', () => {
    render(<ComponentName disabled>Content</ComponentName>);
    const element = screen.getByText('Content').parentElement;
    expect(element).toBeDisabled();
    expect(element).toHaveClass('opacity-50');
  });

  // Interaction tests (for interactive components)
  it('calls onClick handler when clicked', async () => {
    const handleClick = vi.fn();
    render(<ComponentName onClick={handleClick}>Content</ComponentName>);

    const element = screen.getByText('Content');
    await userEvent.click(element);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('does not call onClick when disabled', async () => {
    const handleClick = vi.fn();
    render(<ComponentName onClick={handleClick} disabled>Content</ComponentName>);

    const element = screen.getByText('Content');
    await userEvent.click(element);

    expect(handleClick).not.toHaveBeenCalled();
  });

  // Accessibility tests
  it('is keyboard accessible', async () => {
    const handleClick = vi.fn();
    render(<ComponentName onClick={handleClick}>Content</ComponentName>);

    const element = screen.getByText('Content');
    element.focus();
    await userEvent.keyboard('{Enter}');

    expect(handleClick).toHaveBeenCalled();
  });

  it('has proper ARIA attributes', () => {
    render(<ComponentName aria-label="Test label">Content</ComponentName>);
    expect(screen.getByLabelText('Test label')).toBeInTheDocument();
  });

  // Ref forwarding test
  it('forwards ref correctly', () => {
    const ref = { current: null } as React.RefObject<HTMLDivElement>;
    render(<ComponentName ref={ref}>Content</ComponentName>);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  // Edge cases
  it('handles empty children gracefully', () => {
    render(<ComponentName>{null}</ComponentName>);
    // Should render without crashing
  });

  it('handles long text content', () => {
    const longText = 'A'.repeat(1000);
    render(<ComponentName>{longText}</ComponentName>);
    expect(screen.getByText(longText)).toBeInTheDocument();
  });
});
```

#### Test Coverage Requirements

- **Rendering**: Component renders with default props
- **Variants**: All CVA variants are applied correctly
- **States**: Disabled, loading, error states work
- **Interactions**: Click, keyboard, focus events work
- **Accessibility**: ARIA attributes, keyboard navigation
- **Refs**: `forwardRef` works correctly
- **Edge cases**: Empty children, long text, null values

### Step 4: Implement Component

**File**: `ComponentName.tsx`

```tsx
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../../lib/utils';

// 1. Define variants with CVA
const componentVariants = cva(
  // Base classes (always applied)
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
  {
    // Variant configuration
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow hover:bg-primary/90',
        outline: 'border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-10 rounded-md px-8',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

// 2. Define props interface
export interface ComponentNameProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof componentVariants> {
  asChild?: boolean;
}

// 3. Implement component with forwardRef
export const ComponentName = React.forwardRef<HTMLButtonElement, ComponentNameProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';

    return (
      <Comp
        ref={ref}
        className={cn(componentVariants({ variant, size }), className)}
        {...props}
      />
    );
  }
);

ComponentName.displayName = 'ComponentName';
```

#### Implementation Guidelines

1. **Use CVA for variants**: Consistent variant management
2. **Forward refs**: All components must support `ref` prop
3. **Merge classNames**: Use `cn()` utility for proper class merging
4. **TypeScript strict**: Full type safety with no `any`
5. **200-line limit**: Keep components focused and maintainable
6. **Display name**: Set for better debugging and React DevTools
7. **Composition**: Use `Slot` from Radix UI for `asChild` pattern (optional)

### Step 5: Export Component

**File**: `index.ts`

```tsx
export {
  ComponentName,
  componentVariants,
  type ComponentNameProps,
} from './ComponentName';
```

### Step 6: Add to Public API

**File**: `src/index.ts`

```tsx
export {
  ComponentName,
  componentVariants,
  type ComponentNameProps,
} from './components/ui/ComponentName';
```

### Step 7: Run Tests

```bash
# Run unit tests
npm run test:unit

# Run in watch mode during development
npm test
```

All tests must pass with 80%+ coverage.

### Step 8: Visual Verification

```bash
# Start Storybook
npm run storybook

# Open http://localhost:6006
# Verify all stories render correctly in light/dark themes
```

### Step 9: Take Screenshots

```bash
# Update screenshot script
# Add new stories to scripts/screenshot-stories.ts

# Take screenshots
npx tsx scripts/screenshot-stories.ts

# Review screenshots in screenshots/ directory
```

### Step 10: Commit

```bash
git add src/components/ui/ComponentName
git commit -m "feat: add ComponentName component with variants (T042)"
```

---

## Component Patterns

### Atomic Components

Small, self-contained UI primitives:
- Button, Input, Badge, Label, etc.
- No business logic
- Highly reusable
- CVA variants for styling

### Molecular Components

Compositions of atomic components:
- Form groups (Label + Input)
- Search bars (Input + Button)
- Card sections (Card + Badge + Button)

### Organism Components

Complex, feature-rich components:
- Navigation bars
- Forms with validation
- Data tables
- Modals

---

## Best Practices

### Component Structure

```
ComponentName/
├── ComponentName.tsx           # Implementation (< 200 lines)
├── ComponentName.test.tsx      # Unit tests (80%+ coverage)
├── ComponentName.stories.tsx   # Storybook stories
├── ComponentName.snapshot.test.tsx (optional) # Snapshot tests
└── index.ts                    # Exports
```

### Naming Conventions

- **PascalCase**: Component names (`Button`, `InputField`)
- **camelCase**: Props, functions (`onClick`, `handleSubmit`)
- **kebab-case**: CSS classes (`btn-primary`, `input-error`)
- **SCREAMING_SNAKE_CASE**: Constants (`MAX_LENGTH`, `API_URL`)

### TypeScript Best Practices

```tsx
// ✅ Good: Extend HTML element props
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline';
}

// ❌ Bad: Duplicate HTML props
export interface ButtonProps {
  onClick?: () => void;
  className?: string;
  variant?: 'default' | 'outline';
}

// ✅ Good: Use VariantProps for CVA
export interface ButtonProps extends VariantProps<typeof buttonVariants> {}

// ✅ Good: Ref types
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>((props, ref) => {
  // ...
});

// ✅ Good: Event handlers
const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
  // ...
};
```

### Accessibility Checklist

- [ ] Semantic HTML elements (`<button>`, `<nav>`, `<label>`)
- [ ] Proper ARIA attributes (`aria-label`, `aria-expanded`, `role`)
- [ ] Keyboard navigation (Tab, Enter, Space, Escape)
- [ ] Focus indicators (`:focus-visible` styles)
- [ ] Screen reader support (descriptive labels)
- [ ] Color contrast (WCAG 2.1 AA: 4.5:1 for text)

### Performance Considerations

1. **Avoid inline functions in render**: Memoize callbacks with `useCallback`
2. **Lazy load large components**: Use `React.lazy()` for code splitting
3. **Debounce expensive operations**: Use `useDeferredValue` or `useTransition`
4. **Optimize re-renders**: Use `React.memo()` for expensive components
5. **Minimize bundle size**: Tree-shake unused code

---

## Common Pitfalls

### ❌ Not Following TDD

```tsx
// Bad: Writing implementation first
export const Button = () => <button>Click me</button>;
// Then writing tests later...
```

```tsx
// Good: Writing story and tests first
// Button.stories.tsx - Define API
// Button.test.tsx - Specify behavior
// Button.tsx - Implement to pass tests
```

### ❌ Missing Ref Forwarding

```tsx
// Bad: No ref support
export const Button = (props) => <button {...props} />;
```

```tsx
// Good: Forward refs
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (props, ref) => <button ref={ref} {...props} />
);
```

### ❌ className Not Merged Properly

```tsx
// Bad: Overwrites className
<button className={`btn ${variant}`} {...props} />
```

```tsx
// Good: Merges with cn()
<button className={cn(buttonVariants({ variant }), className)} {...props} />
```

### ❌ Missing Accessibility

```tsx
// Bad: No keyboard support
<div onClick={handleClick}>Click me</div>
```

```tsx
// Good: Semantic + keyboard
<button onClick={handleClick} onKeyDown={handleKeyDown}>
  Click me
</button>
```

### ❌ Hardcoded Styles

```tsx
// Bad: Inline styles, no theming
<button style={{ backgroundColor: '#3b82f6' }}>Click</button>
```

```tsx
// Good: Theme tokens
<button className="bg-primary text-primary-foreground">Click</button>
```

---

## Testing Strategies

### Unit Tests (Vitest + RTL)

Focus on:
- Component renders
- Props work correctly
- Events fire
- State updates
- Edge cases

### Snapshot Tests (Optional)

For catching unintended UI changes:

```tsx
it('matches snapshot', () => {
  const { container } = render(<Button>Click</Button>);
  expect(container.firstChild).toMatchSnapshot();
});
```

### Visual Regression (Playwright Screenshots)

Automated visual testing:
- Captures every Storybook story
- Compares against baselines
- Flags visual regressions

### Storybook Interaction Tests

Test user interactions in Storybook:

```tsx
export const Clicked: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button');
    await userEvent.click(button);
    await expect(button).toHaveClass('active');
  },
};
```

---

## Resources

- **CVA Documentation**: https://cva.style/docs
- **Radix UI Primitives**: https://www.radix-ui.com/primitives
- **shadcn/ui Components**: https://ui.shadcn.com/
- **React Testing Library**: https://testing-library.com/react
- **Storybook**: https://storybook.js.org/
- **Tailwind CSS**: https://tailwindcss.com/

---

**Version**: 1.0
**Last Updated**: 2025-09-30
**Compliance**: Constitution Principle VIII (TDD Required)
