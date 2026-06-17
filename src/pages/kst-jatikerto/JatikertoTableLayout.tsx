import type { ReactNode } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface JatikertoTableLayoutProps {
  categoryName: string;
  subtitle: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  headerContent?: ReactNode;
  beforeTable?: ReactNode;
  children: ReactNode;
}

export function JatikertoTableLayout({
  categoryName,
  subtitle,
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search",
  headerContent,
  beforeTable,
  children,
}: JatikertoTableLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col gap-5 bg-gray-50/50 p-4 md:p-6">
      {headerContent ?? (
        <section className="rounded-lg border border-gray-200 bg-white px-5 py-5 shadow-sm md:px-6">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-bold text-gray-900 md:text-2xl">
              Dashboard {categoryName}
            </h1>
            <p className="text-sm font-medium text-gray-500">{subtitle}</p>
          </div>
        </section>
      )}

      {beforeTable}

      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-gray-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <h2 className="text-base font-bold text-gray-900">
            Tabel {categoryName}
          </h2>

          <div className="relative w-full sm:w-[280px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
            <Input
              type="search"
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(event) => onSearchChange(event.target.value)}
              className="h-9 rounded-xl border-gray-200 bg-white pl-9 text-[13px] shadow-none"
            />
          </div>
        </div>

        {children}
      </section>
    </div>
  );
}

export function rowMatchesSearch<T extends Record<string, unknown>>(
  row: T,
  searchQuery: string,
) {
  const normalizedQuery = searchQuery.trim().toLowerCase();
  if (!normalizedQuery) return true;

  return Object.values(row).some((value) =>
    String(value ?? "").toLowerCase().includes(normalizedQuery),
  );
}
