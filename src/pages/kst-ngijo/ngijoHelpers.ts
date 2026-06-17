export const DATA_EMPTY_TEXT = "Data belum tersedia";
export const DATA_PREPARING_TEXT = "Data Ngijo sedang disiapkan";

export function friendlyDataMessage(message?: string | null, fallback = DATA_PREPARING_TEXT) {
  if (!message) return fallback;
  const lower = message.toLowerCase();
  if (
    lower.includes("failed") ||
    lower.includes("fetch") ||
    lower.includes("backend") ||
    lower.includes("null") ||
    lower.includes("undefined") ||
    lower.includes("404") ||
    lower.includes("500") ||
    lower.includes("format response") ||
    lower.includes("error")
  ) {
    return fallback;
  }
  return DATA_PREPARING_TEXT;
}

export function formatMetric(value: number | null | undefined, suffix?: string) {
  if (value === null || value === undefined || !Number.isFinite(value)) return DATA_EMPTY_TEXT;
  return [value.toLocaleString("id-ID"), suffix].filter(Boolean).join(" ");
}

export const ngijoTableHeaderClass = "border-emerald-100 bg-emerald-50/80 hover:bg-emerald-50/80";
export const ngijoTableHeadClass = "font-bold text-emerald-900 text-[12px]";
export const ngijoTableRowClass = "group border-gray-100 transition-colors hover:bg-emerald-50/40";
export const ngijoBadgeNeutralClass = "inline-flex h-auto rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[12px] font-bold text-gray-600";
