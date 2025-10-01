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
        info: 'bg-blue-50 border-blue-200 text-blue-900 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-100',
        success: 'bg-green-50 border-green-200 text-green-900 dark:bg-green-950 dark:border-green-800 dark:text-green-100',
        warning: 'bg-yellow-50 border-yellow-200 text-yellow-900 dark:bg-yellow-950 dark:border-yellow-800 dark:text-yellow-100',
        error: 'bg-red-50 border-red-200 text-red-900 dark:bg-red-950 dark:border-red-800 dark:text-red-100',
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
      info: 'text-blue-600 dark:text-blue-400',
      success: 'text-green-600 dark:text-green-400',
      warning: 'text-yellow-600 dark:text-yellow-400',
      error: 'text-red-600 dark:text-red-400',
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
