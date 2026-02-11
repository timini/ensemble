import type { Meta, StoryObj } from '@storybook/react';
import { Rating } from './Rating';
import { useState } from 'react';

const meta = {
  title: 'Atoms/Rating',
  component: Rating,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Rating>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    value: 0,
    max: 5,
  },
};

export const ThreeStars: Story = {
  args: {
    value: 3,
    max: 5,
  },
};

export const FiveStars: Story = {
  args: {
    value: 5,
    max: 5,
  },
};

export const ReadOnly: Story = {
  args: {
    value: 4,
    max: 5,
    readOnly: true,
  },
};

export const Disabled: Story = {
  args: {
    value: 2,
    max: 5,
    disabled: true,
  },
};

export const Small: Story = {
  args: {
    value: 3,
    max: 5,
    size: 'sm',
  },
};

export const Large: Story = {
  args: {
    value: 4,
    max: 5,
    size: 'lg',
  },
};

const InteractiveRating = () => {
  const [rating, setRating] = useState(0);
  return (
    <div className="flex flex-col items-center space-y-4">
      <Rating value={rating} onChange={setRating} max={5} />
      <p className="text-sm text-muted-foreground">Selected: {rating} stars</p>
    </div>
  );
};

export const Interactive: Story = {
  args: {
    value: 0,
    max: 5,
  },
  render: () => <InteractiveRating />,
};
