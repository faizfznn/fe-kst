import { useCallback, useMemo, useState } from "react";
import { Banknote, RotateCcw, Search, TrendingDown, TrendingUp } from "lucide-react";
import { useApiData } from "@/api/hooks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { adaptFinanceRows, adaptFinanceSummary, formatRupiah } from "../adapters";
import {
  CangarAlert,
  CangarEmptyState,
  CangarHero,
  CangarSummaryCards,
  CangarTableSkeleton,
  cangarTableHeadClass,
  cangarTableHeaderClass,
  cangarTableRowClass,
  cangarTabsListClass,
  cangarTabsTriggerClass,
  tableLoadingRow,
} from "../cangarUi";
import { cangarFriendlyMessage } from "../cangarHelpers";

const FINANCE_TABS = ["Input Transaksi", "Rekap Harian", "Rekap Mingguan", "Rekap Bulanan"];

type FinanceFilters = {
  jenis: string;
  tanggal: string;
};

const initialFilters: FinanceFilters = {
  jenis: "all",
  tanggal: "",
};

function todayString() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function currentMonthString() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function currentWeekString() {
  // Return current ISO week string in YYYY-Www format for week picker
  const d = new Date();
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

/** Parse YYYY-Www to get start (Mon) and end (Sun) dates */
function parseWeekRange(weekStr: string): { start: string; end: string } | null {
  const match = weekStr.match(/^(\d{4})-W(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const week = Number(match[2]);

  // ISO week: Jan 4 is always in week 1
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const dayOfWeek = jan4.getUTCDay() || 7;
  const monday = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() - dayOfWeek + 1 + (week - 1) * 7);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);

  const fmt = (d: Date) => {
    const yy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(d.getUTCDate()).padStart(2, "0");
    return `${yy}-${mm}-${dd}`;
  };

  return { start: fmt(monday), end: fmt(sunday) };
}

function financeStatusClass(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === "tervalidasi" || normalized === "validated") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (normalized === "draft") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  if (normalized === "rejected" || normalized === "ditolak") {
    return "border-red-200 bg-red-50 text-red-700";
  }
  return "border-gray-200 bg-gray-50 text-gray-700";
}

export default function KeuanganCangar() {
  // --- Input Transaksi tab state ---
  const [draftFilters, setDraftFilters] = useState<FinanceFilters>(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState<FinanceFilters>(initialFilters);

  // --- Rekap Harian state ---
  const [rekapHarianDate, setRekapHarianDate] = useState(todayString());
  const [appliedHarianDate, setAppliedHarianDate] = useState(todayString());

  // --- Rekap Mingguan state ---
  const [rekapMingguanWeek, setRekapMingguanWeek] = useState(currentWeekString());
  const [appliedMingguanWeek, setAppliedMingguanWeek] = useState(currentWeekString());

  // --- Rekap Bulanan state ---
  const [rekapBulananMonth, setRekapBulananMonth] = useState(currentMonthString());
  const [appliedBulananMonth, setAppliedBulananMonth] = useState(currentMonthString());

  // --- Main finance data (for Input Transaksi tab) ---
  const {
    data: keuanganPayload,
    isLoading,
    error: keuanganError,
  } = useApiData<unknown>("/api/kst/cangar/data/keuangan", { limit: 100 });

  // --- Rekap endpoint (for Input Transaksi summary cards) ---
  const { data: rekapPayload, error: rekapError } = useApiData<unknown>(
    "/api/kst/cangar/data/keuangan/rekap",
    appliedFilters.tanggal ? { tanggal: appliedFilters.tanggal } : undefined,
  );

  // --- Rekap Harian data ---
  const {
    data: rekapHarianPayload,
    isLoading: isLoadingHarian,
    error: harianError,
  } = useApiData<unknown>("/api/kst/cangar/data/keuangan", { tanggal: appliedHarianDate });

  // --- Rekap Mingguan data ---
  const mingguanRange = useMemo(() => parseWeekRange(appliedMingguanWeek), [appliedMingguanWeek]);
  const {
    data: rekapMingguanPayload,
    isLoading: isLoadingMingguan,
    error: mingguanError,
  } = useApiData<unknown>(
    "/api/kst/cangar/data/keuangan",
    { week: appliedMingguanWeek },
  );

  // --- Rekap Bulanan data ---
  const {
    data: rekapBulananPayload,
    isLoading: isLoadingBulanan,
    error: bulananError,
  } = useApiData<unknown>("/api/kst/cangar/data/keuangan", { month: appliedBulananMonth });

  // --- Input Transaksi rows ---
  const rows = useMemo(() => adaptFinanceRows(keuanganPayload), [keuanganPayload]);
  const filteredRows = useMemo(
    () =>
      rows.filter((row) => {
        const jenisMatches =
          appliedFilters.jenis === "all" ||
          row.jenis.toLowerCase() === appliedFilters.jenis.toLowerCase();
        const tanggalMatches =
          !appliedFilters.tanggal || row.tanggalRaw === appliedFilters.tanggal;

        return jenisMatches && tanggalMatches;
      }),
    [rows, appliedFilters],
  );
  const summary = useMemo(() => adaptFinanceSummary(rekapPayload, filteredRows), [rekapPayload, filteredRows]);

  // --- Rekap Harian rows & summary ---
  const harianRows = useMemo(() => adaptFinanceRows(rekapHarianPayload), [rekapHarianPayload]);
  const harianFilteredRows = useMemo(
    () => (appliedHarianDate ? harianRows.filter((r) => r.tanggalRaw === appliedHarianDate) : harianRows),
    [harianRows, appliedHarianDate],
  );
  // Fallback: if backend returned no data for the date filter, try filtering from all rows
  const harianDisplayRows = useMemo(
    () => (harianFilteredRows.length > 0 ? harianFilteredRows : rows.filter((r) => r.tanggalRaw === appliedHarianDate)),
    [harianFilteredRows, rows, appliedHarianDate],
  );
  const harianSummary = useMemo(() => {
    const pemasukan = harianDisplayRows
      .filter((r) => r.jenis === "Pemasukan")
      .reduce((sum, r) => sum + r.nominal, 0);
    const pengeluaran = harianDisplayRows
      .filter((r) => r.jenis === "Pengeluaran")
      .reduce((sum, r) => sum + r.nominal, 0);
    return { pemasukan, pengeluaran, saldo: pemasukan - pengeluaran };
  }, [harianDisplayRows]);

  // --- Rekap Mingguan rows & summary ---
  const mingguanRows = useMemo(() => adaptFinanceRows(rekapMingguanPayload), [rekapMingguanPayload]);
  const mingguanFilteredRows = useMemo(() => {
    if (!mingguanRange) return mingguanRows;
    const rowsInSelectedWeek = mingguanRows.filter(
      (r) => r.tanggalRaw >= mingguanRange.start && r.tanggalRaw <= mingguanRange.end,
    );
    return rowsInSelectedWeek.length > 0
      ? rowsInSelectedWeek
      : rows.filter((r) => r.tanggalRaw >= mingguanRange.start && r.tanggalRaw <= mingguanRange.end);
  }, [mingguanRows, rows, mingguanRange]);
  const mingguanSummary = useMemo(() => {
    const pemasukan = mingguanFilteredRows
      .filter((r) => r.jenis === "Pemasukan")
      .reduce((sum, r) => sum + r.nominal, 0);
    const pengeluaran = mingguanFilteredRows
      .filter((r) => r.jenis === "Pengeluaran")
      .reduce((sum, r) => sum + r.nominal, 0);
    return { pemasukan, pengeluaran, saldo: pemasukan - pengeluaran };
  }, [mingguanFilteredRows]);

  // --- Rekap Bulanan rows & summary ---
  const bulananRows = useMemo(() => adaptFinanceRows(rekapBulananPayload), [rekapBulananPayload]);
  const bulananFilteredRows = useMemo(() => {
    if (!appliedBulananMonth) return bulananRows;
    return bulananRows.length > 0
      ? bulananRows
      : rows.filter((r) => r.tanggalRaw.startsWith(appliedBulananMonth));
  }, [bulananRows, rows, appliedBulananMonth]);
  const bulananSummary = useMemo(() => {
    const pemasukan = bulananFilteredRows
      .filter((r) => r.jenis === "Pemasukan")
      .reduce((sum, r) => sum + r.nominal, 0);
    const pengeluaran = bulananFilteredRows
      .filter((r) => r.jenis === "Pengeluaran")
      .reduce((sum, r) => sum + r.nominal, 0);
    return { pemasukan, pengeluaran, saldo: pemasukan - pengeluaran };
  }, [bulananFilteredRows]);

  const handleReset = useCallback(() => {
    setDraftFilters(initialFilters);
    setAppliedFilters(initialFilters);
  }, []);

  const hasAnyError = keuanganError || rekapError || harianError || mingguanError || bulananError;

  return (
    <div className="flex min-h-screen flex-col gap-5 bg-gray-50/50 p-4 md:p-6">
      <CangarHero
        title="Dashboard Revenue dan Keuangan"
        description="Pemantauan pemasukan, pengeluaran, saldo, dan rekap transaksi layanan wisata serta edukasi KST Cangar."
        badges={["Revenue", "Reservasi", "Operasional"]}
        metric={{ label: "Saldo Hari Ini", value: formatRupiah(summary.saldoHariIni) }}
      />
      {hasAnyError ? (
        <CangarAlert>
          {cangarFriendlyMessage(hasAnyError)}
        </CangarAlert>
      ) : null}
      <CangarSummaryCards
        items={[
          { label: "Pemasukan Hari Ini", value: formatRupiah(summary.pemasukanHariIni), icon: TrendingUp, helper: "Total transaksi masuk", tone: "green" },
          { label: "Pengeluaran Hari Ini", value: formatRupiah(summary.pengeluaranHariIni), icon: TrendingDown, helper: "Total transaksi keluar", tone: "red" },
          { label: "Saldo Hari Ini", value: formatRupiah(summary.saldoHariIni), icon: Banknote, helper: "Selisih pemasukan dan pengeluaran" },
          { label: "Total Transaksi", value: filteredRows.length, icon: Banknote, helper: "Transaksi sesuai filter aktif", tone: "blue" },
        ]}
      />
      <Tabs defaultValue="Input Transaksi" className="gap-4">
        <div className="overflow-x-auto pb-1">
          <TabsList className={cangarTabsListClass}>
            {FINANCE_TABS.map((tab) => (
              <TabsTrigger key={tab} value={tab} className={cangarTabsTriggerClass}>
                {tab}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* ==================== INPUT TRANSAKSI ==================== */}
        <TabsContent value="Input Transaksi" className="space-y-4">
          <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm xl:flex-row xl:items-end xl:justify-between">
            <div className="grid flex-1 grid-cols-1 gap-3 md:grid-cols-2">
              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-gray-600">Jenis</span>
                <Select
                  value={draftFilters.jenis}
                  onValueChange={(jenis) => setDraftFilters((current) => ({ ...current, jenis }))}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Jenis</SelectItem>
                    <SelectItem value="pemasukan">Pemasukan</SelectItem>
                    <SelectItem value="pengeluaran">Pengeluaran</SelectItem>
                  </SelectContent>
                </Select>
              </label>

              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-gray-600">Tanggal</span>
                <Input
                  type="date"
                  value={draftFilters.tanggal}
                  onChange={(event) =>
                    setDraftFilters((current) => ({ ...current, tanggal: event.target.value }))
                  }
                  className="bg-white"
                />
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                className="gap-2 bg-[#27A376] text-white hover:bg-[#1f8a63]"
                onClick={() => setAppliedFilters(draftFilters)}
              >
                <Search className="size-4" />
                Filter
              </Button>
              <Button type="button" variant="outline" className="gap-2" onClick={handleReset}>
                <RotateCcw className="size-4" />
                Reset
              </Button>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <Table className="min-w-[920px] table-fixed">
                <TableHeader>
                  <TableRow className={cangarTableHeaderClass}>
                    <TableHead className={`${cangarTableHeadClass} w-[80px] text-center`}>ID</TableHead>
                    <TableHead className={`${cangarTableHeadClass} w-[15%]`}>Tanggal</TableHead>
                    <TableHead className={`${cangarTableHeadClass} w-[14%]`}>Jenis</TableHead>
                    <TableHead className={`${cangarTableHeadClass} w-[16%]`}>Kategori</TableHead>
                    <TableHead className={`${cangarTableHeadClass} w-[16%] text-center`}>Nominal</TableHead>
                    <TableHead className={`${cangarTableHeadClass} w-[26%]`}>Keterangan</TableHead>
                    <TableHead className={`${cangarTableHeadClass} w-[14%]`}>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    tableLoadingRow(7)
                  ) : filteredRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="p-5">
                        <CangarEmptyState title="Belum ada data yang dapat ditampilkan" description="Data keuangan Cangar akan tampil setelah tersedia atau filter diubah." />
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRows.map((row) => (
                      <TableRow key={row.id} className={cangarTableRowClass}>
                        <TableCell className="text-center font-semibold text-gray-900">#{row.id}</TableCell>
                        <TableCell className="whitespace-normal break-words text-gray-600">{row.tanggal || "Belum tersedia"}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn(
                              "rounded-md",
                              row.jenis === "Pemasukan"
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : row.jenis === "Pengeluaran"
                                  ? "border-red-200 bg-red-50 text-red-700"
                                  : "border-gray-200 bg-gray-50 text-gray-700",
                            )}
                          >
                            {row.jenis}
                          </Badge>
                        </TableCell>
                        <TableCell className="whitespace-normal break-words text-gray-600">{row.kategori || "Belum tersedia"}</TableCell>
                        <TableCell className="text-center font-semibold text-gray-900 tabular-nums">
                          {formatRupiah(row.nominal)}
                        </TableCell>
                        <TableCell className="whitespace-normal break-words text-gray-600">
                          {row.keterangan || "Belum tersedia"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn("rounded-md", financeStatusClass(row.status))}>
                            {row.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        {/* ==================== REKAP HARIAN ==================== */}
        <TabsContent value="Rekap Harian" className="space-y-4">
          {/* Date picker */}
          <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-end">
            <label className="space-y-1.5">
              <span className="text-sm font-semibold text-gray-700">Tanggal:</span>
              <Input
                type="date"
                value={rekapHarianDate}
                onChange={(e) => setRekapHarianDate(e.target.value)}
                className="w-full bg-white sm:w-56"
              />
            </label>
            <Button
              type="button"
              className="gap-2 bg-[#27A376] text-white hover:bg-[#1f8a63]"
              onClick={() => setAppliedHarianDate(rekapHarianDate)}
            >
              <Search className="size-4" />
              Tampilkan
            </Button>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card className="rounded-lg border-gray-200 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-semibold text-gray-600">Total Pemasukan</CardTitle>
                <TrendingUp className="size-4 text-emerald-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-700">{formatRupiah(harianSummary.pemasukan)}</div>
              </CardContent>
            </Card>
            <Card className="rounded-lg border-gray-200 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-semibold text-gray-600">Total Pengeluaran</CardTitle>
                <TrendingDown className="size-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-700">{formatRupiah(harianSummary.pengeluaran)}</div>
              </CardContent>
            </Card>
            <Card className="rounded-lg border-gray-200 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-semibold text-gray-600">Saldo Bersih</CardTitle>
                <Banknote className="size-4 text-gray-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{formatRupiah(harianSummary.saldo)}</div>
              </CardContent>
            </Card>
          </div>

          {/* Transaction detail table */}
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <Table className="min-w-[980px]">
                <TableHeader>
                  <TableRow className={cangarTableHeaderClass}>
                    <TableHead className={`${cangarTableHeadClass} min-w-[80px] text-center`}>ID</TableHead>
                    <TableHead className={`${cangarTableHeadClass} min-w-[150px]`}>Tanggal</TableHead>
                    <TableHead className={`${cangarTableHeadClass} min-w-[130px]`}>Jenis</TableHead>
                    <TableHead className={`${cangarTableHeadClass} min-w-[160px]`}>Kategori</TableHead>
                    <TableHead className={`${cangarTableHeadClass} min-w-[150px] text-center`}>Nominal</TableHead>
                    <TableHead className={`${cangarTableHeadClass} min-w-[240px]`}>Keterangan</TableHead>
                    <TableHead className={`${cangarTableHeadClass} min-w-[130px]`}>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingHarian ? (
                    tableLoadingRow(7)
                  ) : harianDisplayRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="p-5">
                        <CangarEmptyState title="Data belum tersedia" description="Belum ada data yang dapat ditampilkan untuk tanggal ini." />
                      </TableCell>
                    </TableRow>
                  ) : (
                    harianDisplayRows.map((row) => (
                      <TableRow key={row.id} className={cangarTableRowClass}>
                        <TableCell className="text-center font-semibold text-gray-900">#{row.id}</TableCell>
                        <TableCell className="text-gray-600">{row.tanggal}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn(
                              "rounded-md",
                              row.jenis === "Pemasukan"
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : row.jenis === "Pengeluaran"
                                  ? "border-red-200 bg-red-50 text-red-700"
                                  : "border-gray-200 bg-gray-50 text-gray-700",
                            )}
                          >
                            {row.jenis}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-gray-600">{row.kategori}</TableCell>
                        <TableCell className="text-center font-semibold text-gray-900 tabular-nums">
                          {formatRupiah(row.nominal)}
                        </TableCell>
                        <TableCell className="max-w-[260px] whitespace-normal break-words text-gray-600">
                          {row.keterangan}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn("rounded-md", financeStatusClass(row.status))}>
                            {row.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        {/* ==================== REKAP MINGGUAN ==================== */}
        <TabsContent value="Rekap Mingguan" className="space-y-4">
          {/* Week picker */}
          <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-end">
            <label className="space-y-1.5">
              <span className="text-sm font-semibold text-gray-700">Minggu:</span>
              <Input
                type="week"
                value={rekapMingguanWeek}
                onChange={(e) => setRekapMingguanWeek(e.target.value)}
                className="w-full bg-white sm:w-56"
              />
            </label>
            <Button
              type="button"
              className="gap-2 bg-[#27A376] text-white hover:bg-[#1f8a63]"
              onClick={() => setAppliedMingguanWeek(rekapMingguanWeek)}
            >
              <Search className="size-4" />
              Tampilkan
            </Button>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card className="rounded-lg border-gray-200 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-semibold text-gray-600">Total Pemasukan Minggu Ini</CardTitle>
                <TrendingUp className="size-4 text-emerald-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-700">{formatRupiah(mingguanSummary.pemasukan)}</div>
              </CardContent>
            </Card>
            <Card className="rounded-lg border-gray-200 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-semibold text-gray-600">Total Pengeluaran Minggu Ini</CardTitle>
                <TrendingDown className="size-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-700">{formatRupiah(mingguanSummary.pengeluaran)}</div>
              </CardContent>
            </Card>
            <Card className="rounded-lg border-gray-200 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-semibold text-gray-600">Saldo Bersih</CardTitle>
                <Banknote className="size-4 text-gray-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{formatRupiah(mingguanSummary.saldo)}</div>
              </CardContent>
            </Card>
          </div>

          {/* Weekly data or empty state */}
          {isLoadingMingguan ? (
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <CangarTableSkeleton columns={7} />
            </div>
          ) : mingguanFilteredRows.length === 0 ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <CangarEmptyState title="Data belum tersedia" description="Belum ada data yang dapat ditampilkan untuk minggu ini." />
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <Table className="min-w-[920px] table-fixed">
                  <TableHeader>
                    <TableRow className={cangarTableHeaderClass}>
                      <TableHead className={`${cangarTableHeadClass} min-w-[80px] text-center`}>ID</TableHead>
                      <TableHead className={`${cangarTableHeadClass} min-w-[150px]`}>Tanggal</TableHead>
                      <TableHead className={`${cangarTableHeadClass} min-w-[130px]`}>Jenis</TableHead>
                      <TableHead className={`${cangarTableHeadClass} min-w-[160px]`}>Kategori</TableHead>
                      <TableHead className={`${cangarTableHeadClass} min-w-[150px] text-center`}>Nominal</TableHead>
                      <TableHead className={`${cangarTableHeadClass} min-w-[240px]`}>Keterangan</TableHead>
                      <TableHead className={`${cangarTableHeadClass} min-w-[130px]`}>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mingguanFilteredRows.map((row) => (
                      <TableRow key={row.id} className={cangarTableRowClass}>
                        <TableCell className="text-center font-semibold text-gray-900">#{row.id}</TableCell>
                        <TableCell className="text-gray-600">{row.tanggal}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn(
                              "rounded-md",
                              row.jenis === "Pemasukan"
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : row.jenis === "Pengeluaran"
                                  ? "border-red-200 bg-red-50 text-red-700"
                                  : "border-gray-200 bg-gray-50 text-gray-700",
                            )}
                          >
                            {row.jenis}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-gray-600">{row.kategori}</TableCell>
                        <TableCell className="text-center font-semibold text-gray-900 tabular-nums">
                          {formatRupiah(row.nominal)}
                        </TableCell>
                        <TableCell className="max-w-[260px] whitespace-normal break-words text-gray-600">
                          {row.keterangan}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn("rounded-md", financeStatusClass(row.status))}>
                            {row.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ==================== REKAP BULANAN ==================== */}
        <TabsContent value="Rekap Bulanan" className="space-y-4">
          {/* Month picker */}
          <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-end">
            <label className="space-y-1.5">
              <span className="text-sm font-semibold text-gray-700">Bulan:</span>
              <Input
                type="month"
                value={rekapBulananMonth}
                onChange={(e) => setRekapBulananMonth(e.target.value)}
                className="w-full bg-white sm:w-56"
              />
            </label>
            <Button
              type="button"
              className="gap-2 bg-[#27A376] text-white hover:bg-[#1f8a63]"
              onClick={() => setAppliedBulananMonth(rekapBulananMonth)}
            >
              <Search className="size-4" />
              Tampilkan
            </Button>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card className="rounded-lg border-gray-200 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-semibold text-gray-600">Total Pemasukan Bulan Ini</CardTitle>
                <TrendingUp className="size-4 text-emerald-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-700">{formatRupiah(bulananSummary.pemasukan)}</div>
              </CardContent>
            </Card>
            <Card className="rounded-lg border-gray-200 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-semibold text-gray-600">Total Pengeluaran Bulan Ini</CardTitle>
                <TrendingDown className="size-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-700">{formatRupiah(bulananSummary.pengeluaran)}</div>
              </CardContent>
            </Card>
            <Card className="rounded-lg border-gray-200 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-semibold text-gray-600">Saldo Bersih Bulan Ini</CardTitle>
                <Banknote className="size-4 text-gray-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{formatRupiah(bulananSummary.saldo)}</div>
              </CardContent>
            </Card>
          </div>

          {/* Monthly data or empty state */}
          {isLoadingBulanan ? (
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <CangarTableSkeleton columns={7} />
            </div>
          ) : bulananFilteredRows.length === 0 ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <CangarEmptyState title="Data belum tersedia" description="Belum ada data yang dapat ditampilkan untuk bulan ini." />
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <Table className="min-w-[920px] table-fixed">
                  <TableHeader>
                    <TableRow className={cangarTableHeaderClass}>
                      <TableHead className={`${cangarTableHeadClass} min-w-[80px] text-center`}>ID</TableHead>
                      <TableHead className={`${cangarTableHeadClass} min-w-[150px]`}>Tanggal</TableHead>
                      <TableHead className={`${cangarTableHeadClass} min-w-[130px]`}>Jenis</TableHead>
                      <TableHead className={`${cangarTableHeadClass} min-w-[160px]`}>Kategori</TableHead>
                      <TableHead className={`${cangarTableHeadClass} min-w-[150px] text-center`}>Nominal</TableHead>
                      <TableHead className={`${cangarTableHeadClass} min-w-[240px]`}>Keterangan</TableHead>
                      <TableHead className={`${cangarTableHeadClass} min-w-[130px]`}>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bulananFilteredRows.map((row) => (
                      <TableRow key={row.id} className={cangarTableRowClass}>
                        <TableCell className="text-center font-semibold text-gray-900">#{row.id}</TableCell>
                        <TableCell className="text-gray-600">{row.tanggal}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn(
                              "rounded-md",
                              row.jenis === "Pemasukan"
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : row.jenis === "Pengeluaran"
                                  ? "border-red-200 bg-red-50 text-red-700"
                                  : "border-gray-200 bg-gray-50 text-gray-700",
                            )}
                          >
                            {row.jenis}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-gray-600">{row.kategori}</TableCell>
                        <TableCell className="text-center font-semibold text-gray-900 tabular-nums">
                          {formatRupiah(row.nominal)}
                        </TableCell>
                        <TableCell className="max-w-[260px] whitespace-normal break-words text-gray-600">
                          {row.keterangan}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn("rounded-md", financeStatusClass(row.status))}>
                            {row.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}



