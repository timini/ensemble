import * as React from 'react';
import { cn } from '../../../lib/utils';

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          'flex min-h-[80px] w-full rounded-lg border border-input bg-card px-3 py-2 text-base shadow-sm transition-[border-color,box-shadow] duration-fast placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/20 md:text-sm disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = 'Textarea';

export { Textarea };
