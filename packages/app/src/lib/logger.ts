/**
 * Simple logger utility for conditional debug logging.
 * Logs are enabled if NEXT_PUBLIC_DEBUG_LOGS is 'true' or if we are in development mode.
 * Errors are also captured by Sentry when available.
 */

import * as Sentry from '@sentry/nextjs';

const isDebug =
    process.env.NEXT_PUBLIC_DEBUG_LOGS === 'true' ||
    process.env.NODE_ENV === 'development';

export const logger = {
    debug: (...args: unknown[]) => {
        if (isDebug) {
            console.log('[DEBUG]', ...args);
        }
    },
    log: (...args: unknown[]) => {
        if (isDebug) {
            console.log(...args);
        }
    },
    warn: (...args: unknown[]) => {
        console.warn(...args);
        Sentry.addBreadcrumb({
            category: 'console',
            message: args.map(String).join(' '),
            level: 'warning',
        });
    },
    error: (...args: unknown[]) => {
        console.error(...args);
        const err = args.find((a) => a instanceof Error);
        if (err) {
            Sentry.captureException(err);
        } else {
            Sentry.captureMessage(args.map(String).join(' '), 'error');
        }
    },
};
