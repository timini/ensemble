import { useRef, useCallback, useEffect } from 'react';
import { useStore } from '~/store';
import type { Provider } from '@/components/molecules/ApiKeyInput';

const AUTO_HIDE_DELAY_MS = 10_000;
const PROVIDERS: Provider[] = ['openai', 'anthropic', 'google', 'xai'];

/**
 * Auto-hides revealed API keys after a period of inactivity and
 * on page navigation (mount/unmount).
 */
export function useApiKeyAutoHide() {
    const apiKeys = useStore((state) => state.apiKeys);
    const hideAllApiKeys = useStore((state) => state.hideAllApiKeys);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const clearTimer = useCallback(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    const resetAutoHideTimer = useCallback(() => {
        clearTimer();
        const hasVisible = PROVIDERS.some((p) => apiKeys[p]?.visible);
        if (hasVisible) {
            timerRef.current = setTimeout(() => {
                hideAllApiKeys();
            }, AUTO_HIDE_DELAY_MS);
        }
    }, [apiKeys, clearTimer, hideAllApiKeys]);

    // Hide all on mount (returning to page) and unmount (navigating away)
    useEffect(() => {
        hideAllApiKeys();
        return () => {
            hideAllApiKeys();
        };
    }, [hideAllApiKeys]);

    // Start/reset the auto-hide timer whenever visibility changes
    const anyKeyVisible = PROVIDERS.some((p) => apiKeys[p]?.visible);
    useEffect(() => {
        if (!anyKeyVisible) {
            clearTimer();
            return;
        }
        timerRef.current = setTimeout(() => {
            hideAllApiKeys();
        }, AUTO_HIDE_DELAY_MS);
        return clearTimer;
    }, [anyKeyVisible, clearTimer, hideAllApiKeys]);

    return { resetAutoHideTimer };
}
