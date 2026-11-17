import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../../lib/utils';
import { ExternalLink } from 'lucide-react';

const linkVariants = cva(
  'focus-ring inline-flex items-center gap-1 rounded-sm underline-offset-4 transition-colors duration-fast',
  {
    variants: {
      variant: {
        default: 'text-primary underline decoration-primary/40 hover:decoration-primary',
        subtle: 'text-muted-foreground hover:text-foreground hover:underline',
        bold: 'font-semibold text-primary underline decoration-primary/40 hover:decoration-primary',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface LinkProps
  extends React.AnchorHTMLAttributes<HTMLAnchorElement>,
    VariantProps<typeof linkVariants> {
  /** Link content */
  children: React.ReactNode;
  /** Whether to show external link icon */
  external?: boolean;
  /** Icon size for external link indicator */
  iconSize?: number;
}

/**
 * Link atom for standardized anchor tag styling.
 *
 * Provides consistent link styles with variants for different use cases.
 * Automatically adds external link icon when external prop is true.
 *
 * @example
 * ```tsx
 * <Link href="/about">About</Link>
 * <Link href="https://example.com" external>External site</Link>
 * <Link variant="subtle" href="/settings">Settings</Link>
 * <Link variant="bold" href="/important">Important link</Link>
 * ```
 */
export const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(
  ({ variant, className, children, external, iconSize = 14, ...props }, ref) => {
    return (
      <a
        ref={ref}
        className={cn(linkVariants({ variant, className }))}
        data-variant={variant || 'default'}
        {...(external && { target: '_blank', rel: 'noopener noreferrer' })}
        {...props}
      >
        {children}
        {external && (
          <ExternalLink
            size={iconSize}
            className="inline-block"
            aria-label="Opens in new window"
          />
        )}
      </a>
    );
  }
);

Link.displayName = 'Link';

export { linkVariants };
