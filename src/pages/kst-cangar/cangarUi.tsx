import type { ComponentType, ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { LoadingIndicator } from "@/components/ui/loading-indicator";
import { CANGAR_EMPTY_TEXT, CANGAR_PREPARING_TEXT } from "./cangarHelpers";

type IconComponent = ComponentType<{ className?: string }>;

export type CangarSummaryItem = {
  label: string;
  value: ReactNode;
  icon: IconComponent;
  helper?: string;
  tone?: "neutral" | "green" | "red" | "amber" | "blue";
};

const toneClass = {
  neutral: "border-gray-100 bg-gray-50 text-gray-700",
  green: "border-emerald-100 bg-emerald-50 text-emerald-700",
  red: "border-red-100 bg-red-50 text-red-700",
  amber: "border-amber-100 bg-amber-50 text-amber-700",
  blue: "border-blue-100 bg-blue-50 text-blue-700",
};

export function CangarHero({
  title,
  description,
  lastUpdated,
  badges = [],
}: {
  title: string;
  description: string;
  lastUpdated?: string;
  badges?: string[];
  metric?: { label: string; value: ReactNode };
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm">
      <div className="relative px-5 py-6 md:px-7">
        <div className="absolute inset-y-0 right-0 hidden w-2/5 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.18),transparent_42%),linear-gradient(to_left,rgba(240,253,244,0.95),transparent)] md:block" />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl">
            <div className="mb-4 flex flex-wrap gap-2">
              <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">
                KST Cangar
              </Badge>
              {badges.map((badge) => (
                <Badge key={badge} className="border-lime-200 bg-lime-50 text-lime-700">
                  {badge}
                </Badge>
              ))}
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-950 md:text-3xl">
              {title}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
              {description}
            </p>
          </div>
          {lastUpdated ? (
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-3 text-left md:text-right">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                Data dimuat pada
              </p>
              <p className="mt-1 text-sm font-bold text-gray-900">{lastUpdated}</p>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export function CangarSummaryCards({ items }: { items: CangarSummaryItem[] }) {
  return (
    <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[12px] font-semibold uppercase tracking-wide text-gray-500">
                {item.label}
              </p>
              <p className="mt-2 text-2xl font-bold leading-tight text-gray-950">
                {item.value ?? CANGAR_EMPTY_TEXT}
              </p>
              <p className="mt-1 text-xs font-medium text-gray-500">
                {item.helper ?? "Ringkasan data terbaru"}
              </p>
            </div>
            <div className={`rounded-xl border p-2 ${toneClass[item.tone ?? "neutral"]}`}>
              <item.icon className="size-5" />
            </div>
          </div>
        </div>
      ))}
    </section>
  );
}

export function CangarAlert({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800 shadow-sm">
      {children}
    </div>
  );
}

export function CangarEmptyState({
  title = CANGAR_PREPARING_TEXT,
  description = "Informasi akan tampil otomatis setelah data tersedia.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="flex min-h-[140px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-emerald-100 bg-emerald-50/40 p-5 text-center">
      <p className="text-sm font-bold text-gray-800">{title}</p>
      <p className="max-w-md text-xs font-medium leading-5 text-gray-500">{description}</p>
    </div>
  );
}

export function CangarTableSkeleton({ columns = 6 }: { columns?: number }) {
  return (
    <div className="space-y-3 px-5 py-5">
      <div className="flex justify-center pb-1">
        <LoadingIndicator label="Memuat data" />
      </div>
      {Array.from({ length: 5 }).map((_, rowIndex) => (
        <div key={rowIndex} className="grid gap-3" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
          {Array.from({ length: columns }).map((__, columnIndex) => (
            <div
              key={columnIndex}
              className="h-4 animate-pulse rounded-full bg-gray-100"
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function tableLoadingRow(colSpan: number) {
  return (
    <tr>
      <td colSpan={colSpan} className="p-0">
        <CangarTableSkeleton columns={colSpan} />
      </td>
    </tr>
  );
}

export const cangarTableHeaderClass = "border-emerald-100 bg-emerald-50/80 hover:bg-emerald-50/80";
export const cangarTableHeadClass = "font-bold text-emerald-900 text-[12px]";
export const cangarTableRowClass = "border-gray-100 transition-colors hover:bg-emerald-50/40";
export const cangarTabsListClass = "h-11 w-max rounded-2xl border border-gray-200 bg-white p-1 shadow-sm";
export const cangarTabsTriggerClass = "rounded-xl px-4 text-[13px] font-semibold data-[state=active]:bg-emerald-600 data-[state=active]:text-white";
