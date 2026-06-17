import { useEffect, useMemo, useState } from "react";
import { ApiError, apiClient } from "./config";

interface PageContainer<T> {
  offset: number;
  limit: number;
  hasNext: boolean;
  total?: number;
  items: T[];
}

type PagePayload<T> = PageContainer<T> | T[] | unknown;

function asRecord(payload: unknown): Record<string, unknown> | null {
  return payload && typeof payload === "object" && !Array.isArray(payload)
    ? (payload as Record<string, unknown>)
    : null;
}

function parseJsonValue(payload: unknown): unknown {
  if (typeof payload !== "string") return payload;

  try {
    return JSON.parse(payload) as unknown;
  } catch {
    return payload;
  }
}

function pageFromArray<T>(items: T[]): PageContainer<T> {
  return {
    offset: 0,
    limit: items.length,
    hasNext: false,
    total: items.length,
    items,
  };
}

function findPageContainer<T>(payload: unknown, depth = 0): PageContainer<T> | null {
  if (depth > 5) return null;

  const parsed = parseJsonValue(payload);
  if (parsed !== payload) return findPageContainer<T>(parsed, depth + 1);

  if (Array.isArray(payload)) {
    return pageFromArray(payload as T[]);
  }

  const record = asRecord(payload);
  if (!record) return null;

  if (Array.isArray(record.items)) {
    return pageFromArray(record.items as T[]);
  }

  for (const key of ["data", "response"]) {
    if (key in record) {
      const nested = findPageContainer<T>(record[key], depth + 1);
      if (nested) return nested;
    }
  }

  const value = parseJsonValue(record.value);
  if (Array.isArray(value)) return pageFromArray(value as T[]);
  if (asRecord(value)) return findPageContainer<T>(value, depth + 1);

  return null;
}

export function parsePageContainer<T>(payload: PagePayload<T> | null): PageContainer<T> | null {
  return findPageContainer<T>(payload);
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
  const parseError =
    !isLoading && !error && data !== null && !page
      ? "Format response tidak dikenali"
      : null;

  return {
    items: page?.items ?? ([] as T[]),
    page,
    warning: extractWarning(data),
    isLoading,
    error: error ?? parseError,
    errorStatus,
  };
}

/**
 * Pulls an upstream `warning` string out of a gateway envelope. The gateway
 * returns HTTP 200 with `{ data: {...}, warning }` when an upstream KST is
 * unavailable, so this lets a page tell "upstream is down" apart from
 * "upstream returned no rows".
 */
function extractWarning(payload: unknown, depth = 0): string | null {
  if (depth > 5) return null;
  const record = asRecord(payload);
  if (!record) return null;
  if (typeof record.warning === "string" && record.warning.trim()) return record.warning;
  for (const key of ["data", "response"]) {
    if (key in record) {
      const nested = extractWarning(record[key], depth + 1);
      if (nested) return nested;
    }
  }
  return null;
}
