import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const spinnerVariants = cva('animate-spin', {
  variants: {
    size: {
      sm: 'h-3 w-3',
      default: 'h-4 w-4',
      lg: 'h-6 w-6',
    },
    variant: {
      default: 'text-foreground',
      primary: 'text-primary',
      muted: 'text-muted-foreground',
    },
  },
  defaultVariants: {
    size: 'default',
    variant: 'default',
  },
});

export interface LoadingSpinnerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof spinnerVariants> {}

/**
 * LoadingSpinner component for indicating loading states.
 *
 * Uses Loader2 icon from lucide-react with CSS animation.
 *
 * @example
 * ```tsx
 * <LoadingSpinner />
 * <LoadingSpinner size="lg" variant="primary" />
 * <LoadingSpinner aria-label="Loading content" />
 * ```
 */
const LoadingSpinner = React.forwardRef<HTMLDivElement, LoadingSpinnerProps>(
  ({ className, size, variant, role = 'status', 'aria-live': ariaLive = 'polite', ...props }, ref) => {
    return (
      <div ref={ref} role={role} aria-live={ariaLive} data-variant={variant || 'default'} data-size={size || 'default'} {...props}>
        <Loader2 className={cn(spinnerVariants({ size, variant, className }))} />
      </div>
    );
  }
);

LoadingSpinner.displayName = 'LoadingSpinner';

export { LoadingSpinner, spinnerVariants };
