type AnyRecord = Record<string, unknown>;

export function isRecord(value: unknown): value is AnyRecord {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export function ngijoValue(payload: unknown) {
  if (!isRecord(payload)) return null;
  const data = payload.data;
  if (!isRecord(data)) return null;
  return data.value ?? null;
}

export function ngijoNumber(payload: unknown) {
  const value = ngijoValue(payload);
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function ngijoTimeSeries<T>(payload: unknown) {
  const value = ngijoValue(payload);
  return Array.isArray(value) ? (value as T[]) : [];
}

export function fieldNumber(record: unknown, keys: string[]) {
  if (!isRecord(record)) return null;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value.replace(/[^\d,.-]/g, "").replace(",", "."));
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
}

function normalizeKey(key: string) {
  return key.replace(/[\s_-]/g, "").toLowerCase();
}

export function fieldValue(record: unknown, keys: string[]) {
  if (!isRecord(record)) return undefined;
  const normalizedKeys = new Map(Object.keys(record).map((key) => [normalizeKey(key), key]));

  for (const key of keys) {
    const direct = record[key];
    if (direct !== undefined && direct !== null && direct !== "") return direct;

    const actualKey = normalizedKeys.get(normalizeKey(key));
    if (!actualKey) continue;

    const value = record[actualKey];
    if (value !== undefined && value !== null && value !== "") return value;
  }

  return undefined;
}

export function colValue(record: unknown, index: number) {
  if (!isRecord(record)) return undefined;
  const values = record.colValues ?? record.col_values ?? record.columns;
  if (!Array.isArray(values)) return undefined;

  const byIndex = values.find((item) => {
    if (!isRecord(item)) return false;
    return Number(item.colIdx ?? item.col_idx ?? item.index) === index;
  });
  if (isRecord(byIndex)) return byIndex.value;

  const direct = values[index];
  return isRecord(direct) && "value" in direct ? direct.value : direct;
}

export function textOrFallback(value: unknown, fallback = "Belum tersedia") {
  if (typeof value === "string" && value.trim()) return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return fallback;
}

export function getContractColumnIndex(contractPayload: unknown, aliases: string[]): number | undefined {
  const col = findContractColumn(contractPayload, aliases);
  if (!col) return undefined;
  const idx = Number(col.colIdx ?? col.col_idx ?? col.index);
  return Number.isNaN(idx) ? undefined : idx;
}

function collectColumnArrays(node: unknown, depth: number, acc: AnyRecord[][]) {
  if (depth > 6 || !node) return;

  if (Array.isArray(node)) {
    // A bare array could itself be a columns array (records with a `name`).
    if (node.some((item) => isRecord(item) && "name" in item && !Array.isArray(item))) {
      acc.push(node.filter(isRecord));
    }
    for (const item of node) collectColumnArrays(item, depth + 1, acc);
    return;
  }

  if (!isRecord(node)) return;

  if (Array.isArray(node.columns)) acc.push(node.columns.filter(isRecord));

  // Descend into the wrappers Ngijo/gateway use around the real payload.
  for (const key of ["response", "data", "dataType", "contract", "items"]) {
    if (key in node) collectColumnArrays(node[key], depth + 1, acc);
  }

  const val = ngijoValue(node);
  if (val && val !== node) collectColumnArrays(val, depth + 1, acc);
}

function findContractColumns(contractPayload: unknown): AnyRecord[] | undefined {
  const acc: AnyRecord[][] = [];
  collectColumnArrays(contractPayload, 0, acc);
  if (acc.length === 0) return undefined;
  return acc.flat();
}

function findContractColumn(contractPayload: unknown, aliases: string[]): AnyRecord | undefined {
  const columns = findContractColumns(contractPayload);
  if (!columns) return undefined;

  const lowerAliases = aliases.map((a) => a.toLowerCase().trim());
  for (const col of columns) {
    if (!isRecord(col)) continue;
    const name = typeof col.name === "string" ? col.name.toLowerCase().trim() : "";
    if (lowerAliases.includes(name)) return col;
  }
  return undefined;
}

/**
 * Reads a `variant` column's index → label mapping straight from the contract
 * dataType, so numeric category codes can be rendered as text without
 * hardcoding the enum. Supports index/value/id for the key and
 * variant/label/name for the text. Returns an empty map when the column isn't
 * a variant or has no variants array.
 */
export function getContractColumnVariants(contractPayload: unknown, aliases: string[]): Map<number, string> {
  const result = new Map<number, string>();
  const col = findContractColumn(contractPayload, aliases);

  // The variants array may live on the column directly or under dataType.
  const dataType = isRecord(col?.dataType) ? col?.dataType : undefined;
  const variants =
    (dataType && Array.isArray(dataType.variants) && dataType.variants) ||
    (col && Array.isArray(col.variants) && col.variants) ||
    undefined;
  if (!variants) return result;

  for (const entry of variants) {
    if (!isRecord(entry)) continue;
    const index = Number(entry.index ?? entry.value ?? entry.id);
    const label = entry.variant ?? entry.label ?? entry.name;
    if (!Number.isNaN(index) && typeof label === "string" && label.trim()) {
      result.set(index, label);
    }
  }
  return result;
}
