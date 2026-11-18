import type { Meta, StoryObj } from '@storybook/react';
import { AccountSection } from './AccountSection';

const meta = {
  title: 'Molecules/AccountSection',
  component: AccountSection,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  args: {
    title: 'Purchases',
    testId: 'story',
    status: 'ready',
    emptyText: 'No purchases yet.',
    itemCount: 2,
    children: (
      <>
        <li className="py-2.5 text-label">$20 pack</li>
        <li className="py-2.5 text-label">$5 pack</li>
      </>
    ),
  },
  decorators: [(Story) => <div className="max-w-md"><Story /></div>],
} satisfies Meta<typeof AccountSection>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A list with items. */
export const Ready: Story = {};

/** More items to load. */
export const WithMore: Story = { args: { hasMore: true, onLoadMore: () => undefined } };

/** The next page is loading. */
export const LoadingMore: Story = { args: { hasMore: true, onLoadMore: () => undefined, loadingMore: true } };

/** Nothing yet. */
export const Empty: Story = { args: { itemCount: 0, children: null } };

/** The first page is loading. */
export const Loading: Story = { args: { status: 'loading' } };

/** The list could not load. */
export const LoadError: Story = { args: { status: 'error' } };
