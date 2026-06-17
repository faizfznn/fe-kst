import type { ComponentType, ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { LoadingIndicator } from "@/components/ui/loading-indicator";
import { cn } from "@/lib/utils";
import { DATA_PREPARING_TEXT } from "./ngijoHelpers";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

type IconComponent = ComponentType<{ className?: string }>;

export type NgijoKpiItem = {
  label: string;
  value: ReactNode;
  icon: IconComponent;
  helper?: string;
  tone?: "emerald" | "lime" | "blue" | "amber" | "slate";
};

const toneClass = {
  emerald: "border-emerald-100 bg-emerald-50 text-emerald-700",
  lime: "border-lime-100 bg-lime-50 text-lime-700",
  blue: "border-sky-100 bg-sky-50 text-sky-700",
  amber: "border-amber-100 bg-amber-50 text-amber-700",
  slate: "border-gray-100 bg-gray-50 text-gray-600",
};

export function NgijoHero({
  title,
  description,
  badges = [],
  metric,
}: {
  title: string;
  description: string;
  badges?: string[];
  metric?: { label: string; value: ReactNode };
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm">
      <div className="relative px-5 py-6 md:px-7">
        <div className="absolute inset-y-0 right-0 hidden w-2/5 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.18),transparent_42%),linear-gradient(to_left,rgba(236,253,245,0.95),transparent)] md:block" />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl">
            <div className="mb-4 flex flex-wrap gap-2">
              <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">
                KST Ngijo
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
          {metric ? (
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-3 text-left md:text-right">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                {metric.label}
              </p>
              <p className="mt-1 text-2xl font-bold text-gray-950">{metric.value}</p>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export function NgijoKpiCards({ items }: { items: NgijoKpiItem[] }) {
  return (
    <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[12px] font-semibold uppercase tracking-wide text-gray-500">
                {item.label}
              </p>
              <p className="mt-2 break-words text-2xl font-bold leading-tight text-gray-950">
                {item.value}
              </p>
              <p className="mt-1 text-xs font-medium leading-5 text-gray-500">
                {item.helper ?? "Ringkasan data Ngijo terbaru"}
              </p>
            </div>
            <div className={cn("rounded-xl border p-2", toneClass[item.tone ?? "emerald"])}>
              <item.icon className="size-5" />
            </div>
          </div>
        </div>
      ))}
    </section>
  );
}

export function NgijoEmptyState({
  title = DATA_PREPARING_TEXT,
  description = "Informasi akan tampil otomatis setelah data dikirim dari backend.",
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

export function NgijoTableSkeleton({ columns = 6 }: { columns?: number }) {
  return (
    <div className="space-y-3 px-5 py-5">
      <div className="flex justify-center pb-1">
        <LoadingIndicator label="Memuat data" />
      </div>
      {Array.from({ length: 5 }).map((_, rowIndex) => (
        <div key={rowIndex} className="grid gap-3" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
          {Array.from({ length: columns }).map((__, columnIndex) => (
            <div key={columnIndex} className="h-4 animate-pulse rounded-full bg-gray-100" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function NgijoPagination({
  currentPage,
  totalPages,
  rowsPerPage,
  onRowsPerPageChange,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  rowsPerPage: string;
  onRowsPerPageChange: (value: string) => void;
  onPageChange: (value: number) => void;
}) {
  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-gray-100 px-4 py-3 sm:flex-row sm:px-5">
      <div className="flex items-center gap-2 text-[13px] font-medium text-gray-500">
        <span className="whitespace-nowrap">Baris per halaman</span>
        <Select value={rowsPerPage} onValueChange={onRowsPerPageChange}>
          <SelectTrigger className="h-8 w-[70px] border-gray-200 bg-white text-[13px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="5">5</SelectItem>
            <SelectItem value="10">10</SelectItem>
            <SelectItem value="25">25</SelectItem>
            <SelectItem value="50">50</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-3">
        <span className="whitespace-nowrap text-[13px] font-medium text-gray-500">
          Halaman {currentPage} dari {totalPages}
        </span>
        <div className="flex items-center gap-1">
          {[
            { icon: ChevronsLeft, action: () => onPageChange(1), disabled: currentPage === 1 },
            { icon: ChevronLeft, action: () => onPageChange(Math.max(1, currentPage - 1)), disabled: currentPage === 1 },
            { icon: ChevronRight, action: () => onPageChange(Math.min(totalPages, currentPage + 1)), disabled: currentPage === totalPages },
            { icon: ChevronsRight, action: () => onPageChange(totalPages), disabled: currentPage === totalPages },
          ].map((btn, index) => (
            <button
              key={index}
              onClick={btn.action}
              disabled={btn.disabled}
              className="rounded-md border border-gray-200 p-1.5 text-gray-400 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <btn.icon className="size-4" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
