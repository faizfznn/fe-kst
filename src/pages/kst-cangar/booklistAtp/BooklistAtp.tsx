import { useMemo, useState } from "react";
import { CalendarCheck, CheckCircle2, Clock3, RotateCcw, Search } from "lucide-react";
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
import { adaptBookingRows, adaptBookingSummary } from "../adapters";
import {
  CangarAlert,
  CangarEmptyState,
  CangarHero,
  CangarSummaryCards,
  cangarTableHeadClass,
  cangarTableHeaderClass,
  cangarTableRowClass,
  cangarTabsListClass,
  cangarTabsTriggerClass,
  tableLoadingRow,
} from "../cangarUi";
import { cangarFriendlyMessage } from "../cangarHelpers";

const BOOKING_TABS = ["Daftar Booking", "Jadwal & Ketersediaan"];

type BookingFilters = {
  status: string;
  layanan: string;
  tanggal: string;
};

const initialFilters: BookingFilters = {
  status: "all",
  layanan: "all",
  tanggal: "",
};

function bookingStatusMatches(rowStatus: string, selectedStatus: string) {
  if (selectedStatus === "all") return true;

  const normalizedStatus = rowStatus.toLowerCase();
  if (selectedStatus === "cancelled") {
    return ["cancelled", "canceled", "dibatalkan", "batal"].includes(normalizedStatus);
  }

  return normalizedStatus === selectedStatus.toLowerCase();
}

const SERVICE_CAPACITY: Record<string, { label: string; capacity: number }> = {
  glamping: { label: "Glamping", capacity: 0 },
  cafe: { label: "Café Eduwisata", capacity: 0 },
  camping: { label: "Camping Ground", capacity: 0 },
};

const SERVICE_ORDER: Record<string, number> = {
  glamping: 0,
  camping: 1,
  cafe: 2,
};

function serviceKey(layanan: string) {
  const normalized = layanan.toLowerCase().trim();
  if (["cafe", "caf\u00e9", "cafe eduwisata", "caf\u00e9 eduwisata"].includes(normalized)) return "cafe";
  if (["camping", "camping ground"].includes(normalized)) return "camping";
  if (normalized === "glamping") return "glamping";
  return normalized;
}

function serviceInfo(layanan: string) {
  const key = serviceKey(layanan);
  if (key === "glamping") return { label: "Glamping", capacity: SERVICE_CAPACITY.glamping.capacity };
  if (key === "cafe") return { label: "Café Eduwisata", capacity: SERVICE_CAPACITY.cafe.capacity };
  if (key === "camping") return { label: "Camping Ground", capacity: SERVICE_CAPACITY.camping.capacity };
  return { label: layanan === "-" ? "-" : layanan, capacity: 0 };
}

export default function BooklistAtp() {
  const [draftFilters, setDraftFilters] = useState<BookingFilters>(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState<BookingFilters>(initialFilters);

  const {
    data: bookingPayload,
    isLoading,
    error: bookingError,
  } = useApiData<unknown>("/api/kst/cangar/data/booking", { limit: 100 });
  const { data: summaryPayload, error: summaryError } = useApiData<unknown>(
    "/api/kst/cangar/data/summary",
  );

  const rows = useMemo(() => adaptBookingRows(bookingPayload), [bookingPayload]);
  const filteredRows = useMemo(
    () =>
      rows.filter((row) => {
        const statusMatches = bookingStatusMatches(row.status, appliedFilters.status);
        const layananMatches =
          appliedFilters.layanan === "all" ||
          row.layanan.toLowerCase() === appliedFilters.layanan.toLowerCase();
        const tanggalMatches =
          !appliedFilters.tanggal || row.tanggalRaw === appliedFilters.tanggal;

        return statusMatches && layananMatches && tanggalMatches;
      }),
    [rows, appliedFilters],
  );
  const summary = useMemo(() => adaptBookingSummary(summaryPayload, rows), [summaryPayload, rows]);
  const activeBookings = useMemo(
    () => rows.filter((row) => row.status !== "Dibatalkan").length,
    [rows],
  );
  const scheduleRows = useMemo(() => {
    const grouped = new Map<
      string,
      {
        key: string;
        tanggal: string;
        tanggalRaw: string;
        layanan: string;
        totalBooking: number;
        confirmedQty: number;
        pending: number;
        capacity: number;
        serviceOrder: number;
      }
    >();

    rows.filter((row) => row.status !== "Dibatalkan").forEach((row) => {
      const info = serviceInfo(row.layanan);
      const key = `${row.tanggalRaw}-${serviceKey(row.layanan)}`;
      const existing = grouped.get(key) ?? {
        key,
        tanggal: row.tanggal,
        tanggalRaw: row.tanggalRaw,
        layanan: info.label,
        totalBooking: 0,
        confirmedQty: 0,
        pending: 0,
        capacity: row.kapasitas ?? info.capacity,
        serviceOrder: SERVICE_ORDER[serviceKey(row.layanan)] ?? 99,
      };

      existing.totalBooking += 1;
      if (row.status === "Confirmed") existing.confirmedQty += row.jumlah;
      if (row.status === "Pending") existing.pending += 1;
      grouped.set(key, existing);
    });

    return Array.from(grouped.values()).sort(
      (left, right) => left.tanggalRaw.localeCompare(right.tanggalRaw) || left.serviceOrder - right.serviceOrder,
    );
  }, [rows]);
  const layananOptions = useMemo(() => {
    const options = Array.from(new Set(rows.map((row) => row.layanan).filter((value) => value !== "-")));
    return options.length > 0 ? options : ["Glamping", "Camping", "Villa"];
  }, [rows]);

  const handleReset = () => {
    setDraftFilters(initialFilters);
    setAppliedFilters(initialFilters);
  };

  return (
    <div className="flex min-h-screen flex-col gap-5 bg-gray-50/50 p-4 md:p-6">
      <CangarHero
        title="Dashboard Reservasi Eco-Agrotourism"
        description="Pengelolaan reservasi ATP, kunjungan edukasi, pelanggan, dan kapasitas layanan wisata KST Cangar."
        badges={["Eco-Agrotourism", "Reservasi", "Edukasi"]}
        metric={{ label: "Booking Aktif", value: activeBookings.toLocaleString("id-ID") }}
      />

      {bookingError || summaryError ? (
        <CangarAlert>
          {cangarFriendlyMessage(bookingError || summaryError)}
        </CangarAlert>
      ) : null}

      <CangarSummaryCards
        items={[
          { label: "Menunggu Konfirmasi", value: summary.pending, icon: Clock3, helper: "Booking yang perlu ditindaklanjuti", tone: "amber" },
          { label: "Confirmed Bulan Ini", value: summary.confirmedMonth, icon: CheckCircle2, helper: "Reservasi terkonfirmasi", tone: "green" },
          { label: "Booking Hari Ini", value: summary.today, icon: CalendarCheck, helper: "Aktivitas reservasi hari ini", tone: "blue" },
          { label: "Total Booking Aktif", value: activeBookings, icon: CalendarCheck, helper: "Tidak termasuk dibatalkan" },
        ]}
      />

      <Tabs defaultValue="Daftar Booking" className="gap-4">
        <div className="overflow-x-auto pb-1">
          <TabsList className={cangarTabsListClass}>
            {BOOKING_TABS.map((tab) => (
              <TabsTrigger key={tab} value={tab} className={cangarTabsTriggerClass}>
                {tab}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="Daftar Booking" className="space-y-4">
          <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm xl:flex-row xl:items-end xl:justify-between">
            <div className="grid flex-1 grid-cols-1 gap-3 md:grid-cols-3">
              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-gray-600">Status</span>
                <Select
                  value={draftFilters.status}
                  onValueChange={(status) => setDraftFilters((current) => ({ ...current, status }))}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="cancelled">Dibatalkan</SelectItem>
                  </SelectContent>
                </Select>
              </label>

              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-gray-600">Layanan</span>
                <Select
                  value={draftFilters.layanan}
                  onValueChange={(layanan) => setDraftFilters((current) => ({ ...current, layanan }))}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Layanan</SelectItem>
                    {layananOptions.map((layanan) => (
                      <SelectItem key={layanan} value={layanan}>
                        {layanan}
                      </SelectItem>
                    ))}
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
              <Table className="min-w-[820px] table-fixed">
                <TableHeader>
                  <TableRow className={cangarTableHeaderClass}>
                    <TableHead className={`${cangarTableHeadClass} w-[80px] text-center`}>ID</TableHead>
                    <TableHead className={`${cangarTableHeadClass} w-[24%]`}>Nama Customer</TableHead>
                    <TableHead className={`${cangarTableHeadClass} w-[16%]`}>No. HP</TableHead>
                    <TableHead className={`${cangarTableHeadClass} w-[18%]`}>Layanan</TableHead>
                    <TableHead className={`${cangarTableHeadClass} w-[16%]`}>Tanggal</TableHead>
                    <TableHead className={`${cangarTableHeadClass} w-[90px] text-center`}>Jumlah</TableHead>
                    <TableHead className={`${cangarTableHeadClass} w-[130px]`}>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    tableLoadingRow(7)
                  ) : filteredRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="p-5">
                        <CangarEmptyState title="Belum ada data yang dapat ditampilkan" description="Data booking Cangar akan tampil setelah tersedia atau filter diubah." />
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRows.map((row) => (
                      <TableRow key={row.id} className={cangarTableRowClass}>
                        <TableCell className="text-center font-semibold text-gray-900">#{row.id}</TableCell>
                        <TableCell className="whitespace-normal break-words font-medium leading-relaxed text-gray-900">{row.namaCustomer || "Belum tersedia"}</TableCell>
                        <TableCell className="whitespace-normal break-words text-gray-600">{row.noHp || "Belum tersedia"}</TableCell>
                        <TableCell className="whitespace-normal break-words text-gray-600">{row.layanan || "Belum tersedia"}</TableCell>
                        <TableCell className="whitespace-normal break-words text-gray-600">{row.tanggal || "Belum tersedia"}</TableCell>
                        <TableCell className="text-center tabular-nums">{row.jumlah}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn(
                              "rounded-md",
                              row.status === "Confirmed"
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : row.status === "Dibatalkan"
                                  ? "border-red-200 bg-red-50 text-red-700"
                                  : "border-amber-200 bg-amber-50 text-amber-700",
                            )}
                        >
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

        <TabsContent value="Jadwal & Ketersediaan" className="space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold text-gray-700">Kapasitas per Hari</p>
            <div className="mt-2 flex flex-wrap gap-2 text-sm font-medium text-gray-600">
              <Badge variant="outline" className="rounded-md border-gray-200 bg-gray-50 text-gray-700">
                Kapasitas mengikuti data reservasi dari API.
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card className="rounded-lg border-gray-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-gray-600">Total Jadwal</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{scheduleRows.length}</div>
              </CardContent>
            </Card>
            <Card className="rounded-lg border-gray-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-gray-600">Qty Confirmed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-700">
                  {scheduleRows.reduce((total, row) => total + row.confirmedQty, 0)}
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-lg border-gray-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-gray-600">Sisa Kapasitas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-700">
                  {scheduleRows.reduce((total, row) => total + Math.max(0, row.capacity - row.confirmedQty), 0)}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <Table className="min-w-[760px] table-fixed">
                <TableHeader>
                  <TableRow className={cangarTableHeaderClass}>
                    <TableHead className={`${cangarTableHeadClass} w-[18%]`}>Tanggal</TableHead>
                    <TableHead className={`${cangarTableHeadClass} w-[22%]`}>Layanan</TableHead>
                    <TableHead className={`${cangarTableHeadClass} w-[14%] text-center`}>Total Booking</TableHead>
                    <TableHead className={`${cangarTableHeadClass} w-[16%] text-center`}>Qty Confirmed</TableHead>
                    <TableHead className={`${cangarTableHeadClass} w-[12%] text-center`}>Pending</TableHead>
                    <TableHead className={`${cangarTableHeadClass} w-[18%]`}>Ketersediaan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    tableLoadingRow(6)
                  ) : scheduleRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="p-5">
                        <CangarEmptyState title="Data belum tersedia" description="Jadwal booking Cangar sedang disiapkan." />
                      </TableCell>
                    </TableRow>
                  ) : (
                    scheduleRows.map((row) => {
                      const hasCapacity = row.capacity > 0;
                      const usedPercent = hasCapacity ? Math.min(100, Math.round((row.confirmedQty / row.capacity) * 100)) : 0;
                      const remainingCapacity = hasCapacity ? Math.max(0, row.capacity - row.confirmedQty) : null;

                      return (
                        <TableRow key={row.key} className={cangarTableRowClass}>
                          <TableCell className="whitespace-normal break-words text-gray-600">{row.tanggal}</TableCell>
                          <TableCell className="font-medium text-gray-900">
                            <span className="inline-flex items-center gap-2 whitespace-normal break-words">
                              <span>{row.layanan}</span>
                            </span>
                          </TableCell>
                          <TableCell className="text-center tabular-nums">{row.totalBooking}</TableCell>
                          <TableCell className="text-center tabular-nums">
                            {hasCapacity ? `${row.confirmedQty} / ${row.capacity}` : row.confirmedQty}
                          </TableCell>
                          <TableCell className="text-center tabular-nums">{row.pending}</TableCell>
                          <TableCell>
                            <div className="flex min-w-[150px] flex-col gap-2">
                              <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                                <div
                                  className="h-full rounded-full bg-emerald-500"
                                  style={{ width: `${usedPercent}%` }}
                                />
                              </div>
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-medium text-gray-500">
                                  {hasCapacity ? `${row.confirmedQty} / ${row.capacity}` : "Kapasitas belum tersedia"}
                                </span>
                                <Badge
                                  variant="outline"
                                  className="rounded-md border-emerald-200 bg-emerald-50 text-emerald-700"
                                >
                                  {remainingCapacity === null ? "Netral" : `Sisa ${remainingCapacity}`}
                                </Badge>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

