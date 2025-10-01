import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../../lib/utils';

const textVariants = cva('', {
  variants: {
    variant: {
      body: 'text-base text-gray-900',
      helper: 'text-sm text-gray-600',
      caption: 'text-xs text-gray-500',
      small: 'text-sm text-gray-900',
    },
    color: {
      default: '',
      muted: 'text-gray-500',
      error: 'text-red-600',
      success: 'text-green-600',
      warning: 'text-yellow-600',
      primary: 'text-blue-600',
    },
  },
  defaultVariants: {
    variant: 'body',
    color: 'default',
  },
});

export interface TextProps
  extends Omit<React.HTMLAttributes<HTMLParagraphElement>, 'color'>,
    VariantProps<typeof textVariants> {
  /** Text content */
  children: React.ReactNode;
  /** HTML element to render (p or span) */
  as?: 'p' | 'span';
}

/**
 * Text atom for standardized body text, helper text, and captions.
 *
 * Provides consistent typography with variants for different text styles
 * and semantic colors for various states.
 *
 * @example
 * ```tsx
 * <Text>Default body text</Text>
 * <Text variant="helper">Helper text for form fields</Text>
 * <Text variant="caption" color="muted">Image caption</Text>
 * <Text as="span" color="error">Error message</Text>
 * ```
 */
export const Text = React.forwardRef<HTMLParagraphElement, TextProps>(
  ({ variant, color, className, children, as: Component = 'p', ...props }, ref) => {
    return (
      <Component
        ref={ref}
        className={cn(textVariants({ variant, color, className }))}
        {...props}
      >
        {children}
      </Component>
    );
  }
);

Text.displayName = 'Text';

export { textVariants };
