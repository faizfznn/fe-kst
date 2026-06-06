import { useState } from "react";
import {
  TrendingUp,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Leaf,
  Droplets,
  Trash2,
  Zap,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Cell,
  Pie,
  PieChart,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
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
import { cn } from "@/lib/utils";
import { useApiData, usePageData } from "@/api/hooks";

const waterData = [
  { name: "Daur Ulang", value: 14200, fill: "#27A376" },
  { name: "Sumber Segar", value: 6700, fill: "#3B82F6" },
];

const waterConfig = {
  daurUlang: { label: "Daur ulang", color: "#27A376" },
  sumberSegar: { label: "Sumber Segar", color: "#3B82F6" },
} satisfies ChartConfig;

const wasteData = [
  { day: "Senin", mendatang: 8, diproses: 5 },
  { day: "Selasa", mendatang: 10, diproses: 7 },
  { day: "Rabu", mendatang: 6, diproses: 4 },
  { day: "Kamis", mendatang: 9, diproses: 6 },
  { day: "Jumat", mendatang: 7, diproses: 5 },
  { day: "Sabtu", mendatang: 5, diproses: 3 },
  { day: "Minggu", mendatang: 4, diproses: 2 },
];

const wasteConfig = {
  mendatang: { label: "Mendatang", color: "#3B82F6" },
  diproses: { label: "Diproses", color: "#93C5FD" },
} satisfies ChartConfig;

const energyData = [
  { month: "Jan", daya: 400, konsumsi: 300 },
  { month: "Feb", daya: 500, konsumsi: 350 },
  { month: "Mar", daya: 550, konsumsi: 420 },
  { month: "Apr", daya: 480, konsumsi: 380 },
  { month: "May", daya: 520, konsumsi: 400 },
  { month: "Jun", daya: 600, konsumsi: 450 },
];

const energyConfig = {
  daya: { label: "Daya", color: "#3B82F6" },
  konsumsi: { label: "Konsumsi", color: "#93C5FD" },
} satisfies ChartConfig;

const months = ["Semua Bulan", "Januari", "Februari", "Maret", "April"];

interface SensorRow {
  id?: string;
  no: number;
  lokasi: string;
  tipe: string;
  baca: string;
  status: string;
  tren: "up" | "down" | "stable";
}

export const sensorData: SensorRow[] = [
  {
    no: 1,
    lokasi: "North Solar Grid A-12",
    tipe: "Photovoltaic Output",
    baca: "428.4 kW",
    status: "Optimal",
    tren: "up",
  },
  {
    no: 2,
    lokasi: "Western Water Rec. Station",
    tipe: "Flow Rate Monitor",
    baca: "12.5 L/sec",
    status: "Optimal",
    tren: "up",
  },
  {
    no: 3,
    lokasi: "Central Biomass Unit B-3",
    tipe: "Thermal Efficiency",
    baca: "87.2%",
    status: "Optimal",
    tren: "up",
  },
  {
    no: 4,
    lokasi: "East Wind Corridor T-7 lokasi diterpencil sangat",
    tipe: "Turbine RPM Sensor dengan Nama Tipe Sensor yang Panjang",
    baca: "1,842 RPM",
    status: "Warning",
    tren: "down",
  },
  {
    no: 5,
    lokasi: "South Composting Bay C-1",
    tipe: "Methane Detector",
    baca: "2.1 ppm",
    status: "Optimal",
    tren: "stable",
  },
];

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
        <circle
          cx="65"
          cy="65"
          r={radius}
          fill="none"
          stroke="#E5E7EB"
          strokeWidth="10"
        />
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
        <span className="text-[10px] font-semibold text-emerald-600">
          {label}
        </span>
      </div>
    </div>
  );
}

function MonthTab({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-4 py-1.5 text-[13px] font-medium rounded-lg transition-all duration-150 whitespace-nowrap",
        active
          ? "bg-gray-900 text-white shadow-sm"
          : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"
      )}
    >
      {label}
    </button>
  );
}

export default function Keberlanjutan() {
  const [selectedYear, setSelectedYear] = useState("2026");
  const [selectedMonth, setSelectedMonth] = useState("Semua Bulan");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState("10");
  const { data: greenPerformance } = useApiData<{ value: number; label: string }>(
    "/kst/ngijo/keberlanjutan/green-performance",
  );
  const { data: waterLifecycle } = useApiData<{ items: typeof waterData }>(
    "/kst/ngijo/keberlanjutan/water-lifecycle",
  );
  const { data: wasteMetrics } = useApiData<{ value: typeof wasteData }>(
    "/kst/ngijo/keberlanjutan/waste-metrics",
  );
  const { data: energyDynamics } = useApiData<{ value: typeof energyData }>(
    "/kst/ngijo/keberlanjutan/energy-dynamics",
  );
  const { data: renewableEnergy } = useApiData<{
    total: number;
    unit: string;
    items: Array<{ label: string; value: number }>;
  }>("/kst/ngijo/keberlanjutan/renewable-energy");
  const { items: sensorRows } = usePageData<SensorRow>(
    "/kst/ngijo/keberlanjutan/sensors",
    { year: selectedYear, month: selectedMonth, limit: 50 },
  );
  const waterRows = waterLifecycle?.items ?? [];
  const wasteRows = wasteMetrics?.value ?? [];
  const energyRows = energyDynamics?.value ?? [];
  const sensorData = sensorRows;

  const recycledWater = waterRows.find((item) => item.name === "Daur Ulang")?.value ?? 0;
  const freshWater = waterRows.find((item) => item.name === "Sumber Segar")?.value ?? 0;
  const totalWater = recycledWater + freshWater;
  const pct = totalWater > 0 ? Math.round((recycledWater / totalWater) * 100) : 0;

  const rowsPerPageNumber = Number(rowsPerPage);
  const totalPages = Math.max(
    1,
    Math.ceil(sensorData.length / rowsPerPageNumber)
  );

  const paginatedSensorData = sensorData.slice(
    (currentPage - 1) * rowsPerPageNumber,
    currentPage * rowsPerPageNumber
  );

  return (
    <div className="flex flex-col gap-5 p-4 md:p-6 bg-gray-50/50 min-h-screen">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col gap-4">
          <div className="flex items-center gap-2.5">
            <Leaf className="size-5 text-gray-500" />
            <div>
              <p className="text-[13px] font-bold text-gray-900">
                Green Performance
              </p>
              <p className="text-[11px] text-gray-400 font-medium">
                Q1 / January - Maret 2026
              </p>
            </div>
          </div>

          <div className="flex justify-center py-2">
            <CircularProgress
              value={greenPerformance?.value ?? 0}
              label={greenPerformance?.label ?? "-"}
              color="#27A376"
            />
          </div>

          <p className="text-[12px] text-gray-500 font-medium text-center">
            Kinerja 12% lebih tinggi dibandingkan kuartal lalu.
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col gap-4">
          <div className="flex items-center gap-2.5">
            <Droplets className="size-5 text-gray-500" />
            <div>
              <p className="text-[13px] font-bold text-gray-900">
                Siklus Hidup Air
              </p>
              <p className="text-[11px] text-gray-400 font-medium">
                Q1 / January - Maret 2026
              </p>
            </div>
          </div>

          <div className="flex justify-center py-2">
            <ChartContainer config={waterConfig} className="h-[120px] w-[120px]">
              <PieChart>
                <Pie
                  data={waterRows}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={38}
                  outerRadius={55}
                  strokeWidth={2}
                >
                  {waterRows.map((entry, index) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ChartContainer>
          </div>

          <div className="flex flex-col items-center gap-1">
            <span className="text-[11px] font-bold text-emerald-600">
              {pct}% Daur Ulang
            </span>

            <div className="flex items-center gap-4 text-[10px] text-gray-500 font-medium">
              <span className="flex items-center gap-1">
                <span className="size-2 rounded-full bg-emerald-500 inline-block" />
                Daur ulang - {recycledWater.toLocaleString("id-ID")} Gal
              </span>
              <span className="flex items-center gap-1">
                <span className="size-2 rounded-full bg-blue-500 inline-block" />
                Sumber Segar - {freshWater.toLocaleString("id-ID")} Gal
              </span>
            </div>
          </div>

          <p className="text-[11px] text-gray-400 font-medium text-center">
            Distribusi air pada KST Ngijo.
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col gap-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <Trash2 className="size-5 text-gray-500" />
              <div>
                <p className="text-[13px] font-bold text-gray-900">
                  Metrik Limbah
                </p>
                <p className="text-[11px] text-gray-400 font-medium">
                  Januari / Minggu Pertama
                </p>
              </div>
            </div>

            <p className="text-[10px] text-gray-400 font-medium max-w-[120px] text-right leading-snug">
              Metrik mingguan dalam pengelolaan proses limbah.
            </p>
          </div>

          <ChartContainer config={wasteConfig} className="h-[140px] w-full">
            <BarChart
              data={wasteRows}
              margin={{ top: 5, right: 0, left: -20, bottom: 0 }}
            >
              <CartesianGrid
                vertical={false}
                strokeDasharray="3 3"
                stroke="#F1F5F9"
              />
              <XAxis
                dataKey="day"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: "#9CA3AF" }}
              />
              <YAxis hide />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar
                dataKey="mendatang"
                fill="#3B82F6"
                radius={[3, 3, 0, 0]}
                barSize={14}
              />
              <Bar
                dataKey="diproses"
                fill="#93C5FD"
                radius={[3, 3, 0, 0]}
                barSize={14}
              />
            </BarChart>
          </ChartContainer>

          <div className="flex items-center justify-center gap-4 text-[10px] text-gray-500 font-medium">
            <span className="flex items-center gap-1">
              <span className="size-2 rounded-full bg-blue-500 inline-block" />
              Mendatang
            </span>
            <span className="flex items-center gap-1">
              <span className="size-2 rounded-full bg-blue-300 inline-block" />
              Diproses
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col gap-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <Zap className="size-5 text-gray-500" />
              <div>
                <p className="text-[13px] font-bold text-gray-900">
                  Dinamika Energi
                </p>
                <p className="text-[11px] text-gray-400 font-medium">
                  Q1 / January - Maret 2026
                </p>
              </div>
            </div>

            <p className="text-[11px] text-gray-400 font-medium max-w-[240px] text-right leading-snug">
              Perbandingan antara daya dengan konsumsi secara langsung.
            </p>
          </div>

          <ChartContainer config={energyConfig} className="h-[200px] w-full">
            <AreaChart
              data={energyRows}
              margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="gradDaya" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradKonsumsi" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#93C5FD" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#93C5FD" stopOpacity={0} />
                </linearGradient>
              </defs>

              <CartesianGrid
                vertical={false}
                strokeDasharray="3 3"
                stroke="#F1F5F9"
              />
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "#9CA3AF" }}
              />
              <YAxis hide />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area
                type="monotone"
                dataKey="daya"
                stroke="#3B82F6"
                fill="url(#gradDaya)"
                strokeWidth={2.5}
              />
              <Area
                type="monotone"
                dataKey="konsumsi"
                stroke="#93C5FD"
                fill="url(#gradKonsumsi)"
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>

          <div className="flex items-center justify-center gap-4 text-[10px] text-gray-500 font-medium">
            <span className="flex items-center gap-1">
              <span className="size-2 rounded-full bg-blue-500 inline-block" />
              Daya
            </span>
            <span className="flex items-center gap-1">
              <span className="size-2 rounded-full bg-blue-300 inline-block" />
              Konsumsi
            </span>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col gap-4">
          <div className="flex items-center gap-2.5">
            <Zap className="size-5 text-gray-500" />
            <div>
              <p className="text-[13px] font-bold text-gray-900 leading-tight">
                Total Energi Terbarukan yang Dihasilkan
              </p>
              <p className="text-[11px] text-gray-400 font-medium">
                Q1 / January - Maret 2026
              </p>
            </div>
          </div>

          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-4xl font-extrabold text-gray-900 tracking-tight">
              {(renewableEnergy?.total ?? 0).toLocaleString("id-ID")}
            </span>
            <span className="text-[14px] font-semibold text-gray-500">
              {renewableEnergy?.unit ?? "MWh"}
            </span>
          </div>

          <div className="flex flex-col gap-3 mt-2">
            {(renewableEnergy?.items ?? []).map((item, index) => (
              <div
                key={item.label}
                className="flex items-center gap-2 text-[12px] text-gray-600 font-medium"
              >
                <span
                  className={cn(
                    "size-2.5 rounded-full shrink-0",
                    ["bg-blue-500", "bg-emerald-500", "bg-amber-500"][index] ??
                    "bg-gray-400",
                  )}
                />
                <span>{item.label}</span>
                <span className="text-gray-400 mx-1">-</span>
                <span className="font-bold text-gray-800">
                  {item.value} {renewableEnergy?.unit ?? "MWh"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h2 className="text-[14px] font-bold text-gray-900 border border-gray-200 rounded-lg px-4 py-2 bg-white shadow-sm">
          Real Time Sensor Feed
        </h2>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="h-9 border-gray-200 bg-white text-[13px] font-medium">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2024">2024</SelectItem>
              <SelectItem value="2025">2025</SelectItem>
              <SelectItem value="2026">2026</SelectItem>
            </SelectContent>
          </Select>

          <div className="w-full sm:w-auto overflow-x-auto scrollbar-none">
            <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1 shadow-sm w-max">
              {months.map((month) => (
                <MonthTab
                  key={month}
                  label={month}
                  active={selectedMonth === month}
                  onClick={() => setSelectedMonth(month)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="min-w-[1000px]">
            <TableHeader>
              <TableRow className="bg-gray-50/80 hover:bg-gray-50/80">
                <TableHead className="font-bold text-gray-500 text-[12px] w-[60px] pl-5">
                  No.
                </TableHead>

                <TableHead className="font-bold text-gray-500 text-[12px] min-w-[260px]">
                  Lokasi Sensor
                </TableHead>

                <TableHead className="font-bold text-gray-500 text-[12px] min-w-[220px]">
                  Tipe
                </TableHead>

                <TableHead className="font-bold text-gray-500 text-[12px] min-w-[140px]">
                  Baca
                </TableHead>

                <TableHead className="font-bold text-gray-500 text-[12px] min-w-[120px]">
                  Status
                </TableHead>

                <TableHead className="font-bold text-gray-500 text-[12px] min-w-[100px]">
                  Tren
                </TableHead>

                <TableHead className="w-[48px]" />
              </TableRow>
            </TableHeader>

            <TableBody>
              {paginatedSensorData.map((row, index) => (
                <TableRow key={row.id ?? row.no} className="hover:bg-gray-50/50 group">
                  <TableCell className="text-[13px] text-gray-500 font-medium pl-5">
                    {(currentPage - 1) * rowsPerPageNumber + index + 1}.
                  </TableCell>

                  <TableCell className="text-[13px] font-medium text-gray-900 max-w-[260px] whitespace-normal break-words leading-relaxed">
                    {row.lokasi}
                  </TableCell>

                  <TableCell className="text-[13px] text-gray-500 max-w-[220px] whitespace-normal break-words leading-relaxed">
                    {row.tipe}
                  </TableCell>

                  <TableCell className="text-[13px] text-gray-600 font-medium min-w-[140px] whitespace-nowrap tabular-nums">
                    {row.baca}
                  </TableCell>

                  <TableCell className="min-w-[120px] whitespace-nowrap">
                    <span
                      className={cn(
                        "text-[12px] font-semibold",
                        row.status === "Optimal"
                          ? "text-emerald-600"
                          : "text-amber-600"
                      )}
                    >
                      {row.status}
                    </span>
                  </TableCell>

                  <TableCell className="min-w-[100px] whitespace-nowrap">
                    <TrendingUp
                      className={cn(
                        "size-4",
                        row.tren === "up"
                          ? "text-emerald-500"
                          : row.tren === "down"
                            ? "text-red-400 rotate-180"
                            : "text-gray-400"
                      )}
                    />
                  </TableCell>

                  <TableCell>
                    <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-gray-100">
                      <MoreVertical className="size-4 text-gray-400" />
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 sm:px-5 py-3 border-t border-gray-100">
          <div className="flex items-center gap-2 text-[13px] text-gray-500 font-medium">
            <span className="whitespace-nowrap">Baris per Page</span>

            <Select
              value={rowsPerPage}
              onValueChange={(value) => {
                setRowsPerPage(value);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="h-8 w-[70px] border-gray-200 bg-white text-[13px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[13px] text-gray-500 font-medium whitespace-nowrap">
              Page {currentPage} dari {totalPages}
            </span>

            <div className="flex items-center gap-1">
              {[
                {
                  icon: ChevronsLeft,
                  action: () => setCurrentPage(1),
                  disabled: currentPage === 1,
                },
                {
                  icon: ChevronLeft,
                  action: () =>
                    setCurrentPage(Math.max(1, currentPage - 1)),
                  disabled: currentPage === 1,
                },
                {
                  icon: ChevronRight,
                  action: () =>
                    setCurrentPage(Math.min(totalPages, currentPage + 1)),
                  disabled: currentPage === totalPages,
                },
                {
                  icon: ChevronsRight,
                  action: () => setCurrentPage(totalPages),
                  disabled: currentPage === totalPages,
                },
              ].map((btn, index) => (
                <button
                  key={index}
                  onClick={btn.action}
                  disabled={btn.disabled}
                  className="p-1.5 rounded-md border border-gray-200 text-gray-400 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <btn.icon className="size-4" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
