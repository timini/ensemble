import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from './Card';

describe('Card Snapshots', () => {
  it('matches snapshot for basic card', () => {
    const { container } = render(
      <Card>
        <CardContent>Basic card content</CardContent>
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
        <CardContent>
          <p>This is the main content area.</p>
        </CardContent>
        <CardFooter>Footer content</CardFooter>
      </Card>
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it('matches snapshot for card with custom className', () => {
    const { container } = render(
      <Card className="custom-class">
        <CardContent>Custom styled card</CardContent>
      </Card>
    );
    expect(container.firstChild).toMatchSnapshot();
  });
});
