import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Icon } from './Icon';
import { Check, Info, AlertCircle } from 'lucide-react';

describe('Icon', () => {
  describe('rendering', () => {
    it('renders with default size', () => {
      const { container } = render(
        <Icon>
          <Check />
        </Icon>
      );
      const icon = container.firstChild;
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveAttribute('data-size', 'default');
    });

    it('renders with small size', () => {
      const { container } = render(
        <Icon size="sm">
          <Check />
        </Icon>
      );
      expect(container.firstChild).toHaveAttribute('data-size', 'sm');
    });

    it('renders with large size', () => {
      const { container } = render(
        <Icon size="lg">
          <Check />
        </Icon>
      );
      expect(container.firstChild).toHaveAttribute('data-size', 'lg');
    });

    it('renders with default variant', () => {
      const { container } = render(
        <Icon>
          <Check />
        </Icon>
      );
      expect(container.firstChild).toHaveAttribute('data-variant', 'default');
    });

    it('renders with primary variant', () => {
      const { container } = render(
        <Icon variant="primary">
          <Info />
        </Icon>
      );
      expect(container.firstChild).toHaveAttribute('data-variant', 'primary');
    });

    it('renders with success variant', () => {
      const { container } = render(
        <Icon variant="success">
          <Check />
        </Icon>
      );
      expect(container.firstChild).toHaveAttribute('data-variant', 'success');
    });

    it('renders with warning variant', () => {
      const { container } = render(
        <Icon variant="warning">
          <AlertCircle />
        </Icon>
      );
      expect(container.firstChild).toHaveAttribute('data-variant', 'warning');
    });

    it('renders with destructive variant', () => {
      const { container } = render(
        <Icon variant="destructive">
          <AlertCircle />
        </Icon>
      );
      expect(container.firstChild).toHaveAttribute('data-variant', 'destructive');
    });

    it('renders with muted variant', () => {
      const { container } = render(
        <Icon variant="muted">
          <Info />
        </Icon>
      );
      expect(container.firstChild).toHaveAttribute('data-variant', 'muted');
    });

    it('applies custom className', () => {
      const { container } = render(
        <Icon className="custom-class">
          <Check />
        </Icon>
      );
      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('renders children correctly', () => {
      const { container } = render(
        <Icon>
          <Check data-testid="check-icon" />
        </Icon>
      );
      expect(container.querySelector('[data-testid="check-icon"]')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('has role="img" by default', () => {
      const { container } = render(
        <Icon>
          <Check />
        </Icon>
      );
      expect(container.firstChild).toHaveAttribute('role', 'img');
    });

    it('accepts aria-label', () => {
      const { container } = render(
        <Icon aria-label="Success checkmark">
          <Check />
        </Icon>
      );
      expect(container.firstChild).toHaveAttribute('aria-label', 'Success checkmark');
    });

    it('can be marked as aria-hidden', () => {
      const { container } = render(
        <Icon aria-hidden="true">
          <Check />
        </Icon>
      );
      expect(container.firstChild).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('snapshots', () => {
    it('matches snapshot for default variant', () => {
      const { container } = render(
        <Icon>
          <Check />
        </Icon>
      );
      expect(container.firstChild).toMatchSnapshot();
    });

    it('matches snapshot for primary variant', () => {
      const { container } = render(
        <Icon variant="primary">
          <Info />
        </Icon>
      );
      expect(container.firstChild).toMatchSnapshot();
    });

    it('matches snapshot for large size', () => {
      const { container } = render(
        <Icon size="lg">
          <Check />
        </Icon>
      );
      expect(container.firstChild).toMatchSnapshot();
    });
  });
});
