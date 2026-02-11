import * as React from 'react';
import { X } from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const tagVariants = cva(
  'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium transition-colors border',
  {
    variants: {
      variant: {
        default: 'bg-secondary text-secondary-foreground',
        primary: 'bg-primary/10 text-primary',
        success: 'bg-success/10 text-success',
      },
      selected: {
        true: 'border-primary',
        false: 'border-border',
      },
      clickable: {
        true: 'cursor-pointer hover:opacity-80',
        false: '',
      },
      disabled: {
        true: 'opacity-50 cursor-not-allowed',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      selected: false,
      clickable: false,
      disabled: false,
    },
  }
);

export interface TagProps extends React.HTMLAttributes<HTMLButtonElement | HTMLSpanElement>, VariantProps<typeof tagVariants> {
  /** Tag label */
  children: React.ReactNode;
  /** Show remove button */
  removable?: boolean;
  /** Callback when remove button is clicked */
  onRemove?: () => void;
  /** Selected state */
  selected?: boolean;
  /** Disabled state */
  disabled?: boolean;
}

/**
 * Tag component for labels, filters, and selections.
 *
 * Supports selected state, removable functionality, and click interactions.
 *
 * @example
 * ```tsx
 * <Tag>Model Name</Tag>
 * <Tag selected onClick={handleClick}>GPT-4</Tag>
 * <Tag removable onRemove={handleRemove}>Filter</Tag>
 * ```
 */
const Tag = React.forwardRef<HTMLElement, TagProps>(
  ({ className, variant, selected, removable, onRemove, onClick, disabled, children, ...props }, ref) => {
    const isClickable = !!onClick && !disabled;
    // Use div when removable to avoid nesting buttons
    const Comp = removable ? 'div' : (isClickable ? 'button' : 'span');

    const handleClick = (e: React.MouseEvent<HTMLDivElement | HTMLButtonElement>) => {
      if (disabled) return;
      onClick?.(e as React.MouseEvent<HTMLButtonElement | HTMLSpanElement>);
    };

    const handleRemove = (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      if (disabled) return;
      onRemove?.();
    };

    return (
      <Comp
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ref={ref as any}
        className={cn(tagVariants({ variant, selected, clickable: isClickable, disabled, className }))}
        onClick={onClick ? handleClick : undefined}
        disabled={!removable ? disabled : undefined}
        {...props}
      >
        {children}
        {removable && (
          <button
            type="button"
            onClick={handleRemove}
            disabled={disabled}
            aria-label="Remove"
            className="inline-flex items-center justify-center rounded-full hover:bg-black/10 dark:hover:bg-white/10 p-0.5 transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </Comp>
    );
  }
);

Tag.displayName = 'Tag';

export { Tag, tagVariants };
