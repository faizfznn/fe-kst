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
import { Boxes, CalendarDays, Leaf, Ruler } from "lucide-react";
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

interface KomoditasRow extends JatikertoApiRow {
  id?: string;
  no?: number;
  nama: string;
  proyeksiPanen: number;
  satuan: string;
  luasUsaha: string;
  masaTanamBulan: number;
  masaTanamTahun: string;
  keterangan: string;
}

function getRowKey(row: KomoditasRow, index: number) {
  return rowIdentity(row) ?? `${row.nama}-${index}`;
}

function mapKomoditasRow(row: KomoditasRow): KomoditasRow {
  const luasUsaha = getNumberValue(row, 1, ["luasUsaha", "luas_usaha", "luas", "area"], Number.NaN);
  const masaTanamTahun = getNumberValue(row, 3, ["masaTanamTahun", "masa_tanam_tahun", "perTahun", "per_tahun"], Number.NaN);

  return {
    ...row,
    id: row.rowId ?? row.id,
    nama: getTextValue(row, 0, fieldAliases.nama, row.nama),
    luasUsaha: Number.isFinite(luasUsaha) ? `${luasUsaha} m²` : row.luasUsaha,
    masaTanamBulan: getNumberValue(row, 2, ["masaTanamBulan", "masa_tanam_bulan", "bulan"], row.masaTanamBulan),
    masaTanamTahun: Number.isFinite(masaTanamTahun) ? `${masaTanamTahun} Kali` : row.masaTanamTahun,
    proyeksiPanen: getNumberValue(row, 4, ["proyeksiPanen", "proyeksi_panen", "panen", ...fieldAliases.jumlah], row.proyeksiPanen),
    satuan: getTextValue(row, 5, ["satuan", "unit"], row.satuan),
    keterangan: getTextValue(row, 6, ["keterangan", "description", "catatan"], row.keterangan ?? "-"),
  };
}

function rowMatchesPertanianSearch(row: KomoditasRow, searchQuery: string) {
  return matchesFields([row.nama, row.satuan, row.luasUsaha, row.keterangan], searchQuery);
}

export default function Pertanian() {
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
  } = usePageData<KomoditasRow>(API_ENDPOINTS.kst.jatikerto.pertanianItems, {
    year: selectedYear,
    month: selectedMonth,
    limit: 50,
  });

  const mappedData = tableData.map(mapKomoditasRow);
  const displayData = mappedData.filter((row) => rowMatchesPertanianSearch(row, searchQuery));
  const rowsPerPageNumber = Number(rowsPerPage);
  const totalPages = Math.max(1, Math.ceil(displayData.length / rowsPerPageNumber));
  const totalPanen = mappedData.reduce((sum, row) => sum + Number(row.proyeksiPanen || 0), 0);
  const totalLuas = mappedData.reduce((sum, row) => sum + getNumericValue(row.luasUsaha), 0);
  const totalFrekuensi = mappedData.reduce((sum, row) => sum + getFrequencyValue(row.masaTanamTahun), 0);
  const lastUpdated = getLastUpdated(mappedData);
  const summaryCards = [
    { label: "Total Komoditas", value: formatNumber(mappedData.length), icon: Leaf },
    { label: "Total Proyeksi Panen", value: formatQuantity(totalPanen, mappedData[0]?.satuan || "Kg"), icon: Boxes },
    { label: "Total Luas Usaha", value: formatArea(totalLuas), icon: Ruler },
    { label: "Frekuensi Panen / Tahun", value: formatFrequency(totalFrekuensi), icon: CalendarDays },
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
      categoryName="Pertanian"
      subtitle="Proyeksi Panen Komoditas Pertanian"
      searchValue={searchQuery}
      searchPlaceholder="Cari komoditas..."
      headerContent={
        <JatikertoHero
          title="Dashboard Pertanian"
          description="Proyeksi Panen Komoditas Pertanian dan pengelolaan produksi agro KST Jatikerto."
          badges={["Pertanian Agroindustri"]}
          lastUpdated={lastUpdated}
          metric={{ label: "Total Proyeksi Panen", value: formatQuantity(totalPanen, mappedData[0]?.satuan || "Kg") }}
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
                  Komoditas
                </TableHead>
                <TableHead className={`${tableHeadClass} w-[16%] text-center`}>
                  Proyeksi Panen
                </TableHead>
                <TableHead className={`${tableHeadClass} w-[14%] text-center`}>
                  Luas Usaha
                </TableHead>
                <TableHead className={`${tableHeadClass} w-[24%] text-center`}>
                  Masa Tanam
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
                      {row.nama || "Belum tersedia"}
                    </TableCell>
                    <TableCell className="text-center text-[13px] font-medium text-gray-700 tabular-nums">
                      {formatQuantity(row.proyeksiPanen, row.satuan)}
                    </TableCell>
                    <TableCell className="text-center text-[13px] text-gray-600 tabular-nums">
                      {formatArea(row.luasUsaha)}
                    </TableCell>
                    <TableCell className="min-w-[250px]">
                      <div className="flex flex-wrap justify-center gap-2">
                        <Badge className={mutedBadgeClass}>
                          {formatNumber(row.masaTanamBulan)} Bulan
                        </Badge>
                        <Badge className={badgeSoftGreenClass}>
                          {formatFrequency(row.masaTanamTahun)}
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
