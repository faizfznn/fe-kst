import { useEffect, useMemo, useState } from "react";
import { ApiError, apiClient } from "./config";

interface PageContainer<T> {
  offset: number;
  limit: number;
  hasNext: boolean;
  total?: number;
  items: T[];
}

interface DataContainer<T> {
  data?: PageContainer<T>;
}

type PagePayload<T> = PageContainer<T> | DataContainer<T>;

function hasItems<T>(payload: unknown): payload is PageContainer<T> {
  return Boolean(
    payload &&
      typeof payload === "object" &&
      Array.isArray((payload as PageContainer<T>).items),
  );
}

export function parsePageContainer<T>(payload: PagePayload<T> | null): PageContainer<T> | null {
  const nestedData =
    payload && typeof payload === "object" && "data" in payload ? payload.data : null;

  if (hasItems<T>(nestedData)) return nestedData;
  if (hasItems<T>(payload)) return payload;
  return null;
}

export function useApiData<T>(
  path: string,
  query?: Record<string, unknown>,
  enabled = true,
) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const key = useMemo(() => JSON.stringify(query ?? {}), [query]);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    setIsLoading(true);
    setError(null);
    setErrorStatus(null);

    apiClient
      .get<T>(path, query)
      .then((response) => {
        if (!cancelled) setData(response);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Gagal memuat data");
          setErrorStatus(err instanceof ApiError ? err.status : null);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [path, key, enabled]);

  return { data, isLoading, error, errorStatus };
}

export function usePageData<T>(path: string, query?: Record<string, unknown>) {
  const { data, isLoading, error, errorStatus } = useApiData<PagePayload<T>>(path, query);
  const page = parsePageContainer<T>(data);

  return {
    items: page?.items ?? ([] as T[]),
    page,
    isLoading,
    error,
    errorStatus,
  };
}
