import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { useTranslation } from 'react-i18next';
import { cn } from '../../../lib/utils';

const ratingVariants = cva('flex items-center space-x-1', {
  variants: {
    size: {
      sm: 'text-sm',
      default: 'text-base',
      lg: 'text-xl',
    },
  },
  defaultVariants: {
    size: 'default',
  },
});

const starVariants = cva(
  'cursor-pointer transition-colors disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      size: {
        sm: 'text-sm',
        default: 'text-base',
        lg: 'text-xl',
      },
      filled: {
        true: 'text-warning hover:text-warning/80',
        false: 'text-muted hover:text-warning',
      },
    },
    defaultVariants: {
      size: 'default',
      filled: false,
    },
  }
);

export interface RatingProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'>,
    VariantProps<typeof ratingVariants> {
  value: number;
  max?: number;
  onChange?: (value: number) => void;
  readOnly?: boolean;
  disabled?: boolean;
}

const Rating = React.forwardRef<HTMLDivElement, RatingProps>(
  (
    {
      className,
      size,
      value,
      max = 5,
      onChange,
      readOnly = false,
      disabled = false,
      ...props
    },
    ref
  ) => {
    const { t } = useTranslation();

    const handleStarClick = (starValue: number) => {
      if (!readOnly && !disabled && onChange) {
        onChange(starValue);
      }
    };

    return (
      <div ref={ref} className={cn(ratingVariants({ size }), className)} data-size={size || 'default'} {...props}>
        {Array.from({ length: max }, (_, index) => {
          const starValue = index + 1;
          const isFilled = starValue <= value;

          return (
            <button
              key={index}
              type="button"
              onClick={() => handleStarClick(starValue)}
              disabled={disabled || readOnly}
              className={cn(
                starVariants({ size, filled: isFilled }),
                (readOnly || disabled) && 'cursor-default hover:text-current'
              )}
              aria-label={t('atoms.rating.star', { count: starValue })}
            >
              {isFilled ? '⭐' : '☆'}
            </button>
          );
        })}
      </div>
    );
  }
);
Rating.displayName = 'Rating';

export { Rating, ratingVariants };
