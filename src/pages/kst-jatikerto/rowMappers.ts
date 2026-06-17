type ColValue = {
  colIdx: number;
  value: unknown;
};

export type JatikertoApiRow = {
  rowId?: string;
  id?: string;
  no?: number;
  colValues?: ColValue[];
  col_values?: ColValue[];
  columns?: ColValue[];
  [key: string]: unknown;
};

const ALIAS_GROUPS = {
  nama: ["nama", "name", "namaKomoditas", "komoditas", "judul"],
  tanggal: ["tanggal", "date", "createdAt", "updatedAt", "created_at", "updated_at"],
  jumlah: ["jumlah", "total", "quantity", "qty"],
  status: ["status", "kategori", "category"],
} as const;

function normalizeKey(key: string) {
  return key.replace(/[\s_-]/g, "").toLowerCase();
}

function getColValue(row: JatikertoApiRow, colIdx: number) {
  const values = row.colValues ?? row.col_values ?? row.columns;
  if (!Array.isArray(values)) return undefined;

  const byIndex = values.find((col) => {
    if (!col || typeof col !== "object") return false;
    const index = (col as Record<string, unknown>).colIdx ?? (col as Record<string, unknown>).col_idx;
    return Number(index) === colIdx;
  });
  if (byIndex) return (byIndex as Record<string, unknown>).value;

  const direct = values[colIdx];
  if (direct && typeof direct === "object" && "value" in direct) {
    return (direct as Record<string, unknown>).value;
  }
  return direct;
}

export function getFieldAlias(row: JatikertoApiRow, aliases: readonly string[]) {
  const keyMap = new Map(
    Object.keys(row).map((key) => [normalizeKey(key), key]),
  );

  for (const alias of aliases) {
    const actualKey = keyMap.get(normalizeKey(alias));
    if (!actualKey) continue;

    const value = row[actualKey];
    if (value !== undefined && value !== null && value !== "") return value;
  }

  return undefined;
}

function resolveValue(
  row: JatikertoApiRow,
  colIdx: number,
  aliases: readonly string[] = [],
) {
  return getFieldAlias(row, aliases) ?? getColValue(row, colIdx);
}

export function getTextValue(
  row: JatikertoApiRow,
  colIdx: number,
  aliases: readonly string[] = [],
  fallback = "",
) {
  const value = resolveValue(row, colIdx, aliases);
  return value === undefined || value === null ? fallback : String(value);
}

export function getNumberValue(
  row: JatikertoApiRow,
  colIdx: number,
  aliases: readonly string[] = [],
  fallback = 0,
) {
  const value = resolveValue(row, colIdx, aliases);
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function getDateValue(
  row: JatikertoApiRow,
  colIdx: number,
  aliases: readonly string[] = [],
  fallback = "",
) {
  return getTextValue(row, colIdx, aliases, fallback);
}

export function textValue(row: JatikertoApiRow, colIdx: number, fallback = "") {
  return getTextValue(row, colIdx, [], fallback);
}

export function numberValue(row: JatikertoApiRow, colIdx: number, fallback = 0) {
  return getNumberValue(row, colIdx, [], fallback);
}

export const fieldAliases = ALIAS_GROUPS;

export function rowIdentity(row: JatikertoApiRow) {
  return row.id ?? row.rowId ?? row.no;
}

export function formatDescription(value: unknown) {
  const text = String(value ?? "").trim();
  return text ? text : "-";
}
