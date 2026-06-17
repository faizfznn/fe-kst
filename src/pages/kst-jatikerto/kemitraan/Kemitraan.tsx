import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Clock3, Handshake, Leaf, TrendingUp } from "lucide-react";
import { usePageData } from "@/api/hooks";
import { API_ENDPOINTS } from "@/api/endpoints";
import { getJatikertoDataMessage } from "../dataState";
import {
  fieldAliases,
  formatDescription,
  getDateValue,
  getTextValue,
  rowIdentity,
  type JatikertoApiRow,
} from "../rowMappers";
import { JatikertoTableLayout } from "../JatikertoTableLayout";
import {
  badgeSoftGreenClass,
  formatIndonesianDate,
  formatNumber,
  getLastUpdated,
  JatikertoEmptyState,
  JatikertoHero,
  JatikertoPagination,
  JatikertoSummaryCards,
  JatikertoTableSkeleton,
  matchesFields,
  parseDate,
  statusBadgeClass,
  tableHeadClass,
  tableHeaderClass,
  tableRowClass,
} from "../dashboardUi";

type ContractStatus = "Aktif" | "Akan Berakhir" | "Selesai";

interface MitraRow extends JatikertoApiRow {
  id?: string;
  no?: number;
  mitra: string;
  bidangKerjasama: string;
  jangkaWaktuKontrak: string;
  tanggalMulai?: string;
  tanggalSelesai?: string;
  updatedAt?: string;
  keterangan: string;
}

function getRowKey(row: MitraRow, index: number) {
  return rowIdentity(row) ?? `${row.mitra}-${row.jangkaWaktuKontrak}-${index}`;
}

function formatContractRange(row: MitraRow) {
  const start = formatIndonesianDate(row.tanggalMulai);
  const end = formatIndonesianDate(row.tanggalSelesai);

  if (start !== "-" || end !== "-") return `${start} - ${end}`;
  return row.jangkaWaktuKontrak || "-";
}

function getContractStatus(row: MitraRow): ContractStatus {
  const start = parseDate(row.tanggalMulai);
  const end = parseDate(row.tanggalSelesai);

  if (!end) return "Selesai";

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  start?.setHours(0, 0, 0, 0);

  if (end < today) return "Selesai";
  if (start && start > today) return "Aktif";

  const daysRemaining = Math.ceil((end.getTime() - today.getTime()) / 86_400_000);
  return daysRemaining <= 30 ? "Akan Berakhir" : "Aktif";
}

function rowMatchesMitraSearch(row: MitraRow, searchQuery: string) {
  return matchesFields([row.mitra, row.bidangKerjasama, row.keterangan], searchQuery);
}

function mapMitraRow(row: MitraRow): MitraRow {
  const mulai = getDateValue(row, 2, ["mulai", "tanggalMulai", "tanggal_mulai", "startDate", "start_date"]);
  const selesai = getDateValue(row, 3, ["selesai", "tanggalSelesai", "tanggal_selesai", "endDate", "end_date"]);
  const jangkaWaktuKontrak =
    getTextValue(row, -1, ["jangkaWaktuKontrak", "jangka_waktu_kontrak", "kontrak"], "") ||
    [mulai, selesai].filter(Boolean).join(" - ") ||
    row.jangkaWaktuKontrak;
  const [kontrakMulai, kontrakSelesai] = String(jangkaWaktuKontrak ?? "")
    .split(/\s+-\s+/)
    .map((value) => value.trim());

  return {
    ...row,
    id: row.rowId ?? row.id,
    mitra: getTextValue(row, 0, ["mitra", "partner", ...fieldAliases.nama], row.mitra),
    bidangKerjasama: getTextValue(row, 1, ["bidangKerjasama", "bidang_kerjasama", "kerjasama", ...fieldAliases.status], row.bidangKerjasama),
    jangkaWaktuKontrak,
    tanggalMulai: mulai || kontrakMulai,
    tanggalSelesai: selesai || kontrakSelesai,
    updatedAt: getDateValue(row, -1, ["updatedAt", "updated_at", "updated", "modifiedAt", "modified_at", "createdAt", "created_at"], ""),
    keterangan: getTextValue(row, 4, ["keterangan", "description", "catatan"], row.keterangan ?? "-"),
  };
}

function getMostCommonField(rows: MitraRow[]) {
  const counts = rows.reduce<Record<string, number>>((acc, row) => {
    const field = row.bidangKerjasama?.trim();
    if (!field) return acc;
    acc[field] = (acc[field] ?? 0) + 1;
    return acc;
  }, {});

  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "-";
}

export default function Kemitraan() {
  const [selectedYear] = useState("2026");
  const [selectedMonth] = useState("Semua Bulan");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState("10");
  const {
    items: tableData,
    isLoading,
    error,
    errorStatus,
  } = usePageData<MitraRow>(API_ENDPOINTS.kst.jatikerto.kemitraanItems, {
    year: selectedYear,
    month: selectedMonth,
    limit: 50,
  });

  const mappedData = tableData.map(mapMitraRow);
  const displayData = mappedData.filter((row) => rowMatchesMitraSearch(row, searchQuery));
  const rowsPerPageNumber = Number(rowsPerPage);
  const totalPages = Math.max(1, Math.ceil(displayData.length / rowsPerPageNumber));
  const contractStatuses = mappedData.map((row) => getContractStatus(row));
  const activeContracts = contractStatuses.filter((status) => status === "Aktif").length;
  const expiringContracts = contractStatuses.filter((status) => status === "Akan Berakhir").length;
  const mostCommonField = getMostCommonField(mappedData);
  const lastUpdated = getLastUpdated(mappedData);
  const summaryCards = [
    { label: "Total Mitra", value: formatNumber(mappedData.length), icon: Handshake },
    { label: "Kontrak Aktif", value: formatNumber(activeContracts), icon: Leaf },
    { label: "Kontrak Akan Berakhir", value: formatNumber(expiringContracts), icon: Clock3 },
    { label: "Bidang Kerja Sama Terbanyak", value: mostCommonField, icon: TrendingUp },
  ];

  const paginatedData = displayData.slice(
    (currentPage - 1) * rowsPerPageNumber,
    currentPage * rowsPerPageNumber,
  );
  const tableMessage = getJatikertoDataMessage({
    isLoading,
    error,
    errorStatus,
    hasItems: displayData.length > 0,
  });

  return (
    <JatikertoTableLayout
      categoryName="Kemitraan"
      subtitle="Kegiatan Kerjasama KST Jatikerto dengan Berbagai Mitra"
      searchValue={searchQuery}
      searchPlaceholder="Cari mitra atau bidang kerja sama..."
      headerContent={
        <JatikertoHero
          title="Dashboard Kemitraan"
          description="Pemantauan kerja sama KST Jatikerto dengan mitra industri, riset, agroindustri, dan aktivitas operasional kemitraan."
          badges={["Kemitraan Agroindustri"]}
          lastUpdated={lastUpdated}
          metric={{ label: "Kontrak Aktif", value: formatNumber(activeContracts) }}
        />
      }
      beforeTable={<JatikertoSummaryCards items={summaryCards} />}
      onSearchChange={(value) => {
        setSearchQuery(value);
        setCurrentPage(1);
      }}
    >
      <>
        <div className="overflow-x-auto">
          <Table className="min-w-[920px] table-fixed">
            <TableHeader>
              <TableRow className={tableHeaderClass}>
                <TableHead className={`${tableHeadClass} w-[56px] pl-5`}>
                  No.
                </TableHead>
                <TableHead className={`${tableHeadClass} w-[22%]`}>
                  Mitra
                </TableHead>
                <TableHead className={`${tableHeadClass} w-[22%]`}>
                  Bidang Kerjasama
                </TableHead>
                <TableHead className={`${tableHeadClass} w-[24%]`}>
                  Jangka Waktu Kontrak
                </TableHead>
                <TableHead className={`${tableHeadClass} w-[14%]`}>
                  Status
                </TableHead>
                <TableHead className={`${tableHeadClass} w-[18%]`}>
                  Keterangan
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="p-0">
                    <JatikertoTableSkeleton columns={6} />
                  </TableCell>
                </TableRow>
              ) : tableMessage ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="p-5"
                  >
                    <JatikertoEmptyState title={tableMessage} />
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((row, index) => {
                  const status = getContractStatus(row);

                  return (
                    <TableRow key={getRowKey(row, index)} className={tableRowClass}>
                      <TableCell className="pl-5 text-[13px] font-medium text-gray-500">
                        {(currentPage - 1) * rowsPerPageNumber + index + 1}.
                      </TableCell>
                      <TableCell className="max-w-[260px] whitespace-normal break-words text-[13px] font-semibold leading-relaxed text-gray-900">
                        {row.mitra || "Belum tersedia"}
                      </TableCell>
                      <TableCell className="max-w-[240px] whitespace-normal break-words text-[13px] leading-relaxed text-gray-600">
                        <Badge className={`${badgeSoftGreenClass} max-w-full whitespace-normal break-words text-left leading-relaxed`}>
                          {row.bidangKerjasama || "Belum tersedia"}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-[13px] text-gray-600">
                        {formatContractRange(row)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-[13px]">
                        <Badge className={`h-auto rounded-full px-2.5 py-1 ${statusBadgeClass(status)}`}>
                          {status}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[260px] whitespace-normal break-words text-[13px] leading-relaxed text-gray-600">
                        <p className="line-clamp-3 break-words">{formatDescription(row.keterangan)}</p>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <JatikertoPagination
          currentPage={currentPage}
          totalPages={totalPages}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(value) => {
            setRowsPerPage(value);
            setCurrentPage(1);
          }}
          onPageChange={setCurrentPage}
        />
      </>
    </JatikertoTableLayout>
  );
}
