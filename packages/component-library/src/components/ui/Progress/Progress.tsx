import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../../lib/utils';

const progressVariants = cva('relative h-2 w-full overflow-hidden rounded-full', {
  variants: {
    variant: {
      default: 'bg-secondary',
      destructive: 'bg-red-100 dark:bg-red-950',
      success: 'bg-green-100 dark:bg-green-950',
      warning: 'bg-yellow-100 dark:bg-yellow-950',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

const progressIndicatorVariants = cva(
  'h-full w-full flex-1 transition-all duration-300 ease-in-out',
  {
    variants: {
      variant: {
        default: 'bg-primary',
        destructive: 'bg-destructive',
        success: 'bg-green-500 dark:bg-green-400',
        warning: 'bg-yellow-500 dark:bg-yellow-400',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface ProgressProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof progressVariants> {
  value?: number;
  max?: number;
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, max = 100, variant, ...props }, ref) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        className={cn(progressVariants({ variant }), className)}
        {...props}
      >
        <div
          className={cn(progressIndicatorVariants({ variant }))}
          style={{ width: `${percentage}%` }}
        />
      </div>
    );
  }
);
Progress.displayName = 'Progress';

export { Progress, progressVariants, progressIndicatorVariants };
