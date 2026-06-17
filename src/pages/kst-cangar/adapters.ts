import { formatDateInputValueSafe, formatIndonesianCalendarDate } from "@/lib/date";

type AnyRecord = Record<string, unknown>;

export interface StockSummary {
  totalBarang: number;
  totalMasuk: number;
  totalKeluar: number;
  totalRetur: number;
}

export interface StockItemRow {
  id: number | string;
  namaBarang: string;
  satuan: string;
  totalMasuk: number;
  totalKeluar: number;
  totalRetur: number;
  stokSistem: number;
  stokFisikTerakhir: string;
  selisihTerakhir: string;
  statusOpname: string;
  periode?: string;
}

export interface BookingSummary {
  pending: number;
  confirmedMonth: number;
  today: number;
}

export interface BookingRow {
  id: number | string;
  namaCustomer: string;
  noHp: string;
  layanan: string;
  tanggal: string;
  tanggalRaw: string;
  jumlah: number;
  kapasitas: number | null;
  status: string;
}

export interface FinanceSummary {
  pemasukanHariIni: number;
  pengeluaranHariIni: number;
  saldoHariIni: number;
}

export interface FinanceRow {
  id: number | string;
  tanggal: string;
  tanggalRaw: string;
  jenis: string;
  kategori: string;
  nominal: number;
  keterangan: string;
  status: string;
}

function isRecord(value: unknown): value is AnyRecord {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function valueOf(record: unknown, keys: string[]) {
  if (!isRecord(record)) return undefined;
  const lowerKeyMap = new Map(Object.keys(record).map((key) => [key.toLowerCase(), key]));

  for (const key of keys) {
    const exact = record[key];
    if (exact !== undefined && exact !== null) return exact;

    const actualKey = lowerKeyMap.get(key.toLowerCase());
    if (actualKey) {
      const value = record[actualKey];
      if (value !== undefined && value !== null) return value;
    }
  }

  return undefined;
}

function nestedValue(record: unknown, paths: string[][]) {
  for (const path of paths) {
    let current = record;
    for (const key of path) {
      current = valueOf(current, [key]);
      if (current === undefined || current === null) break;
    }
    if (current !== undefined && current !== null) return current;
  }
  return undefined;
}

function parseJsonValue(value: unknown): unknown {
  if (typeof value !== "string") return value;

  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}

function normalizePayload(payload: unknown): unknown {
  const parsed = parseJsonValue(payload);
  if (!isRecord(parsed)) return parsed;

  const response = valueOf(parsed, ["response"]);
  if (response !== undefined) return normalizePayload(response);

  const data = valueOf(parsed, ["data"]);

  // data is itself an array (e.g., { data: [{...}, {...}] })
  if (Array.isArray(data)) return data;

  if (isRecord(data)) {
    // PageContainer format: { data: { items: [...], offset, limit, ... } }
    const items = valueOf(data, ["items"]);
    if (Array.isArray(items)) return data;

    // Google Sheets / colValues format: { data: { value: "[{...}]" } }
    const value = valueOf(data, ["value"]);
    const parsedValue = parseJsonValue(value);
    if (Array.isArray(parsedValue)) return { ...data, items: parsedValue };
    if (isRecord(parsedValue)) return parsedValue;
  }

  return parsed;
}

export function toNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const normalized = value.replace(/[^\d,-.]/g, "").replace(",", ".");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function toText(value: unknown, fallback = "-") {
  if (value === undefined || value === null || value === "") return fallback;
  return String(value);
}

export function formatRupiah(value: unknown) {
  if (typeof value === "string" && value.trim().startsWith("Rp")) return value;
  return `Rp ${toNumber(value).toLocaleString("id-ID")}`;
}

export function formatIndonesianDate(value: unknown) {
  return formatIndonesianCalendarDate(value);
}

export function formatDateInputValue(value: unknown) {
  return formatDateInputValueSafe(value);
}

export function extractItems(payload: unknown): unknown[] {
  const normalized = normalizePayload(payload);
  if (Array.isArray(normalized)) return normalized;
  if (!isRecord(normalized)) return [];

  const direct = valueOf(normalized, [
    "items",
    "data",
    "rows",
    "records",
    "results",
    "list",
    "content",
    "entries",
    "value",
    "stok",
    "stock",
    "stocks",
    "barang",
    "inventory",
    "stokBarang",
    "stok_barang",
    "daftar",
    "bookings",
    "booking",
    "reservasi",
    "transactions",
    "transaksi",
    "keuangan",
  ]);

  const parsedDirect = parseJsonValue(direct);
  if (Array.isArray(parsedDirect)) return parsedDirect;

  if (isRecord(parsedDirect)) {
    const nested = extractItems(parsedDirect);
    if (nested.length > 0) return nested;
  }

  if (valueOf(normalized, ["item_id", "rowId", "id", "name", "nama_barang", "unit", "colValues"]) !== undefined) {
    return [normalized];
  }

  // Last-resort: scan all values for the first array containing record-like items
  for (const val of Object.values(normalized)) {
    const parsedVal = parseJsonValue(val);
    if (Array.isArray(parsedVal) && parsedVal.length > 0 && isRecord(parsedVal[0])) {
      return parsedVal;
    }
  }

  return [];
}

function firstNumber(record: unknown, keys: string[], paths: string[][] = [], fallback = 0) {
  return toNumber(valueOf(record, keys) ?? nestedValue(record, paths), fallback);
}

function colValue(record: unknown, index: number) {
  const values = valueOf(record, ["colValues", "col_values", "columns"]);
  if (!Array.isArray(values)) return undefined;

  const byIndex = values.find((item) => isRecord(item) && toNumber(valueOf(item, ["colIdx", "col_idx", "index"]), -1) === index);
  if (byIndex !== undefined) return valueOf(byIndex, ["value"]);

  return values[index];
}

function normalizeBookingStatus(value: unknown) {
  const status = toText(value, "Pending");
  const lower = status.toLowerCase();
  if (["confirmed", "confirm", "konfirmasi", "terkonfirmasi", "lunas"].includes(lower)) return "Confirmed";
  if (["cancelled", "canceled", "batal", "dibatalkan"].includes(lower)) return "Dibatalkan";
  if (["pending", "menunggu", "menunggu konfirmasi", "belum lunas", "dp"].includes(lower)) return "Pending";
  return status;
}

function normalizeFinanceType(value: unknown) {
  const jenis = toText(value, "-");
  const lower = jenis.toLowerCase();
  if (["income", "in", "masuk", "pemasukan"].includes(lower)) return "Pemasukan";
  if (["expense", "out", "keluar", "pengeluaran"].includes(lower)) return "Pengeluaran";
  return jenis;
}

function normalizeFinanceStatus(value: unknown) {
  const status = toText(value, "Tervalidasi");
  const lower = status.toLowerCase();
  if (["validated", "valid", "tervalidasi"].includes(lower)) return "Tervalidasi";
  if (["draft", "pending", "menunggu"].includes(lower)) return "Draft";
  if (["rejected", "reject", "ditolak"].includes(lower)) return "Rejected";
  return status;
}

export function adaptStockSummary(payload: unknown, rows: StockItemRow[] = []): StockSummary {
  const normalized = normalizePayload(payload);
  return {
    totalBarang:
      firstNumber(normalized, ["total_barang", "totalBarang", "total_items", "total_stok"], [["stok", "total"]]) ||
      rows.length,
    totalMasuk:
      firstNumber(normalized, ["stok_masuk", "stokMasuk", "stock_in", "total_masuk"], [["stok", "masuk"]]) ||
      rows.reduce((total, row) => total + row.totalMasuk, 0),
    totalKeluar:
      firstNumber(normalized, ["stok_keluar", "stokKeluar", "stock_out", "total_keluar"], [["stok", "keluar"]]) ||
      rows.reduce((total, row) => total + row.totalKeluar, 0),
    totalRetur:
      firstNumber(normalized, ["total_retur", "totalRetur", "retur", "return", "returned"], [["stok", "retur"]]) ||
      rows.reduce((total, row) => total + row.totalRetur, 0),
  };
}

export function adaptStockRows(payload: unknown): StockItemRow[] {
  return extractItems(payload).map((item, index) => {
    const satuan = toText(valueOf(item, ["satuan", "unit", "uom"]) ?? colValue(item, 1), "pcs");
    const totalMasuk = toNumber(
      valueOf(item, ["totalMasuk", "total_masuk", "stok_masuk", "barang_masuk", "stock_in", "masuk"]) ??
        colValue(item, 3),
    );
    const totalKeluar = toNumber(
      valueOf(item, ["totalKeluar", "total_keluar", "stok_keluar", "barang_keluar", "stock_out", "keluar"]) ??
        colValue(item, 4),
    );
    const totalRetur = toNumber(
      valueOf(item, ["totalRetur", "total_retur", "retur", "return", "returned"]) ?? colValue(item, 5),
    );
    const stokSistem = firstNumber(
      item,
      ["stokSistem", "stok_sistem", "system_stock", "stock_system", "stockAkhir", "stok_akhir", "total", "jumlah"],
      [],
      toNumber(colValue(item, 6), totalMasuk - totalKeluar + totalRetur),
    );
    const rawFisik = valueOf(item, [
      "stokFisikTerakhir",
      "stok_fisik_terakhir",
      "physicalStockLast",
      "lastPhysicalStock",
      "last_physical_stock",
      "stockFisik",
      "stok_fisik",
      "physical_stock",
      "physicalStock",
    ]) ?? colValue(item, 7);
    const rawSelisih = valueOf(item, [
      "selisihTerakhir",
      "selisih_terakhir",
      "differenceLast",
      "lastDifference",
      "last_difference",
      "selisih",
      "difference",
    ]) ?? colValue(item, 8);
    const rawStatus =
      valueOf(item, ["statusOpname", "status_opname", "opname_status", "status"]) ?? colValue(item, 9);
    const periode = toText(
      valueOf(item, ["periode", "period", "minggu", "week", "validation_week"]) ?? colValue(item, 10),
      "",
    );

    return {
      id: toText(valueOf(item, ["id", "ID", "uuid", "kode", "kode_barang"]), String(index + 1)),
      namaBarang: toText(valueOf(item, ["namaBarang", "nama_barang", "name", "nama", "barang", "item_name"]) ?? colValue(item, 0)),
      satuan,
      totalMasuk,
      totalKeluar,
      totalRetur,
      stokSistem,
      stokFisikTerakhir:
        rawFisik === undefined || rawFisik === null || rawFisik === ""
          ? "Belum opname"
          : toText(rawFisik),
      selisihTerakhir:
        rawSelisih === undefined || rawSelisih === null || rawSelisih === ""
          ? "-"
          : toText(rawSelisih),
      statusOpname: normalizeStockStatus(rawStatus),
      periode: periode || undefined,
    };
  });
}

export function adaptBookingSummary(payload: unknown, rows: BookingRow[] = []): BookingSummary {
  const normalized = normalizePayload(payload);
  return {
    pending:
      firstNumber(normalized, ["pending", "booking_pending", "menunggu_konfirmasi"], [["booking", "pending"]]) ||
      rows.filter((row) => row.status.toLowerCase() === "pending").length,
    confirmedMonth:
      firstNumber(
        normalized,
        ["confirmed_month", "confirmedMonth", "booking_confirmed_month", "confirmed_bulan_ini"],
        [["booking", "confirmed_month"]],
      ) || rows.filter((row) => row.status.toLowerCase() === "confirmed").length,
    today:
      firstNumber(normalized, ["today", "booking_today", "booking_hari_ini"], [["booking", "today"]]) ||
      rows.filter((row) => row.tanggal === formatIndonesianDate(new Date().toISOString())).length,
  };
}

export function adaptBookingRows(payload: unknown): BookingRow[] {
  return extractItems(payload).map((item, index) => {
    const customer = valueOf(item, ["customer", "pelanggan", "guest"]);
    const source = isRecord(customer) ? customer : item;
    const rawTanggal =
      valueOf(item, ["tanggal", "date", "booking_date", "checkIn", "check_in", "checkin", "start_date", "tanggal_mulai"]) ??
      colValue(item, 3);

    return {
      id: toText(valueOf(item, ["rowId", "row_id", "id", "ID", "booking_id", "kode"]), String(index + 1)),
      namaCustomer: toText(
        valueOf(source, ["namaCustomer", "nama_customer", "nama", "name", "customer_name", "nama_pelanggan", "guest_name"]) ??
          colValue(item, 0),
      ),
      noHp: toText(valueOf(source, ["noHp", "no_hp", "phone", "telephone", "whatsapp", "kontak", "contact"]) ?? colValue(item, 1)),
      layanan: toText(valueOf(item, ["layanan", "service", "tipe", "type", "room_type", "jenis", "unit_type"]) ?? colValue(item, 2)),
      tanggal: formatIndonesianDate(rawTanggal),
      tanggalRaw: formatDateInputValue(rawTanggal),
      jumlah: toNumber(
        valueOf(item, ["jumlah", "jumlah_tamu", "jumlahTamu", "guest_count", "pax", "guests"]) ?? colValue(item, 4),
      ),
      kapasitas: (() => {
        const value = valueOf(item, ["kapasitas", "capacity", "quota", "kuota", "available_capacity"]);
        const parsed = toNumber(value, Number.NaN);
        return Number.isFinite(parsed) ? parsed : null;
      })(),
      status: normalizeBookingStatus(valueOf(item, ["status", "booking_status", "payment_status"]) ?? colValue(item, 5)),
    };
  });
}

function normalizeStockStatus(value: unknown) {
  const status = toText(value, "Belum ada opname");
  const lower = status.toLowerCase();
  if (["validated", "valid", "tervalidasi"].includes(lower)) return "Tervalidasi";
  if (["draft", "pending", "menunggu"].includes(lower)) return "Draft";
  if (["rejected", "reject", "ditolak"].includes(lower)) return "Ditolak";
  if (["belum ada opname", "belum opname", "none", "-"].includes(lower)) return "Belum ada opname";
  return status;
}

export function adaptFinanceSummary(payload: unknown, rows: FinanceRow[] = []): FinanceSummary {
  const normalized = normalizePayload(payload);
  const pemasukan =
    firstNumber(
      normalized,
      ["pemasukan_hari_ini", "pemasukanHariIni", "income_today", "total_pemasukan", "total_income"],
      [["keuangan", "pemasukan_hari_ini"]],
    ) ||
    rows
      .filter((row) => row.jenis.toLowerCase() === "pemasukan")
      .reduce((total, row) => total + row.nominal, 0);
  const pengeluaran =
    firstNumber(
      normalized,
      ["pengeluaran_hari_ini", "pengeluaranHariIni", "expense_today", "total_pengeluaran", "total_expense"],
      [["keuangan", "pengeluaran_hari_ini"]],
    ) ||
    rows
      .filter((row) => row.jenis.toLowerCase() === "pengeluaran")
      .reduce((total, row) => total + row.nominal, 0);

  return {
    pemasukanHariIni: pemasukan,
    pengeluaranHariIni: pengeluaran,
    saldoHariIni:
      firstNumber(
      normalized,
      ["saldo_hari_ini", "saldoHariIni", "balance_today", "net_today", "saldo", "balance"],
      [["keuangan", "saldo_hari_ini"]],
    ) || pemasukan - pengeluaran,
  };
}

export function adaptFinanceRows(payload: unknown): FinanceRow[] {
  return extractItems(payload)
    .map((item, index) => {
      const rawTanggal = valueOf(item, ["tanggal", "date", "transaction_date", "created_at"]) ?? colValue(item, 4);

      return {
        id: toText(valueOf(item, ["rowId", "row_id", "id", "ID", "transaction_id", "transaksi_id", "kode"]), String(index + 1)),
        tanggal: formatIndonesianDate(rawTanggal),
        tanggalRaw: formatDateInputValue(rawTanggal),
        jenis: normalizeFinanceType(valueOf(item, ["jenis", "type", "transaction_type"]) ?? colValue(item, 0)),
        kategori: toText(valueOf(item, ["kategori", "category", "akun", "account"]) ?? colValue(item, 2)),
        nominal: toNumber(valueOf(item, ["nominal", "amount", "jumlah", "total", "value"]) ?? colValue(item, 1)),
        keterangan: toText(valueOf(item, ["keterangan", "description", "note", "notes", "catatan"]) ?? colValue(item, 3)),
        status: normalizeFinanceStatus(valueOf(item, ["status", "validation_status", "validated"]) ?? colValue(item, 5)),
      };
    })
    .sort((left, right) => toNumber(right.id) - toNumber(left.id));
}
