type AnyRecord = Record<string, unknown>;

export type DashboardSource = {
  kstIdentifier: string;
  data: AnyRecord | null;
  warning?: string;
  status?: string;
};

export type DashboardSummary = {
  totalVisitors: number | null;
  todayVisitors: number | null;
  weekVisitors: number | null;
  activeKst: number | null;
  totalKst: number | null;
  totalProduction: number | null;
  activeOperations: number | null;
  greenPerformance: number | null;
  sources: DashboardSource[];
  warnings: string[];
};

const SUMMARY_FIELDS = {
  totalVisitors: ["totalVisitors", "total_visitors"],
  todayVisitors: ["todayVisitors", "today_visitors"],
  weekVisitors: ["weekVisitors", "week_visitors"],
  activeKst: ["activeKst", "active_kst"],
  totalKst: ["totalKst", "total_kst"],
  totalProduction: ["totalProduction", "total_production"],
  activeOperations: ["activeOperations", "active_operations"],
  greenPerformance: ["greenPerformance", "green_performance"],
} as const;

function isRecord(value: unknown): value is AnyRecord {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function normalizeKey(key: string) {
  return key.replace(/[\s_-]/g, "").toLowerCase();
}

export function valueOf(record: unknown, keys: readonly string[]) {
  if (!isRecord(record)) return undefined;
  const keyMap = new Map(Object.keys(record).map((key) => [normalizeKey(key), key]));

  for (const key of keys) {
    const actualKey = keyMap.get(normalizeKey(key));
    if (!actualKey) continue;

    const value = record[actualKey];
    if (value !== undefined && value !== null && value !== "") return value;
  }

  return undefined;
}

export function numberOrNull(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^\d,-.]/g, "").replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function readNumber(record: unknown, keys: readonly string[]) {
  return numberOrNull(valueOf(record, keys));
}

function normalizeSource(source: unknown, fallbackIdentifier?: string): DashboardSource | null {
  if (!isRecord(source)) return null;

  const kstIdentifier = String(
    valueOf(source, ["kstIdentifier", "kst_identifier", "identifier", "kst"]) ??
      fallbackIdentifier ??
      "",
  ).toLowerCase();
  if (!kstIdentifier) return null;

  const sourceData = valueOf(source, ["data"]);
  const warning = valueOf(source, ["warning", "message"]);
  const status = valueOf(source, ["status"]);

  return {
    kstIdentifier,
    data: isRecord(sourceData) ? sourceData : isRecord(source) && sourceData === undefined ? source : null,
    warning: typeof warning === "string" ? warning : undefined,
    status: typeof status === "string" ? status : undefined,
  };
}

function normalizeSources(payload: unknown): DashboardSource[] {
  const sources = valueOf(payload, ["sources"]);
  if (Array.isArray(sources)) {
    return sources
      .map((source) => normalizeSource(source))
      .filter((source): source is DashboardSource => Boolean(source));
  }

  if (isRecord(sources)) {
    return Object.entries(sources)
      .map(([key, source]) => normalizeSource(source, key))
      .filter((source): source is DashboardSource => Boolean(source));
  }

  return [];
}

export function adaptDashboardSummary(payload: unknown): DashboardSummary {
  return {
    totalVisitors: readNumber(payload, SUMMARY_FIELDS.totalVisitors),
    todayVisitors: readNumber(payload, SUMMARY_FIELDS.todayVisitors),
    weekVisitors: readNumber(payload, SUMMARY_FIELDS.weekVisitors),
    activeKst: readNumber(payload, SUMMARY_FIELDS.activeKst),
    totalKst: readNumber(payload, SUMMARY_FIELDS.totalKst),
    totalProduction: readNumber(payload, SUMMARY_FIELDS.totalProduction),
    activeOperations: readNumber(payload, SUMMARY_FIELDS.activeOperations),
    greenPerformance: readNumber(payload, SUMMARY_FIELDS.greenPerformance),
    sources: normalizeSources(payload),
    warnings: Array.isArray(valueOf(payload, ["warnings"]))
      ? (valueOf(payload, ["warnings"]) as unknown[]).filter((item): item is string => typeof item === "string")
      : [],
  };
}

export function sourceData(summary: DashboardSummary | null, kstIdentifier: string) {
  const source = summary?.sources.find(
    (item) => item.kstIdentifier.toLowerCase() === kstIdentifier.toLowerCase(),
  );
  return {
    data: source?.data ?? null,
    warning: source?.warning,
    status: source?.status,
  };
}
