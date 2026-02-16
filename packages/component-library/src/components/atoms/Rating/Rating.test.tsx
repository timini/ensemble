import * as React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Rating } from './Rating';
import { renderWithI18n } from '../../../lib/test-utils/i18n-test-wrapper';

describe('Rating', () => {
  it('renders with correct number of stars', () => {
    const { container } = render(<Rating value={0} max={5} />);
    const buttons = container.querySelectorAll('button');
    expect(buttons).toHaveLength(5);
  });

  it('displays correct number of filled stars', () => {
    const { container } = render(<Rating value={3} max={5} />);
    const buttons = container.querySelectorAll('button');

    // First 3 should have filled star
    expect(buttons[0]).toHaveTextContent('⭐');
    expect(buttons[1]).toHaveTextContent('⭐');
    expect(buttons[2]).toHaveTextContent('⭐');

    // Last 2 should have empty star
    expect(buttons[3]).toHaveTextContent('☆');
    expect(buttons[4]).toHaveTextContent('☆');
  });

  it('calls onChange when star is clicked', async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();
    const { container } = render(<Rating value={0} max={5} onChange={handleChange} />);

    const thirdStar = container.querySelectorAll('button')[2];
    await user.click(thirdStar);

    expect(handleChange).toHaveBeenCalledWith(3);
  });

  it('does not call onChange in readOnly mode', async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();
    const { container } = render(
      <Rating value={3} max={5} onChange={handleChange} readOnly />
    );

    const firstStar = container.querySelectorAll('button')[0];
    await user.click(firstStar);

    expect(handleChange).not.toHaveBeenCalled();
  });

  it('does not call onChange when disabled', async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();
    const { container } = render(
      <Rating value={3} max={5} onChange={handleChange} disabled />
    );

    const firstStar = container.querySelectorAll('button')[0];
    await user.click(firstStar);

    expect(handleChange).not.toHaveBeenCalled();
  });

  it('applies small size', () => {
    const { container } = render(<Rating value={0} max={5} size="sm" />);
    expect(container.firstChild).toHaveAttribute('data-size', 'sm');
  });

  it('applies large size', () => {
    const { container } = render(<Rating value={0} max={5} size="lg" />);
    expect(container.firstChild).toHaveAttribute('data-size', 'lg');
  });

  it('applies custom className', () => {
    render(<Rating value={0} max={5} className="custom-class" data-testid="rating" />);
    expect(screen.getByTestId('rating')).toHaveClass('custom-class');
  });

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<Rating ref={ref} value={0} max={5} />);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  describe('snapshots', () => {
    it('matches snapshot for zero stars', () => {
      const { container } = render(<Rating value={0} max={5} />);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('matches snapshot for three stars', () => {
      const { container } = render(<Rating value={3} max={5} />);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('matches snapshot for five stars', () => {
      const { container } = render(<Rating value={5} max={5} />);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('matches snapshot for read only', () => {
      const { container } = render(<Rating value={4} max={5} readOnly />);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('matches snapshot for disabled', () => {
      const { container } = render(<Rating value={2} max={5} disabled />);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('matches snapshot for small size', () => {
      const { container } = render(<Rating value={3} max={5} size="sm" />);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('matches snapshot for large size', () => {
      const { container } = render(<Rating value={4} max={5} size="lg" />);
      expect(container.firstChild).toMatchSnapshot();
    });
  });

  describe('internationalization', () => {
    it('renders English aria-label for single star', () => {
      const { container } = renderWithI18n(<Rating value={0} max={5} />, { language: 'en' });
      const firstButton = container.querySelectorAll('button')[0];
      expect(firstButton).toHaveAttribute('aria-label', '1 star');
    });

    it('renders English aria-label for multiple stars', () => {
      const { container } = renderWithI18n(<Rating value={0} max={5} />, { language: 'en' });
      const thirdButton = container.querySelectorAll('button')[2];
      expect(thirdButton).toHaveAttribute('aria-label', '3 stars');
    });

    it('renders French aria-label for single star', () => {
      const { container } = renderWithI18n(<Rating value={0} max={5} />, { language: 'fr' });
      const firstButton = container.querySelectorAll('button')[0];
      expect(firstButton).toHaveAttribute('aria-label', '1 étoile');
    });

    it('renders French aria-label for multiple stars', () => {
      const { container } = renderWithI18n(<Rating value={0} max={5} />, { language: 'fr' });
      const thirdButton = container.querySelectorAll('button')[2];
      expect(thirdButton).toHaveAttribute('aria-label', '3 étoiles');
    });

    it('displays correct English labels for all star values', () => {
      const { container } = renderWithI18n(<Rating value={0} max={5} />, { language: 'en' });
      const buttons = container.querySelectorAll('button');

      expect(buttons[0]).toHaveAttribute('aria-label', '1 star');
      expect(buttons[1]).toHaveAttribute('aria-label', '2 stars');
      expect(buttons[4]).toHaveAttribute('aria-label', '5 stars');
    });

    it('displays correct French labels for all star values', () => {
      const { container } = renderWithI18n(<Rating value={0} max={5} />, { language: 'fr' });
      const buttons = container.querySelectorAll('button');

      expect(buttons[0]).toHaveAttribute('aria-label', '1 étoile');
      expect(buttons[1]).toHaveAttribute('aria-label', '2 étoiles');
      expect(buttons[4]).toHaveAttribute('aria-label', '5 étoiles');
    });
  });
});
