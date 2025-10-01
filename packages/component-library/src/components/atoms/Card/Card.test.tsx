import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from './Card';

describe('Card', () => {
  it('renders card with content', () => {
    render(
      <Card data-testid="card">
        <CardContent>Card content</CardContent>
      </Card>
    );
    expect(screen.getByTestId('card')).toBeInTheDocument();
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  it('renders CardHeader', () => {
    render(<CardHeader data-testid="card-header">Header</CardHeader>);
    expect(screen.getByTestId('card-header')).toBeInTheDocument();
  });

  it('renders CardTitle', () => {
    render(<CardTitle>Title</CardTitle>);
    expect(screen.getByText('Title')).toBeInTheDocument();
  });

  it('renders CardDescription', () => {
    render(<CardDescription>Description</CardDescription>);
    expect(screen.getByText('Description')).toBeInTheDocument();
  });

  it('renders CardContent', () => {
    render(<CardContent>Content</CardContent>);
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('renders CardFooter', () => {
    render(<CardFooter data-testid="card-footer">Footer</CardFooter>);
    expect(screen.getByTestId('card-footer')).toBeInTheDocument();
  });

  it('renders complete card structure', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Card Title</CardTitle>
          <CardDescription>Card Description</CardDescription>
        </CardHeader>
        <CardContent>Card Content</CardContent>
        <CardFooter>Card Footer</CardFooter>
      </Card>
    );

    expect(screen.getByText('Card Title')).toBeInTheDocument();
    expect(screen.getByText('Card Description')).toBeInTheDocument();
    expect(screen.getByText('Card Content')).toBeInTheDocument();
    expect(screen.getByText('Card Footer')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(
      <Card className="custom-card" data-testid="card">
        <CardContent>Content</CardContent>
      </Card>
    );
    expect(screen.getByTestId('card')).toHaveClass('custom-card');
  });

  it('forwards ref correctly', () => {
    const ref = { current: null };
    render(
      <Card ref={ref}>
        <CardContent>Content</CardContent>
      </Card>
    );
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  describe('snapshots', () => {
    it('matches snapshot for basic card', () => {
      const { container } = render(
        <Card>
          <CardContent>Simple content</CardContent>
        </Card>
      );
      expect(container.firstChild).toMatchSnapshot();
    });

    it('matches snapshot for complete card structure', () => {
      const { container } = render(
        <Card>
          <CardHeader>
            <CardTitle>Card Title</CardTitle>
            <CardDescription>Card Description</CardDescription>
          </CardHeader>
          <CardContent>Card Content</CardContent>
          <CardFooter>Card Footer</CardFooter>
        </Card>
      );
      expect(container.firstChild).toMatchSnapshot();
    });

    it('matches snapshot with custom className', () => {
      const { container } = render(
        <Card className="border-2">
          <CardContent>Custom styled card</CardContent>
        </Card>
      );
      expect(container.firstChild).toMatchSnapshot();
    });

    it('matches snapshot for CardHeader alone', () => {
      const { container } = render(<CardHeader>Header content</CardHeader>);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('matches snapshot for CardTitle alone', () => {
      const { container } = render(<CardTitle>Title text</CardTitle>);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('matches snapshot for CardDescription alone', () => {
      const { container } = render(<CardDescription>Description text</CardDescription>);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('matches snapshot for CardFooter alone', () => {
      const { container } = render(<CardFooter>Footer content</CardFooter>);
      expect(container.firstChild).toMatchSnapshot();
    });
  });
});
