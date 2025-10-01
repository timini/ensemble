# Atomic Design Architecture

> **Design Philosophy**: This component library follows [Atomic Design](https://bradfrost.com/blog/post/atomic-web-design/) principles by Brad Frost, organizing components from simple to complex.

## Overview

Atomic Design breaks user interfaces into a hierarchy of increasingly complex components:

```
Atoms → Molecules → Organisms → Templates → Pages
```

This approach promotes:
- **Reusability**: Build once, use everywhere
- **Consistency**: Shared design tokens and patterns
- **Scalability**: Easy to add new components
- **Maintainability**: Clear component relationships
- **Testing**: Isolated testing at each level

## Component Hierarchy

### 🔹 Atoms (Level 1)

**Definition**: Basic building blocks that cannot be broken down further without losing meaning.

**Characteristics**:
- Single responsibility
- No internal state (or minimal)
- Fully controlled via props
- Maximum reusability
- 50-150 lines of code

**Current Atoms** (12):
```
src/components/atoms/
├── Button/           # Action trigger with variants
├── Input/            # Text input field
├── Textarea/         # Multiline text input
├── Label/            # Form label
├── Badge/            # Status indicator
├── Icon/             # Icon wrapper (lucide-react)
├── LoadingSpinner/   # Loading indicator
├── Tag/              # Chip/tag for filters
├── InlineAlert/      # Inline message
├── Progress/         # Progress bar
├── Separator/        # Horizontal/vertical divider
└── Card/             # Container with header/footer
```

**Examples to Add**:
- Checkbox
- Radio
- Switch
- Avatar
- Skeleton
- Tooltip trigger

### 🔸 Molecules (Level 2)

**Definition**: Simple combinations of atoms that function together as a unit.

**Characteristics**:
- Composed of 2-5 atoms
- Single, focused purpose
- Minimal internal logic
- 100-200 lines of code

**Planned Molecules**:
```
src/components/molecules/
├── FormField/         # Label + Input + Error message
├── SearchField/       # Input + Search icon + Clear button
├── SelectField/       # Label + Select + Helper text
├── CheckboxField/     # Checkbox + Label
├── RadioGroup/        # Multiple Radio + Labels
├── SwitchField/       # Switch + Label + Description
├── InputWithIcon/     # Input + Icon (left/right)
├── ButtonGroup/       # Multiple related Buttons
├── TagGroup/          # Multiple Tags (closeable)
└── AlertDialog/       # InlineAlert + Actions
```

**Current Status**: EnsembleHeader and ProgressSteps will move here

### 🔶 Organisms (Level 3)

**Definition**: Complex components composed of molecules and/or atoms.

**Characteristics**:
- Multiple molecules/atoms working together
- Contains business logic
- May have internal state
- Represents distinct UI sections
- 150-300 lines of code

**Planned Organisms**:
```
src/components/organisms/
├── Navbar/            # Navigation bar with links, user menu
├── Sidebar/           # Collapsible navigation sidebar
├── DataTable/         # Table with sorting, pagination
├── Form/              # Complete form with validation
├── Modal/             # Dialog with overlay
├── Dropdown/          # Menu with items
├── Tabs/              # Tabbed interface
├── CommandPalette/    # Command search interface
└── ApiKeyManager/     # API key form with validation
```

### 📄 Templates (Level 4)

**Definition**: Page-level layouts that define structure without content.

**Characteristics**:
- Compose organisms, molecules, atoms
- Define layout and spacing
- No real data (uses placeholders)
- Reusable page structures

**Planned Templates**:
```
src/components/templates/
├── DashboardLayout/   # Header + Sidebar + Content
├── AuthLayout/        # Centered card layout
├── WizardLayout/      # Multi-step wizard
└── SettingsLayout/    # Settings page structure
```

### 📱 Pages (Level 5)

**Definition**: Specific instances of templates with real data.

**Note**: Pages live in `/packages/app/`, not component library. The component library provides atoms → templates only.

## New Folder Structure

```
packages/component-library/
├── src/
│   ├── components/
│   │   ├── atoms/              # Level 1: Basic building blocks
│   │   │   ├── Button/
│   │   │   ├── Input/
│   │   │   ├── Badge/
│   │   │   ├── Icon/
│   │   │   ├── LoadingSpinner/
│   │   │   ├── Tag/
│   │   │   ├── InlineAlert/
│   │   │   ├── Textarea/
│   │   │   ├── Label/
│   │   │   ├── Progress/
│   │   │   ├── Separator/
│   │   │   └── Card/
│   │   ├── molecules/          # Level 2: Simple combinations
│   │   │   ├── FormField/
│   │   │   ├── SearchField/
│   │   │   ├── SelectField/
│   │   │   ├── CheckboxField/
│   │   │   ├── RadioGroup/
│   │   │   ├── SwitchField/
│   │   │   ├── EnsembleHeader/    # Moved from root
│   │   │   └── ProgressSteps/      # Moved from root
│   │   ├── organisms/          # Level 3: Complex components
│   │   │   ├── Navbar/
│   │   │   ├── DataTable/
│   │   │   ├── Modal/
│   │   │   ├── Dropdown/
│   │   │   └── Tabs/
│   │   └── templates/          # Level 4: Page layouts
│   │       ├── DashboardLayout/
│   │       ├── AuthLayout/
│   │       └── WizardLayout/
│   ├── lib/                    # Utilities
│   │   ├── utils.ts
│   │   └── validators.ts
│   ├── hooks/                  # Shared React hooks
│   │   ├── useMediaQuery.ts
│   │   ├── useDebounce.ts
│   │   └── useLocalStorage.ts
│   ├── styles/
│   │   └── globals.css
│   └── index.ts                # Public exports
├── docs/
│   ├── ATOMIC_DESIGN_ARCHITECTURE.md  # This file
│   ├── COMPONENT_DEVELOPMENT_GUIDE.md
│   └── TAILWIND_DESIGN_SYSTEM.md
└── package.json
```

## Component Mapping

### Current → New Structure

**Atoms** (src/components/ui/ → src/components/atoms/):
- ✅ Button → atoms/Button
- ✅ Input → atoms/Input
- ✅ Textarea → atoms/Textarea
- ✅ Label → atoms/Label
- ✅ Badge → atoms/Badge
- ✅ Icon → atoms/Icon
- ✅ LoadingSpinner → atoms/LoadingSpinner
- ✅ Tag → atoms/Tag
- ✅ InlineAlert → atoms/InlineAlert
- ✅ Progress → atoms/Progress
- ✅ Separator → atoms/Separator
- ✅ Card → atoms/Card

**Molecules** (src/components/ → src/components/molecules/):
- ✅ EnsembleHeader → molecules/EnsembleHeader
- ✅ ProgressSteps → molecules/ProgressSteps

## Storybook Organization

Update Storybook titles to reflect atomic hierarchy:

```tsx
// Atoms
export default {
  title: 'Atoms/Button',
  component: Button,
} satisfies Meta<typeof Button>;

// Molecules
export default {
  title: 'Molecules/FormField',
  component: FormField,
} satisfies Meta<typeof FormField>;

// Organisms
export default {
  title: 'Organisms/DataTable',
  component: DataTable,
} satisfies Meta<typeof DataTable>;

// Templates
export default {
  title: 'Templates/DashboardLayout',
  component: DashboardLayout,
} satisfies Meta<typeof DashboardLayout>;
```

## Export Strategy

### Public API (index.ts)

```tsx
// Atoms
export * from './components/atoms/Button';
export * from './components/atoms/Input';
export * from './components/atoms/Badge';
export * from './components/atoms/Icon';
export * from './components/atoms/LoadingSpinner';
export * from './components/atoms/Tag';
export * from './components/atoms/InlineAlert';
export * from './components/atoms/Textarea';
export * from './components/atoms/Label';
export * from './components/atoms/Progress';
export * from './components/atoms/Separator';
export * from './components/atoms/Card';

// Molecules
export * from './components/molecules/FormField';
export * from './components/molecules/SearchField';
export * from './components/molecules/SelectField';
export * from './components/molecules/CheckboxField';
export * from './components/molecules/RadioGroup';
export * from './components/molecules/SwitchField';
export * from './components/molecules/EnsembleHeader';
export * from './components/molecules/ProgressSteps';

// Organisms
export * from './components/organisms/Navbar';
export * from './components/organisms/DataTable';
export * from './components/organisms/Modal';
export * from './components/organisms/Dropdown';
export * from './components/organisms/Tabs';

// Templates
export * from './components/templates/DashboardLayout';
export * from './components/templates/AuthLayout';
export * from './components/templates/WizardLayout';

// Utilities
export * from './lib/utils';
```

### Usage (Consumer Apps)

```tsx
// Import remains the same (flat exports)
import {
  Button,          // Atom
  FormField,       // Molecule
  DataTable,       // Organism
  DashboardLayout, // Template
} from '@ai-ensemble/component-library';
```

## Development Phases

### Phase 1: Foundation (Complete ✅)
- ✅ 12 Atoms
- ✅ 2 Molecules (EnsembleHeader, ProgressSteps)
- ✅ Testing setup (Vitest + Storybook)
- ✅ Documentation (README, TDD guide, Design system)

### Phase 2: Restructure (In Progress)
- 🔄 Reorganize to atomic structure
- 🔄 Update import paths
- 🔄 Update Storybook titles
- 🔄 Update documentation

### Phase 3: Molecules (Planned)
- FormField (Label + Input + Error)
- SearchField (Input + Icon + Clear)
- SelectField (Select + Label + Helper)
- CheckboxField (Checkbox + Label)
- RadioGroup (Radio options)
- SwitchField (Switch + Label)

### Phase 4: Organisms (Planned)
- Navbar (Navigation)
- DataTable (Sorting, pagination)
- Modal (Dialog overlay)
- Dropdown (Menu)
- Tabs (Tabbed content)
- CommandPalette (⌘K interface)

### Phase 5: Templates (Planned)
- DashboardLayout
- AuthLayout
- WizardLayout
- SettingsLayout

## Component Selection Criteria

### When to Create an Atom
- ✅ Used in multiple molecules/organisms
- ✅ Has a single, focused purpose
- ✅ Can stand alone
- ✅ Fully controlled via props

### When to Create a Molecule
- ✅ Combines 2-5 atoms
- ✅ Represents a common UI pattern
- ✅ Reduces duplication
- ✅ Has reusable logic

### When to Create an Organism
- ✅ Contains business logic
- ✅ Represents a distinct UI section
- ✅ Manages complex state
- ✅ Used across multiple pages

### When to Create a Template
- ✅ Defines page structure
- ✅ Reusable across multiple pages
- ✅ Composition of organisms/molecules

## Best Practices

### Composition Over Props
```tsx
// Good: Compose atoms into molecules
function FormField({ label, error, children }) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
      {error && <InlineAlert variant="error">{error}</InlineAlert>}
    </div>
  );
}

// Usage
<FormField label="Email" error={errors.email}>
  <Input type="email" {...register('email')} />
</FormField>

// Bad: Atom with too many props
function Input({ label, error, helperText, icon, ... }) {
  // Too complex for an atom
}
```

### Keep Atoms Pure
```tsx
// Good: Pure atom
function Button({ children, onClick, variant }) {
  return <button className={cn(variants[variant])} onClick={onClick}>{children}</button>;
}

// Bad: Atom with side effects
function Button({ children, onClick }) {
  const { trackEvent } = useAnalytics(); // DON'T - push to molecule/organism
  return <button onClick={() => { trackEvent('click'); onClick(); }}>{children}</button>;
}
```

### Molecule Boundaries
```tsx
// Good: Clear molecule boundary
function SearchField({ value, onChange, onClear }) {
  return (
    <div className="relative">
      <Icon name="search" />
      <Input value={value} onChange={onChange} />
      {value && <Button onClick={onClear}><Icon name="x" /></Button>}
    </div>
  );
}

// Bad: Molecule doing too much (should be organism)
function SearchField({ value, onChange, results, onSelect, loading }) {
  // Too complex - this is SearchWithResults organism
}
```

## Migration Guide

### For Existing Code

1. **Imports**: Update from `components/ui/Button` to `components/atoms/Button`
2. **Stories**: Update title from `UI/Button` to `Atoms/Button`
3. **Tests**: No changes needed (component exports unchanged)

### Example Migration

**Before**:
```tsx
import { Button } from '@/components/ui/Button';

// Storybook
export default {
  title: 'UI/Button',
  component: Button,
};
```

**After**:
```tsx
import { Button } from '@/components/atoms/Button';

// Storybook
export default {
  title: 'Atoms/Button',
  component: Button,
};
```

**Public API** (no change):
```tsx
import { Button } from '@ai-ensemble/component-library';
```

## References

- **Atomic Design Methodology**: https://bradfrost.com/blog/post/atomic-web-design/
- **Atomic Design Book**: https://atomicdesign.bradfrost.com/
- **Pattern Lab**: https://patternlab.io/
- **Component Development Guide**: `COMPONENT_DEVELOPMENT_GUIDE.md`
- **Design System**: `TAILWIND_DESIGN_SYSTEM.md`

---

**Version**: 1.0.0
**Last Updated**: 2025-09-30
**Design Philosophy**: Atomic Design by Brad Frost
