import { useState } from "react";
import { Badge } from "@/components/ui/badge";
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
import { ImageOff, LayoutGrid, Leaf, Sprout } from "lucide-react";
import { usePageData } from "@/api/hooks";
import { API_ENDPOINTS } from "@/api/endpoints";
import { getJatikertoDataMessage } from "../dataState";
import {
  fieldAliases,
  formatDescription,
  getNumberValue,
  getTextValue,
  rowIdentity,
  type JatikertoApiRow,
} from "../rowMappers";
import { JatikertoTableLayout } from "../JatikertoTableLayout";
import {
  badgeSoftGreenClass,
  formatNumber,
  getLastUpdated,
  JatikertoEmptyState,
  JatikertoHero,
  JatikertoPagination,
  JatikertoSummaryCards,
  JatikertoTableSkeleton,
  matchesFields,
  tableHeadClass,
  tableHeaderClass,
  tableRowClass,
} from "../dashboardUi";

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

const categoryLabels: Record<KonservasiCategory, string> = {
  "konservasi-hewan": "Konservasi Hewan",
  "konservasi-tumbuhan": "Konservasi Tumbuhan",
};

function getRowKey(row: KonservasiRow, category: KonservasiCategory, index: number) {
  return rowIdentity(row) ?? `${category}-${row.namaKomoditas}-${index}`;
}

function mapKonservasiRow(row: KonservasiRow, category: KonservasiCategory): KonservasiRow {
  if (category === "konservasi-hewan") {
    return {
      ...row,
      id: row.rowId ?? row.id,
      namaKomoditas: getTextValue(row, 0, fieldAliases.nama, row.namaKomoditas),
      foto: getTextValue(row, 1, ["foto", "image", "gambar", "photo", "url"], row.foto ?? ""),
      jumlah: getNumberValue(row, 2, fieldAliases.jumlah, row.jumlah),
      satuan: getTextValue(row, 3, ["satuan", "unit"], row.satuan),
      keterangan: getTextValue(row, 4, ["keterangan", "description", "catatan"], row.keterangan ?? "-"),
    };
  }

  return {
    ...row,
    id: row.rowId ?? row.id,
    namaKomoditas: getTextValue(row, 0, fieldAliases.nama, row.namaKomoditas),
    foto: getTextValue(row, 7, ["foto", "image", "gambar", "photo", "url"], row.foto ?? ""),
    jumlah: getNumberValue(row, 4, fieldAliases.jumlah, row.jumlah),
    satuan: getTextValue(row, 5, ["satuan", "unit"], row.satuan),
    keterangan: getTextValue(row, 6, ["keterangan", "description", "catatan"], row.keterangan ?? "-"),
  };
}

function rowMatchesKonservasiSearch(row: KonservasiRow, searchQuery: string) {
  return matchesFields([row.namaKomoditas, row.satuan, row.keterangan], searchQuery);
}

function ConservationImage({ src, alt }: { src?: string; alt: string }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className="flex h-[72px] w-[128px] items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50 text-gray-400">
        <ImageOff className="size-5" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setFailed(true)}
      className="h-[72px] w-[128px] rounded-xl object-cover shadow-sm"
    />
  );
}

export default function Konservasi() {
  const [selectedYear] = useState("2026");
  const [selectedMonth] = useState("Semua Bulan");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState("5");
  const [selectedCategory, setSelectedCategory] =
    useState<KonservasiCategory>("konservasi-hewan");
  const konservasiEndpoint =
    selectedCategory === "konservasi-hewan"
      ? API_ENDPOINTS.kst.jatikerto.konservasiHewan
      : API_ENDPOINTS.kst.jatikerto.konservasiTanaman;
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

  const mappedData = activeData.map((row) => mapKonservasiRow(row, selectedCategory));
  const displayData = mappedData.filter((row) => rowMatchesKonservasiSearch(row, searchQuery));
  const rowsPerPageNumber = Number(rowsPerPage);
  const totalPages = Math.max(1, Math.ceil(displayData.length / rowsPerPageNumber));
  const totalJumlah = mappedData.reduce((sum, row) => sum + Number(row.jumlah || 0), 0);
  const lastUpdated = getLastUpdated(mappedData);
  const summaryCards = [
    { label: "Total Item Konservasi", value: formatNumber(mappedData.length), icon: Leaf },
    { label: "Total Populasi / Jumlah", value: formatNumber(totalJumlah), icon: Sprout },
    { label: "Kategori Aktif", value: categoryLabels[selectedCategory], icon: LayoutGrid },
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

  const handleChangeCategory = (value: KonservasiCategory) => {
    setSelectedCategory(value);
    setCurrentPage(1);
  };

  return (
    <JatikertoTableLayout
      categoryName="Konservasi"
      subtitle="Detail Konservasi KST Jatikerto"
      searchValue={searchQuery}
      searchPlaceholder="Cari komoditas konservasi..."
      headerContent={
        <JatikertoHero
          title="Dashboard Konservasi"
          description="Pemantauan konservasi hewan, tumbuhan, populasi, dan aktivitas pelestarian KST Jatikerto."
          badges={[categoryLabels[selectedCategory]]}
          lastUpdated={lastUpdated}
          metric={{ label: "Total Populasi/Jumlah", value: formatNumber(totalJumlah) }}
        />
      }
      beforeTable={<JatikertoSummaryCards items={summaryCards} />}
      onSearchChange={(value) => {
        setSearchQuery(value);
        setCurrentPage(1);
      }}
    >
      <>
        <div className="flex justify-end px-4 pb-4 sm:px-5">
          <Select
            value={selectedCategory}
            onValueChange={(value) =>
              handleChangeCategory(value as KonservasiCategory)
            }
          >
            <SelectTrigger className="h-10 w-full rounded-xl border-gray-200 bg-white text-[13px] font-semibold shadow-none sm:w-[240px]">
              <div className="flex items-center gap-2">
                <LayoutGrid className="size-4 text-emerald-700" />
                <SelectValue />
              </div>
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="konservasi-hewan">Konservasi Hewan</SelectItem>
              <SelectItem value="konservasi-tumbuhan">Konservasi Tumbuhan</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-x-auto">
          <Table className="min-w-[900px] table-fixed">
            <TableHeader>
              <TableRow className={tableHeaderClass}>
                <TableHead className={`${tableHeadClass} w-[56px] pl-5`}>
                  No.
                </TableHead>
                <TableHead className={`${tableHeadClass} w-[24%]`}>
                  Nama Komoditas
                </TableHead>
                <TableHead className={`${tableHeadClass} w-[16%] text-center`}>
                  Foto
                </TableHead>
                <TableHead className={`${tableHeadClass} w-[14%] text-center`}>
                  Jumlah
                </TableHead>
                <TableHead className={`${tableHeadClass} w-[17%] text-center`}>
                  Jenis Konservasi
                </TableHead>
                <TableHead className={`${tableHeadClass} w-[29%]`}>
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
                paginatedData.map((row, index) => (
                  <TableRow
                    key={getRowKey(row, selectedCategory, index)}
                    className={tableRowClass}
                  >
                    <TableCell className="pl-5 text-[13px] font-medium text-gray-500">
                      {(currentPage - 1) * rowsPerPageNumber + index + 1}.
                    </TableCell>
                    <TableCell className="max-w-[240px] whitespace-normal break-words text-[13px] font-semibold leading-relaxed text-gray-900">
                      {row.namaKomoditas || "Belum tersedia"}
                    </TableCell>
                    <TableCell className="min-w-[170px]">
                      <div className="flex justify-center">
                        <ConservationImage src={row.foto} alt={row.namaKomoditas} />
                      </div>
                    </TableCell>
                    <TableCell className="text-center text-[13px] font-medium text-gray-700 tabular-nums">
                      {row.jumlah ? `${formatNumber(row.jumlah)} ${row.satuan || ""}` : "Belum tersedia"}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={selectedCategory === "konservasi-hewan" ? "h-auto rounded-full border-orange-200 bg-orange-50 px-2.5 py-1 text-orange-700" : badgeSoftGreenClass}>
                        {categoryLabels[selectedCategory].replace("Konservasi ", "")}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[300px] whitespace-normal break-words text-[13px] leading-relaxed text-gray-600">
                      <p className="line-clamp-3 break-words">{formatDescription(row.keterangan)}</p>
                    </TableCell>
                  </TableRow>
                ))
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
