import { useState } from "react";
import {
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { usePageData } from "@/api/hooks";
import { getJatikertoDataMessage } from "../dataState";
import { rowIdentity, textValue, type JatikertoApiRow } from "../rowMappers";

interface MitraRow extends JatikertoApiRow {
  id?: string;
  no?: number;
  mitra: string;
  bidangKerjasama: string;
  jangkaWaktuKontrak: string;
  keterangan: string;
}

export const tableData: MitraRow[] = [
  {
    no: 1,
    mitra: "PT Teknologi Informasi dan Inovasi Digital Nusantara Indonesia",
    bidangKerjasama: "Pengembangan Sistem Informasi Pertanian Cerdas",
    jangkaWaktuKontrak: "8 Mei 2026 - 8 Mei 2027",
    keterangan: "-",
  },
  {
    no: 2,
    mitra: "CV Agro Sejahtera Mandiri",
    bidangKerjasama: "Pertanian",
    jangkaWaktuKontrak: "15 Juni 2026 - 15 Juni 2027",
    keterangan: "-",
  },
  {
    no: 3,
    mitra: "PT Green Energy Indonesia",
    bidangKerjasama: "Energi Terbarukan",
    jangkaWaktuKontrak: "1 Juli 2026 - 1 Juli 2027",
    keterangan: "-",
  },
  {
    no: 4,
    mitra: "Yayasan Pendidikan Maju Bersama",
    bidangKerjasama: "Pendidikan",
    jangkaWaktuKontrak: "20 Agustus 2026 - 20 Agustus 2027",
    keterangan: "-",
  },
  {
    no: 5,
    mitra: "PT Wisata Alam Nusantara",
    bidangKerjasama: "Pariwisata",
    jangkaWaktuKontrak: "10 September 2026 - 10 September 2027",
    keterangan: "-",
  },
  {
    no: 6,
    mitra: "PT Samudra Perikanan Indonesia",
    bidangKerjasama: "Perikanan",
    jangkaWaktuKontrak: "5 Oktober 2026 - 5 Oktober 2027",
    keterangan: "-",
  },
  {
    no: 7,
    mitra: "PT Manufaktur Teknologi Indonesia",
    bidangKerjasama: "Manufaktur",
    jangkaWaktuKontrak: "12 November 2026 - 12 November 2027",
    keterangan: "-",
  },
  {
    no: 8,
    mitra: "PT Transportasi Cerdas Indonesia",
    bidangKerjasama: "Transportasi",
    jangkaWaktuKontrak: "25 Desember 2026 - 25 Desember 2027",
    keterangan: "-",
  },
  {
    no: 9,
    mitra: "Bank Inovasi Nusantara",
    bidangKerjasama: "Keuangan",
    jangkaWaktuKontrak: "3 Januari 2027 - 3 Januari 2028",
    keterangan: "-",
  },
  {
    no: 10,
    mitra: "PT Kesehatan Digital Indonesia",
    bidangKerjasama: "Kesehatan",
    jangkaWaktuKontrak: "18 Februari 2027 - 18 Februari 2028",
    keterangan: "-",
  },
];

const months = ["Semua Bulan", "Januari", "Februari", "Maret", "April"];

function getRowKey(row: MitraRow, index: number) {
  return rowIdentity(row) ?? `${row.mitra}-${row.jangkaWaktuKontrak}-${index}`;
}

function mapMitraRow(row: MitraRow): MitraRow {
  if (!row.colValues) return row;

  const mulai = textValue(row, 2);
  const selesai = textValue(row, 3);

  return {
    ...row,
    id: row.rowId ?? row.id,
    mitra: textValue(row, 0),
    bidangKerjasama: textValue(row, 1),
    jangkaWaktuKontrak: [mulai, selesai].filter(Boolean).join(" - "),
    keterangan: textValue(row, 4, "-"),
  };
}

export default function Kemitraan() {
  const [selectedYear, setSelectedYear] = useState("2026");
  const [selectedMonth, setSelectedMonth] = useState("Semua Bulan");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState("10");
  const {
    items: tableData,
    isLoading,
    error,
    errorStatus,
  } = usePageData<MitraRow>("/kst/jatikerto/data/kemitraan/items", {
    year: selectedYear,
    month: selectedMonth,
    limit: 50,
  });

  const rowsPerPageNumber = Number(rowsPerPage);
  const totalPages = Math.max(1, Math.ceil(tableData.length / rowsPerPageNumber));

  const paginatedData = tableData.slice(
    (currentPage - 1) * rowsPerPageNumber,
    currentPage * rowsPerPageNumber
  ).map(mapMitraRow);
  const tableMessage = getJatikertoDataMessage({
    isLoading,
    error,
    errorStatus,
    hasItems: tableData.length > 0,
  });


  return (
    <div className="flex flex-col gap-5 p-4 md:p-6 bg-gray-50/50 min-h-screen">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="h-9 border-gray-200 bg-white text-[13px] font-medium">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="2024">2024</SelectItem>
            <SelectItem value="2025">2025</SelectItem>
            <SelectItem value="2026">2026</SelectItem>
          </SelectContent>
        </Select>

        <div className="w-full sm:w-auto overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1 shadow-sm w-max">
            {months.map((month) => (
              <button
                key={month}
                onClick={() => setSelectedMonth(month)}
                className={cn(
                  "px-4 py-1.5 text-[13px] font-medium rounded-lg transition-all duration-150 whitespace-nowrap",
                  selectedMonth === month
                    ? "bg-gray-900 text-white shadow-sm"
                    : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                )}
              >
                {month}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="min-w-[1200px]">
            <TableHeader>
              <TableRow className="bg-gray-50/80 hover:bg-gray-50/80">
                <TableHead className="font-bold text-gray-500 text-[12px] w-[50px] pl-5">
                  No.
                </TableHead>

                <TableHead className="font-bold text-gray-500 text-[12px] min-w-[260px]">
                  Mitra
                </TableHead>

                <TableHead className="font-bold text-gray-500 text-[12px] min-w-[220px]">
                  Bidang Kerjasama
                </TableHead>

                <TableHead className="font-bold text-gray-500 text-[12px] min-w-[260px]">
                  Jangka Waktu Kontrak
                </TableHead>

                <TableHead className="font-bold text-gray-500 text-[12px] min-w-[180px]">
                  Keterangan
                </TableHead>

                <TableHead className="w-[48px]" />
              </TableRow>
            </TableHeader>

            <TableBody>
              {tableMessage ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="h-32 text-center text-[13px] text-gray-400 font-medium"
                  >
                    {tableMessage}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((row, index) => (
                <TableRow key={getRowKey(row, index)} className="hover:bg-gray-50/50 group">
                  <TableCell className="text-[13px] text-gray-500 font-medium pl-5">
                    {(currentPage - 1) * rowsPerPageNumber + index + 1}.
                  </TableCell>

                  <TableCell className="text-[13px] font-medium text-gray-900 max-w-[260px] whitespace-normal break-words leading-relaxed">
                    {row.mitra}
                  </TableCell>

                  <TableCell className="text-[13px] text-gray-600 max-w-[220px] whitespace-normal break-words leading-relaxed">
                    {row.bidangKerjasama}
                  </TableCell>

                  <TableCell className="text-[13px] text-gray-600 min-w-[260px] whitespace-nowrap">
                    {row.jangkaWaktuKontrak}
                  </TableCell>

                  <TableCell className="text-[13px] text-gray-600 max-w-[180px] whitespace-normal break-words leading-relaxed">
                    {row.keterangan}
                  </TableCell>

                  <TableCell>
                    <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-gray-100">
                      <MoreVertical className="size-4 text-gray-400" />
                    </button>
                  </TableCell>
                </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 sm:px-5 py-3 border-t border-gray-100">
          <div className="flex items-center gap-2 text-[13px] text-gray-500 font-medium">
            <span className="whitespace-nowrap">Baris per Page</span>
            <Select
              value={rowsPerPage}
              onValueChange={(value) => {
                setRowsPerPage(value);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="h-8 w-[70px] border-gray-200 bg-white text-[13px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[13px] text-gray-500 font-medium whitespace-nowrap">
              Page {currentPage} dari {totalPages}
            </span>

            <div className="flex items-center gap-1">
              {[
                {
                  icon: ChevronsLeft,
                  action: () => setCurrentPage(1),
                  disabled: currentPage === 1,
                },
                {
                  icon: ChevronLeft,
                  action: () =>
                    setCurrentPage(Math.max(1, currentPage - 1)),
                  disabled: currentPage === 1,
                },
                {
                  icon: ChevronRight,
                  action: () =>
                    setCurrentPage(
                      Math.min(totalPages, currentPage + 1)
                    ),
                  disabled: currentPage === totalPages,
                },
                {
                  icon: ChevronsRight,
                  action: () => setCurrentPage(totalPages),
                  disabled: currentPage === totalPages,
                },
              ].map((btn, i) => (
                <button
                  key={i}
                  onClick={btn.action}
                  disabled={btn.disabled}
                  className="p-1.5 rounded-md border border-gray-200 text-gray-400 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <btn.icon className="size-4" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
