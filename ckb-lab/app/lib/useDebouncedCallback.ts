import { useCallback, useEffect, useRef } from "react";

/**
 * Returns a debounced version of `fn` that delays invocation by `delay` ms.
 * Always calls the latest version of `fn` (no stale-closure issues).
 * Pending timer is cancelled automatically on unmount.
 */
export function useDebouncedCallback<T extends (...args: never[]) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return useCallback(
    (...args: Parameters<T>) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        fnRef.current(...args);
      }, delay);
    },
    [delay]
  );
}
