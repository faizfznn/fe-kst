import * as React from "react";
import {
  Download,
  FileSpreadsheet,
  FileText,
  Leaf,
  Activity,
  ClipboardList,
  Book,
  Sprout,
  PawPrint,
  GraduationCap,
  Handshake,
} from "lucide-react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { getDownloadUrl } from "@/api/config";
import { useAuth } from "@/hooks/useAuth";

interface ReportDownloadCommandProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

type ReportFormat = "csv" | "xlsx" | "pdf";

interface ReportItem {
  title: string;
  kst: string;
  format: ReportFormat;
  icon: React.ElementType;
}

const reports: ReportItem[] = [
  {
    title: "Tracker Inovasi",
    kst: "KST Ngijo",
    format: "csv",
    icon: Activity,
  },
  {
    title: "Keberlanjutan",
    kst: "KST Ngijo",
    format: "csv",
    icon: Leaf,
  },
  {
    title: "Stok Opname",
    kst: "KST Cangar",
    format: "csv",
    icon: ClipboardList,
  },
  {
    title: "Booklist ATP",
    kst: "KST Cangar",
    format: "csv",
    icon: Book,
  },
  {
    title: "Pertanian",
    kst: "KST Jatikerto",
    format: "csv",
    icon: Sprout,
  },
  {
    title: "Peternakan",
    kst: "KST Jatikerto",
    format: "csv",
    icon: PawPrint,
  },
  {
    title: "Konservasi",
    kst: "KST Jatikerto",
    format: "csv",
    icon: Leaf,
  },
  {
    title: "Pelayanan Akademik",
    kst: "KST Jatikerto",
    format: "csv",
    icon: GraduationCap,
  },
  {
    title: "Kemitraan",
    kst: "KST Jatikerto",
    format: "csv",
    icon: Handshake,
  },
];

async function downloadReport(report: ReportItem) {
  const token = localStorage.getItem("access_token");
  const kst = report.kst.includes("Ngijo")
    ? "ngijo"
    : report.kst.includes("Cangar")
      ? "cangar"
      : "jatikerto";
  const response = await fetch(
    getDownloadUrl("/reports/download", {
      kst,
      report: report.title.toLowerCase().replaceAll(" ", "-"),
      year: "2026",
      month: "Semua Bulan",
      format: report.format,
    }),
    {
      credentials: "include",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    },
  );

  if (!response.ok) throw new Error("Gagal mengunduh laporan");
  const blob = await response.blob();
  const disposition = response.headers.get("content-disposition") ?? "";
  const fileName =
    disposition.match(/filename="([^"]+)"/)?.[1] ??
    `laporan-${report.title.toLowerCase().replaceAll(" ", "-")}.csv`;
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  link.click();

  URL.revokeObjectURL(url);
}

function ReportFormatIcon({ format }: { format: ReportFormat }) {
  if (format === "pdf") {
    return <FileText className="ml-auto size-4 text-red-500" />;
  }

  if (format === "xlsx") {
    return <FileSpreadsheet className="ml-auto size-4 text-emerald-600" />;
  }

  return <Download className="ml-auto size-4 text-gray-400" />;
}

export function ReportDownloadCommand({
  open,
  setOpen,
}: ReportDownloadCommandProps) {
  const { user } = useAuth();
  const allowedReports = React.useMemo(
    () =>
      reports.filter((report) => {
        const kst = report.kst.includes("Ngijo")
          ? "ngijo"
          : report.kst.includes("Cangar")
            ? "cangar"
            : "jatikerto";

        return user?.kstAccess.includes(kst) ?? false;
      }),
    [user?.kstAccess],
  );
  const runDownload = React.useCallback(
    (report: ReportItem) => {
      setOpen(false);
      void downloadReport(report);
    },
    [setOpen]
  );

  const ngijoReports = allowedReports.filter((report) => report.kst === "KST Ngijo");
  const cangarReports = allowedReports.filter((report) => report.kst === "KST Cangar");
  const jatikertoReports = allowedReports.filter(
    (report) => report.kst === "KST Jatikerto"
  );

  const renderReportItem = (report: ReportItem) => {
    const Icon = report.icon;

    return (
      <CommandItem
        key={`${report.kst}-${report.title}`}
        onSelect={() => runDownload(report)}
        className="flex items-center gap-3 py-3 cursor-pointer"
      >
        <Icon className="size-4 text-gray-700" />

        <div className="flex flex-col">
          <span className="text-[14px] font-medium text-gray-900">
            {report.title}
          </span>
          <span className="text-[11px] text-gray-400">
            {report.kst} • {report.format.toUpperCase()}
          </span>
        </div>

        <ReportFormatIcon format={report.format} />
      </CommandItem>
    );
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Cari laporan yang ingin diunduh..." />

      <CommandList>
        <CommandEmpty>Laporan tidak ditemukan.</CommandEmpty>

        {ngijoReports.length > 0 && (
          <>
            <CommandGroup heading="KST Ngijo">
              {ngijoReports.map(renderReportItem)}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {cangarReports.length > 0 && (
          <>
            <CommandGroup heading="KST Cangar">
              {cangarReports.map(renderReportItem)}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {jatikertoReports.length > 0 && (
          <CommandGroup heading="KST Jatikerto">
            {jatikertoReports.map(renderReportItem)}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
