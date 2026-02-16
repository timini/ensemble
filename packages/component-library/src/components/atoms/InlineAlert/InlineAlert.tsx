import * as React from 'react';
import { Info, CheckCircle, AlertTriangle, AlertCircle, X } from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

const alertVariants = cva(
  'flex items-start gap-3 p-4 rounded-md border',
  {
    variants: {
      variant: {
        info: 'bg-info/10 border-info/20 text-foreground',
        success: 'bg-success/10 border-success/20 text-foreground',
        warning: 'bg-warning/10 border-warning/20 text-foreground',
        error: 'bg-destructive/10 border-destructive/20 text-foreground',
      },
    },
    defaultVariants: {
      variant: 'info',
    },
  }
);

const iconVariants = cva('h-4 w-4 shrink-0 mt-0.5', {
  variants: {
    variant: {
      info: 'text-info',
      success: 'text-success',
      warning: 'text-warning',
      error: 'text-destructive',
    },
  },
  defaultVariants: {
    variant: 'info',
  },
});

export interface InlineAlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  /** Alert message content */
  children: React.ReactNode;
  /** Show dismiss button */
  dismissible?: boolean;
  /** Callback when dismissed */
  onDismiss?: () => void;
}

const iconMap = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  error: AlertCircle,
};

/**
 * InlineAlert component for contextual messages and notifications.
 *
 * Displays info, success, warning, or error messages with icons.
 *
 * @example
 * ```tsx
 * <InlineAlert variant="info">This is informational.</InlineAlert>
 * <InlineAlert variant="success">Saved successfully.</InlineAlert>
 * <InlineAlert variant="error" dismissible onDismiss={handleDismiss}>Error occurred.</InlineAlert>
 * ```
 */
const InlineAlert = React.forwardRef<HTMLDivElement, InlineAlertProps>(
  ({ className, variant = 'info', dismissible, onDismiss, children, role = 'alert', ...props }, ref) => {
    const { t } = useTranslation();
    const Icon = iconMap[variant ?? 'info'];

    return (
      <div
        ref={ref}
        role={role}
        className={cn(alertVariants({ variant, className }))}
        data-variant={variant || 'info'}
        {...props}
      >
        <Icon className={cn(iconVariants({ variant }))} aria-hidden="true" />
        <div className="flex-1 text-sm">{children}</div>
        {dismissible && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label={t('atoms.inlineAlert.dismiss')}
            className="shrink-0 rounded-sm opacity-70 hover:opacity-100 transition-opacity"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }
);

InlineAlert.displayName = 'InlineAlert';

export { InlineAlert, alertVariants };
