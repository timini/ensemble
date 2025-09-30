import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../../lib/utils';

const avatarVariants = cva(
  'relative flex shrink-0 overflow-hidden rounded-full items-center justify-center font-semibold',
  {
    variants: {
      size: {
        sm: 'h-8 w-8 text-xs',
        default: 'h-10 w-10 text-sm',
        lg: 'h-12 w-12 text-base',
      },
      variant: {
        default: 'bg-muted text-muted-foreground',
        anthropic: 'bg-orange-100 text-orange-600',
        openai: 'bg-blue-100 text-blue-600',
        google: 'bg-green-100 text-green-600',
        warning: 'bg-yellow-100 text-yellow-600',
      },
    },
    defaultVariants: {
      size: 'default',
      variant: 'default',
    },
  }
);

export interface AvatarProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof avatarVariants> {
  src?: string;
  alt?: string;
}

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, size, variant, src, alt, children, ...props }, ref) => {
    const [imageError, setImageError] = React.useState(false);

    return (
      <div
        ref={ref}
        className={cn(avatarVariants({ size, variant }), className)}
        {...props}
      >
        {src && !imageError ? (
          <img
            src={src}
            alt={alt || ''}
            className="aspect-square h-full w-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <span>{children}</span>
        )}
      </div>
    );
  }
);
Avatar.displayName = 'Avatar';

export { Avatar, avatarVariants };
