type ColValue = {
  colIdx: number;
  value: unknown;
};

export type JatikertoApiRow = {
  rowId?: string;
  id?: string;
  no?: number;
  colValues?: ColValue[];
};

function getValue(row: JatikertoApiRow, colIdx: number) {
  return row.colValues?.find((col) => col.colIdx === colIdx)?.value;
}

export function textValue(row: JatikertoApiRow, colIdx: number, fallback = "") {
  const value = getValue(row, colIdx);
  return value === undefined || value === null ? fallback : String(value);
}

export function numberValue(row: JatikertoApiRow, colIdx: number, fallback = 0) {
  const value = getValue(row, colIdx);
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function rowIdentity(row: JatikertoApiRow) {
  return row.id ?? row.rowId ?? row.no;
}
