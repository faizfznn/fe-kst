import { useState } from "react";
import {
  Droplets,
  Gauge,
  Leaf,
  Recycle,
  Trash2,
  TrendingUp,
  Waves,
  Zap,
} from "lucide-react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useApiData, usePageData } from "@/api/hooks";
import { API_ENDPOINTS } from "@/api/endpoints";
import { cn } from "@/lib/utils";
import { LoadingIndicator } from "@/components/ui/loading-indicator";
import { formatIndonesianCalendarDate } from "@/lib/date";
import {
  colValue,
  fieldNumber,
  fieldValue,
  getContractColumnIndex,
  getContractColumnVariants,
  isRecord,
  ngijoNumber,
  ngijoTimeSeries,
  textOrFallback,
} from "../adapters";
import {
  NgijoEmptyState,
  NgijoHero,
  NgijoKpiCards,
  NgijoPagination,
  NgijoTableSkeleton,
} from "../ngijoUi";
import {
  DATA_EMPTY_TEXT,
  friendlyDataMessage,
  formatMetric,
  ngijoBadgeNeutralClass,
  ngijoTableHeadClass,
  ngijoTableHeaderClass,
  ngijoTableRowClass,
} from "../ngijoHelpers";

const energyConfig = {
  daya: { label: "Daya", color: "#059669" },
  konsumsi: { label: "Konsumsi", color: "#38BDF8" },
} satisfies ChartConfig;

interface EnergyPoint {
  month: string;
  daya: number | null;
  konsumsi: number | null;
}

interface SensorRow {
  id?: string;
  lokasi: string;
  tipe: string;
  baca: string;
  status: string;
  tren: "up" | "down" | "stable" | null;
}

function CircularProgress({
  value,
  label,
  color,
}: {
  value: number;
  label: string;
  color: string;
}) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="130" height="130" className="-rotate-90">
        <circle cx="65" cy="65" r={radius} fill="none" stroke="#E5E7EB" strokeWidth="10" />
        <circle
          cx="65"
          cy="65"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-3xl font-extrabold text-gray-900">{value}</span>
        <span className="text-[10px] font-semibold text-emerald-600">{label}</span>
      </div>
    </div>
  );
}

function normalizeEnergyRows(rows: unknown[]): EnergyPoint[] {
  return rows
    .map((row, index) => {
      const record = isRecord(row) ? row : {};
      const daya = fieldNumber(record, ["daya", "power", "generatedPower", "generated_power", "value"]);
      const konsumsi = fieldNumber(record, ["konsumsi", "consumption", "energyConsumption", "energy_consumption"]);
      const rawTime =
        record.month ??
        record.bulan ??
        record.label ??
        record.time ??
        record.timestamp ??
        record.createdAt ??
        record.created_at;
      const formattedTime = formatIndonesianCalendarDate(rawTime);

      return {
        month: formattedTime === "-" ? `Data ${index + 1}` : formattedTime,
        daya,
        konsumsi,
      };
    })
    .filter((row) => row.daya !== null || row.konsumsi !== null);
}

function resolveVariantText(value: unknown, variants: Map<number, string>) {
  const variantIndex = fieldNumber({ value }, ["value"]);
  if (variantIndex !== null && variants.has(variantIndex)) return variants.get(variantIndex)!;
  return textOrFallback(value, DATA_EMPTY_TEXT);
}

function resolveTrend(value: unknown, variants: Map<number, string>): SensorRow["tren"] {
  const text = resolveVariantText(value, variants).toLowerCase().trim();
  if (["up", "naik", "increase", "meningkat"].includes(text)) return "up";
  if (["down", "turun", "decrease", "menurun"].includes(text)) return "down";
  if (["stable", "stabil", "normal"].includes(text)) return "stable";
  return null;
}

function normalizeSensorRows(rows: unknown[], contractPayload: unknown): SensorRow[] {
  const lokasiIdx = getContractColumnIndex(contractPayload, ["lokasi sensor", "lokasi", "location"]) ?? 0;
  const tipeIdx = getContractColumnIndex(contractPayload, ["tipe", "type"]) ?? 1;
  const bacaIdx = getContractColumnIndex(contractPayload, ["baca", "reading", "value"]) ?? 2;
  const statusIdx = getContractColumnIndex(contractPayload, ["status"]) ?? 3;
  const trenIdx = getContractColumnIndex(contractPayload, ["tren", "trend"]) ?? 4;
  const statusVariants = getContractColumnVariants(contractPayload, ["status"]);
  const trendVariants = getContractColumnVariants(contractPayload, ["tren", "trend"]);

  return rows.map((row) => {
    const record = isRecord(row) ? row : {};
    const trend = fieldValue(record, ["tren", "trend"]) ?? colValue(record, trenIdx);
    const statusRaw = fieldValue(record, ["status"]) ?? colValue(record, statusIdx);

    return {
      id: textOrFallback(record.id ?? record.rowId ?? record.row_id, ""),
      lokasi: textOrFallback(fieldValue(record, ["lokasi", "location", "sensorLocation", "sensor_location"]) ?? colValue(record, lokasiIdx)),
      tipe: textOrFallback(fieldValue(record, ["tipe", "type", "sensorType", "sensor_type"]) ?? colValue(record, tipeIdx)),
      baca: textOrFallback(fieldValue(record, ["baca", "reading", "value", "currentValue", "current_value"]) ?? colValue(record, bacaIdx)),
      status: resolveVariantText(statusRaw, statusVariants),
      tren: resolveTrend(trend, trendVariants),
    };
  });
}

function sensorStatusClass(status: string): string {
  const value = status.toLowerCase().trim();
  if (["optimal", "ok", "normal", "good", "healthy", "aktif"].includes(value)) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (["critical", "error", "danger", "alert", "fault", "kritis"].includes(value)) {
    return "border-red-200 bg-red-50 text-red-700";
  }
  if (!value || value === "-" || value === DATA_EMPTY_TEXT.toLowerCase()) {
    return "border-gray-200 bg-gray-50 text-gray-500";
  }
  return "border-amber-200 bg-amber-50 text-amber-700";
}

function greenScore(value: number | null) {
  if (value === null) return DATA_EMPTY_TEXT;
  return `${value.toLocaleString("id-ID", { maximumFractionDigits: 1 })}%`;
}

export default function Keberlanjutan() {
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState("10");
  const { data: renewableEnergyPayload, isLoading: isRenewableEnergyLoading } = useApiData<unknown>(
    API_ENDPOINTS.kst.ngijo.renewableEnergy,
  );
  const { data: greenPerformancePayload, isLoading: isGreenPerformanceLoading } = useApiData<unknown>(
    API_ENDPOINTS.kst.ngijo.greenPerformance,
  );
  const { data: recycledWaterPayload, isLoading: isRecycledWaterLoading } = useApiData<unknown>(
    API_ENDPOINTS.kst.ngijo.recycledWater,
  );
  const { data: wasteMetricPayload, isLoading: isWasteMetricLoading } = useApiData<unknown>(
    API_ENDPOINTS.kst.ngijo.wasteMetric,
  );
  const { data: energyDynamicsPayload, isLoading: isEnergyDynamicsLoading } = useApiData<unknown>(
    API_ENDPOINTS.kst.ngijo.energyDynamics,
    { start_time: 0, end_time: 9999999999, limit: 100 },
  );
  const { data: contractPayload } = useApiData<unknown>(
    API_ENDPOINTS.kst.ngijo.contract,
  );
  const {
    items: sensorRows,
    isLoading: isSensorLoading,
    error: sensorError,
    warning: sensorWarning,
  } = usePageData<unknown>(API_ENDPOINTS.kst.ngijo.sensorFeed, {
    offset: 0,
    limit: 50,
    sort_col: -1,
  });

  const renewableEnergy = ngijoNumber(renewableEnergyPayload);
  const greenPerformance = ngijoNumber(greenPerformancePayload);
  const recycledWater = ngijoNumber(recycledWaterPayload);
  const wasteMetric = ngijoNumber(wasteMetricPayload);
  const energyRows = normalizeEnergyRows(ngijoTimeSeries<unknown>(energyDynamicsPayload));
  const sensorData = normalizeSensorRows(sensorRows, contractPayload);

  const rowsPerPageNumber = Number(rowsPerPage);
  const totalPages = Math.max(1, Math.ceil(sensorData.length / rowsPerPageNumber));
  const paginatedSensorData = sensorData.slice(
    (currentPage - 1) * rowsPerPageNumber,
    currentPage * rowsPerPageNumber,
  );

  return (
    <div className="flex min-h-screen flex-col gap-5 bg-gray-50/50 p-4 md:p-6">
      <NgijoHero
        title="Keberlanjutan dan Operasi Hijau"
        description="Ringkasan energi terbarukan, air daur ulang, pengolahan limbah, sensor operasional, dan green performance untuk Green Science Park Ngijo."
        badges={["Sustainability", "Mikrohidro", "Limbah"]}
        metric={{ label: "Green Performance", value: isGreenPerformanceLoading ? <LoadingIndicator /> : greenScore(greenPerformance) }}
      />

      <NgijoKpiCards
        items={[
          {
            icon: Zap,
            label: "Energi Terbarukan",
            value: isRenewableEnergyLoading ? <LoadingIndicator /> : formatMetric(renewableEnergy, "MWh"),
            helper: "Produksi energi dari sumber terbarukan.",
            tone: "amber",
          },
          {
            icon: Leaf,
            label: "Green Performance",
            value: isGreenPerformanceLoading ? <LoadingIndicator /> : greenScore(greenPerformance),
            helper: "Skor performa hijau yang dikirim API Ngijo.",
            tone: "emerald",
          },
          {
            icon: Droplets,
            label: "Air Daur Ulang",
            value: isRecycledWaterLoading ? <LoadingIndicator /> : formatMetric(recycledWater),
            helper: "Pemanfaatan ulang air untuk proses operasional.",
            tone: "blue",
          },
          {
            icon: Trash2,
            label: "Metrik Limbah",
            value: isWasteMetricLoading ? <LoadingIndicator /> : formatMetric(wasteMetric),
            helper: "Indikator pengelolaan dan pemrosesan limbah.",
            tone: "slate",
          },
        ]}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2.5">
            <Leaf className="size-5 text-gray-500" />
            <div>
              <p className="text-[13px] font-bold text-gray-900">Green Performance</p>
              <p className="text-[11px] font-medium text-gray-400">Dari endpoint green performance</p>
            </div>
          </div>

          {isGreenPerformanceLoading ? (
            <div className="flex min-h-[160px] items-center justify-center">
              <LoadingIndicator />
            </div>
          ) : greenPerformance === null ? (
            <NgijoEmptyState title="Data belum tersedia" description="Green performance Ngijo sedang disiapkan." />
          ) : (
            <>
              <div className="flex justify-center py-2">
                <CircularProgress value={greenPerformance} label="Skor" color="#059669" />
              </div>
              <p className="text-center text-[12px] font-medium text-gray-500">
                Skor ini merepresentasikan capaian hijau lintas energi, air, dan limbah.
              </p>
            </>
          )}
        </div>

        <div className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2.5">
            <Waves className="size-5 text-gray-500" />
            <div>
              <p className="text-[13px] font-bold text-gray-900">Siklus Hidup Air</p>
              <p className="text-[11px] font-medium text-gray-400">Air daur ulang</p>
            </div>
          </div>

          {isRecycledWaterLoading ? (
            <div className="flex min-h-[160px] items-center justify-center">
              <LoadingIndicator />
            </div>
          ) : recycledWater === null ? (
            <NgijoEmptyState title="Data belum tersedia" description="Data air daur ulang sedang disiapkan." />
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 py-4">
              <span className="text-3xl font-extrabold text-gray-900">
                {recycledWater.toLocaleString("id-ID")}
              </span>
              <span className="text-[12px] font-semibold text-emerald-600">Air daur ulang</span>
              <p className="text-center text-[11px] font-medium text-gray-400">
                Distribusi per lokasi akan ditampilkan saat tersedia dari API.
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <Recycle className="size-5 text-gray-500" />
              <div>
                <p className="text-[13px] font-bold text-gray-900">Metrik Limbah</p>
                <p className="text-[11px] font-medium text-gray-400">Pengolahan limbah</p>
              </div>
            </div>
            <p className="max-w-[120px] text-right text-[10px] font-medium leading-snug text-gray-400">
              Metrik mingguan dalam pengelolaan proses limbah.
            </p>
          </div>

          {isWasteMetricLoading ? (
            <div className="flex min-h-[140px] items-center justify-center">
              <LoadingIndicator />
            </div>
          ) : wasteMetric === null ? (
            <NgijoEmptyState title="Data belum tersedia" description="Metrik limbah Ngijo sedang disiapkan." />
          ) : (
            <div className="flex flex-col justify-center gap-2 py-6">
              <span className="text-3xl font-extrabold text-gray-900">
                {wasteMetric.toLocaleString("id-ID")}
              </span>
              <span className="text-[12px] font-semibold text-gray-500">Metrik limbah</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Zap className="size-5 text-gray-500" />
              <div>
                <p className="text-[13px] font-bold text-gray-900">Dinamika Energi</p>
                <p className="text-[11px] font-medium text-gray-400">Produksi dan konsumsi energi</p>
              </div>
            </div>
            <p className="max-w-[240px] text-right text-[11px] font-medium leading-snug text-gray-400">
              Perbandingan antara daya dengan konsumsi energi dari feed API.
            </p>
          </div>

          {isEnergyDynamicsLoading ? (
            <div className="flex min-h-[220px] items-center justify-center">
              <LoadingIndicator />
            </div>
          ) : energyRows.length === 0 ? (
            <NgijoEmptyState title="Data belum tersedia" description="Dinamika energi belum dikirim oleh backend." />
          ) : (
            <>
              <ChartContainer config={energyConfig} className="h-[220px] w-full">
                <AreaChart data={energyRows} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradDaya" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#059669" stopOpacity={0.22} />
                      <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradKonsumsi" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#38BDF8" stopOpacity={0.24} />
                      <stop offset="95%" stopColor="#38BDF8" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#6B7280" }} />
                  <YAxis hide />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area type="monotone" dataKey="daya" stroke="#059669" fill="url(#gradDaya)" strokeWidth={2.5} />
                  <Area type="monotone" dataKey="konsumsi" stroke="#38BDF8" fill="url(#gradKonsumsi)" strokeWidth={2} />
                </AreaChart>
              </ChartContainer>
              <div className="flex items-center justify-center gap-4 text-[10px] font-medium text-gray-500">
                <span className="flex items-center gap-1">
                  <span className="inline-block size-2 rounded-full bg-emerald-600" />
                  Daya
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block size-2 rounded-full bg-sky-400" />
                  Konsumsi
                </span>
              </div>
            </>
          )}
        </div>

        <div className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2.5">
            <Gauge className="size-5 text-gray-500" />
            <div>
              <p className="text-[13px] font-bold leading-tight text-gray-900">
                Total Energi Terbarukan yang Dihasilkan
              </p>
              <p className="text-[11px] font-medium text-gray-400">Mikrohidro dan energi hijau</p>
            </div>
          </div>

          {isRenewableEnergyLoading ? (
            <div className="flex min-h-[120px] items-center justify-center">
              <LoadingIndicator />
            </div>
          ) : renewableEnergy === null ? (
            <NgijoEmptyState title="Data belum tersedia" description="Data energi terbarukan Ngijo sedang disiapkan." />
          ) : (
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-4xl font-extrabold tracking-tight text-gray-900">
                {renewableEnergy.toLocaleString("id-ID")}
              </span>
              <span className="text-[14px] font-semibold text-gray-500">MWh</span>
            </div>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-4">
          <p className="text-sm font-bold text-gray-950">Feed Sensor Operasional</p>
          <p className="mt-1 text-xs font-medium text-gray-500">
            Status sensor real-time untuk fasilitas energi, air, limbah, dan area produksi Ngijo.
          </p>
        </div>
        <div className="overflow-x-auto">
          <Table className="min-w-[920px] table-fixed">
            <TableHeader>
              <TableRow className={ngijoTableHeaderClass}>
                <TableHead className={`${ngijoTableHeadClass} w-[64px] pl-5 text-center`}>No.</TableHead>
                <TableHead className={`${ngijoTableHeadClass} w-[28%]`}>Lokasi Sensor</TableHead>
                <TableHead className={`${ngijoTableHeadClass} w-[22%]`}>Tipe</TableHead>
                <TableHead className={`${ngijoTableHeadClass} w-[16%] text-center`}>Baca</TableHead>
                <TableHead className={`${ngijoTableHeadClass} w-[18%]`}>Status</TableHead>
                <TableHead className={`${ngijoTableHeadClass} w-[10%] text-center`}>Tren</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {isSensorLoading ? (
                <TableRow className={ngijoTableRowClass}>
                  <TableCell colSpan={6} className="p-0">
                    <NgijoTableSkeleton columns={6} />
                  </TableCell>
                </TableRow>
              ) : sensorError ? (
                <TableRow className={ngijoTableRowClass}>
                  <TableCell colSpan={6} className="p-5">
                    <NgijoEmptyState title={friendlyDataMessage(sensorError)} />
                  </TableCell>
                </TableRow>
              ) : paginatedSensorData.length === 0 ? (
                <TableRow className={ngijoTableRowClass}>
                  <TableCell colSpan={6} className="p-5">
                    <NgijoEmptyState
                      title={friendlyDataMessage(sensorWarning, "Data belum tersedia")}
                      description="Feed sensor Ngijo akan tampil otomatis setelah data tersedia."
                    />
                  </TableCell>
                </TableRow>
              ) : (
                paginatedSensorData.map((row, index) => (
                  <TableRow key={row.id || `${row.lokasi}-${index}`} className={ngijoTableRowClass}>
                    <TableCell className="pl-5 text-center text-[13px] font-semibold tabular-nums text-gray-500">
                      {(currentPage - 1) * rowsPerPageNumber + index + 1}.
                    </TableCell>
                    <TableCell className="whitespace-normal break-words text-[13px] font-semibold leading-relaxed text-gray-900">
                      {row.lokasi}
                    </TableCell>
                    <TableCell className="whitespace-normal break-words text-[13px] leading-relaxed text-gray-500">
                      {row.tipe}
                    </TableCell>
                    <TableCell className="whitespace-normal break-words text-center text-[13px] font-semibold tabular-nums text-gray-700">
                      {row.baca}
                    </TableCell>
                    <TableCell className="whitespace-normal break-words">
                      <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-[12px] font-bold", sensorStatusClass(row.status))}>
                        {row.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      {row.tren === null ? (
                        <span className={ngijoBadgeNeutralClass}>{DATA_EMPTY_TEXT}</span>
                      ) : (
                        <TrendingUp
                          className={cn(
                            "mx-auto size-4",
                            row.tren === "up"
                              ? "text-emerald-500"
                              : row.tren === "down"
                                ? "rotate-180 text-red-400"
                                : "text-gray-400",
                          )}
                        />
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <NgijoPagination
          currentPage={currentPage}
          totalPages={totalPages}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(value) => {
            setRowsPerPage(value);
            setCurrentPage(1);
          }}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
}
