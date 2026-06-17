import type { ComponentType, ReactNode } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Boxes,
  ClipboardList,
  GraduationCap,
  Handshake,
  Leaf,
  Sprout,
  TrendingUp,
  Zap,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingIndicator } from "@/components/ui/loading-indicator";
import { API_ENDPOINTS } from "@/api/endpoints";
import { parsePageContainer, useApiData, usePageData } from "@/api/hooks";
import {
  adaptBookingRows,
  adaptBookingSummary,
  adaptFinanceRows,
  adaptFinanceSummary,
  adaptStockRows,
  adaptStockSummary,
  formatRupiah,
} from "@/pages/kst-cangar/adapters";
import { ngijoNumber } from "@/pages/kst-ngijo/adapters";
import { parseDate } from "@/pages/kst-jatikerto/dashboardUi";
import {
  fieldAliases,
  getDateValue,
  getNumberValue,
  getTextValue,
  type JatikertoApiRow,
} from "@/pages/kst-jatikerto/rowMappers";
import { adaptDashboardSummary, sourceData } from "./adapters";

type IconComponent = ComponentType<{ className?: string }>;
type Tone = "emerald" | "amber" | "teal";

const KST_KEYS = ["ngijo", "cangar", "jatikerto"] as const;
const EMPTY_TEXT = "Data belum tersedia";
const WAITING_TEXT = "Data belum tersedia";
const EMPTY_MESSAGE = "Belum ada data yang dilaporkan";
const ERROR_MESSAGE = "Data tidak dapat dimuat saat ini";

const toneClass = {
  emerald: {
    accent: "bg-emerald-600",
    badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
    icon: "border-emerald-100 bg-emerald-50 text-emerald-700",
    progress: "bg-emerald-600",
    soft: "bg-emerald-50 text-emerald-700",
    text: "text-emerald-700",
  },
  amber: {
    accent: "bg-amber-500",
    badge: "border-amber-200 bg-amber-50 text-amber-700",
    icon: "border-amber-100 bg-amber-50 text-amber-700",
    progress: "bg-amber-500",
    soft: "bg-amber-50 text-amber-700",
    text: "text-amber-700",
  },
  teal: {
    accent: "bg-teal-500",
    badge: "border-teal-200 bg-teal-50 text-teal-700",
    icon: "border-teal-100 bg-teal-50 text-teal-700",
    progress: "bg-teal-500",
    soft: "bg-teal-50 text-teal-700",
    text: "text-teal-700",
  },
} satisfies Record<Tone, Record<string, string>>;

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function hasValue(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function formatNumber(value: number | null | undefined, suffix?: string) {
  if (!hasValue(value)) return EMPTY_TEXT;
  return [value.toLocaleString("id-ID"), suffix].filter(Boolean).join(" ");
}

function formatPercent(value: number | null | undefined) {
  if (!hasValue(value)) return EMPTY_TEXT;
  return `${value.toLocaleString("id-ID")}%`;
}

function dataStatusText(
  isLoading: boolean,
  error?: string | null,
  hasData = false,
) {
  if (isLoading) return <LoadingIndicator label="Memuat data" />;
  if (error) return ERROR_MESSAGE;
  return hasData ? "" : EMPTY_MESSAGE;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function normalizeFieldName(value: string) {
  return value.replace(/[\s_-]/g, "").toLowerCase();
}

function parseNumericValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.replace(/[^\d,-.]/g, "").replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function parseJsonValue(value: unknown): unknown {
  if (typeof value !== "string") return value;

  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}

function findNumericField(
  payload: unknown,
  aliases: readonly string[],
  depth = 0,
): number | null {
  if (depth > 6) return null;
  const parsed = parseJsonValue(payload);
  if (parsed !== payload) return findNumericField(parsed, aliases, depth + 1);

  if (Array.isArray(payload)) {
    for (const item of payload) {
      const nested = findNumericField(item, aliases, depth + 1);
      if (nested !== null) return nested;
    }
    return null;
  }

  if (!isRecord(payload)) return null;

  const normalizedAliases = new Set(aliases.map(normalizeFieldName));
  for (const [key, value] of Object.entries(payload)) {
    if (!normalizedAliases.has(normalizeFieldName(key))) continue;
    const numberValue = parseNumericValue(value);
    if (numberValue !== null) return numberValue;
  }

  for (const key of ["data", "response", "summary", "stok", "stock"]) {
    if (!(key in payload)) continue;
    const nested = findNumericField(payload[key], aliases, depth + 1);
    if (nested !== null) return nested;
  }

  return null;
}

function sourceStatusLabel(
  source: ReturnType<typeof sourceData>,
  label: string,
  summaryLoaded: boolean,
) {
  if (source.warning) return `${label} belum tersedia`;
  if (source.status || source.data) return `${label} belum ada highlight yang dapat ditampilkan`;
  return summaryLoaded ? `${label} belum tersedia` : `${label} memuat data`;
}

function CardShell({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={`overflow-hidden rounded-2xl border-gray-200 bg-white shadow-sm ${className}`}>
      {children}
    </Card>
  );
}

function SectionHeader({
  title,
  tone,
  description,
}: {
  title: string;
  tone: Tone;
  description?: string;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <div className="mb-3 flex items-center gap-3">
          <span className={`h-1 w-9 rounded-full ${toneClass[tone].accent}`} />
          <Badge className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${toneClass[tone].badge}`}>
            Ringkasan operasional
          </Badge>
        </div>
        <h2 className="text-xl font-bold tracking-tight text-gray-950 md:text-2xl">{title}</h2>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-600">{description}</p>
        ) : null}
      </div>
    </div>
  );
}

function HeroOverview({
  kstValue,
  indicatorValue,
  focusValue,
}: {
  kstValue: ReactNode;
  indicatorValue: ReactNode;
  focusValue: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm">
      <div className="relative px-5 py-6 md:px-7">
        <div className="absolute inset-y-0 right-0 hidden w-2/5 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.18),transparent_42%),linear-gradient(to_left,rgba(240,253,244,0.95),transparent)] md:block" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-4 flex flex-wrap gap-2">
              <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">
                Executive Dashboard
              </Badge>
              <Badge className="border-lime-200 bg-lime-50 text-lime-700">
                Ngijo
              </Badge>
              <Badge className="border-lime-200 bg-lime-50 text-lime-700">
                Cangar
              </Badge>
              <Badge className="border-lime-200 bg-lime-50 text-lime-700">
                Jatikerto
              </Badge>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-950 md:text-3xl">
              Beranda Executive Dashboard
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
              Ringkasan lintas KST untuk memantau riset, keberlanjutan, operasional,
              agro, dan konservasi dari data yang sudah tersedia.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[440px]">
            {[
              { label: "KST terpantau", value: kstValue },
              { label: "Indikator tercatat", value: indicatorValue },
              { label: "Fokus aktif", value: focusValue },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-3 text-left lg:text-right"
              >
                <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                  {item.label}
                </p>
                <p className="mt-1 text-2xl font-bold text-gray-950">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ExecutiveSummaryCard({
  label,
  value,
  description,
  icon: Icon,
  featured = false,
  children,
}: {
  label: string;
  value: ReactNode;
  description: string;
  icon: IconComponent;
  featured?: boolean;
  children?: ReactNode;
}) {
  if (featured) {
    return (
      <CardShell className="border-emerald-900 bg-emerald-950 text-white shadow-md shadow-emerald-950/15">
        <CardContent className="relative min-h-[158px] p-5">
          <div className="absolute -bottom-10 -right-8 size-32 rounded-full border-[18px] border-emerald-700/35" />
          <div className="relative">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-100">{label}</p>
              <div className="grid size-10 place-items-center rounded-xl border border-white/10 bg-white/10">
                <Icon className="size-5" />
              </div>
            </div>
            <div className="mt-4 text-4xl font-bold leading-none tracking-tight">{value}</div>
            <div className="mt-5 flex items-center gap-2 text-xs font-semibold text-emerald-100">
              <span className="size-2 rounded-full bg-emerald-300" />
              <span>{description}</span>
            </div>
          </div>
        </CardContent>
      </CardShell>
    );
  }

  return (
    <CardShell>
      <CardContent className="flex min-h-[158px] flex-col justify-between p-5">
        <div>
          <div className="flex items-start justify-between gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{label}</p>
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-2 text-emerald-700">
              <Icon className="size-5" />
            </div>
          </div>
          <div className="mt-3 break-words text-3xl font-bold leading-tight tracking-tight text-gray-950">{value}</div>
          <p className="mt-2 text-sm leading-5 text-gray-500">{description}</p>
        </div>
        {children ? (
          <div className="mt-4">{children}</div>
        ) : (
          <div className="mt-4 text-xs font-semibold text-emerald-700">Data tersedia</div>
        )}
      </CardContent>
    </CardShell>
  );
}

function IconBadge({ icon: Icon, tone }: { icon: IconComponent; tone: Tone }) {
  return (
    <div className={`grid size-11 shrink-0 place-items-center rounded-xl border ${toneClass[tone].icon}`}>
      <Icon className="size-5" />
    </div>
  );
}

function CompactMetricCard({
  label,
  value,
  description,
  icon,
  tone,
  className = "",
}: {
  label: string;
  value: ReactNode;
  description: ReactNode;
  icon: IconComponent;
  tone: Tone;
  className?: string;
}) {
  return (
    <CardShell className={className}>
      <CardContent className="flex min-h-[124px] items-center gap-4 p-5">
        <IconBadge icon={icon} tone={tone} />
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{label}</p>
          <div className="mt-1 break-words text-2xl font-bold leading-tight tracking-tight text-gray-950">{value}</div>
          {description ? (
            <div className="mt-1 text-xs leading-5 text-gray-500">{description}</div>
          ) : null}
        </div>
      </CardContent>
    </CardShell>
  );
}

function ProgressLine({
  label,
  value,
  max = 100,
  tone,
}: {
  label: string;
  value: number | null;
  max?: number;
  tone: Tone;
}) {
  const percent = value === null ? 0 : clamp((value / max) * 100);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
        <span className="min-w-0">{label}</span>
        <span className={toneClass[tone].text}>{value === null ? EMPTY_TEXT : `${Math.round(percent)}%`}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
        <div className={`h-full rounded-full ${toneClass[tone].progress}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function SemiGauge({
  value,
  max,
  tone,
}: {
  value: number | null;
  max: number;
  tone: Tone;
}) {
  const percent = value === null ? 0 : clamp((value / max) * 100);
  const color = tone === "emerald" ? "#059669" : tone === "amber" ? "#f59e0b" : "#14b8a6";

  return (
    <div className="mx-auto grid w-full max-w-[260px] place-items-center pt-3">
      <div
        className="relative h-[118px] w-full overflow-hidden"
        style={{
          background: `conic-gradient(from 270deg at 50% 100%, ${color} ${percent / 2}%, #e5e7eb 0 50%, transparent 0)`,
          borderTopLeftRadius: 260,
          borderTopRightRadius: 260,
        }}
      >
        <div className="absolute bottom-0 left-1/2 h-[82px] w-[72%] -translate-x-1/2 rounded-t-full bg-white" />
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-center">
          <div className="text-3xl font-bold leading-none tracking-tight text-gray-950">
            {value === null ? "-" : value.toLocaleString("id-ID", { maximumFractionDigits: 1 })}
          </div>
          <div className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500">Avg TRL</div>
        </div>
      </div>
    </div>
  );
}

function DonutMetricCard({
  total,
  pending,
  isLoading,
  error,
}: {
  total: number | null;
  pending: number | null;
  isLoading: boolean;
  error?: string | null;
}) {
  const safeTotal = total ?? 0;
  const safePending = pending ?? 0;
  const completed = Math.max(safeTotal - safePending, 0);
  const completedPercent = safeTotal > 0 ? clamp((completed / safeTotal) * 100) : 0;

  return (
    <CardShell>
      <CardContent className="flex min-h-[250px] flex-col p-5">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Booking vs Pending</p>
        <div className="mt-6 grid place-items-center">
          <div
            className="grid size-32 place-items-center rounded-full"
            style={{
              background: `conic-gradient(#92400e ${completedPercent}%, #fde68a 0)`,
            }}
          >
            <div className="grid size-24 place-items-center rounded-full bg-white">
              <div className="text-center">
                <div className="text-3xl font-bold tracking-tight text-gray-950">
                  {isLoading ? <LoadingIndicator /> : `${Math.round(completedPercent)}%`}
                </div>
                <div className="text-[11px] font-bold text-gray-500">Booking aktif</div>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-auto flex flex-wrap gap-3 text-xs font-bold text-gray-600">
          <span className="flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-amber-800" />
            {formatNumber(total)}
          </span>
          <span className="flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-amber-200" />
            {formatNumber(pending)} pending
          </span>
        </div>
        {dataStatusText(isLoading, error, total !== null) ? (
          <p className="mt-3 text-xs leading-5 text-gray-500">
            {dataStatusText(isLoading, error, total !== null)}
          </p>
        ) : null}
      </CardContent>
    </CardShell>
  );
}

function MiniBarComparisonCard({
  title,
  leftLabel,
  leftValue,
  rightLabel,
  rightValue,
  message,
}: {
  title: string;
  leftLabel: string;
  leftValue: number | null;
  rightLabel: string;
  rightValue: number | null;
  message?: ReactNode;
}) {
  const hasValues = leftValue !== null && rightValue !== null;
  const safeLeftValue = leftValue ?? 0;
  const safeRightValue = rightValue ?? 0;
  const maxValue = Math.max(safeLeftValue, safeRightValue, 1);
  const rows = [
    { label: leftLabel, value: leftValue, safeValue: safeLeftValue, icon: ArrowDownRight, color: "bg-amber-700" },
    { label: rightLabel, value: rightValue, safeValue: safeRightValue, icon: ArrowUpRight, color: "bg-blue-200" },
  ];

  return (
    <CardShell>
      <CardContent className="flex min-h-[250px] flex-col p-5">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{title}</p>
        <div className="mt-6 space-y-5">
          {rows.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="space-y-2">
                <div className="flex items-center justify-between gap-3 text-sm font-bold text-gray-700">
                  <span className="flex min-w-0 items-center gap-2">
                    <Icon className="size-4 shrink-0 text-gray-500" />
                    <span className="truncate">{item.label}</span>
                  </span>
                  <span>{formatNumber(item.value)}</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className={`h-full rounded-full ${item.color}`}
                    style={{ width: `${hasValues ? (item.safeValue / maxValue) * 100 : 0}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        {message ? (
          <div className="mt-auto rounded-xl bg-amber-50 p-4 text-sm leading-5 text-amber-900">
            {message}
          </div>
        ) : null}
      </CardContent>
    </CardShell>
  );
}

function FinancialHighlightCard({
  saldo,
  income,
  expense,
  itemCount,
  isLoading,
  error,
}: {
  saldo: number | null;
  income: number | null;
  expense: number | null;
  itemCount: number | null;
  isLoading: boolean;
  error?: string | null;
}) {
  return (
    <CardShell className="border-amber-100">
      <CardContent className="relative flex min-h-[250px] flex-col p-5">
        <div className="absolute -right-10 -top-10 size-32 rounded-full bg-amber-50" />
        <div className="relative">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Financial Highlight</p>
          <p className="mt-5 text-sm font-medium text-gray-500">Saldo aktif unit</p>
          <div className="mt-2 break-words text-3xl font-bold leading-tight tracking-tight text-gray-950">
            {isLoading ? <LoadingIndicator /> : saldo === null ? EMPTY_TEXT : formatRupiah(saldo)}
          </div>
        </div>
        <div className="relative mt-auto space-y-3 border-t border-gray-100 pt-4 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-gray-500">Pemasukan</span>
            <span className="font-extrabold text-emerald-700">
              {income === null ? EMPTY_TEXT : formatRupiah(income)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-gray-500">Pengeluaran</span>
            <span className="font-extrabold text-amber-700">
              {expense === null ? EMPTY_TEXT : formatRupiah(expense)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-gray-500">Barang terpantau</span>
            <span className="font-extrabold text-gray-950">{formatNumber(itemCount)}</span>
          </div>
        </div>
        {dataStatusText(isLoading, error, saldo !== null || itemCount !== null) ? (
          <p className="relative mt-3 text-xs leading-5 text-gray-500">
            {dataStatusText(isLoading, error, saldo !== null || itemCount !== null)}
          </p>
        ) : null}
      </CardContent>
    </CardShell>
  );
}

function HarvestBars({ rows }: { rows: JatikertoApiRow[] }) {
  const values = rows
    .map((row, index) => ({
      label: getTextValue(row, 0, fieldAliases.nama, `Item ${index + 1}`),
      value: getNumberValue(row, 4, ["proyeksiPanen", "proyeksi_panen", "panen", ...fieldAliases.jumlah], 0),
    }))
    .filter((item) => item.value > 0)
    .sort((left, right) => right.value - left.value)
    .slice(0, 8);
  const maxValue = Math.max(...values.map((item) => item.value), 1);
  const axisTicks = Array.from({ length: 5 }, (_, index) => (maxValue * (4 - index)) / 4);

  if (values.length === 0) {
    return (
      <div className="mt-5 grid min-h-[230px] flex-1 place-items-center rounded-xl border border-dashed border-teal-100 bg-teal-50/60 px-5 text-center text-sm font-semibold text-teal-700">
        Data panen belum tersedia
      </div>
    );
  }

  return (
    <div className="mt-5 flex min-h-[230px] flex-1 flex-col">
      <div className="grid flex-1 grid-cols-[48px_minmax(0,1fr)] gap-3">
        <div className="relative min-h-[190px] text-[10px] font-semibold text-gray-400">
          {axisTicks.map((tick, index) => (
            <span
              key={`${tick}-${index}`}
              className="absolute right-0 -translate-y-1/2 tabular-nums"
              style={{ top: `${(index / (axisTicks.length - 1)) * 100}%` }}
            >
              {formatNumber(Math.round(tick), "Kg")}
            </span>
          ))}
        </div>
        <div className="relative min-h-[190px] overflow-hidden rounded-xl border border-teal-100/70 bg-teal-50/25 px-3 pb-0 pt-4">
          <div className="pointer-events-none absolute inset-x-3 bottom-0 top-4">
            {axisTicks.map((tick, index) => (
              <div
                key={`${tick}-line-${index}`}
                className="absolute left-0 right-0 border-t border-teal-900/10"
                style={{ top: `${(index / (axisTicks.length - 1)) * 100}%` }}
              />
            ))}
          </div>
          <div className="pointer-events-none absolute bottom-0 left-3 right-3 top-4 grid" style={{ gridTemplateColumns: `repeat(${values.length}, minmax(0, 1fr))` }}>
            {values.map((item, index) => (
              <div key={`${item.label}-guide-${index}`} className="border-l border-teal-900/[0.06] first:border-l-0" />
            ))}
          </div>
          <div className="relative z-10 flex h-full items-end gap-2 sm:gap-3">
            {values.map((item, index) => (
              <div key={`${item.label}-${index}`} className="flex h-full min-w-0 flex-1 items-end justify-center">
                <div
                  className={`w-full max-w-14 rounded-t-lg shadow-sm ${index === 0 ? "bg-teal-600" : "bg-teal-200"}`}
                  style={{ height: `max(${(item.value / maxValue) * 100}%, 28px)` }}
                  title={`${item.label}: ${formatNumber(item.value, "Kg")}`}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-2 grid grid-cols-[48px_minmax(0,1fr)] gap-3">
        <div />
        <div className="flex gap-2 sm:gap-3">
          {values.map((item, index) => (
            <span
              key={`${item.label}-label-${index}`}
              className="min-w-0 flex-1 truncate text-center text-[11px] font-bold leading-4 text-gray-500"
              title={item.label}
            >
              {item.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function getResearchStatus(row: JatikertoApiRow) {
  const start = parseDate(getDateValue(row, 3, ["mulai", "tanggalMulai", "tanggal_mulai", "startDate", "start_date"]));
  const end = parseDate(getDateValue(row, 4, ["selesai", "tanggalSelesai", "tanggal_selesai", "endDate", "end_date"]));
  if (!start || !end) return "-";

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  if (start > today) return "Akan Dimulai";
  if (end < today) return "Selesai";
  return "Aktif";
}

export default function Dashboard() {
  const {
    data: summaryPayload,
    isLoading: isSummaryLoading,
    error: summaryError,
  } = useApiData<unknown>(API_ENDPOINTS.dashboard.summary);

  const { data: averageTrlPayload, isLoading: isAverageTrlLoading, error: averageTrlError } =
    useApiData<unknown>(API_ENDPOINTS.kst.ngijo.averageTrl);
  const { data: greenPerformancePayload, isLoading: isGreenLoading, error: greenError } =
    useApiData<unknown>(API_ENDPOINTS.kst.ngijo.greenPerformance);
  const { data: renewableEnergyPayload, isLoading: isRenewableLoading, error: renewableError } =
    useApiData<unknown>(API_ENDPOINTS.kst.ngijo.renewableEnergy);
  const { data: pendingPatentsPayload } = useApiData<unknown>(
    API_ENDPOINTS.kst.ngijo.pendingPatents,
  );
  const { data: ngijoCollaborationPayload } = useApiData<unknown>(
    API_ENDPOINTS.kst.ngijo.collaboration,
  );

  const { data: cangarSummaryPayload } = useApiData<unknown>(
    API_ENDPOINTS.kst.cangar.summary,
  );
  const { data: bookingPayload, isLoading: isBookingLoading, error: bookingError } =
    useApiData<unknown>(API_ENDPOINTS.kst.cangar.booking, { limit: 100 });
  const { data: stockPayload, isLoading: isStockLoading, error: stockError } =
    useApiData<unknown>(API_ENDPOINTS.kst.cangar.stock, { limit: 100 });
  const { data: stockItemsPayload } = useApiData<unknown>(
    API_ENDPOINTS.kst.cangar.stockItems,
    { limit: 100 },
  );
  const { data: financePayload, isLoading: isFinanceLoading, error: financeError } =
    useApiData<unknown>(API_ENDPOINTS.kst.cangar.finance, { limit: 100 });
  const { data: financeRecapPayload } = useApiData<unknown>(
    API_ENDPOINTS.kst.cangar.financeRecap,
  );

  const { items: pertanianRows, isLoading: isPertanianLoading, error: pertanianError } =
    usePageData<JatikertoApiRow>(API_ENDPOINTS.kst.jatikerto.pertanianItems, {
      year: "2026",
      month: "Semua Bulan",
      limit: 50,
    });
  const { items: peternakanRows, isLoading: isPeternakanLoading, error: peternakanError } =
    usePageData<JatikertoApiRow>(API_ENDPOINTS.kst.jatikerto.peternakanItems, {
      year: "2026",
      month: "Semua Bulan",
      limit: 50,
    });
  const { items: konservasiHewanRows } = usePageData<JatikertoApiRow>(
    API_ENDPOINTS.kst.jatikerto.konservasiHewan,
    { year: "2026", month: "Semua Bulan", limit: 50 },
  );
  const { items: konservasiTanamanRows, isLoading: isKonservasiLoading, error: konservasiError } =
    usePageData<JatikertoApiRow>(API_ENDPOINTS.kst.jatikerto.konservasiTanaman, {
      year: "2026",
      month: "Semua Bulan",
      limit: 50,
    });
  const { items: akademikRows, isLoading: isAkademikLoading, error: akademikError } =
    usePageData<JatikertoApiRow>(API_ENDPOINTS.kst.jatikerto.akademikItems, {
      year: "2026",
      month: "Semua Bulan",
      limit: 50,
    });

  const summary = adaptDashboardSummary(summaryPayload);
  const sources = KST_KEYS.map((key) => sourceData(summary, key));
  const summaryLoaded = !isSummaryLoading && !summaryError;
  const integratedKst = sources.filter((source) => source.data && !source.warning).length;

  const averageTrl = ngijoNumber(averageTrlPayload);
  const greenPerformance = ngijoNumber(greenPerformancePayload);
  const renewableEnergy = ngijoNumber(renewableEnergyPayload);
  const pendingPatents = ngijoNumber(pendingPatentsPayload);
  const ngijoCollaboration = ngijoNumber(ngijoCollaborationPayload);
  const ngijoPartnershipMetric = ngijoCollaboration ?? pendingPatents;

  const bookingRows = adaptBookingRows(bookingPayload);
  const bookingSummary = adaptBookingSummary(cangarSummaryPayload ?? bookingPayload, bookingRows);
  const totalBooking = bookingRows.length || bookingSummary.confirmedMonth + bookingSummary.pending;
  const hasBookingData = bookingPayload !== null || bookingRows.length > 0;
  const displayTotalBooking = hasBookingData ? totalBooking : null;
  const displayPendingBooking = hasBookingData ? bookingSummary.pending : null;
  const directStockRows = adaptStockRows(stockPayload);
  const pagedStockRows =
    directStockRows.length === 0 && stockPayload !== null
      ? adaptStockRows(parsePageContainer<unknown>(stockPayload)?.items ?? [])
      : [];
  const stockItemRows = adaptStockRows(stockItemsPayload);
  const primaryStockRows = directStockRows.length > 0 ? directStockRows : pagedStockRows;
  const stockRows =
    primaryStockRows.length > 0 && stockItemRows.length > 0
      ? Array.from(
          new Map(
            [...stockItemRows, ...primaryStockRows].map((row) => [
              row.namaBarang.toLowerCase(),
              row,
            ]),
          ).values(),
        )
      : primaryStockRows.length > 0
        ? primaryStockRows
        : stockItemRows;
  const stockSummary = adaptStockSummary(cangarSummaryPayload, stockRows);
  const summaryStockIn = findNumericField(cangarSummaryPayload, [
    "stok_masuk",
    "stokMasuk",
    "stock_in",
    "total_masuk",
    "masuk",
  ]);
  const summaryStockOut = findNumericField(cangarSummaryPayload, [
    "stok_keluar",
    "stokKeluar",
    "stock_out",
    "total_keluar",
    "keluar",
  ]);
  const summaryStockItems = findNumericField(cangarSummaryPayload, [
    "total_barang",
    "totalBarang",
    "total_items",
    "total_stok",
  ]);
  const hasStockRows = stockRows.length > 0;
  const rowStockIn = stockRows.reduce((total, row) => total + row.totalMasuk, 0);
  const rowStockOut = stockRows.reduce((total, row) => total + row.totalKeluar, 0);
  const displayStockItems = hasStockRows
    ? stockSummary.totalBarang || stockRows.length
    : summaryStockItems;
  const displayStockIn = hasStockRows ? rowStockIn : summaryStockIn;
  const displayStockOut = hasStockRows ? rowStockOut : summaryStockOut;
  const financeRows = adaptFinanceRows(financePayload);
  const financeSummary = adaptFinanceSummary(financeRecapPayload ?? financePayload, financeRows);
  const hasFinanceData = financeRecapPayload !== null || financePayload !== null || financeRows.length > 0;
  const displaySaldo = hasFinanceData ? financeSummary.saldoHariIni : null;
  const displayIncome = hasFinanceData ? financeSummary.pemasukanHariIni : null;
  const displayExpense = hasFinanceData ? financeSummary.pengeluaranHariIni : null;

  const totalPanen = pertanianRows.reduce(
    (sum, row) =>
      sum +
      getNumberValue(row, 4, ["proyeksiPanen", "proyeksi_panen", "panen", ...fieldAliases.jumlah], 0),
    0,
  );
  const totalPopulasiTernak = peternakanRows.reduce(
    (sum, row) => sum + getNumberValue(row, 4, fieldAliases.jumlah, 0),
    0,
  );
  const totalKonservasi =
    konservasiHewanRows.reduce(
      (sum, row) => sum + getNumberValue(row, 2, fieldAliases.jumlah, 0),
      0,
    ) +
    konservasiTanamanRows.reduce(
      (sum, row) => sum + getNumberValue(row, 4, fieldAliases.jumlah, 0),
      0,
    );
  const activeAcademicResearch = akademikRows.filter(
    (row) => getResearchStatus(row) === "Aktif",
  ).length;
  const displayTotalPanen = pertanianRows.length > 0 ? totalPanen : null;
  const displayKomoditasAgro = pertanianRows.length > 0 ? pertanianRows.length : null;
  const displayPopulasiTernak = peternakanRows.length > 0 ? totalPopulasiTernak : null;
  const displayKonservasi = totalKonservasi > 0 ? totalKonservasi : null;
  const displayActiveResearch = akademikRows.length > 0 ? activeAcademicResearch : null;
  const conservationOrResearchMetric = displayKonservasi ?? displayActiveResearch;

  const mainIndicators = [
    averageTrl,
    greenPerformance,
    renewableEnergy,
    ngijoPartnershipMetric,
    displayTotalBooking,
    displayPendingBooking,
    displayStockItems,
    displaySaldo,
    displayTotalPanen,
    displayKomoditasAgro,
    displayPopulasiTernak,
    conservationOrResearchMetric,
  ].filter(hasValue).length;

  const hasNgijoData = [averageTrl, greenPerformance, renewableEnergy, ngijoPartnershipMetric].some(hasValue);
  const hasCangarData = [displayTotalBooking, displayStockItems, displaySaldo].some(hasValue);
  const hasJatikertoData = [
    displayTotalPanen,
    displayKomoditasAgro,
    displayPopulasiTernak,
    conservationOrResearchMetric,
  ].some(hasValue);
  const directKstAvailability = [hasNgijoData, hasCangarData, hasJatikertoData];
  const directKstCount = directKstAvailability.filter(Boolean).length;
  const hasEndpointError = Boolean(
    summaryError ||
      averageTrlError ||
      greenError ||
      renewableError ||
      bookingError ||
      stockError ||
      financeError ||
      pertanianError ||
      peternakanError ||
      konservasiError ||
      akademikError,
  );
  const isAnyLoading =
    isSummaryLoading ||
    isAverageTrlLoading ||
    isGreenLoading ||
    isRenewableLoading ||
    isBookingLoading ||
    isStockLoading ||
    isFinanceLoading ||
    isPertanianLoading ||
    isPeternakanLoading ||
    isKonservasiLoading ||
    isAkademikLoading;
  const ngijoStatusMessage = dataStatusText(
    isAverageTrlLoading || isGreenLoading,
    averageTrlError || greenError,
    averageTrl !== null || greenPerformance !== null,
  );
  const renewableStatusMessage = dataStatusText(
    isRenewableLoading,
    renewableError,
    renewableEnergy !== null,
  );
  const stockComparisonMessage = isStockLoading
    ? <LoadingIndicator label="Memuat data" />
    : stockError
      ? "Data stok tidak dapat dimuat saat ini"
      : displayStockIn === null || displayStockOut === null
        ? "Belum ada data stok yang dilaporkan"
        : "";
  const harvestStatusMessage = dataStatusText(
    isPertanianLoading,
    pertanianError,
    displayTotalPanen !== null,
  );
  const livestockStatusMessage = dataStatusText(
    isPeternakanLoading,
    peternakanError,
    displayPopulasiTernak !== null,
  );
  const conservationStatusMessage =
    displayKonservasi !== null
      ? dataStatusText(isKonservasiLoading, konservasiError, true)
      : dataStatusText(isAkademikLoading, akademikError, displayActiveResearch !== null);
  const kstTerpantauValue = isSummaryLoading
    ? <LoadingIndicator />
    : summary.activeKst !== null && summary.totalKst !== null
      ? `${summary.activeKst}/${summary.totalKst}`
      : `${Math.max(integratedKst, directKstCount)}/${KST_KEYS.length}`;
  const focusAktifValue = `${[hasCangarData, hasJatikertoData].filter(Boolean).length} fokus`;

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 md:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
        <HeroOverview
          kstValue={kstTerpantauValue}
          indicatorValue={mainIndicators > 0 ? mainIndicators : isAnyLoading ? <LoadingIndicator /> : WAITING_TEXT}
          focusValue={focusAktifValue}
        />

        {hasEndpointError ? (
          <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800 shadow-sm">
            Sebagian data belum dapat dimuat. Highlight yang tersedia tetap ditampilkan.
          </div>
        ) : null}

        {sources.some((source, index) => !directKstAvailability[index] && (source.warning || summaryLoaded)) ? (
          <div className="flex flex-wrap gap-2">
            {sources.map((source, index) => {
              const label = ["Ngijo", "Cangar", "Jatikerto"][index];
              const hasDirectData = directKstAvailability[index];
              const isWarning = Boolean(source.warning);
              if (hasDirectData || (!isWarning && !summaryLoaded)) return null;

              return (
                <Badge
                  key={label}
                  variant="outline"
                  className={`rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold shadow-sm ${
                    isWarning ? "border-amber-200 text-amber-700" : "border-gray-200 text-gray-500"
                  }`}
                >
                  {sourceStatusLabel(source, label, summaryLoaded)}
                </Badge>
              );
            })}
          </div>
        ) : null}

        <section className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <ExecutiveSummaryCard
              label="KST Terpantau"
              value={kstTerpantauValue}
              description="Data tersedia dari unit yang berhasil dimuat"
              icon={Activity}
              featured
            />
            <ExecutiveSummaryCard
              label="Total Indikator Utama"
              value={mainIndicators > 0 ? mainIndicators : isAnyLoading ? <LoadingIndicator /> : WAITING_TEXT}
              description="Highlight yang memiliki data angka"
              icon={ClipboardList}
            >
              <div className="flex items-center gap-3">
                {[0, 1, 2, 3].map((item) => (
                  <span
                    key={item}
                    className={`h-5 rounded-full ${item % 2 === 0 ? "w-10 bg-emerald-200" : "w-8 bg-emerald-900"}`}
                  />
                ))}
              </div>
            </ExecutiveSummaryCard>
            <ExecutiveSummaryCard
              label="Fokus Riset & Keberlanjutan"
              value={
                hasNgijoData
                  ? formatPercent(greenPerformance)
                  : isAverageTrlLoading || isGreenLoading
                    ? <LoadingIndicator />
                    : WAITING_TEXT
              }
              description="TRL, green performance, energi, kolaborasi atau paten"
              icon={Leaf}
            >
              <ProgressLine label="Ngijo" value={greenPerformance} tone="emerald" />
            </ExecutiveSummaryCard>
            <ExecutiveSummaryCard
              label="Fokus Agro / Operasional / Konservasi"
              value={focusAktifValue}
              description="Booking, stok, saldo, panen, ternak, konservasi"
              icon={TrendingUp}
            />
          </div>
        </section>

        <section className="space-y-5">
          <SectionHeader
            title="Ngijo Highlight: Riset & Keberlanjutan"
            tone="emerald"
            description="Memantau kesiapan teknologi, performa hijau, energi terbarukan, dan kolaborasi atau paten."
          />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
            <CardShell className="border-emerald-100">
              <CardContent className="grid gap-6 p-5 md:grid-cols-[minmax(0,1fr)_minmax(240px,1fr)] md:p-6">
                <div className="flex min-h-[260px] flex-col items-center justify-center border-b border-gray-100 pb-6 text-center md:border-b-0 md:border-r md:pb-0 md:pr-6">
                  <SemiGauge value={averageTrl} max={9} tone="emerald" />
                  <h3 className="mt-4 text-xl font-bold text-gray-950">Technology Readiness Level</h3>
                  <p className="mt-2 max-w-sm text-sm leading-6 text-gray-500">
                    Rata-rata TRL dari data riset Ngijo yang tersedia.
                  </p>
                </div>
                <div className="flex min-h-[260px] flex-col justify-center gap-6">
                  <ProgressLine label="Green Performance" value={greenPerformance} tone="emerald" />
                  {ngijoStatusMessage ? (
                    <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-700">Status data</p>
                      <p className="mt-2 text-sm leading-6 text-emerald-900">
                        {ngijoStatusMessage}
                      </p>
                    </div>
                  ) : null}
                </div>
              </CardContent>
            </CardShell>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <CompactMetricCard
                label="Energi Terbarukan"
                value={isRenewableLoading ? <LoadingIndicator /> : formatNumber(renewableEnergy, "MWh")}
                description={renewableStatusMessage}
                icon={Zap}
                tone="emerald"
              />
              <CompactMetricCard
                label={ngijoCollaboration !== null ? "Kolaborasi" : "Paten Tertunda"}
                value={formatNumber(ngijoPartnershipMetric)}
                description={
                  ngijoPartnershipMetric === null
                    ? isAverageTrlLoading || isGreenLoading
                      ? <LoadingIndicator label="Memuat data" />
                      : WAITING_TEXT
                    : ngijoCollaboration !== null
                      ? "Kolaborasi yang dilaporkan API Ngijo."
                      : "Paten tertunda yang dilaporkan API Ngijo."
                }
                icon={Handshake}
                tone="emerald"
              />
            </div>
          </div>
        </section>

        <section className="space-y-5">
          <SectionHeader
            title="Cangar Highlight: Operasional & Keuangan"
            tone="amber"
            description="Ringkasan booking, pergerakan stok, dan kondisi keuangan unit Cangar."
          />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <DonutMetricCard
              total={displayTotalBooking}
              pending={displayPendingBooking}
              isLoading={isBookingLoading}
              error={bookingError}
            />
            <MiniBarComparisonCard
              title="Stok Masuk vs Keluar"
              leftLabel="Stok Masuk"
              leftValue={displayStockIn}
              rightLabel="Stok Keluar"
              rightValue={displayStockOut}
              message={stockComparisonMessage}
            />
            <FinancialHighlightCard
              saldo={displaySaldo}
              income={displayIncome}
              expense={displayExpense}
              itemCount={displayStockItems}
              isLoading={isFinanceLoading}
              error={financeError}
            />
          </div>
        </section>

        <section className="space-y-5">
          <SectionHeader
            title="Jatikerto Highlight: Agro & Konservasi"
            tone="teal"
            description="Ikhtisar pertanian, peternakan, konservasi, dan riset akademik dari data Jatikerto."
          />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
            <CardShell className="h-full border-teal-100">
              <CardContent className="flex h-full min-h-[390px] flex-col p-5 md:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-teal-700">Proyeksi Panen</p>
                    <h3 className="mt-2 text-2xl font-bold tracking-tight text-gray-950">
                      {isPertanianLoading ? <LoadingIndicator /> : formatNumber(displayTotalPanen, "Kg")}
                    </h3>
                    <p className="mt-2 max-w-xl text-sm leading-6 text-gray-500">
                      Visual ringkasan berdasarkan komoditas pertanian yang tersedia, bukan data historis bulanan.
                    </p>
                  </div>
                  <Badge className="w-fit rounded-full border border-teal-200 bg-teal-50 px-2.5 py-1 font-bold text-teal-700">
                    {formatNumber(displayKomoditasAgro)} komoditas
                  </Badge>
                </div>
                <HarvestBars rows={pertanianRows} />
                {harvestStatusMessage ? (
                  <p className="mt-4 text-xs leading-5 text-gray-500">
                    {harvestStatusMessage}
                  </p>
                ) : null}
              </CardContent>
            </CardShell>
            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
              <CompactMetricCard
                label="Komoditas Agro"
                value={isPertanianLoading ? <LoadingIndicator /> : formatNumber(displayKomoditasAgro)}
                description="Jumlah komoditas dari data pertanian Jatikerto."
                icon={Sprout}
                tone="teal"
                className="bg-teal-50/45"
              />
              <CompactMetricCard
                label="Populasi Ternak"
                value={isPeternakanLoading ? <LoadingIndicator /> : formatNumber(displayPopulasiTernak)}
                description={livestockStatusMessage}
                icon={Boxes}
                tone="teal"
                className="bg-teal-50/45"
              />
              <CompactMetricCard
                label={displayKonservasi !== null ? "Populasi Konservasi" : "Mahasiswa Riset"}
                value={
                  isKonservasiLoading || isAkademikLoading
                    ? <LoadingIndicator />
                    : formatNumber(conservationOrResearchMetric)
                }
                description={
                  conservationStatusMessage
                }
                icon={displayKonservasi !== null ? Leaf : GraduationCap}
                tone="teal"
                className="bg-teal-50/45"
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
