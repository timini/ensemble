import type { Meta, StoryObj } from '@storybook/react';
import { Link } from './Link';

const meta = {
  title: 'Atoms/Link',
  component: Link,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'subtle', 'bold'],
      description: 'Link style variant',
    },
    external: {
      control: 'boolean',
      description: 'Whether to show external link icon and add target="_blank"',
    },
    iconSize: {
      control: 'number',
      description: 'Size of external link icon',
    },
  },
} satisfies Meta<typeof Link>;

export default meta;
type Story = StoryObj<typeof meta>;

// Default variant
export const Default: Story = {
  args: {
    href: '/about',
    children: 'Default link',
  },
};

// Variants
export const Subtle: Story = {
  args: {
    variant: 'subtle',
    href: '/settings',
    children: 'Subtle link',
  },
};

export const Bold: Story = {
  args: {
    variant: 'bold',
    href: '/important',
    children: 'Bold link',
  },
};

// External link
export const External: Story = {
  args: {
    href: 'https://example.com',
    external: true,
    children: 'External link',
  },
};

export const ExternalSubtle: Story = {
  args: {
    variant: 'subtle',
    href: 'https://example.com',
    external: true,
    children: 'External subtle link',
  },
};

export const ExternalBold: Story = {
  args: {
    variant: 'bold',
    href: 'https://example.com',
    external: true,
    children: 'External bold link',
  },
};

// Custom icon size
export const ExternalLargeIcon: Story = {
  args: {
    href: 'https://example.com',
    external: true,
    iconSize: 20,
    children: 'Link with larger icon',
  },
};

// All variants showcase
export const AllVariants: Story = {
  args: { children: '' },
  render: () => (
    <div className="space-y-4">
      <div>
        <Link href="/default">Default: Standard link style</Link>
      </div>
      <div>
        <Link variant="subtle" href="/subtle">Subtle: Less prominent link</Link>
      </div>
      <div>
        <Link variant="bold" href="/bold">Bold: Emphasized link</Link>
      </div>
    </div>
  ),
};

// External links showcase
export const ExternalLinks: Story = {
  args: { children: '' },
  render: () => (
    <div className="space-y-4">
      <div>
        <Link href="https://example.com" external>
          Default external link
        </Link>
      </div>
      <div>
        <Link variant="subtle" href="https://example.com" external>
          Subtle external link
        </Link>
      </div>
      <div>
        <Link variant="bold" href="https://example.com" external>
          Bold external link
        </Link>
      </div>
    </div>
  ),
};

// Inline text example
export const InlineText: Story = {
  args: { children: '' },
  render: () => (
    <p className="max-w-md text-gray-700">
      This is a paragraph with an{' '}
      <Link href="/inline">inline link</Link>
      {' '}that demonstrates how the link component works within body text. You can also have{' '}
      <Link href="https://example.com" external>external links</Link>
      {' '}with the external icon.
    </p>
  ),
};

// Breadcrumb example
export const Breadcrumb: Story = {
  args: { children: '' },
  render: () => (
    <nav aria-label="Breadcrumb" className="flex items-center space-x-2 text-sm">
      <Link variant="subtle" href="/">Home</Link>
      <span className="text-gray-400">/</span>
      <Link variant="subtle" href="/products">Products</Link>
      <span className="text-gray-400">/</span>
      <span className="text-gray-900">Current Page</span>
    </nav>
  ),
};

// Navigation menu example
export const NavigationMenu: Story = {
  args: { children: '' },
  render: () => (
    <nav className="flex flex-col space-y-2">
      <Link variant="subtle" href="/dashboard">Dashboard</Link>
      <Link variant="subtle" href="/projects">Projects</Link>
      <Link variant="subtle" href="/team">Team</Link>
      <Link variant="subtle" href="/settings">Settings</Link>
    </nav>
  ),
};

// Footer links example
export const FooterLinks: Story = {
  args: { children: '' },
  render: () => (
    <footer className="bg-gray-50 p-6 rounded">
      <div className="grid grid-cols-3 gap-4 text-sm">
        <div>
          <h3 className="font-semibold text-gray-900 mb-2">Product</h3>
          <div className="space-y-1">
            <div><Link variant="subtle" href="/features">Features</Link></div>
            <div><Link variant="subtle" href="/pricing">Pricing</Link></div>
            <div><Link variant="subtle" href="/roadmap">Roadmap</Link></div>
          </div>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 mb-2">Company</h3>
          <div className="space-y-1">
            <div><Link variant="subtle" href="/about">About</Link></div>
            <div><Link variant="subtle" href="/blog">Blog</Link></div>
            <div><Link variant="subtle" href="/careers">Careers</Link></div>
          </div>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 mb-2">Resources</h3>
          <div className="space-y-1">
            <div><Link variant="subtle" href="https://docs.example.com" external>Documentation</Link></div>
            <div><Link variant="subtle" href="https://github.com/example" external>GitHub</Link></div>
            <div><Link variant="subtle" href="/support">Support</Link></div>
          </div>
        </div>
      </div>
    </footer>
  ),
};
