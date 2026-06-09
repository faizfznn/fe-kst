import * as React from "react";
import { useLocation, Link } from "react-router-dom";
import {
  Home,
  ChevronDown,
  Download,
  Activity,
  ClipboardList,
  Book,
  Sprout,
  Leaf,
  GraduationCap,
  Handshake,
  LogOut,
  LayoutDashboard,
  PawPrint,
  X,
  FileText,
  FileSpreadsheet,
  Settings,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/routes/routes";
import { useAuth } from "@/hooks/useAuth";
import { getDownloadUrl } from "@/api/config";

const NAV_ITEMS = [
  {
    title: "Home",
    items: [
      {
        title: "Beranda",
        url: ROUTES.DASHBOARD,
        icon: Home,
      },

      {
        title: "Kelola Akun",
        url: ROUTES.KELOLA_AKUN,
        icon: Settings,
      },
    ],
  },
  {
    title: "KST Ngijo",
    items: [
      {
        title: "Tracker Inovasi",
        url: ROUTES.TRACKER_INOVASI,
        icon: Activity,
      },
      {
        title: "Keberlanjutan",
        url: ROUTES.KEBERLANJUTAN,
        icon: Leaf,
      },
    ],
  },
  {
    title: "KST Cangar",
    items: [
      {
        title: "Stok Opname",
        url: ROUTES.STOK_OPNAME,
        icon: ClipboardList,
      },
      {
        title: "Booklist ATP",
        url: ROUTES.BOOKLIST_ATP,
        icon: Book,
      },
    ],
  },
  {
    title: "KST Jatikerto",
    items: [
      {
        title: "Pertanian",
        url: ROUTES.PERTANIAN,
        icon: Sprout,
      },
      {
        title: "Peternakan",
        url: ROUTES.PETERNAKAN,
        icon: PawPrint,
      },
      {
        title: "Konservasi",
        url: ROUTES.KONSERVASI,
        icon: Leaf,
      },
      {
        title: "Pelayanan Akademik",
        url: ROUTES.PELAYANAN_AKADEMIK,
        icon: GraduationCap,
      },
      {
        title: "Kemitraan",
        url: ROUTES.KEMITRAAN,
        icon: Handshake,
      },
    ],
  },
];

type ReportKst = "ngijo" | "cangar" | "jatikerto";
type ReportFormat = "csv" | "xlsx" | "pdf";

const REPORT_OPTIONS: Record<ReportKst, string[]> = {
  ngijo: ["Tracker Inovasi", "Keberlanjutan"],
  cangar: ["Stok Opname", "Booklist ATP"],
  jatikerto: [
    "Pertanian",
    "Peternakan",
    "Konservasi",
    "Pelayanan Akademik",
    "Kemitraan",
  ],
};

const REPORT_KST_LABELS: Record<ReportKst, string> = {
  ngijo: "KST Ngijo",
  cangar: "KST Cangar",
  jatikerto: "KST Jatikerto",
};

const MONTH_OPTIONS = [
  "Semua Bulan",
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const location = useLocation();
  const { logout, user } = useAuth();

  const [openGroups, setOpenGroups] = React.useState<Record<string, boolean>>({
    Home: true,
    "KST Ngijo": true,
    "KST Cangar": true,
    "KST Jatikerto": true,
  });

  const [isReportModalOpen, setIsReportModalOpen] = React.useState(false);
  const [selectedKst, setSelectedKst] = React.useState<ReportKst>("jatikerto");
  const [selectedReport, setSelectedReport] = React.useState("Pertanian");
  const [selectedYear, setSelectedYear] = React.useState("2026");
  const [selectedMonth, setSelectedMonth] = React.useState("Januari");
  const [selectedFormat, setSelectedFormat] =
    React.useState<ReportFormat>("xlsx");
  const allowedReportKsts = React.useMemo(
    () =>
      (["ngijo", "cangar", "jatikerto"] as ReportKst[]).filter((kst) =>
        user?.kstAccess.includes(kst),
      ),
    [user?.kstAccess],
  );

  const toggleGroup = (title: string) => {
    setOpenGroups((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  };

  const handleChangeKst = (value: ReportKst) => {
    setSelectedKst(value);
    setSelectedReport(REPORT_OPTIONS[value][0]);
  };

  const handleDownloadReport = async () => {
    if (!allowedReportKsts.includes(effectiveSelectedKst)) {
      throw new Error("Tidak memiliki akses untuk mengunduh laporan KST ini");
    }

    const reportName = effectiveSelectedReport.toLowerCase().replaceAll(" ", "-");
    const token = localStorage.getItem("access_token");
    const response = await fetch(
      getDownloadUrl("/reports/download", {
        kst: effectiveSelectedKst,
        report: reportName,
        year: selectedYear,
        month: selectedMonth,
        format: selectedFormat,
      }),
      {
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      },
    );

    if (!response.ok) {
      throw new Error("Gagal mengunduh laporan");
    }

    const blob = await response.blob();
    const disposition = response.headers.get("content-disposition") ?? "";
    const fileName = disposition.match(/filename="([^"]+)"/)?.[1] ?? `laporan-${reportName}.csv`;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = fileName;
    link.click();

    URL.revokeObjectURL(url);
    setIsReportModalOpen(false);
  };

  const allowedNavItems = NAV_ITEMS.map((group) => ({
    ...group,
    items: group.items.filter((item) => {
      if (item.url === ROUTES.KELOLA_AKUN) {
        return user?.activeRole === "super_admin";
      }
      if (group.title === "KST Ngijo") return user?.kstAccess.includes("ngijo");
      if (group.title === "KST Cangar") return user?.kstAccess.includes("cangar");
      if (group.title === "KST Jatikerto") return user?.kstAccess.includes("jatikerto");
      return true;
    }),
  })).filter((group) => group.items.length > 0);

  const roleLabel =
    user?.activeRole === "super_admin"
      ? "Super Admin"
      : user?.activeRole === "manajemen"
        ? "Manajemen"
        : "Operator";

  const initials =
    user?.name
      ?.split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ?? "U";

  const effectiveSelectedKst = allowedReportKsts.includes(selectedKst)
    ? selectedKst
    : allowedReportKsts[0] ?? selectedKst;
  const effectiveSelectedReport = REPORT_OPTIONS[effectiveSelectedKst].includes(selectedReport)
    ? selectedReport
    : REPORT_OPTIONS[effectiveSelectedKst][0];
  const selectedKstLabel = REPORT_KST_LABELS[effectiveSelectedKst];

  React.useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsReportModalOpen(false);
      }
    };

    if (isReportModalOpen) {
      document.addEventListener("keydown", handleEsc);
    }

    return () => {
      document.removeEventListener("keydown", handleEsc);
    };
  }, [isReportModalOpen]);

  return (
    <>
      <Sidebar
        variant="sidebar"
        collapsible="icon"
        className="border-r border-gray-200"
        {...props}
      >
        <SidebarHeader className="p-[9.25px] border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-black text-white">
              <LayoutDashboard className="size-4" />
            </div>

            <div className="flex flex-col gap-0.5 leading-none group-data-[collapsible=icon]:hidden">
              <span className="font-bold text-[12px] text-[#151515]">
                Executive Dashboard
              </span>
              <span className="text-[10px] text-gray-500 font-medium uppercase tracking-tight">
                KST UB
              </span>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent className="px-1 py-3 gap-3">
          <div className="px-1 group-data-[collapsible=icon]:hidden">
            <Button
              onClick={() => setIsReportModalOpen(true)}
              disabled={allowedReportKsts.length === 0}
              className="w-full justify-center gap-2 bg-[#27A376] hover:bg-[#1f8a63] text-white font-semibold rounded-lg h-9 shadow-sm text-[12px]"
            >
              <Download className="size-3" />
              <span>Unduh Laporan</span>
            </Button>
          </div>

          {allowedNavItems.map((group) => {
            const isOpen = openGroups[group.title];

            return (
              <SidebarGroup key={group.title} className="p-0">
                <SidebarGroupLabel
                  className={cn(
                    "px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 flex items-center justify-between group-data-[collapsible=icon]:hidden cursor-pointer hover:text-gray-600 transition-colors",
                    !isOpen && "mb-0"
                  )}
                  onClick={() => toggleGroup(group.title)}
                >
                  {group.title}
                  <ChevronDown
                    className={cn(
                      "size-3 transition-transform duration-200",
                      isOpen ? "rotate-180" : "rotate-0"
                    )}
                  />
                </SidebarGroupLabel>

                <div
                  className={cn(
                    "grid transition-all duration-300 ease-in-out group-data-[collapsible=icon]:hidden",
                    isOpen
                      ? "grid-rows-[1fr] opacity-100 mt-1"
                      : "grid-rows-[0fr] opacity-0 overflow-hidden"
                  )}
                >
                  <SidebarGroupContent className="overflow-hidden">
                    <SidebarMenu className="gap-0.5">
                      {group.items.map((item) => {
                        const isActive = location.pathname === item.url;
                        const Icon = item.icon;

                        return (
                          <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton
                              asChild
                              isActive={isActive}
                              className={cn(
                                "w-full justify-start px-3 py-1.5 rounded-lg transition-colors h-8 text-[12px]",
                                isActive
                                  ? "!bg-[#E6F6EB] !text-[#30A46C] font-semibold hover:bg-[#E9F7F2]"
                                  : "text-gray-600 hover:bg-gray-50 font-medium"
                              )}
                            >
                              <Link
                                to={item.url}
                                className="flex items-center gap-2.5 w-full"
                              >
                                <Icon className="size-3" />
                                <span>{item.title}</span>
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        );
                      })}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </div>
              </SidebarGroup>
            );
          })}
        </SidebarContent>

        <SidebarFooter className="p-3 mt-auto border-t border-gray-100 bg-white">
          <div className="flex items-center gap-2.5 mb-3 group-data-[collapsible=icon]:justify-center">
            <div className="size-8 rounded-full bg-gray-200 overflow-hidden ring-2 ring-gray-100 shrink-0">
              <div className="w-full h-full flex items-center justify-center bg-gray-800 text-white font-bold text-[10px]">
                {initials}
              </div>
            </div>

            <div className="flex flex-col group-data-[collapsible=icon]:hidden">
              <span className="font-bold text-[12px] text-[#151515]">
                {user?.name ?? "User"}
              </span>
              <span className="text-[10px] text-gray-500 font-medium">
                {roleLabel}
              </span>
            </div>
          </div>

          <Button
            variant="outline"
            onClick={() => void logout()}
            className="w-full justify-between gap-2 border-gray-200 text-gray-700 font-semibold hover:bg-red-500 hover:text-white rounded-lg h-8 text-[12px] group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:justify-center"
          >
            <span className="group-data-[collapsible=icon]:hidden">
              Logout
            </span>
            <LogOut className="size-3" />
          </Button>
        </SidebarFooter>
      </Sidebar>

      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 px-4 py-8 backdrop-blur-[3px] overflow-hidden">
          <div className="w-full max-w-[675px] max-h-[calc(100vh-64px)] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl animate-in fade-in-0 zoom-in-95 duration-150 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 shrink-0">
              <div>
                <h2 className="text-[18px] font-bold text-gray-900">
                  Unduh Laporan
                </h2>
                <p className="text-[13px] text-gray-400 mt-0.5">
                  Pilih KST, cabang, periode, dan format file laporan.
                </p>
              </div>

              <button
                onClick={() => setIsReportModalOpen(false)}
                className="rounded-lg p-1.5 hover:bg-gray-100 transition-colors"
              >
                <X className="size-5 text-gray-500" />
              </button>
            </div>

            {/* Body scrollable */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {/* Preview */}
              <div className="mb-5 rounded-xl border border-gray-100 bg-gray-50 px-5 py-4">
                <div className="text-[14px] font-bold text-gray-700">
                  {selectedKstLabel} / {selectedReport}
                </div>

                <p className="mt-1 text-[13px] text-gray-400">
                  {selectedMonth} {selectedYear} • Format{" "}
                  {selectedFormat.toUpperCase()}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
                <div className="space-y-1.5">
                  <label className="text-[13px] font-semibold text-gray-600">
                    Pilih KST
                  </label>

                  <Select
                    value={effectiveSelectedKst}
                    onValueChange={(value) =>
                      handleChangeKst(value as ReportKst)
                    }
                    >
                      <SelectTrigger className="h-11 border-gray-200 bg-white text-[14px] rounded-xl">
                        <SelectValue />
                      </SelectTrigger>

                      <SelectContent>
                        {allowedReportKsts.map((kst) => (
                          <SelectItem key={kst} value={kst}>
                            {REPORT_KST_LABELS[kst]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[13px] font-semibold text-gray-600">
                    Cabang Laporan
                  </label>

                  <Select
                    value={effectiveSelectedReport}
                    onValueChange={setSelectedReport}
                  >
                    <SelectTrigger className="h-11 border-gray-200 bg-white text-[14px] rounded-xl">
                      <SelectValue />
                    </SelectTrigger>

                    <SelectContent>
                      {REPORT_OPTIONS[effectiveSelectedKst].map((report) => (
                        <SelectItem key={report} value={report}>
                          {report}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[13px] font-semibold text-gray-600">
                    Tahun
                  </label>

                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger className="h-11 border-gray-200 bg-white text-[14px] rounded-xl">
                      <SelectValue />
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem value="2024">2024</SelectItem>
                      <SelectItem value="2025">2025</SelectItem>
                      <SelectItem value="2026">2026</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[13px] font-semibold text-gray-600">
                    Bulan
                  </label>

                  <Select
                    value={selectedMonth}
                    onValueChange={setSelectedMonth}
                  >
                    <SelectTrigger className="h-11 border-gray-200 bg-white text-[14px] rounded-xl">
                      <SelectValue />
                    </SelectTrigger>

                    <SelectContent>
                      {MONTH_OPTIONS.map((month) => (
                        <SelectItem key={month} value={month}>
                          {month}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <label className="text-[13px] font-semibold text-gray-600">
                    Jenis File
                  </label>

                  <div className="grid grid-cols-3 gap-3">
                    {[
                      {
                        value: "csv",
                        label: "CSV",
                        icon: FileSpreadsheet,
                      },
                      {
                        value: "xlsx",
                        label: "Excel",
                        icon: FileSpreadsheet,
                      },
                      {
                        value: "pdf",
                        label: "PDF",
                        icon: FileText,
                      },
                    ].map((format) => {
                      const Icon = format.icon;
                      const isSelected = selectedFormat === format.value;

                      return (
                        <button
                          key={format.value}
                          type="button"
                          onClick={() =>
                            setSelectedFormat(format.value as ReportFormat)
                          }
                          className={cn(
                            "flex items-center justify-center gap-2 rounded-xl border px-3 py-3.5 text-[14px] font-semibold transition-colors",
                            isSelected
                              ? "border-[#27A376] bg-[#E6F6EB] text-[#27A376]"
                              : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                          )}
                        >
                          <Icon className="size-4" />
                          {format.label}
                        </button>
                      );
                    })}
                  </div>

                  <p className="text-[12px] text-gray-400 leading-relaxed">
                    Untuk frontend sementara tetap mengunduh CSV dummy. Format
                    Excel/PDF nanti bisa disambungkan ke backend.
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-3 border-t border-gray-100 px-6 py-4 bg-white shrink-0">
              <p className="text-[12px] text-gray-400">
                Tekan ESC atau klik batal untuk menutup.
              </p>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsReportModalOpen(false)}
                  className="h-10 px-5 text-[14px] rounded-xl"
                >
                  Batal
                </Button>

                <Button
                  onClick={handleDownloadReport}
                  className="h-10 px-5 gap-2 bg-[#27A376] hover:bg-[#1f8a63] text-white text-[14px] rounded-xl"
                >
                  <Download className="size-4" />
                  Unduh
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
