import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Custom hook that:
 * 1. Polls an async callback function every `intervalMs` (default: 20000ms = 20s).
 * 2. Pauses polling when the browser tab is hidden to save battery and network bandwidth.
 * 3. Immediately triggers a fresh fetch when the tab becomes visible again.
 * 4. Listens to `finance:mutation` events to trigger immediate cache invalidation and refetching.
 * 5. Cleans up all intervals on unmount.
 */
export function useRealTimePolling(callback, intervalMs = 20000, dependencies = []) {
  const [lastUpdated, setLastUpdated] = useState(() => new Date());
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  const executeCallback = useCallback(async () => {
    try {
      await callbackRef.current();
      setLastUpdated(new Date());
    } catch (err) {
      console.warn("Polling callback warning:", err);
    }
  }, []);

  useEffect(() => {
    let intervalId = null;

    const startPolling = () => {
      if (!intervalId && intervalMs > 0) {
        intervalId = setInterval(() => {
          if (!document.hidden) {
            executeCallback();
          }
        }, intervalMs);
      }
    };

    const stopPolling = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    // Initial fetch
    executeCallback();
    startPolling();

    // Pause when tab is hidden, resume immediately when tab is visible
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        executeCallback();
        startPolling();
      }
    };

    // Instant update on any create/update/delete mutation
    const handleMutation = () => {
      executeCallback();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('finance:mutation', handleMutation);

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('finance:mutation', handleMutation);
    };
  }, [executeCallback, intervalMs, ...dependencies]);

  return { lastUpdated, refetch: executeCallback };
}

export default useRealTimePolling;
