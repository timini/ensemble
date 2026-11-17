import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('handles conditional classes', () => {
    const condition = false;
    expect(cn('foo', condition && 'bar', 'baz')).toBe('foo baz');
  });

  it('merges Tailwind classes correctly', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4');
  });

  it('handles undefined and null', () => {
    expect(cn('foo', undefined, null, 'bar')).toBe('foo bar');
  });

  it('handles arrays', () => {
    expect(cn(['foo', 'bar'])).toBe('foo bar');
  });

  it('handles objects', () => {
    expect(cn({ foo: true, bar: false, baz: true })).toBe('foo baz');
  });
});

describe('cn with design tokens', () => {
  it('keeps a semantic text size next to a text colour', () => {
    expect(cn('text-lead text-muted-foreground')).toBe('text-lead text-muted-foreground');
    expect(cn('text-foreground', 'text-display')).toBe('text-foreground text-display');
  });

  it('lets a later semantic text size replace an earlier one', () => {
    expect(cn('text-sm', 'text-label')).toBe('text-label');
  });

  it('keeps the focus-ring utility', () => {
    expect(cn('focus-ring', 'outline-none')).toContain('focus-ring');
  });
});
