import * as React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Avatar } from './Avatar';

describe('Avatar', () => {
  it('renders with fallback text', () => {
    render(<Avatar data-testid="avatar">AB</Avatar>);
    expect(screen.getByTestId('avatar')).toBeInTheDocument();
    expect(screen.getByText('AB')).toBeInTheDocument();
  });

  it('renders with image when src is provided', () => {
    render(
      <Avatar src="https://example.com/avatar.png" alt="User avatar" data-testid="avatar">
        AB
      </Avatar>
    );
    const avatar = screen.getByTestId('avatar');
    expect(avatar).toBeInTheDocument();
    const img = avatar.querySelector('img');
    expect(img).toHaveAttribute('src', 'https://example.com/avatar.png');
    expect(img).toHaveAttribute('alt', 'User avatar');
  });

  it('applies default size classes', () => {
    render(<Avatar data-testid="avatar">AB</Avatar>);
    const avatar = screen.getByTestId('avatar');
    expect(avatar).toHaveClass('h-10', 'w-10');
  });

  it('applies small size classes', () => {
    render(
      <Avatar size="sm" data-testid="avatar">
        SM
      </Avatar>
    );
    const avatar = screen.getByTestId('avatar');
    expect(avatar).toHaveClass('h-8', 'w-8');
  });

  it('applies large size classes', () => {
    render(
      <Avatar size="lg" data-testid="avatar">
        LG
      </Avatar>
    );
    const avatar = screen.getByTestId('avatar');
    expect(avatar).toHaveClass('h-12', 'w-12');
  });

  it('applies anthropic variant classes', () => {
    render(
      <Avatar variant="anthropic" data-testid="avatar">
        A
      </Avatar>
    );
    const avatar = screen.getByTestId('avatar');
    expect(avatar).toHaveClass('bg-warning/10', 'text-warning');
  });

  it('applies openai variant classes', () => {
    render(
      <Avatar variant="openai" data-testid="avatar">
        O
      </Avatar>
    );
    const avatar = screen.getByTestId('avatar');
    expect(avatar).toHaveClass('bg-primary/10', 'text-primary');
  });

  it('applies google variant classes', () => {
    render(
      <Avatar variant="google" data-testid="avatar">
        G
      </Avatar>
    );
    const avatar = screen.getByTestId('avatar');
    expect(avatar).toHaveClass('bg-success/10', 'text-success');
  });

  it('applies warning variant classes', () => {
    render(
      <Avatar variant="warning" data-testid="avatar">
        W
      </Avatar>
    );
    const avatar = screen.getByTestId('avatar');
    expect(avatar).toHaveClass('bg-warning/10', 'text-warning');
  });

  it('applies custom className', () => {
    render(
      <Avatar className="custom-class" data-testid="avatar">
        AB
      </Avatar>
    );
    expect(screen.getByTestId('avatar')).toHaveClass('custom-class');
  });

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<Avatar ref={ref}>AB</Avatar>);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  describe('snapshots', () => {
    it('matches snapshot for default avatar', () => {
      const { container } = render(<Avatar>AB</Avatar>);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('matches snapshot for avatar with image', () => {
      const { container } = render(
        <Avatar src="https://example.com/avatar.png" alt="Avatar">
          AB
        </Avatar>
      );
      expect(container.firstChild).toMatchSnapshot();
    });

    it('matches snapshot for small size', () => {
      const { container } = render(<Avatar size="sm">SM</Avatar>);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('matches snapshot for large size', () => {
      const { container } = render(<Avatar size="lg">LG</Avatar>);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('matches snapshot for anthropic variant', () => {
      const { container } = render(<Avatar variant="anthropic">A</Avatar>);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('matches snapshot for openai variant', () => {
      const { container } = render(<Avatar variant="openai">O</Avatar>);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('matches snapshot for google variant', () => {
      const { container } = render(<Avatar variant="google">G</Avatar>);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('matches snapshot with icon', () => {
      const { container } = render(<Avatar>🤖</Avatar>);
      expect(container.firstChild).toMatchSnapshot();
    });
  });
});
