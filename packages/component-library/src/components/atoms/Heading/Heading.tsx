import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../../lib/utils';

const headingVariants = cva('font-semibold text-foreground', {
  variants: {
    size: {
      xs: 'text-xs',
      sm: 'text-sm',
      md: 'text-base',
      lg: 'text-lg',
      xl: 'text-xl',
      '2xl': 'text-2xl',
      '3xl': 'text-3xl font-bold',
    },
  },
  defaultVariants: {
    size: 'lg',
  },
});

export interface HeadingProps
  extends React.HTMLAttributes<HTMLHeadingElement>,
    VariantProps<typeof headingVariants> {
  /** Heading level (h1-h6) */
  level: 1 | 2 | 3 | 4 | 5 | 6;
  /** Visual size - can differ from semantic level */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  /** Content to display */
  children: React.ReactNode;
}

/**
 * Heading atom for standardized heading typography.
 *
 * Separates semantic level (h1-h6) from visual size for flexibility.
 * All headings use consistent font-weight and color from design system.
 *
 * @example
 * ```tsx
 * <Heading level={2} size="3xl">
 *   Page Title
 * </Heading>
 *
 * <Heading level={3} size="lg">
 *   Section Title
 * </Heading>
 * ```
 */
export const Heading = React.forwardRef<HTMLHeadingElement, HeadingProps>(
  ({ level, size, className, children, ...props }, ref) => {
    const Component = `h${level}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

    return (
      <Component
        ref={ref as React.Ref<HTMLHeadingElement>}
        className={cn(headingVariants({ size, className }))}
        {...props}
      >
        {children}
      </Component>
    );
  }
);

Heading.displayName = 'Heading';

export { headingVariants };
