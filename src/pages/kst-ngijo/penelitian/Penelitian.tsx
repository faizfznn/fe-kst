import { useState } from "react";
import {
  Activity,
  BarChart3,
  Shield,
  Users,
  Microscope,
  FlaskConical,
  Factory,
  Fish,
  Leaf,
  Zap,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { LoadingIndicator } from "@/components/ui/loading-indicator";
import { useApiData, usePageData } from "@/api/hooks";
import { API_ENDPOINTS } from "@/api/endpoints";
import { colValue, fieldNumber, fieldValue, getContractColumnIndex, getContractColumnVariants, isRecord, ngijoNumber, textOrFallback } from "../adapters";
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

interface InovasiRow {
  id?: string;
  no: number;
  namaProyek: string;
  kepalaRiset: string;
  domain: string;
  trlLevel: number | null;
  trlLabel: string;
}

const DOMAIN_LABELS: Record<string, string> = {
  technology: "Technology",
  agriculture: "Agritech",
  energy: "Energy",
  sustainability: "Sustainability",
  herbal: "Jamu & Atsiri",
  fisheries: "Perikanan Air Tawar",
  aquaculture: "Perikanan Air Tawar",
  waste: "Pengolahan Limbah",
  other: "Other",
};

function domainLabel(variant: string): string {
  const key = variant.toLowerCase().trim();
  if (DOMAIN_LABELS[key]) return DOMAIN_LABELS[key];
  return key ? key.charAt(0).toUpperCase() + key.slice(1) : "";
}

function domainTone(domain: string) {
  const value = domain.toLowerCase();
  if (value.includes("jamu") || value.includes("atsiri") || value.includes("agri")) return "border-lime-200 bg-lime-50 text-lime-700";
  if (value.includes("ikan") || value.includes("aqua")) return "border-sky-200 bg-sky-50 text-sky-700";
  if (value.includes("energy") || value.includes("energi")) return "border-amber-200 bg-amber-50 text-amber-700";
  if (value.includes("sustain") || value.includes("limbah")) return "border-emerald-200 bg-emerald-50 text-emerald-700";
  return "border-gray-200 bg-gray-50 text-gray-600";
}

const TRL_STATUS: Record<number, string> = {
  1: "Basic Research",
  2: "Concept Formulation",
  3: "Proof of Concept",
  4: "Lab Validation",
  5: "Technology Validation",
  6: "Prototype Testing",
  7: "Demonstration Stage",
  8: "System Complete",
  9: "Market Ready",
};

function trlStatusLabel(level: number | null): string | null {
  if (level === null) return null;
  return TRL_STATUS[level] ?? null;
}

// Fill color for an achieved TRL box, based on which band the box sits in
// (1-3 red, 4-6 orange, 7-9 green). Unreached boxes render light gray.
function trlBoxColor(boxIndex: number): string {
  if (boxIndex <= 3) return "#E5484D";
  if (boxIndex <= 6) return "#F76808";
  return "#46A758";
}

function TrlIndicator({ level }: { level: number | null }) {
  return (
    <div className="flex items-center gap-[3px]">
      {Array.from({ length: 9 }, (_, i) => {
        const boxNumber = i + 1;
        const reached = level !== null && boxNumber <= level;
        return (
          <span
            key={boxNumber}
            className="h-2.5 w-2.5 rounded-[3px]"
            style={{ backgroundColor: reached ? trlBoxColor(boxNumber) : "#E5E7EB" }}
          />
        );
      })}
    </div>
  );
}

function resolveDomain(domainRaw: unknown, variants: Map<number, string>): string {
  if (domainRaw === undefined || domainRaw === null || domainRaw === "") return "";

  const variantIndex = fieldNumber({ value: domainRaw }, ["value"]);
  if (variantIndex !== null && variants.has(variantIndex)) {
    return domainLabel(variants.get(variantIndex)!);
  }
  // Fall back to the raw value (string label, or the bare number) rather than
  // hiding a value that the API actually sent.
  if (typeof domainRaw === "string") return domainLabel(domainRaw);
  return String(domainRaw);
}

function aggregateDomains(rows: InovasiRow[]) {
  const counts = rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.domain] = (acc[row.domain] ?? 0) + 1;
    return acc;
  }, {});
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
}

function trlReadiness(averageTrl: number | null) {
  if (averageTrl === null) return 0;
  return Math.max(0, Math.min(100, Math.round((averageTrl / 9) * 100)));
}

function normalizeInovasiRows(rows: unknown[], contractPayload: unknown) {
  const nameIdx = getContractColumnIndex(contractPayload, ["nama proyek", "judul", "project", "proyek"]) ?? 0;
  const leadIdx = getContractColumnIndex(contractPayload, ["kepala riset", "peneliti utama", "peneliti", "researcher"]) ?? 1;
  const domainIdx = getContractColumnIndex(contractPayload, ["domain", "kategori", "field", "bidang", "category"]) ?? 2;
  const trlIdx = getContractColumnIndex(contractPayload, ["trl level", "trl", "trl status", "status trl"]) ?? 3;
  const domainVariants = getContractColumnVariants(contractPayload, ["domain", "kategori", "category"]);

  return rows.map((row, index): InovasiRow => {
    const record = isRecord(row) ? row : {};
    const trlRaw = fieldValue(record, ["trlLevel", "trl_level", "trl", "trlLevelValue", "trlStatus", "trl_status"]) ?? colValue(record, trlIdx);
    const trlLevel = fieldNumber({ value: trlRaw }, ["value"]);

    const domainRaw = fieldValue(record, ["domain", "category", "kategori", "bidang"]) ?? colValue(record, domainIdx);
    const domainText = resolveDomain(domainRaw, domainVariants);

    return {
      id: textOrFallback(record.id ?? record.rowId ?? record.row_id, ""),
      no: index + 1,
      namaProyek: textOrFallback(
        fieldValue(record, ["namaProyek", "nama_proyek", "projectName", "project_name", "judul", "name"]) ?? colValue(record, nameIdx),
      ),
      kepalaRiset: textOrFallback(
        fieldValue(record, ["kepalaRiset", "kepala_riset", "leadResearcher", "lead_researcher", "peneliti"]) ?? colValue(record, leadIdx),
      ),
      domain: domainText || "Belum tersedia",
      trlLevel,
      trlLabel: textOrFallback(
        trlStatusLabel(trlLevel) ?? fieldValue(record, ["trlLabel", "trl_label", "trlStatus", "trl_status", "status"]),
        trlLevel === null ? "Belum tersedia" : "Status belum tersedia",
      ),
    };
  });
}

export default function Penelitian() {
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState("10");
  const { data: activeProjectsPayload, isLoading: isActiveProjectsLoading } = useApiData<unknown>(
    API_ENDPOINTS.kst.ngijo.activeProjects,
  );
  const { data: averageTrlPayload, isLoading: isAverageTrlLoading } = useApiData<unknown>(
    API_ENDPOINTS.kst.ngijo.averageTrl,
  );
  const { data: pendingPatentsPayload, isLoading: isPendingPatentsLoading } = useApiData<unknown>(
    API_ENDPOINTS.kst.ngijo.pendingPatents,
  );
  const { data: collaborationPayload, isLoading: isCollaborationLoading } = useApiData<unknown>(
    API_ENDPOINTS.kst.ngijo.collaboration,
  );
  const { data: contractPayload } = useApiData<unknown>(
    API_ENDPOINTS.kst.ngijo.contract,
  );
  const { items: backendRows, isLoading: isTableLoading, error: tableError } = usePageData<unknown>(
    API_ENDPOINTS.kst.ngijo.activeResearch,
    { offset: 0, limit: 50 },
  );
  const activeProjects = ngijoNumber(activeProjectsPayload);
  const averageTrl = ngijoNumber(averageTrlPayload);
  const pendingPatents = ngijoNumber(pendingPatentsPayload);
  const collaboration = ngijoNumber(collaborationPayload);
  const tableData = normalizeInovasiRows(backendRows, contractPayload);
  const domains = aggregateDomains(tableData);
  const averageDisplay =
    averageTrl === null ? DATA_EMPTY_TEXT : averageTrl.toLocaleString("id-ID", { maximumFractionDigits: 1 });

  const rowsPerPageNumber = Number(rowsPerPage);
  const totalPages = Math.max(
    1,
    Math.ceil(tableData.length / rowsPerPageNumber)
  );

  const paginatedData = tableData.slice(
    (currentPage - 1) * rowsPerPageNumber,
    currentPage * rowsPerPageNumber
  );

  return (
    <div className="flex min-h-screen flex-col gap-5 bg-gray-50/50 p-4 md:p-6">
      <NgijoHero
        title="Riset dan Inovasi Green Science Park"
        description="Pemantauan portofolio penelitian Ngijo, kesiapan TRL, paten, kolaborasi, dan fokus inovasi yang mendukung produksi jamu/atsiri, perikanan air tawar, energi, serta pengolahan limbah."
        badges={["Riset", "Inovasi", "Green Performance"]}
        metric={{ label: "Kesiapan TRL", value: isAverageTrlLoading ? <LoadingIndicator /> : `${trlReadiness(averageTrl)}%` }}
      />

      <NgijoKpiCards
        items={[
          {
            icon: Activity,
            label: "Inovasi Aktif",
            value: isActiveProjectsLoading ? <LoadingIndicator /> : formatMetric(activeProjects),
            helper: "Jumlah penelitian dan inovasi aktif dari API Ngijo.",
            tone: "emerald",
          },
          {
            icon: BarChart3,
            label: "Rata-rata TRL",
            value: isAverageTrlLoading ? <LoadingIndicator /> : averageDisplay,
            helper: "Indikasi kesiapan teknologi dari portofolio riset.",
            tone: "blue",
          },
          {
            icon: Shield,
            label: "Paten Tertunda",
            value: isPendingPatentsLoading ? <LoadingIndicator /> : formatMetric(pendingPatents),
            helper: "Luaran inovasi yang masih dalam proses perlindungan.",
            tone: "amber",
          },
          {
            icon: Users,
            label: "Kolaborasi",
            value: isCollaborationLoading ? <LoadingIndicator /> : formatMetric(collaboration),
            helper: "Kolaborasi riset dan inovasi yang dilaporkan backend.",
            tone: "lime",
          },
        ]}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-gray-950">Fokus Riset Ngijo</p>
              <p className="mt-1 text-xs font-medium leading-5 text-gray-500">
                Distribusi domain dari data penelitian yang tersedia.
              </p>
            </div>
            <Microscope className="size-5 text-emerald-600" />
          </div>
          {domains.length === 0 ? (
            <NgijoEmptyState description="Domain riset akan tampil setelah baris penelitian tersedia dari backend." />
          ) : (
            <div className="space-y-3">
              {domains.map(([domain, count]) => {
                const width = Math.max(8, Math.round((count / tableData.length) * 100));
                return (
                  <div key={domain}>
                    <div className="mb-1 flex items-center justify-between gap-3 text-xs font-semibold">
                      <span className="truncate text-gray-700">{domain}</span>
                      <span className="tabular-nums text-gray-500">{count} proyek</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100">
                      <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${width}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-bold text-gray-950">Representasi Program</p>
          <p className="mt-1 text-xs font-medium leading-5 text-gray-500">
            Area Ngijo yang diprioritaskan pada dashboard ini.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {[
              { label: "Jamu/Atsiri", icon: FlaskConical },
              { label: "Produksi", icon: Factory },
              { label: "Perikanan", icon: Fish },
              { label: "Mikrohidro", icon: Zap },
              { label: "Limbah", icon: Leaf },
              { label: "Riset", icon: Microscope },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3">
                <item.icon className="mb-2 size-4 text-emerald-700" />
                <p className="text-xs font-bold text-gray-800">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-4">
          <p className="text-sm font-bold text-gray-950">Tracker Penelitian dan Inovasi</p>
          <p className="mt-1 text-xs font-medium text-gray-500">
            Data baris berasal dari endpoint penelitian Ngijo dan mapping kolom mengikuti contract.
          </p>
        </div>
        <div className="overflow-x-auto">
          <Table className="min-w-[900px] table-fixed">
            <TableHeader>
              <TableRow className={ngijoTableHeaderClass}>
                <TableHead className={`${ngijoTableHeadClass} w-[64px] pl-5 text-center`}>
                  No.
                </TableHead>

                <TableHead className={`${ngijoTableHeadClass} w-[28%]`}>
                  Nama Proyek
                </TableHead>

                <TableHead className={`${ngijoTableHeadClass} w-[22%]`}>
                  Kepala Riset
                </TableHead>

                <TableHead className={`${ngijoTableHeadClass} w-[18%]`}>
                  Domain
                </TableHead>

                <TableHead className={`${ngijoTableHeadClass} w-[26%]`}>
                  TRL Status
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {isTableLoading ? (
                <TableRow className={ngijoTableRowClass}>
                  <TableCell colSpan={5} className="p-0">
                    <NgijoTableSkeleton columns={5} />
                  </TableCell>
                </TableRow>
              ) : tableError ? (
                <TableRow className={ngijoTableRowClass}>
                  <TableCell colSpan={5} className="p-5">
                    <NgijoEmptyState title={friendlyDataMessage(tableError)} />
                  </TableCell>
                </TableRow>
              ) : paginatedData.length === 0 ? (
                <TableRow className={ngijoTableRowClass}>
                  <TableCell colSpan={5} className="p-5">
                    <NgijoEmptyState title="Data belum tersedia" description="Data penelitian Ngijo sedang disiapkan." />
                  </TableCell>
                </TableRow>
              ) : paginatedData.map((row, index) => (
                <TableRow
                  key={row.id || `${row.namaProyek}-${index}`}
                  className={ngijoTableRowClass}
                >
                  <TableCell className="pl-5 text-center text-[13px] font-semibold tabular-nums text-gray-500">
                    {(currentPage - 1) * rowsPerPageNumber + index + 1}.
                  </TableCell>

                  <TableCell className="whitespace-normal break-words text-[13px] font-semibold leading-relaxed text-gray-900">
                    {row.namaProyek}
                  </TableCell>

                  <TableCell className="whitespace-normal break-words text-[13px] leading-relaxed text-gray-600">
                    {row.kepalaRiset}
                  </TableCell>

                  <TableCell className="whitespace-normal break-words text-[13px] text-gray-600">
                    <span className={cn(ngijoBadgeNeutralClass, domainTone(row.domain))}>
                      {row.domain}
                    </span>
                  </TableCell>

                  <TableCell>
                    {row.trlLevel === null ? (
                      <span className="text-[12px] font-semibold text-gray-400">Data belum tersedia</span>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-[13px] font-bold text-gray-900">TRL {row.trlLevel}</span>
                          <span className="whitespace-normal break-words text-[12px] font-medium text-gray-500">{row.trlLabel}</span>
                        </div>
                        <TrlIndicator level={row.trlLevel} />
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
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
