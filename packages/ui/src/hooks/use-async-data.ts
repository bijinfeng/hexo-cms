import { useState, useCallback, useEffect, useRef } from "react";

export interface AsyncDataState<T> {
  data: T;
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
}

export function useAsyncData<T>(
  fetchFn: () => Promise<T>,
  deps?: unknown[],
  initialValue?: T | null,
): AsyncDataState<T | null> {
  const resolvedDeps = deps ?? [];
  const [data, setData] = useState<T | null>(initialValue ?? null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchFnRef = useRef(fetchFn);
  fetchFnRef.current = fetchFn;

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await fetchFnRef.current();
      setData(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("useAsyncData fetch failed:", err);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, resolvedDeps);  

  useEffect(() => {
    loadData();
  }, [loadData]);

  return { data, loading, error, refresh: loadData };
}
