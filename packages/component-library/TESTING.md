# Component Library Testing

This component library uses a comprehensive testing strategy to ensure component quality and prevent regressions.

## Testing Stack

- **Vitest**: Unit and snapshot testing
- **React Testing Library**: Component testing utilities
- **Storybook Test Runner**: Visual regression and interaction testing
- **Playwright**: Browser automation for Storybook tests

## Test Types

### 1. Unit Tests (`*.test.tsx`)

Test component behavior, props, and user interactions.

```bash
npm run test:unit
```

**Example:**
```typescript
it('handles click events', async () => {
  const handleClick = vi.fn();
  render(<Button onClick={handleClick}>Click</Button>);
  await user.click(screen.getByRole('button'));
  expect(handleClick).toHaveBeenCalledOnce();
});
```

### 2. Snapshot Tests (`*.snapshot.test.tsx`)

Capture component HTML output to detect unintended changes.

```bash
npm run test:unit  # Also runs snapshot tests
```

**Updating snapshots:**
```bash
npm run test:unit -- -u
```

**Example:**
```typescript
it('matches snapshot for default variant', () => {
  const { container } = render(<Button>Click me</Button>);
  expect(container.firstChild).toMatchSnapshot();
});
```

### 3. Storybook Visual Tests

Test components in isolation with Storybook's test-runner.

**Prerequisites:**
```bash
# Install Playwright browsers (first time only)
npx playwright install chromium
```

**Run tests:**
```bash
# Development: Requires Storybook to be running
npm run storybook  # Terminal 1
npm run test:storybook  # Terminal 2

# CI: Builds Storybook and runs tests
npm run test:storybook:ci
```

## Test Coverage

Current coverage: **78 tests** across all components

- **Atomic Components**: Button, Card, Input, Badge, Textarea
- **Composite Components**: EnsembleHeader, ProgressSteps
- **Utilities**: cn function

### Coverage Thresholds

Configured in `vitest.config.ts`:
```typescript
coverage: {
  lines: 80,
  functions: 80,
  branches: 80,
  statements: 80,
}
```

## Running All Tests

```bash
# Unit + Snapshot tests
npm run test:unit

# Storybook tests (requires Storybook running)
npm run storybook
npm run test:storybook

# All tests in CI
npm run test:unit && npm run test:storybook:ci
```

## Writing Tests

### Unit Test Template

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { YourComponent } from './YourComponent';

describe('YourComponent', () => {
  it('renders with default props', () => {
    render(<YourComponent>Content</YourComponent>);
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<YourComponent className="custom">Content</YourComponent>);
    expect(screen.getByText('Content')).toHaveClass('custom');
  });
});
```

### Snapshot Test Template

```typescript
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { YourComponent } from './YourComponent';

describe('YourComponent Snapshots', () => {
  it('matches snapshot for default state', () => {
    const { container } = render(<YourComponent>Content</YourComponent>);
    expect(container.firstChild).toMatchSnapshot();
  });
});
```

### Storybook Story Template

```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { YourComponent } from './YourComponent';

const meta = {
  title: 'UI/YourComponent',
  component: YourComponent,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof YourComponent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: 'Content',
  },
};
```

## CI Integration

Add to your CI pipeline:

```yaml
- name: Run unit tests
  run: npm run test:unit

- name: Run Storybook tests
  run: npm run test:storybook:ci
```

## Debugging Tests

### Vitest UI
```bash
npm run test -- --ui
```

### Verbose Output
```bash
npm run test:unit -- --reporter=verbose
```

### Watch Mode
```bash
npm run test
```

## Best Practices

1. **Test user behavior**, not implementation details
2. **Use semantic queries** (getByRole, getByLabelText)
3. **Keep snapshots small** and focused
4. **Update snapshots intentionally**, review changes carefully
5. **Mock external dependencies** (APIs, localStorage)
6. **Test accessibility** (ARIA attributes, keyboard navigation)

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Storybook Test Runner](https://storybook.js.org/docs/writing-tests/test-runner)
