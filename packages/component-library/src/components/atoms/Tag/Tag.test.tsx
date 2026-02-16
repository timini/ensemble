import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tag } from './Tag';

describe('Tag', () => {
  describe('rendering', () => {
    it('renders label correctly', () => {
      render(<Tag>Model Name</Tag>);
      expect(screen.getByText('Model Name')).toBeInTheDocument();
    });

    it('renders with default variant', () => {
      const { container } = render(<Tag>Tag</Tag>);
      const tag = container.firstChild;
      expect(tag).toHaveAttribute('data-variant', 'default');
    });

    it('renders with primary variant', () => {
      const { container } = render(<Tag variant="primary">Tag</Tag>);
      const tag = container.firstChild;
      expect(tag).toHaveAttribute('data-variant', 'primary');
    });

    it('renders with success variant', () => {
      const { container } = render(<Tag variant="success">Tag</Tag>);
      const tag = container.firstChild;
      expect(tag).toHaveAttribute('data-variant', 'success');
    });

    it('renders as selected', () => {
      const { container } = render(<Tag selected>Tag</Tag>);
      const tag = container.firstChild;
      expect(tag).toHaveAttribute('data-selected', 'true');
    });

    it('renders as unselected', () => {
      const { container } = render(<Tag selected={false}>Tag</Tag>);
      const tag = container.firstChild;
      expect(tag).toHaveAttribute('data-selected', 'false');
    });

    it('does not show remove button by default', () => {
      render(<Tag>Tag</Tag>);
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('shows remove button when removable', () => {
      render(<Tag removable>Tag</Tag>);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(<Tag className="custom-class">Tag</Tag>);
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('interactions', () => {
    it('calls onClick when clicked', async () => {
      const handleClick = vi.fn();
      render(<Tag onClick={handleClick}>Tag</Tag>);

      await userEvent.click(screen.getByText('Tag'));
      expect(handleClick).toHaveBeenCalledOnce();
    });

    it('calls onRemove when remove button clicked', async () => {
      const handleRemove = vi.fn();
      render(<Tag removable onRemove={handleRemove}>Tag</Tag>);

      const removeButton = screen.getByRole('button');
      await userEvent.click(removeButton);
      expect(handleRemove).toHaveBeenCalledOnce();
    });

    it('does not call onClick when remove button clicked', async () => {
      const handleClick = vi.fn();
      const handleRemove = vi.fn();
      render(
        <Tag onClick={handleClick} removable onRemove={handleRemove}>
          Tag
        </Tag>
      );

      const removeButton = screen.getByRole('button');
      await userEvent.click(removeButton);

      expect(handleRemove).toHaveBeenCalledOnce();
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('does not call onClick when disabled', async () => {
      const handleClick = vi.fn();
      render(<Tag onClick={handleClick} disabled>Tag</Tag>);

      await userEvent.click(screen.getByText('Tag'));
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('does not call onRemove when disabled', async () => {
      const handleRemove = vi.fn();
      render(<Tag removable onRemove={handleRemove} disabled>Tag</Tag>);

      const removeButton = screen.getByRole('button');
      await userEvent.click(removeButton);
      expect(handleRemove).not.toHaveBeenCalled();
    });
  });

  describe('accessibility', () => {
    it('has proper role when clickable', () => {
      render(<Tag onClick={vi.fn()}>Tag</Tag>);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('is disabled when disabled prop is true', () => {
      const { container } = render(<Tag onClick={vi.fn()} disabled>Tag</Tag>);
      const tag = container.firstChild;
      expect(tag).toHaveAttribute('data-disabled', 'true');
    });

    it('remove button has aria-label', () => {
      render(<Tag removable>Model Name</Tag>);
      const removeButton = screen.getByRole('button');
      expect(removeButton).toHaveAttribute('aria-label', 'Remove');
    });
  });

  describe('snapshots', () => {
    it('matches snapshot for default state', () => {
      const { container } = render(<Tag>Tag</Tag>);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('matches snapshot for selected state', () => {
      const { container } = render(<Tag selected>Tag</Tag>);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('matches snapshot for removable state', () => {
      const { container } = render(<Tag removable>Tag</Tag>);
      expect(container.firstChild).toMatchSnapshot();
    });
  });
});
