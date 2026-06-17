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
  FileSpreadsheet,
  Settings,
  Banknote,
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
import { LoadingIndicator } from "@/components/ui/loading-indicator";
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
import {
  downloadReport,
  findReportDefinition,
  reportDefinitionsByKst,
  type ReportFormat,
  type ReportKst,
} from "@/lib/reportExport";

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
        title: "Penelitian",
        url: ROUTES.PENELITIAN,
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
        title: "Manajemen Booking",
        url: ROUTES.BOOKLIST_ATP,
        icon: Book,
      },
      {
        title: "Keuangan",
        url: ROUTES.KEUANGAN_CANGAR,
        icon: Banknote,
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

const REPORT_KST_LABELS: Record<ReportKst, string> = {
  ngijo: "KST Ngijo",
  cangar: "KST Cangar",
  jatikerto: "KST Jatikerto",
};

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
  const [selectedReport, setSelectedReport] = React.useState("pertanian");
  const [selectedFormat, setSelectedFormat] =
    React.useState<ReportFormat>("xlsx");
  const [isGeneratingReport, setIsGeneratingReport] = React.useState(false);
  const [reportError, setReportError] = React.useState<string | null>(null);
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
    setSelectedReport(reportDefinitionsByKst(value)[0]?.id ?? "");
    setReportError(null);
  };

  const handleDownloadReport = async () => {
    if (!allowedReportKsts.includes(effectiveSelectedKst)) {
      setReportError("Anda tidak memiliki akses untuk mengunduh laporan KST ini.");
      return;
    }

    const definition = findReportDefinition(effectiveSelectedKst, effectiveSelectedReport);
    if (!definition) {
      setReportError("Laporan belum tersedia untuk cabang yang dipilih.");
      return;
    }

    setIsGeneratingReport(true);
    setReportError(null);
    try {
      await downloadReport(definition, selectedFormat);
      setIsReportModalOpen(false);
    } catch (error) {
      setReportError(
        error instanceof Error
          ? error.message
          : "Laporan belum bisa dibuat karena data tidak tersedia atau koneksi bermasalah.",
      );
    } finally {
      setIsGeneratingReport(false);
    }
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
  const reportOptions = reportDefinitionsByKst(effectiveSelectedKst);
  const effectiveSelectedReport = reportOptions.some((report) => report.id === selectedReport)
    ? selectedReport
    : reportOptions[0]?.id ?? "";
  const selectedReportDefinition = findReportDefinition(effectiveSelectedKst, effectiveSelectedReport);
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
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black/20 px-4 py-8 backdrop-blur-[3px]">
          <div className="flex max-h-[calc(100vh-64px)] w-full max-w-[560px] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl animate-in fade-in-0 zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-gray-100 px-6 py-4">
              <div className="min-w-0">
                <h2 className="text-[18px] font-bold text-gray-900">
                  Unduh Laporan
                </h2>
                <p className="text-[13px] text-gray-400 mt-0.5">
                  Pilih KST, cabang, dan format file laporan.
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
              <div className="mb-5 rounded-xl border border-emerald-100 bg-emerald-50/60 px-4 py-3.5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase text-emerald-700">
                      Laporan terpilih
                    </p>
                    <p className="mt-0.5 truncate text-[14px] font-bold text-gray-900">
                      {selectedKstLabel} / {selectedReportDefinition?.label ?? "Laporan"}
                    </p>
                  </div>

                  <span className="inline-flex w-max items-center rounded-full border border-emerald-200 bg-white px-3 py-1 text-[12px] font-bold text-emerald-700">
                    {selectedFormat === "xlsx" ? "Excel" : "CSV"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                    <SelectTrigger className="h-11 rounded-xl border-gray-200 bg-white text-[14px]">
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
                    onValueChange={(value) => {
                      setSelectedReport(value);
                      setReportError(null);
                    }}
                  >
                    <SelectTrigger className="h-11 rounded-xl border-gray-200 bg-white text-[14px]">
                      <SelectValue />
                    </SelectTrigger>

                    <SelectContent>
                      {reportOptions.map((report) => (
                        <SelectItem key={report.id} value={report.id}>
                          {report.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <label className="text-[13px] font-semibold text-gray-600">
                    Jenis File
                  </label>

                  <div className="grid grid-cols-2 gap-3">
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
                    ].map((format) => {
                      const Icon = format.icon;
                      const isSelected = selectedFormat === format.value;

                      return (
                        <button
                          key={format.value}
                          type="button"
                          onClick={() => {
                            setSelectedFormat(format.value as ReportFormat);
                            setReportError(null);
                          }}
                          className={cn(
                            "flex h-11 items-center justify-center gap-2 rounded-xl border px-3 text-[14px] font-semibold transition-colors",
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
                </div>

                {reportError ? (
                  <div className="sm:col-span-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-[13px] font-medium text-red-700">
                    {reportError}
                  </div>
                ) : null}
              </div>
            </div>

            {/* Footer */}
            <div className="flex shrink-0 flex-col gap-3 border-t border-gray-100 bg-white px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[12px] text-gray-400">
                Tekan ESC atau klik batal untuk menutup.
              </p>

              <div className="flex items-center justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsReportModalOpen(false)}
                  disabled={isGeneratingReport}
                  className="h-10 px-5 text-[14px] rounded-xl"
                >
                  Batal
                </Button>

                <Button
                  onClick={handleDownloadReport}
                  disabled={isGeneratingReport || !selectedReportDefinition}
                  className="h-10 px-5 gap-2 bg-[#27A376] hover:bg-[#1f8a63] text-white text-[14px] rounded-xl"
                >
                  {isGeneratingReport ? (
                    <LoadingIndicator label="Menyiapkan" className="text-white" iconClassName="text-white" />
                  ) : (
                    <>
                      <Download className="size-4" />
                      Unduh
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
