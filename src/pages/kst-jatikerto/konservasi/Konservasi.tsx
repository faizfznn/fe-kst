import { useState } from "react";
import {
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  LayoutGrid,
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
import { numberValue, rowIdentity, textValue, type JatikertoApiRow } from "../rowMappers";

interface KonservasiRow extends JatikertoApiRow {
  id?: string;
  no?: number;
  namaKomoditas: string;
  foto: string;
  jumlah: number;
  satuan: string;
  keterangan: string;
}

type KonservasiCategory = "konservasi-hewan" | "konservasi-tumbuhan";

export const hewanData: KonservasiRow[] = [
  {
    no: 1,
    namaKomoditas: "Rusa Totol",
    foto:
      "https://images.unsplash.com/photo-1484406566174-9da000fda645?w=300&h=160&fit=crop",
    jumlah: 8,
    satuan: "Ekor",
    keterangan: "Keterangan dari hewan dan gambar",
  },
  {
    no: 2,
    namaKomoditas: "Kijang Jawa kijang jawa pajero",
    foto:
      "https://images.unsplash.com/photo-1546182990-dffeafbe841d?w=300&h=160&fit=crop",
    jumlah: 18,
    satuan: "Ekor",
    keterangan:
      "Keterangan dari hewan dan gambar yang cukup panjang sehingga perlu turun baris agar tabel tetap rapi.",
  },
  {
    no: 3,
    namaKomoditas: "Merak Hijau",
    foto:
      "https://images.unsplash.com/photo-1522926193341-e9ffd686c60f?w=300&h=160&fit=crop",
    jumlah: 2,
    satuan: "Ekor",
    keterangan: "Keterangan dari hewan dan gambar",
  },
  {
    no: 4,
    namaKomoditas: "Elang Jawa",
    foto:
      "https://images.unsplash.com/photo-1501706362039-c6e8090b8372?w=300&h=160&fit=crop",
    jumlah: 4,
    satuan: "Ekor",
    keterangan: "Pemantauan habitat dan kesehatan rutin",
  },
  {
    no: 5,
    namaKomoditas: "Burung Jalak Bali",
    foto:
      "https://images.unsplash.com/photo-1522926193341-e9ffd686c60f?w=300&h=160&fit=crop",
    jumlah: 6,
    satuan: "Ekor",
    keterangan: "Program konservasi dan pengembangbiakan",
  },
  {
    no: 6,
    namaKomoditas: "Kura-kura Hutan",
    foto:
      "https://images.unsplash.com/photo-1437622368342-7a3d73a34c8f?w=300&h=160&fit=crop",
    jumlah: 12,
    satuan: "Ekor",
    keterangan: "Perawatan area konservasi semi alami",
  },
];

export const tumbuhanData: KonservasiRow[] = [
  {
    no: 1,
    namaKomoditas: "Anggrek Bulan",
    foto:
      "https://images.unsplash.com/photo-1566907225470-b77b78824271?w=300&h=160&fit=crop",
    jumlah: 35,
    satuan: "Pohon",
    keterangan: "Tanaman konservasi dengan pemantauan kelembaban rutin",
  },
  {
    no: 2,
    namaKomoditas: "Kantong Semar",
    foto:
      "https://images.unsplash.com/photo-1501004318641-b39e6451bec6?w=300&h=160&fit=crop",
    jumlah: 20,
    satuan: "Tanaman",
    keterangan:
      "Tumbuhan endemik yang membutuhkan area lembab dan perlindungan khusus.",
  },
  {
    no: 3,
    namaKomoditas: "Edelweis Jawa",
    foto:
      "https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=300&h=160&fit=crop",
    jumlah: 15,
    satuan: "Rumpun",
    keterangan: "Dibudidayakan sebagai bagian dari konservasi tumbuhan langka",
  },
  {
    no: 4,
    namaKomoditas: "Bambu Petung",
    foto:
      "https://images.unsplash.com/photo-1540946485063-a40da27545f8?w=300&h=160&fit=crop",
    jumlah: 50,
    satuan: "Batang",
    keterangan: "Digunakan untuk konservasi lahan dan penguatan area hijau",
  },
  {
    no: 5,
    namaKomoditas: "Pohon Trembesi",
    foto:
      "https://images.unsplash.com/photo-1448375240586-882707db888b?w=300&h=160&fit=crop",
    jumlah: 28,
    satuan: "Pohon",
    keterangan: "Tanaman peneduh dan penyerap karbon di area konservasi",
  },
  {
    no: 6,
    namaKomoditas: "Paku Sarang Burung",
    foto:
      "https://images.unsplash.com/photo-1509423350716-97f9360b4e09?w=300&h=160&fit=crop",
    jumlah: 40,
    satuan: "Tanaman",
    keterangan: "Tumbuhan hias konservasi yang dirawat pada area teduh",
  },
];

const months = ["Semua Bulan", "Januari", "Februari", "Maret", "April"];

function getRowKey(row: KonservasiRow, category: KonservasiCategory, index: number) {
  return rowIdentity(row) ?? `${category}-${row.namaKomoditas}-${index}`;
}

function mapKonservasiRow(row: KonservasiRow, category: KonservasiCategory): KonservasiRow {
  if (!row.colValues) return row;

  if (category === "konservasi-hewan") {
    return {
      ...row,
      id: row.rowId ?? row.id,
      namaKomoditas: textValue(row, 0),
      foto: textValue(row, 1),
      jumlah: numberValue(row, 2),
      satuan: textValue(row, 3),
      keterangan: textValue(row, 4, "-"),
    };
  }

  return {
    ...row,
    id: row.rowId ?? row.id,
    namaKomoditas: textValue(row, 0),
    foto: row.foto ?? "",
    jumlah: numberValue(row, 4),
    satuan: textValue(row, 5),
    keterangan: textValue(row, 6, "-"),
  };
}

export default function Konservasi() {
  const [selectedYear, setSelectedYear] = useState("2026");
  const [selectedMonth, setSelectedMonth] = useState("Semua Bulan");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState("5");
  const [selectedCategory, setSelectedCategory] =
    useState<KonservasiCategory>("konservasi-hewan");
  const konservasiEndpoint =
    selectedCategory === "konservasi-hewan"
      ? "/kst/jatikerto/data/konservasi/hewan"
      : "/kst/jatikerto/data/konservasi/tanaman";
  const {
    items: activeData,
    isLoading,
    error,
    errorStatus,
  } = usePageData<KonservasiRow>(konservasiEndpoint, {
    year: selectedYear,
    month: selectedMonth,
    limit: 50,
  });

  const rowsPerPageNumber = Number(rowsPerPage);

  const totalPages = Math.max(
    1,
    Math.ceil(activeData.length / rowsPerPageNumber)
  );

  const paginatedData = activeData.slice(
    (currentPage - 1) * rowsPerPageNumber,
    currentPage * rowsPerPageNumber
  ).map((row) => mapKonservasiRow(row, selectedCategory));
  const tableMessage = getJatikertoDataMessage({
    isLoading,
    error,
    errorStatus,
    hasItems: activeData.length > 0,
  });

  const handleChangeCategory = (value: KonservasiCategory) => {
    setSelectedCategory(value);
    setCurrentPage(1);
  };

  return (
    <div className="flex flex-col gap-5 p-4 md:p-6 bg-gray-50/50 min-h-screen">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
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

        <Select
          value={selectedCategory}
          onValueChange={(value) =>
            handleChangeCategory(value as KonservasiCategory)
          }
        >
          <SelectTrigger className="h-9 w-[220px] border-gray-200 bg-white text-[13px] font-medium">
            <div className="flex items-center gap-2">
              <LayoutGrid className="size-4 text-gray-700" />
              <SelectValue />
            </div>
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="konservasi-hewan">
              Konservasi Hewan
            </SelectItem>

            <SelectItem value="konservasi-tumbuhan">
              Konservasi Tumbuhan
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="min-w-[1100px]">
            <TableHeader>
              <TableRow className="bg-gray-50/80 hover:bg-gray-50/80">
                <TableHead className="font-bold text-gray-500 text-[12px] w-[50px] pl-5">
                  No.
                </TableHead>

                <TableHead className="font-bold text-gray-500 text-[12px] min-w-[240px]">
                  Nama Komoditas
                </TableHead>

                <TableHead className="font-bold text-gray-500 text-[12px] text-center min-w-[180px]">
                  Foto
                </TableHead>

                <TableHead className="font-bold text-gray-500 text-[12px] text-center min-w-[100px]">
                  Jumlah
                </TableHead>

                <TableHead className="font-bold text-gray-500 text-[12px] text-center min-w-[120px]">
                  Satuan
                </TableHead>

                <TableHead className="font-bold text-gray-500 text-[12px] min-w-[260px]">
                  Keterangan
                </TableHead>

                <TableHead className="w-[48px]" />
              </TableRow>
            </TableHeader>

            <TableBody>
              {tableMessage ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="h-32 text-center text-[13px] text-gray-400 font-medium"
                  >
                    {tableMessage}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((row, index) => (
                <TableRow
                  key={getRowKey(row, selectedCategory, index)}
                  className="hover:bg-gray-50/50 group"
                >
                  <TableCell className="text-[13px] text-gray-500 font-medium pl-5">
                    {(currentPage - 1) * rowsPerPageNumber + index + 1}.
                  </TableCell>

                  <TableCell className="text-[13px] font-medium text-gray-900 max-w-[240px] whitespace-normal break-words leading-relaxed">
                    {row.namaKomoditas}
                  </TableCell>

                  <TableCell className="min-w-[180px]">
                    <div className="flex justify-center">
                      <img
                        src={row.foto}
                        alt={row.namaKomoditas}
                        className="h-[70px] w-[150px] rounded-xl object-cover"
                      />
                    </div>
                  </TableCell>

                  <TableCell className="text-[13px] text-gray-600 font-medium text-center min-w-[100px] whitespace-nowrap tabular-nums">
                    {row.jumlah}
                  </TableCell>

                  <TableCell className="text-[13px] text-gray-500 text-center min-w-[120px] whitespace-nowrap">
                    {row.satuan}
                  </TableCell>

                  <TableCell className="text-[13px] text-gray-600 max-w-[260px] whitespace-normal break-words leading-relaxed">
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
                    setCurrentPage(Math.min(totalPages, currentPage + 1)),
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
