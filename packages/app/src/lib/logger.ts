/**
 * Simple logger utility for conditional debug logging.
 * Logs are enabled if NEXT_PUBLIC_DEBUG_LOGS is 'true' or if we are in development mode.
 */

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
    },
    error: (...args: unknown[]) => {
        console.error(...args);
    },
};
