# Component Library Testing

## Testing stack

- **Vitest** (jsdom) with **React Testing Library**: unit and snapshot tests
- **Storybook test runner** (`@storybook/test-runner`, uses Playwright): renders every story and runs any `play` functions
- **Playwright screenshot script**: optional, see below

## Test types

### 1. Unit tests (`*.test.tsx`)

Test component behavior, props and user interactions.

```bash
npm run test:unit   # same as npm test: vitest run --coverage
```

Example:

```typescript
it('handles click events', async () => {
  const handleClick = vi.fn();
  render(<Button onClick={handleClick}>Click</Button>);
  await user.click(screen.getByRole('button'));
  expect(handleClick).toHaveBeenCalledOnce();
});
```

Components that render translated text should be wrapped with the helper in `src/lib/test-utils/i18n-test-wrapper.tsx`.

### 2. Snapshot tests (`*.snapshot.test.tsx`)

A handful of atoms have snapshot tests (7 files today). They run with the unit tests.

```bash
npm run test:unit -- -u   # update snapshots
```

### 3. Storybook tests

```bash
# Install Playwright browsers (first time only)
npx playwright install chromium

# Development: Storybook must be running
npm run storybook           # terminal 1
npm run test:storybook      # terminal 2

# CI: builds Storybook, serves it, runs the test runner
npm run test:storybook:ci
```

`.storybook/test-runner.ts` has empty `preVisit` and `postVisit` hooks, so the runner checks that each story renders and that its `play` function (if any) passes. It does not take visual snapshots or run accessibility checks.

### 4. Screenshots

`scripts/screenshot-stories.ts` opens a running Storybook and saves PNGs to `screenshots/` for a hard-coded list of story ids. The list uses old `ui-*` ids that no longer match the current `Atoms/`, `Molecules/` and `Organisms/` titles, so it needs updating before use. Nothing compares screenshots automatically; they are for manual review.

```bash
npm run storybook
npx tsx scripts/screenshot-stories.ts
```

## Coverage

Thresholds in `vitest.config.ts` are 80% for lines, functions, branches and statements. Stories, index files, config and `src/lib/i18n/config.ts` are excluded.

## CI

`.github/workflows/ci.yml` runs, for this package:

```bash
npm run lint --workspace=packages/component-library
npm run test:unit --workspace=packages/component-library
npm run test:storybook:ci --workspace=packages/component-library
```

## Templates

### Unit test

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

### Story

```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { YourComponent } from './YourComponent';

const meta = {
  title: 'Atoms/YourComponent',
  component: YourComponent,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof YourComponent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { children: 'Content' },
};
```

## Debugging

```bash
npm run test:unit -- --reporter=verbose  # verbose output
npm run test:watch                       # watch mode
```

## Practices

1. Test user behavior, not implementation details.
2. Prefer semantic queries (`getByRole`, `getByLabelText`); use `data-testid` when there is no good semantic handle.
3. Keep snapshots small and review snapshot changes.
4. Mock external dependencies (APIs, localStorage).
5. Check ARIA attributes and keyboard navigation.

## Resources

- [Vitest](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Storybook test runner](https://storybook.js.org/docs/writing-tests/test-runner)
