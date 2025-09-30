import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const iconVariants = cva('inline-flex shrink-0', {
  variants: {
    size: {
      sm: 'h-3 w-3',
      default: 'h-4 w-4',
      lg: 'h-5 w-5',
    },
    variant: {
      default: 'text-foreground',
      primary: 'text-blue-600 dark:text-blue-400',
      success: 'text-green-500 dark:text-green-400',
      warning: 'text-yellow-500 dark:text-yellow-400',
      destructive: 'text-destructive',
      muted: 'text-muted-foreground',
    },
  },
  defaultVariants: {
    size: 'default',
    variant: 'default',
  },
});

export interface IconProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof iconVariants> {
  /** Icon element from lucide-react or custom SVG */
  children: React.ReactNode;
}

/**
 * Icon wrapper component providing consistent sizing and colors.
 *
 * Uses lucide-react icons or custom SVG elements.
 *
 * @example
 * ```tsx
 * import { Check, Info } from 'lucide-react';
 *
 * <Icon><Check /></Icon>
 * <Icon variant="success" size="lg"><Check /></Icon>
 * <Icon variant="primary"><Info /></Icon>
 * ```
 */
const Icon = React.forwardRef<HTMLSpanElement, IconProps>(
  ({ className, size, variant, children, role = 'img', ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(iconVariants({ size, variant, className }))}
        role={role}
        {...props}
      >
        {React.Children.map(children, (child) => {
          if (React.isValidElement(child)) {
            return React.cloneElement(child as React.ReactElement<{ className?: string }>, {
              className: cn(
                iconVariants({ size }),
                (child as React.ReactElement<{ className?: string }>).props.className
              ),
            });
          }
          return child;
        })}
      </span>
    );
  }
);

Icon.displayName = 'Icon';

export { Icon, iconVariants };
