import { apiClient } from "@/api/config";
import { API_ENDPOINTS } from "@/api/endpoints";
import { parsePageContainer } from "@/api/hooks";
import {
  adaptBookingRows,
  adaptFinanceRows,
  adaptStockRows,
  formatRupiah,
} from "@/pages/kst-cangar/adapters";
import {
  fieldAliases,
  getDateValue,
  getNumberValue,
  getTextValue,
  type JatikertoApiRow,
} from "@/pages/kst-jatikerto/rowMappers";
import { normalizeProgramStudi } from "@/pages/kst-jatikerto/programStudi";
import {
  formatArea,
  formatFrequency,
  formatIndonesianDate,
  formatNumber,
  formatQuantity,
  parseDate,
} from "@/pages/kst-jatikerto/dashboardUi";
import {
  colValue,
  fieldNumber,
  fieldValue,
  getContractColumnIndex,
  getContractColumnVariants,
  isRecord,
  textOrFallback,
} from "@/pages/kst-ngijo/adapters";
import { DATA_EMPTY_TEXT } from "@/pages/kst-ngijo/ngijoHelpers";

export type ReportKst = "ngijo" | "cangar" | "jatikerto";
export type ReportFormat = "csv" | "xlsx";

export type ReportColumn = {
  header: string;
  value: (row: Record<string, unknown>, index: number) => unknown;
};

type ReportData = {
  title: string;
  kstLabel: string;
  reportLabel: string;
  fileSlug: string;
  columns: ReportColumn[];
  rows: Record<string, unknown>[];
};

export type ReportDefinition = {
  id: string;
  kst: ReportKst;
  label: string;
  fileSlug: string;
  load: () => Promise<ReportData>;
};

const KST_LABELS: Record<ReportKst, string> = {
  ngijo: "KST Ngijo",
  cangar: "KST Cangar",
  jatikerto: "KST Jatikerto",
};

const REPORT_ERROR_MESSAGE =
  "Laporan belum bisa dibuat karena data tidak tersedia atau koneksi bermasalah.";

function asRows<T>(payload: unknown): T[] {
  return parsePageContainer<T>(payload)?.items ?? [];
}

async function fetchPageRows<T>(path: string, query?: Record<string, unknown>) {
  const payload = await apiClient.get<unknown>(path, query);
  return asRows<T>(payload);
}

function text(value: unknown, fallback = "-") {
  if (value === undefined || value === null || value === "") return fallback;
  return String(value);
}

function slug(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, "dan")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function reportData(
  kst: ReportKst,
  label: string,
  fileSlug: string,
  columns: ReportColumn[],
  rows: Record<string, unknown>[],
): ReportData {
  return {
    title: `Laporan ${KST_LABELS[kst]} - ${label}`,
    kstLabel: KST_LABELS[kst],
    reportLabel: label,
    fileSlug,
    columns,
    rows,
  };
}

function withNumberColumn(columns: ReportColumn[]): ReportColumn[] {
  return [{ header: "No.", value: (_row, index) => index + 1 }, ...columns];
}

function extractXlsxCellValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return text(value, "");
}

const jatikertoQuery = { year: "2026", month: "Semua Bulan", limit: 50 };

type CommodityRow = JatikertoApiRow & {
  nama?: string;
  namaKomoditas?: string;
  luasUsaha?: string;
  masaTanamBulan?: number;
  masaTanamTahun?: string;
  ketersediaanBulan?: number;
  ketersediaanTahun?: string;
  proyeksiPanen?: number;
  jumlah?: number;
  satuan?: string;
  keterangan?: string;
};

function mapPertanianRow(row: CommodityRow) {
  const luasUsaha = getNumberValue(row, 1, ["luasUsaha", "luas_usaha", "luas", "area"], Number.NaN);
  const masaTanamTahun = getNumberValue(row, 3, ["masaTanamTahun", "masa_tanam_tahun", "perTahun", "per_tahun"], Number.NaN);

  return {
    nama: getTextValue(row, 0, fieldAliases.nama, row.nama),
    proyeksiPanen: getNumberValue(row, 4, ["proyeksiPanen", "proyeksi_panen", "panen", ...fieldAliases.jumlah], row.proyeksiPanen),
    satuan: getTextValue(row, 5, ["satuan", "unit"], row.satuan),
    luasUsaha: Number.isFinite(luasUsaha) ? `${luasUsaha} m2` : row.luasUsaha,
    masaTanamBulan: getNumberValue(row, 2, ["masaTanamBulan", "masa_tanam_bulan", "bulan"], row.masaTanamBulan),
    masaTanamTahun: Number.isFinite(masaTanamTahun) ? `${masaTanamTahun} Kali` : row.masaTanamTahun,
    keterangan: getTextValue(row, 6, ["keterangan", "description", "catatan"], row.keterangan ?? "-"),
  };
}

function mapPeternakanRow(row: CommodityRow) {
  const luasUsaha = getNumberValue(row, 1, ["luasUsaha", "luas_usaha", "luas", "area"], Number.NaN);
  const ketersediaanTahun = getNumberValue(row, 3, ["ketersediaanTahun", "ketersediaan_tahun", "perTahun", "per_tahun"], Number.NaN);

  return {
    namaKomoditas: getTextValue(row, 0, fieldAliases.nama, row.namaKomoditas),
    jumlah: getNumberValue(row, 4, fieldAliases.jumlah, row.jumlah),
    satuan: getTextValue(row, 5, ["satuan", "unit"], row.satuan),
    luasUsaha: Number.isFinite(luasUsaha) ? `${luasUsaha} m2` : row.luasUsaha,
    ketersediaanBulan: getNumberValue(row, 2, ["ketersediaanBulan", "ketersediaan_bulan", "bulan"], row.ketersediaanBulan),
    ketersediaanTahun: Number.isFinite(ketersediaanTahun) ? `${ketersediaanTahun} Kali` : row.ketersediaanTahun,
    keterangan: getTextValue(row, 6, ["keterangan", "description", "catatan"], row.keterangan ?? "-"),
  };
}

type KonservasiCategory = "konservasi-hewan" | "konservasi-tumbuhan";

function mapKonservasiRow(row: CommodityRow & { foto?: string }, category: KonservasiCategory) {
  const isHewan = category === "konservasi-hewan";

  return {
    namaKomoditas: getTextValue(row, 0, fieldAliases.nama, row.namaKomoditas),
    foto: getTextValue(row, 1, ["foto", "image", "gambar", "photo", "url"], row.foto ?? ""),
    jumlah: getNumberValue(row, isHewan ? 2 : 4, fieldAliases.jumlah, row.jumlah),
    satuan: getTextValue(row, isHewan ? 3 : 5, ["satuan", "unit"], row.satuan),
    jenisKonservasi: isHewan ? "Hewan" : "Tumbuhan",
    keterangan: getTextValue(row, isHewan ? 4 : 6, ["keterangan", "description", "catatan"], row.keterangan ?? "-"),
  };
}

type MitraRow = JatikertoApiRow & {
  mitra?: string;
  bidangKerjasama?: string;
  jangkaWaktuKontrak?: string;
  tanggalMulai?: string;
  tanggalSelesai?: string;
  keterangan?: string;
};

function formatContractRange(row: MitraRow) {
  const start = formatIndonesianDate(row.tanggalMulai);
  const end = formatIndonesianDate(row.tanggalSelesai);
  if (start !== "-" && end !== "-") return `${start} - ${end}`;
  return row.jangkaWaktuKontrak || "-";
}

function getContractStatus(row: MitraRow) {
  const start = parseDate(row.tanggalMulai);
  const end = parseDate(row.tanggalSelesai);
  if (!end) return "Selesai";

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  start?.setHours(0, 0, 0, 0);

  if (end < today) return "Selesai";
  if (start && start > today) return "Aktif";

  const daysRemaining = Math.ceil((end.getTime() - today.getTime()) / 86_400_000);
  return daysRemaining <= 30 ? "Akan Berakhir" : "Aktif";
}

function mapMitraRow(row: MitraRow) {
  const mulai = getDateValue(row, 2, ["mulai", "tanggalMulai", "tanggal_mulai", "startDate", "start_date"]);
  const selesai = getDateValue(row, 3, ["selesai", "tanggalSelesai", "tanggal_selesai", "endDate", "end_date"]);
  const jangkaWaktuKontrak =
    getTextValue(row, -1, ["jangkaWaktuKontrak", "jangka_waktu_kontrak", "kontrak"], "") ||
    [mulai, selesai].filter(Boolean).join(" - ") ||
    row.jangkaWaktuKontrak;
  const [kontrakMulai, kontrakSelesai] = String(jangkaWaktuKontrak ?? "")
    .split(/\s+-\s+/)
    .map((value) => value.trim());

  const mapped = {
    mitra: getTextValue(row, 0, ["mitra", "partner", ...fieldAliases.nama], row.mitra),
    bidangKerjasama: getTextValue(row, 1, ["bidangKerjasama", "bidang_kerjasama", "kerjasama", ...fieldAliases.status], row.bidangKerjasama),
    jangkaWaktuKontrak,
    tanggalMulai: mulai || kontrakMulai,
    tanggalSelesai: selesai || kontrakSelesai,
    keterangan: getTextValue(row, 4, ["keterangan", "description", "catatan"], row.keterangan ?? "-"),
  };

  return { ...mapped, status: getContractStatus(mapped) };
}

type MahasiswaRow = JatikertoApiRow & {
  namaMahasiswa?: string;
  dosenPembimbing?: string;
  programStudi?: string;
  mulai?: string;
  selesai?: string;
  luasan?: string;
  judulPenelitian?: string;
};

function getResearchStatus(row: MahasiswaRow) {
  const start = parseDate(row.mulai);
  const end = parseDate(row.selesai);
  if (!start || !end) return "-";

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  if (start > today) return "Akan Dimulai";
  if (end < today) return "Selesai";
  return "Aktif";
}

function mapMahasiswaRow(row: MahasiswaRow) {
  const luasan = getNumberValue(row, 5, ["luasan", "luas", "area"], Number.NaN);
  const mapped = {
    namaMahasiswa: getTextValue(row, 0, ["namaMahasiswa", "nama_mahasiswa", "mahasiswa", ...fieldAliases.nama], row.namaMahasiswa),
    dosenPembimbing: getTextValue(row, 1, ["dosenPembimbing", "dosen_pembimbing", "dosen", "pembimbing"], row.dosenPembimbing),
    programStudi: getTextValue(row, 2, ["programStudi", "program_studi", "prodi"], row.programStudi),
    mulai: getDateValue(row, 3, ["mulai", "tanggalMulai", "tanggal_mulai", "startDate", "start_date"], row.mulai),
    selesai: getDateValue(row, 4, ["selesai", "tanggalSelesai", "tanggal_selesai", "endDate", "end_date"], row.selesai),
    luasan: Number.isFinite(luasan) ? `${luasan} m2` : row.luasan,
    judulPenelitian: getTextValue(row, 6, ["judulPenelitian", "judul_penelitian", "penelitian", ...fieldAliases.nama], row.judulPenelitian),
  };

  return { ...mapped, status: getResearchStatus(mapped) };
}

const DOMAIN_LABELS: Record<string, string> = {
  technology: "Technology",
  agriculture: "Agritech",
  energy: "Energy",
  sustainability: "Sustainability",
  herbal: "Jamu & Atsiri",
  fisheries: "Perikanan Air Tawar",
  aquaculture: "Perikanan Air Tawar",
  waste: "Pengolahan Limbah",
  other: "Other",
};

const TRL_STATUS: Record<number, string> = {
  1: "Basic Research",
  2: "Concept Formulation",
  3: "Proof of Concept",
  4: "Lab Validation",
  5: "Technology Validation",
  6: "Prototype Testing",
  7: "Demonstration Stage",
  8: "System Complete",
  9: "Market Ready",
};

function domainLabel(variant: string) {
  const key = variant.toLowerCase().trim();
  if (DOMAIN_LABELS[key]) return DOMAIN_LABELS[key];
  return key ? key.charAt(0).toUpperCase() + key.slice(1) : "";
}

function resolveDomain(domainRaw: unknown, variants: Map<number, string>) {
  if (domainRaw === undefined || domainRaw === null || domainRaw === "") return "";
  const variantIndex = fieldNumber({ value: domainRaw }, ["value"]);
  if (variantIndex !== null && variants.has(variantIndex)) return domainLabel(variants.get(variantIndex)!);
  if (typeof domainRaw === "string") return domainLabel(domainRaw);
  return String(domainRaw);
}

function normalizeInovasiRows(rows: unknown[], contractPayload: unknown) {
  const nameIdx = getContractColumnIndex(contractPayload, ["nama proyek", "judul", "project", "proyek"]) ?? 0;
  const leadIdx = getContractColumnIndex(contractPayload, ["kepala riset", "peneliti utama", "peneliti", "researcher"]) ?? 1;
  const domainIdx = getContractColumnIndex(contractPayload, ["domain", "kategori", "field", "bidang", "category"]) ?? 2;
  const trlIdx = getContractColumnIndex(contractPayload, ["trl level", "trl", "trl status", "status trl"]) ?? 3;
  const domainVariants = getContractColumnVariants(contractPayload, ["domain", "kategori", "category"]);

  return rows.map((row) => {
    const record = isRecord(row) ? row : {};
    const trlRaw = fieldValue(record, ["trlLevel", "trl_level", "trl", "trlLevelValue", "trlStatus", "trl_status"]) ?? colValue(record, trlIdx);
    const trlLevel = fieldNumber({ value: trlRaw }, ["value"]);
    const domainRaw = fieldValue(record, ["domain", "category", "kategori", "bidang"]) ?? colValue(record, domainIdx);

    return {
      namaProyek: textOrFallback(fieldValue(record, ["namaProyek", "nama_proyek", "projectName", "project_name", "judul", "name"]) ?? colValue(record, nameIdx)),
      kepalaRiset: textOrFallback(fieldValue(record, ["kepalaRiset", "kepala_riset", "leadResearcher", "lead_researcher", "peneliti"]) ?? colValue(record, leadIdx)),
      domain: resolveDomain(domainRaw, domainVariants) || DATA_EMPTY_TEXT,
      trlLevel: trlLevel === null ? DATA_EMPTY_TEXT : `TRL ${trlLevel}`,
      trlStatus:
        trlLevel === null
          ? DATA_EMPTY_TEXT
          : TRL_STATUS[trlLevel] ??
            textOrFallback(fieldValue(record, ["trlLabel", "trl_label", "trlStatus", "trl_status", "status"]), "Status belum tersedia"),
    };
  });
}

function resolveVariantText(value: unknown, variants: Map<number, string>) {
  const variantIndex = fieldNumber({ value }, ["value"]);
  if (variantIndex !== null && variants.has(variantIndex)) return variants.get(variantIndex)!;
  return textOrFallback(value, DATA_EMPTY_TEXT);
}

function resolveTrend(value: unknown, variants: Map<number, string>) {
  const textValue = resolveVariantText(value, variants).toLowerCase().trim();
  if (["up", "naik", "increase", "meningkat"].includes(textValue)) return "Naik";
  if (["down", "turun", "decrease", "menurun"].includes(textValue)) return "Turun";
  if (["stable", "stabil", "normal"].includes(textValue)) return "Stabil";
  return DATA_EMPTY_TEXT;
}

function normalizeSensorRows(rows: unknown[], contractPayload: unknown) {
  const lokasiIdx = getContractColumnIndex(contractPayload, ["lokasi sensor", "lokasi", "location"]) ?? 0;
  const tipeIdx = getContractColumnIndex(contractPayload, ["tipe", "type"]) ?? 1;
  const bacaIdx = getContractColumnIndex(contractPayload, ["baca", "reading", "value"]) ?? 2;
  const statusIdx = getContractColumnIndex(contractPayload, ["status"]) ?? 3;
  const trenIdx = getContractColumnIndex(contractPayload, ["tren", "trend"]) ?? 4;
  const statusVariants = getContractColumnVariants(contractPayload, ["status"]);
  const trendVariants = getContractColumnVariants(contractPayload, ["tren", "trend"]);

  return rows.map((row) => {
    const record = isRecord(row) ? row : {};
    return {
      lokasi: textOrFallback(fieldValue(record, ["lokasi", "location", "sensorLocation", "sensor_location"]) ?? colValue(record, lokasiIdx)),
      tipe: textOrFallback(fieldValue(record, ["tipe", "type", "sensorType", "sensor_type"]) ?? colValue(record, tipeIdx)),
      baca: textOrFallback(fieldValue(record, ["baca", "reading", "value", "currentValue", "current_value"]) ?? colValue(record, bacaIdx)),
      status: resolveVariantText(fieldValue(record, ["status"]) ?? colValue(record, statusIdx), statusVariants),
      tren: resolveTrend(fieldValue(record, ["tren", "trend"]) ?? colValue(record, trenIdx), trendVariants),
    };
  });
}

export const REPORT_DEFINITIONS: ReportDefinition[] = [
  {
    id: "pertanian",
    kst: "jatikerto",
    label: "Pertanian",
    fileSlug: "pertanian",
    load: async () => {
      const rows = (await fetchPageRows<CommodityRow>(API_ENDPOINTS.kst.jatikerto.pertanianItems, jatikertoQuery)).map(mapPertanianRow);
      return reportData(
        "jatikerto",
        "Pertanian",
        "pertanian",
        withNumberColumn([
          { header: "Komoditas", value: (row) => row.nama },
          { header: "Proyeksi Panen", value: (row) => formatQuantity(row.proyeksiPanen as number, row.satuan as string) },
          { header: "Luas Usaha", value: (row) => formatArea(row.luasUsaha as string) },
          { header: "Masa Tanam Bulan", value: (row) => `${formatNumber(row.masaTanamBulan as number)} Bulan` },
          { header: "Masa Tanam Tahun", value: (row) => formatFrequency(row.masaTanamTahun as string) },
          { header: "Keterangan", value: (row) => row.keterangan },
        ]),
        rows,
      );
    },
  },
  {
    id: "peternakan",
    kst: "jatikerto",
    label: "Peternakan",
    fileSlug: "peternakan",
    load: async () => {
      const rows = (await fetchPageRows<CommodityRow>(API_ENDPOINTS.kst.jatikerto.peternakanItems, jatikertoQuery)).map(mapPeternakanRow);
      return reportData(
        "jatikerto",
        "Peternakan",
        "peternakan",
        withNumberColumn([
          { header: "Komoditas Ternak", value: (row) => row.namaKomoditas },
          { header: "Populasi", value: (row) => formatQuantity(row.jumlah as number, row.satuan as string) },
          { header: "Luas Usaha", value: (row) => formatArea(row.luasUsaha as string) },
          { header: "Ketersediaan Bulan", value: (row) => `${formatNumber(row.ketersediaanBulan as number)} Bulan` },
          { header: "Ketersediaan Tahun", value: (row) => formatFrequency(row.ketersediaanTahun as string) },
          { header: "Keterangan", value: (row) => row.keterangan },
        ]),
        rows,
      );
    },
  },
  {
    id: "konservasi",
    kst: "jatikerto",
    label: "Konservasi",
    fileSlug: "konservasi",
    load: async () => {
      const [hewanRows, tanamanRows] = await Promise.all([
        fetchPageRows<CommodityRow & { foto?: string }>(API_ENDPOINTS.kst.jatikerto.konservasiHewan, jatikertoQuery),
        fetchPageRows<CommodityRow & { foto?: string }>(API_ENDPOINTS.kst.jatikerto.konservasiTanaman, jatikertoQuery),
      ]);
      const rows = [
        ...hewanRows.map((row) => mapKonservasiRow(row, "konservasi-hewan")),
        ...tanamanRows.map((row) => mapKonservasiRow(row, "konservasi-tumbuhan")),
      ];
      return reportData(
        "jatikerto",
        "Konservasi",
        "konservasi",
        withNumberColumn([
          { header: "Nama Komoditas", value: (row) => row.namaKomoditas },
          { header: "Foto", value: (row) => row.foto },
          { header: "Jumlah", value: (row) => row.jumlah ? `${formatNumber(row.jumlah as number)} ${text(row.satuan, "")}` : "-" },
          { header: "Jenis Konservasi", value: (row) => row.jenisKonservasi },
          { header: "Keterangan", value: (row) => row.keterangan },
        ]),
        rows,
      );
    },
  },
  {
    id: "pelayanan-akademik",
    kst: "jatikerto",
    label: "Pelayanan Akademik",
    fileSlug: "pelayanan-akademik",
    load: async () => {
      const rows = (await fetchPageRows<MahasiswaRow>(API_ENDPOINTS.kst.jatikerto.akademikItems, jatikertoQuery)).map(mapMahasiswaRow);
      return reportData(
        "jatikerto",
        "Pelayanan Akademik",
        "pelayanan-akademik",
        withNumberColumn([
          { header: "Nama Mahasiswa", value: (row) => row.namaMahasiswa },
          { header: "Dosen Pembimbing", value: (row) => row.dosenPembimbing },
          { header: "Program Studi", value: (row) => normalizeProgramStudi(row.programStudi) || "-" },
          { header: "Mulai", value: (row) => formatIndonesianDate(row.mulai as string) },
          { header: "Selesai", value: (row) => formatIndonesianDate(row.selesai as string) },
          { header: "Status", value: (row) => row.status },
          { header: "Luasan", value: (row) => formatArea(row.luasan as string) },
          { header: "Judul Penelitian", value: (row) => row.judulPenelitian },
        ]),
        rows,
      );
    },
  },
  {
    id: "kemitraan",
    kst: "jatikerto",
    label: "Kemitraan",
    fileSlug: "kemitraan",
    load: async () => {
      const rows = (await fetchPageRows<MitraRow>(API_ENDPOINTS.kst.jatikerto.kemitraanItems, jatikertoQuery)).map(mapMitraRow);
      return reportData(
        "jatikerto",
        "Kemitraan",
        "kemitraan",
        withNumberColumn([
          { header: "Mitra", value: (row) => row.mitra },
          { header: "Bidang Kerjasama", value: (row) => row.bidangKerjasama },
          { header: "Jangka Waktu Kontrak", value: (row) => formatContractRange(row as MitraRow) },
          { header: "Status", value: (row) => row.status },
          { header: "Keterangan", value: (row) => row.keterangan },
        ]),
        rows,
      );
    },
  },
  {
    id: "stok-opname",
    kst: "cangar",
    label: "Stok Opname",
    fileSlug: "stok-opname",
    load: async () => {
      const [stokPayload, itemsPayload] = await Promise.all([
        apiClient.get<unknown>(API_ENDPOINTS.kst.cangar.stock, { limit: 100 }),
        apiClient.get<unknown>(API_ENDPOINTS.kst.cangar.stockItems, { limit: 100 }),
      ]);
      const stokRows = adaptStockRows(stokPayload);
      const itemRows = adaptStockRows(itemsPayload);
      const byName = new Map(stokRows.map((row) => [row.namaBarang.toLowerCase(), row]));
      for (const row of itemRows) {
        if (!byName.has(row.namaBarang.toLowerCase())) byName.set(row.namaBarang.toLowerCase(), row);
      }
      const rows = Array.from(byName.values()) as unknown as Record<string, unknown>[];
      return reportData(
        "cangar",
        "Stok Opname",
        "stok-opname",
        withNumberColumn([
          { header: "Nama Barang", value: (row) => row.namaBarang },
          { header: "Satuan", value: (row) => row.satuan },
          { header: "Total Masuk", value: (row) => `+${Number(row.totalMasuk ?? 0).toLocaleString("id-ID")}` },
          { header: "Total Keluar", value: (row) => `-${Number(row.totalKeluar ?? 0).toLocaleString("id-ID")}` },
          { header: "Total Retur", value: (row) => row.totalRetur },
          { header: "Stok Sistem", value: (row) => `${Number(row.stokSistem ?? 0).toLocaleString("id-ID")} ${text(row.satuan, "")}` },
          { header: "Stok Fisik Terakhir", value: (row) => row.stokFisikTerakhir },
          { header: "Selisih Terakhir", value: (row) => row.selisihTerakhir },
          { header: "Status Opname", value: (row) => row.statusOpname },
          { header: "Periode", value: (row) => row.periode },
        ]),
        rows,
      );
    },
  },
  {
    id: "booking-atp",
    kst: "cangar",
    label: "Booking/Reservasi ATP",
    fileSlug: "booking-reservasi-atp",
    load: async () => {
      const payload = await apiClient.get<unknown>(API_ENDPOINTS.kst.cangar.booking, { limit: 100 });
      const rows = adaptBookingRows(payload) as unknown as Record<string, unknown>[];
      return reportData(
        "cangar",
        "Booking/Reservasi ATP",
        "booking-reservasi-atp",
        withNumberColumn([
          { header: "ID", value: (row) => `#${text(row.id)}` },
          { header: "Nama Customer", value: (row) => row.namaCustomer },
          { header: "No. HP", value: (row) => row.noHp },
          { header: "Layanan", value: (row) => row.layanan },
          { header: "Tanggal", value: (row) => row.tanggal },
          { header: "Jumlah", value: (row) => row.jumlah },
          { header: "Status", value: (row) => row.status },
        ]),
        rows,
      );
    },
  },
  {
    id: "keuangan",
    kst: "cangar",
    label: "Keuangan",
    fileSlug: "keuangan",
    load: async () => {
      const payload = await apiClient.get<unknown>(API_ENDPOINTS.kst.cangar.finance, { limit: 100 });
      const rows = adaptFinanceRows(payload) as unknown as Record<string, unknown>[];
      return reportData(
        "cangar",
        "Keuangan",
        "keuangan",
        withNumberColumn([
          { header: "ID", value: (row) => `#${text(row.id)}` },
          { header: "Tanggal", value: (row) => row.tanggal },
          { header: "Jenis", value: (row) => row.jenis },
          { header: "Kategori", value: (row) => row.kategori },
          { header: "Nominal", value: (row) => formatRupiah(row.nominal) },
          { header: "Keterangan", value: (row) => row.keterangan },
          { header: "Status", value: (row) => row.status },
        ]),
        rows,
      );
    },
  },
  {
    id: "penelitian",
    kst: "ngijo",
    label: "Tracker Inovasi/Penelitian",
    fileSlug: "penelitian",
    load: async () => {
      const [rowsPayload, contractPayload] = await Promise.all([
        apiClient.get<unknown>(API_ENDPOINTS.kst.ngijo.activeResearch, { offset: 0, limit: 50 }),
        apiClient.get<unknown>(API_ENDPOINTS.kst.ngijo.contract),
      ]);
      const rows = normalizeInovasiRows(asRows<unknown>(rowsPayload), contractPayload);
      return reportData(
        "ngijo",
        "Tracker Inovasi/Penelitian",
        "penelitian",
        withNumberColumn([
          { header: "Nama Proyek", value: (row) => row.namaProyek },
          { header: "Kepala Riset", value: (row) => row.kepalaRiset },
          { header: "Domain", value: (row) => row.domain },
          { header: "TRL Level", value: (row) => row.trlLevel },
          { header: "TRL Status", value: (row) => row.trlStatus },
        ]),
        rows,
      );
    },
  },
  {
    id: "sensor-monitoring",
    kst: "ngijo",
    label: "Sensor/Monitoring",
    fileSlug: "sensor-monitoring",
    load: async () => {
      const [rowsPayload, contractPayload] = await Promise.all([
        apiClient.get<unknown>(API_ENDPOINTS.kst.ngijo.sensorFeed, { offset: 0, limit: 50, sort_col: -1 }),
        apiClient.get<unknown>(API_ENDPOINTS.kst.ngijo.contract),
      ]);
      const rows = normalizeSensorRows(asRows<unknown>(rowsPayload), contractPayload);
      return reportData(
        "ngijo",
        "Sensor/Monitoring",
        "sensor-monitoring",
        withNumberColumn([
          { header: "Lokasi Sensor", value: (row) => row.lokasi },
          { header: "Tipe", value: (row) => row.tipe },
          { header: "Baca", value: (row) => row.baca },
          { header: "Status", value: (row) => row.status },
          { header: "Tren", value: (row) => row.tren },
        ]),
        rows,
      );
    },
  },
];

export function reportDefinitionsByKst(kst: ReportKst) {
  return REPORT_DEFINITIONS.filter((report) => report.kst === kst);
}

export function findReportDefinition(kst: ReportKst, reportId: string) {
  return REPORT_DEFINITIONS.find((report) => report.kst === kst && report.id === reportId);
}

function buildRows(data: ReportData) {
  if (data.rows.length === 0) {
    return [data.columns.map((column) => column.header), ["Data belum tersedia"]];
  }

  return [
    data.columns.map((column) => column.header),
    ...data.rows.map((row, index) =>
      data.columns.map((column) => text(column.value(row, index))),
    ),
  ];
}

function csvEscape(value: unknown) {
  const normalized = text(value, "");
  return /[",\r\n]/.test(normalized) ? `"${normalized.replace(/"/g, '""')}"` : normalized;
}

function buildCsv(data: ReportData) {
  const rows = buildRows(data).map((row) => row.map(csvEscape).join(",")).join("\r\n");
  return new Blob([`\uFEFF${rows}`], { type: "text/csv;charset=utf-8" });
}

function escapeXml(value: unknown) {
  return text(value, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function columnName(index: number) {
  let name = "";
  let value = index + 1;
  while (value > 0) {
    const remainder = (value - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    value = Math.floor((value - 1) / 26);
  }
  return name;
}

function sheetXml(data: ReportData) {
  const rows = buildRows(data);
  const sheetRows = rows
    .map((row, rowIndex) => {
      const cells = row
        .map((value, cellIndex) => {
          const ref = `${columnName(cellIndex)}${rowIndex + 1}`;
          const normalized = extractXlsxCellValue(value);
          if (typeof normalized === "number") {
            return `<c r="${ref}"><v>${normalized}</v></c>`;
          }
          return `<c r="${ref}" t="inlineStr"><is><t>${escapeXml(normalized)}</t></is></c>`;
        })
        .join("");
      return `<row r="${rowIndex + 1}">${cells}</row>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheetRows}</sheetData></worksheet>`;
}

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let i = 0; i < 8; i += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function writeUint16(target: number[], value: number) {
  target.push(value & 0xff, (value >>> 8) & 0xff);
}

function writeUint32(target: number[], value: number) {
  target.push(value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff);
}

function encodeUtf8(value: string) {
  return new TextEncoder().encode(value);
}

function zipStore(files: Array<{ path: string; content: string }>) {
  const chunks: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const name = encodeUtf8(file.path);
    const content = encodeUtf8(file.content);
    const crc = crc32(content);
    const local: number[] = [];
    writeUint32(local, 0x04034b50);
    writeUint16(local, 20);
    writeUint16(local, 0);
    writeUint16(local, 0);
    writeUint16(local, 0);
    writeUint16(local, 0);
    writeUint32(local, crc);
    writeUint32(local, content.length);
    writeUint32(local, content.length);
    writeUint16(local, name.length);
    writeUint16(local, 0);
    chunks.push(new Uint8Array(local), name, content);

    const centralHeader: number[] = [];
    writeUint32(centralHeader, 0x02014b50);
    writeUint16(centralHeader, 20);
    writeUint16(centralHeader, 20);
    writeUint16(centralHeader, 0);
    writeUint16(centralHeader, 0);
    writeUint16(centralHeader, 0);
    writeUint16(centralHeader, 0);
    writeUint32(centralHeader, crc);
    writeUint32(centralHeader, content.length);
    writeUint32(centralHeader, content.length);
    writeUint16(centralHeader, name.length);
    writeUint16(centralHeader, 0);
    writeUint16(centralHeader, 0);
    writeUint16(centralHeader, 0);
    writeUint16(centralHeader, 0);
    writeUint32(centralHeader, 0);
    writeUint32(centralHeader, offset);
    central.push(new Uint8Array(centralHeader), name);

    offset += local.length + name.length + content.length;
  }

  const centralOffset = offset;
  const centralSize = central.reduce((total, part) => total + part.length, 0);
  const end: number[] = [];
  writeUint32(end, 0x06054b50);
  writeUint16(end, 0);
  writeUint16(end, 0);
  writeUint16(end, files.length);
  writeUint16(end, files.length);
  writeUint32(end, centralSize);
  writeUint32(end, centralOffset);
  writeUint16(end, 0);

  return new Blob([...chunks, ...central, new Uint8Array(end)] as BlobPart[], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

function buildXlsx(data: ReportData) {
  return zipStore([
    {
      path: "[Content_Types].xml",
      content:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>',
    },
    {
      path: "_rels/.rels",
      content:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    },
    {
      path: "xl/workbook.xml",
      content:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Laporan" sheetId="1" r:id="rId1"/></sheets></workbook>',
    },
    {
      path: "xl/_rels/workbook.xml.rels",
      content:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>',
    },
    { path: "xl/worksheets/sheet1.xml", content: sheetXml(data) },
  ]);
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function downloadReport(definition: ReportDefinition, format: ReportFormat) {
  try {
    const data = await definition.load();
    const blob =
      format === "csv" ? buildCsv(data) :
      buildXlsx(data);
    const fileName = `laporan-${definition.kst === "jatikerto" ? "kst-jatikerto" : definition.kst === "cangar" ? "kst-cangar" : "kst-ngijo"}-${slug(definition.fileSlug)}.${format}`;
    downloadBlob(blob, fileName);
  } catch (error) {
    console.error("Report export failed", error);
    throw new Error(REPORT_ERROR_MESSAGE, { cause: error });
  }
}
