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
import { BookOpenCheck, GraduationCap, Microscope, UsersRound } from "lucide-react";
import { usePageData } from "@/api/hooks";
import { API_ENDPOINTS } from "@/api/endpoints";
import { getJatikertoDataMessage } from "../dataState";
import { getProgramStudiBadgeClass, normalizeProgramStudi } from "../programStudi";
import {
  fieldAliases,
  getDateValue,
  getNumberValue,
  getTextValue,
  rowIdentity,
  type JatikertoApiRow,
} from "../rowMappers";
import { JatikertoTableLayout } from "../JatikertoTableLayout";
import {
  formatArea,
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

type ResearchStatus = "Akan Dimulai" | "Aktif" | "Selesai" | "-";

interface MahasiswaRow extends JatikertoApiRow {
  id?: string;
  no?: number;
  namaMahasiswa: string;
  dosenPembimbing: string;
  programStudi: string;
  mulai: string;
  selesai: string;
  luasan: string;
  judulPenelitian: string;
}

function getRowKey(row: MahasiswaRow, index: number) {
  return rowIdentity(row) ?? `${row.namaMahasiswa}-${row.judulPenelitian}-${index}`;
}

function mapMahasiswaRow(row: MahasiswaRow): MahasiswaRow {
  const luasan = getNumberValue(row, 5, ["luasan", "luas", "area"], Number.NaN);

  return {
    ...row,
    id: row.rowId ?? row.id,
    namaMahasiswa: getTextValue(row, 0, ["namaMahasiswa", "nama_mahasiswa", "mahasiswa", ...fieldAliases.nama], row.namaMahasiswa),
    dosenPembimbing: getTextValue(row, 1, ["dosenPembimbing", "dosen_pembimbing", "dosen", "pembimbing"], row.dosenPembimbing),
    programStudi: getTextValue(row, 2, ["programStudi", "program_studi", "prodi"], row.programStudi),
    mulai: getDateValue(row, 3, ["mulai", "tanggalMulai", "tanggal_mulai", "startDate", "start_date"], row.mulai),
    selesai: getDateValue(row, 4, ["selesai", "tanggalSelesai", "tanggal_selesai", "endDate", "end_date"], row.selesai),
    luasan: Number.isFinite(luasan) ? `${luasan} m²` : row.luasan,
    judulPenelitian: getTextValue(row, 6, ["judulPenelitian", "judul_penelitian", "penelitian", ...fieldAliases.nama], row.judulPenelitian),
  };
}

function getResearchStatus(row: MahasiswaRow): ResearchStatus {
  const start = parseDate(row.mulai);
  const end = parseDate(row.selesai);
  if (!start || !end) return "-";

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  if (start > today) return "Akan Dimulai";
  if (end < today) return "Selesai";
  return "Aktif";
}

function rowMatchesAkademikSearch(row: MahasiswaRow, searchQuery: string) {
  return matchesFields(
    [row.namaMahasiswa, row.dosenPembimbing, row.programStudi, row.judulPenelitian],
    searchQuery,
  );
}

export default function PelayananAkademik() {
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
  } = usePageData<MahasiswaRow>(
    API_ENDPOINTS.kst.jatikerto.akademikItems,
    { year: selectedYear, month: selectedMonth, limit: 50 },
  );

  const mappedData = tableData.map(mapMahasiswaRow);
  const displayData = mappedData.filter((row) => rowMatchesAkademikSearch(row, searchQuery));
  const rowsPerPageNumber = Number(rowsPerPage);
  const totalPages = Math.max(1, Math.ceil(displayData.length / rowsPerPageNumber));
  const totalDosen = new Set(mappedData.map((row) => row.dosenPembimbing).filter(Boolean)).size;
  const totalProdi = new Set(mappedData.map((row) => normalizeProgramStudi(row.programStudi) || row.programStudi).filter(Boolean)).size;
  const activeResearch = mappedData.filter((row) => getResearchStatus(row) === "Aktif").length;
  const lastUpdated = getLastUpdated(mappedData);
  const summaryCards = [
    { label: "Total Mahasiswa", value: formatNumber(mappedData.length), icon: GraduationCap },
    { label: "Dosen Pembimbing", value: formatNumber(totalDosen), icon: UsersRound },
    { label: "Program Studi Terlibat", value: formatNumber(totalProdi), icon: BookOpenCheck },
    { label: "Penelitian Aktif", value: formatNumber(activeResearch), icon: Microscope },
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
      categoryName="Pelayanan Akademik"
      subtitle="Kegiatan Riset Mahasiswa Universitas Brawijaya di KST Jatikerto"
      searchValue={searchQuery}
      searchPlaceholder="Cari mahasiswa, dosen, atau judul penelitian..."
      headerContent={
        <JatikertoHero
          title="Dashboard Pelayanan Akademik"
          description="Pemantauan kegiatan riset mahasiswa, dosen pembimbing, program studi, dan pemanfaatan lahan akademik KST Jatikerto."
          badges={["Riset Akademik"]}
          lastUpdated={lastUpdated}
          metric={{ label: "Penelitian Aktif", value: formatNumber(activeResearch) }}
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
          <Table className="min-w-[1040px] table-fixed">
            <TableHeader>
              <TableRow className={tableHeaderClass}>
                <TableHead className={`${tableHeadClass} w-[56px] pl-5`}>
                  No.
                </TableHead>
                <TableHead className={`${tableHeadClass} w-[15%]`}>
                  Nama Mahasiswa
                </TableHead>
                <TableHead className={`${tableHeadClass} w-[15%]`}>
                  Dosen Pembimbing
                </TableHead>
                <TableHead className={`${tableHeadClass} w-[14%]`}>
                  Program Studi
                </TableHead>
                <TableHead className={`${tableHeadClass} w-[11%]`}>
                  Mulai
                </TableHead>
                <TableHead className={`${tableHeadClass} w-[11%]`}>
                  Selesai
                </TableHead>
                <TableHead className={`${tableHeadClass} w-[11%]`}>
                  Status
                </TableHead>
                <TableHead className={`${tableHeadClass} w-[10%]`}>
                  Luasan
                </TableHead>
                <TableHead className={`${tableHeadClass} w-[23%]`}>
                  Judul Penelitian
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="p-0">
                    <JatikertoTableSkeleton columns={9} />
                  </TableCell>
                </TableRow>
              ) : tableMessage ? (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="p-5"
                  >
                    <JatikertoEmptyState title={tableMessage} />
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((row, index) => {
                  const status = getResearchStatus(row);

                  return (
                    <TableRow key={getRowKey(row, index)} className={tableRowClass}>
                      <TableCell className="pl-5 text-[13px] font-medium text-gray-500">
                        {(currentPage - 1) * rowsPerPageNumber + index + 1}.
                      </TableCell>
                      <TableCell className="max-w-[220px] whitespace-normal break-words text-[13px] font-semibold leading-relaxed text-gray-900">
                        {row.namaMahasiswa || "Belum tersedia"}
                      </TableCell>
                      <TableCell className="max-w-[240px] whitespace-normal break-words text-[13px] leading-relaxed text-gray-600">
                        {row.dosenPembimbing || "Belum tersedia"}
                      </TableCell>
                      <TableCell className="max-w-[160px] overflow-hidden text-[13px] text-gray-600">
                        <Badge className={`${getProgramStudiBadgeClass(row.programStudi)} inline-block h-auto max-w-[150px] truncate rounded-full border px-2.5 py-1 align-middle`}>
                          {normalizeProgramStudi(row.programStudi) || "Belum tersedia"}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-[13px] text-gray-600">
                        {formatIndonesianDate(row.mulai)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-[13px] text-gray-600">
                        {formatIndonesianDate(row.selesai)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-[13px]">
                        <Badge className={`h-auto rounded-full px-2.5 py-1 ${statusBadgeClass(status)}`}>
                          {status}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-[13px] text-gray-600 tabular-nums">
                        {formatArea(row.luasan)}
                      </TableCell>
                      <TableCell className="max-w-[320px] whitespace-normal break-words text-[13px] leading-relaxed text-gray-600">
                        <p className="line-clamp-3 break-words">{row.judulPenelitian || "Belum tersedia"}</p>
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
