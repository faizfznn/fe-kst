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
import { Beef, CalendarDays, Gauge, Ruler } from "lucide-react";
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
  formatArea,
  formatFrequency,
  formatNumber,
  formatQuantity,
  getFrequencyValue,
  getLastUpdated,
  getNumericValue,
  JatikertoEmptyState,
  JatikertoHero,
  JatikertoPagination,
  JatikertoSummaryCards,
  JatikertoTableSkeleton,
  matchesFields,
  mutedBadgeClass,
  tableHeadClass,
  tableHeaderClass,
  tableRowClass,
} from "../dashboardUi";

interface PeternakanRow extends JatikertoApiRow {
  id?: string;
  no?: number;
  namaKomoditas: string;
  jumlah: number;
  satuan: string;
  luasUsaha: string;
  ketersediaanBulan: number;
  ketersediaanTahun: string;
  keterangan: string;
}

function getRowKey(row: PeternakanRow, index: number) {
  return rowIdentity(row) ?? `${row.namaKomoditas}-${index}`;
}

function mapPeternakanRow(row: PeternakanRow): PeternakanRow {
  const luasUsaha = getNumberValue(row, 1, ["luasUsaha", "luas_usaha", "luas", "area"], Number.NaN);
  const ketersediaanTahun = getNumberValue(row, 3, ["ketersediaanTahun", "ketersediaan_tahun", "perTahun", "per_tahun"], Number.NaN);

  return {
    ...row,
    id: row.rowId ?? row.id,
    namaKomoditas: getTextValue(row, 0, fieldAliases.nama, row.namaKomoditas),
    luasUsaha: Number.isFinite(luasUsaha) ? `${luasUsaha} m²` : row.luasUsaha,
    ketersediaanBulan: getNumberValue(row, 2, ["ketersediaanBulan", "ketersediaan_bulan", "bulan"], row.ketersediaanBulan),
    ketersediaanTahun: Number.isFinite(ketersediaanTahun) ? `${ketersediaanTahun} Kali` : row.ketersediaanTahun,
    jumlah: getNumberValue(row, 4, fieldAliases.jumlah, row.jumlah),
    satuan: getTextValue(row, 5, ["satuan", "unit"], row.satuan),
    keterangan: getTextValue(row, 6, ["keterangan", "description", "catatan"], row.keterangan ?? "-"),
  };
}

function rowMatchesPeternakanSearch(row: PeternakanRow, searchQuery: string) {
  return matchesFields([row.namaKomoditas, row.satuan, row.luasUsaha, row.keterangan], searchQuery);
}

export default function Peternakan() {
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
  } = usePageData<PeternakanRow>(API_ENDPOINTS.kst.jatikerto.peternakanItems, {
    year: selectedYear,
    month: selectedMonth,
    limit: 50,
  });

  const mappedData = tableData.map(mapPeternakanRow);
  const displayData = mappedData.filter((row) => rowMatchesPeternakanSearch(row, searchQuery));
  const rowsPerPageNumber = Number(rowsPerPage);
  const totalPages = Math.max(1, Math.ceil(displayData.length / rowsPerPageNumber));
  const totalPopulasi = mappedData.reduce((sum, row) => sum + Number(row.jumlah || 0), 0);
  const totalLuas = mappedData.reduce((sum, row) => sum + getNumericValue(row.luasUsaha), 0);
  const totalFrekuensi = mappedData.reduce((sum, row) => sum + getFrequencyValue(row.ketersediaanTahun), 0);
  const lastUpdated = getLastUpdated(mappedData);
  const summaryCards = [
    { label: "Total Komoditas Ternak", value: formatNumber(mappedData.length), icon: Beef },
    { label: "Total Populasi", value: formatQuantity(totalPopulasi, mappedData[0]?.satuan || "Ekor"), icon: Gauge },
    { label: "Total Luas Usaha", value: formatArea(totalLuas), icon: Ruler },
    { label: "Ketersediaan / Tahun", value: formatFrequency(totalFrekuensi), icon: CalendarDays },
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
      categoryName="Peternakan"
      subtitle="Proyeksi Panen Komoditas Peternakan"
      searchValue={searchQuery}
      searchPlaceholder="Cari komoditas ternak..."
      headerContent={
        <JatikertoHero
          title="Dashboard Peternakan"
          description="Pemantauan populasi, ketersediaan, dan produksi agro peternakan KST Jatikerto."
          badges={["Peternakan Agroindustri"]}
          lastUpdated={lastUpdated}
          metric={{ label: "Total Populasi", value: formatQuantity(totalPopulasi, mappedData[0]?.satuan || "Ekor") }}
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
          <Table className="min-w-[900px] table-fixed">
            <TableHeader>
              <TableRow className={tableHeaderClass}>
                <TableHead className={`${tableHeadClass} w-[56px] text-center`}>
                  No.
                </TableHead>
                <TableHead className={`${tableHeadClass} w-[24%]`}>
                  Komoditas Ternak
                </TableHead>
                <TableHead className={`${tableHeadClass} w-[16%] text-center`}>
                  Populasi
                </TableHead>
                <TableHead className={`${tableHeadClass} w-[14%] text-center`}>
                  Luas Usaha
                </TableHead>
                <TableHead className={`${tableHeadClass} w-[24%] text-center`}>
                  Ketersediaan
                </TableHead>
                <TableHead className={`${tableHeadClass} w-[22%]`}>
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
                  <TableRow key={getRowKey(row, index)} className={tableRowClass}>
                    <TableCell className="text-center text-[13px] font-medium text-gray-500">
                      {(currentPage - 1) * rowsPerPageNumber + index + 1}.
                    </TableCell>
                    <TableCell className="max-w-[220px] whitespace-normal break-words text-[13px] font-semibold leading-relaxed text-gray-900">
                      {row.namaKomoditas || "Belum tersedia"}
                    </TableCell>
                    <TableCell className="text-center text-[13px] font-medium text-gray-700 tabular-nums">
                      {formatQuantity(row.jumlah, row.satuan)}
                    </TableCell>
                    <TableCell className="text-center text-[13px] text-gray-600 tabular-nums">
                      {formatArea(row.luasUsaha)}
                    </TableCell>
                    <TableCell className="min-w-[250px]">
                      <div className="flex flex-wrap justify-center gap-2">
                        <Badge className={mutedBadgeClass}>
                          {formatNumber(row.ketersediaanBulan)} Bulan
                        </Badge>
                        <Badge className={badgeSoftGreenClass}>
                          {formatFrequency(row.ketersediaanTahun)}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[280px] whitespace-normal break-words text-[13px] leading-relaxed text-gray-600">
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
