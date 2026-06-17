import { useMemo } from "react";
import { ClipboardList, Package, RotateCcw, TrendingDown, TrendingUp } from "lucide-react";
import { useApiData, parsePageContainer } from "@/api/hooks";
import { API_ENDPOINTS } from "@/api/endpoints";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { adaptStockRows, adaptStockSummary, type StockItemRow } from "../adapters";
import {
  CangarAlert,
  CangarEmptyState,
  CangarHero,
  CangarSummaryCards,
  cangarTableHeadClass,
  cangarTableHeaderClass,
  cangarTableRowClass,
  cangarTabsListClass,
  cangarTabsTriggerClass,
  tableLoadingRow,
} from "../cangarUi";
import { cangarFriendlyMessage } from "../cangarHelpers";

const STOK_TABS = [
  "Data Barang",
  "Stok Harian",
  "Master Barang",
  "Laporan Mingguan",
];

function signedValue(value: number, prefix: "+" | "-") {
  return `${prefix}${Math.abs(value).toLocaleString("id-ID")}`;
}

function statusBadgeClass(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === "tervalidasi") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (normalized === "ditolak") return "border-red-200 bg-red-50 text-red-700";
  if (normalized === "draft") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-gray-200 bg-gray-50 text-gray-700";
}

export default function StokOpname() {
  const {
    data: stokPayload,
    isLoading: isStokLoading,
    error: stokError,
  } = useApiData<unknown>(API_ENDPOINTS.kst.cangar.stock, { limit: 100 });
  const {
    data: itemsPayload,
    isLoading: isItemsLoading,
    error: itemsError,
  } = useApiData<unknown>(
    API_ENDPOINTS.kst.cangar.stockItems,
    { limit: 100 },
  );
  const { data: summaryPayload, error: summaryError } = useApiData<unknown>(
    API_ENDPOINTS.kst.cangar.summary,
  );

  const isLoading = isStokLoading || isItemsLoading;


  const rows = useMemo(() => {
    const stokRows = adaptStockRows(stokPayload);

    let pageRows: StockItemRow[] = [];
    if (stokRows.length === 0 && stokPayload !== null) {
      const page = parsePageContainer<unknown>(
        stokPayload as { data?: { offset: number; limit: number; hasNext: boolean; items: unknown[] } },
      );
      if (page?.items && page.items.length > 0) {
        pageRows = adaptStockRows(page.items);
      }
    }

    const itemRows = adaptStockRows(itemsPayload);

    const primaryRows = stokRows.length > 0 ? stokRows : pageRows;

    if (primaryRows.length > 0 && itemRows.length > 0) {
      const byName = new Map(primaryRows.map((row) => [row.namaBarang.toLowerCase(), row]));
      for (const item of itemRows) {
        if (!byName.has(item.namaBarang.toLowerCase())) {
          byName.set(item.namaBarang.toLowerCase(), item);
        }
      }
      return Array.from(byName.values());
    }

    if (primaryRows.length > 0) return primaryRows;
    if (itemRows.length > 0) return itemRows;


    return [];
  }, [stokPayload, itemsPayload]);

  const masterRows = useMemo(() => {
    const itemRows = adaptStockRows(itemsPayload);
    return itemRows.length > 0 ? itemRows : rows;
  }, [itemsPayload, rows]);

  const summary = useMemo(() => {
    const stockSummary = adaptStockSummary(summaryPayload, rows);
    return {
      ...stockSummary,
      totalBarang: stockSummary.totalBarang || masterRows.length,
    };
  }, [summaryPayload, rows, masterRows.length]);
  const hasError = Boolean(stokError || itemsError || summaryError);

  return (
    <div className="flex min-h-screen flex-col gap-5 bg-gray-50/50 p-4 md:p-6">
      <CangarHero
        title="Dashboard Stok Operasional Cangar"
        description="Pemantauan stok opname, arus barang, retur, dan kesiapan operasional layanan eco-agrotourism KST Cangar."
        badges={["Stok Opname", "Operasional", "Eco-Agrotourism"]}
        metric={{ label: "Total Barang", value: summary.totalBarang.toLocaleString("id-ID") }}
      />

      {hasError ? (
        <CangarAlert>
          {cangarFriendlyMessage(stokError || itemsError || summaryError)}
        </CangarAlert>
      ) : null}

      <CangarSummaryCards
        items={[
          { label: "Total Barang", value: summary.totalBarang, icon: Package, helper: "Jumlah barang terpantau" },
          { label: "Total Masuk", value: signedValue(summary.totalMasuk, "+"), icon: TrendingUp, helper: "Akumulasi barang masuk", tone: "green" },
          { label: "Total Keluar", value: signedValue(summary.totalKeluar, "-"), icon: TrendingDown, helper: "Akumulasi barang keluar", tone: "red" },
          { label: "Total Retur", value: summary.totalRetur, icon: RotateCcw, helper: "Total barang retur" },
        ]}
      />

      <Tabs defaultValue="Data Barang" className="gap-4">
        <div className="overflow-x-auto pb-1">
          <TabsList className={cangarTabsListClass}>
            {STOK_TABS.map((tab) => (
              <TabsTrigger key={tab} value={tab} className={cangarTabsTriggerClass}>
                {tab}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="Data Barang">
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <Table className="min-w-[1080px] table-fixed">
                <TableHeader>
                  <TableRow className={cangarTableHeaderClass}>
                    <TableHead className={`${cangarTableHeadClass} w-[22%]`}>Nama Barang</TableHead>
                    <TableHead className={`${cangarTableHeadClass} w-[8%]`}>Satuan</TableHead>
                    <TableHead className={`${cangarTableHeadClass} w-[11%] text-center`}>Total Masuk</TableHead>
                    <TableHead className={`${cangarTableHeadClass} w-[11%] text-center`}>Total Keluar</TableHead>
                    <TableHead className={`${cangarTableHeadClass} w-[10%] text-center`}>Total Retur</TableHead>
                    <TableHead className={`${cangarTableHeadClass} w-[12%] text-center`}>Stok Sistem</TableHead>
                    <TableHead className={`${cangarTableHeadClass} w-[13%] text-center`}>Stok Fisik</TableHead>
                    <TableHead className={`${cangarTableHeadClass} w-[11%] text-center`}>Selisih</TableHead>
                    <TableHead className={`${cangarTableHeadClass} w-[15%]`}>Status Opname</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    tableLoadingRow(9)
                  ) : rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="p-5">
                        <CangarEmptyState title="Data belum tersedia" description="Data barang Cangar sedang disiapkan." />
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((row, idx) => (
                      <TableRow key={`${row.id}-${idx}`} className={cangarTableRowClass}>
                        <TableCell className="whitespace-normal break-words font-semibold leading-relaxed text-gray-900">{row.namaBarang || "Belum tersedia"}</TableCell>
                        <TableCell className="whitespace-normal break-words text-gray-600">{row.satuan || "Belum tersedia"}</TableCell>
                        <TableCell className="text-center font-semibold text-emerald-700 tabular-nums">
                          {signedValue(row.totalMasuk, "+")}
                        </TableCell>
                        <TableCell className="text-center font-semibold text-red-700 tabular-nums">
                          {signedValue(row.totalKeluar, "-")}
                        </TableCell>
                        <TableCell className="text-center text-gray-700 tabular-nums">{row.totalRetur}</TableCell>
                        <TableCell className="text-center font-medium text-gray-900">
                          {row.stokSistem.toLocaleString("id-ID")} {row.satuan}
                        </TableCell>
                        <TableCell className="whitespace-normal break-words text-center text-gray-600">{row.stokFisikTerakhir || "Belum tersedia"}</TableCell>
                        <TableCell className="whitespace-normal break-words text-center text-gray-600">{row.selisihTerakhir || "Belum tersedia"}</TableCell>
                        <TableCell>
                          <div className="flex flex-col items-start gap-1">
                            <Badge variant="outline" className={`rounded-md ${statusBadgeClass(row.statusOpname)}`}>
                              <ClipboardList className="size-3" />
                              {row.statusOpname}
                            </Badge>
                            {row.periode ? (
                              <span className="text-xs font-medium text-gray-500">{row.periode}</span>
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="Stok Harian">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card className="rounded-lg border-gray-200 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-semibold text-gray-600">Total Masuk Hari Ini</CardTitle>
                <TrendingUp className="size-4 text-emerald-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-700">
                  {signedValue(summary.totalMasuk, "+")}
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-lg border-gray-200 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-semibold text-gray-600">Total Keluar Hari Ini</CardTitle>
                <TrendingDown className="size-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-700">
                  {signedValue(summary.totalKeluar, "-")}
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-lg border-gray-200 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-semibold text-gray-600">Total Retur Hari Ini</CardTitle>
                <RotateCcw className="size-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  {summary.totalRetur.toLocaleString("id-ID")}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="Master Barang">
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <Table className="min-w-[640px] table-fixed">
                <TableHeader>
                  <TableRow className={cangarTableHeaderClass}>
                    <TableHead className={`${cangarTableHeadClass} min-w-[100px] text-center`}>ID</TableHead>
                    <TableHead className={`${cangarTableHeadClass} min-w-[260px]`}>Nama Barang</TableHead>
                    <TableHead className={`${cangarTableHeadClass} min-w-[120px]`}>Satuan</TableHead>
                    <TableHead className={`${cangarTableHeadClass} min-w-[160px]`}>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    tableLoadingRow(4)
                  ) : masterRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="p-5">
                        <CangarEmptyState title="Data belum tersedia" description="Master barang Cangar sedang disiapkan." />
                      </TableCell>
                    </TableRow>
                  ) : (
                    masterRows.map((row, idx) => (
                      <TableRow key={`${row.id}-${idx}`} className={cangarTableRowClass}>
                        <TableCell className="text-center font-semibold text-gray-900">#{row.id}</TableCell>
                        <TableCell className="whitespace-normal break-words font-medium text-gray-900">{row.namaBarang || "Belum tersedia"}</TableCell>
                        <TableCell className="whitespace-normal break-words text-gray-600">{row.satuan || "Belum tersedia"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="rounded-md border-emerald-200 bg-emerald-50 text-emerald-700">
                            Aktif
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="Laporan Mingguan">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card className="rounded-lg border-gray-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-gray-600">Total Masuk Mingguan</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-700">{signedValue(summary.totalMasuk, "+")}</div>
              </CardContent>
            </Card>
            <Card className="rounded-lg border-gray-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-gray-600">Total Keluar Mingguan</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-700">{signedValue(summary.totalKeluar, "-")}</div>
              </CardContent>
            </Card>
            <Card className="rounded-lg border-gray-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-gray-600">Total Retur Mingguan</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{summary.totalRetur.toLocaleString("id-ID")}</div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-4 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <Table className="min-w-[820px] table-fixed">
                <TableHeader>
                  <TableRow className={cangarTableHeaderClass}>
                    <TableHead className={`${cangarTableHeadClass} min-w-[220px]`}>Nama Barang</TableHead>
                    <TableHead className={`${cangarTableHeadClass} min-w-[110px]`}>Satuan</TableHead>
                    <TableHead className={`${cangarTableHeadClass} min-w-[130px] text-center`}>Masuk</TableHead>
                    <TableHead className={`${cangarTableHeadClass} min-w-[130px] text-center`}>Keluar</TableHead>
                    <TableHead className={`${cangarTableHeadClass} min-w-[130px] text-center`}>Retur</TableHead>
                    <TableHead className={`${cangarTableHeadClass} min-w-[140px] text-center`}>Stok Sistem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    tableLoadingRow(6)
                  ) : rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="p-5">
                        <CangarEmptyState title="Data belum tersedia" description="Laporan mingguan Cangar sedang disiapkan." />
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((row, idx) => (
                      <TableRow key={`${row.id}-${idx}`} className={cangarTableRowClass}>
                        <TableCell className="whitespace-normal break-words font-semibold text-gray-900">{row.namaBarang || "Belum tersedia"}</TableCell>
                        <TableCell className="whitespace-normal break-words text-gray-600">{row.satuan || "Belum tersedia"}</TableCell>
                        <TableCell className="text-center font-semibold text-emerald-700 tabular-nums">
                          {signedValue(row.totalMasuk, "+")}
                        </TableCell>
                        <TableCell className="text-center font-semibold text-red-700 tabular-nums">
                          {signedValue(row.totalKeluar, "-")}
                        </TableCell>
                        <TableCell className="text-center text-gray-700 tabular-nums">{row.totalRetur}</TableCell>
                        <TableCell className="text-center font-medium text-gray-900">
                          {row.stokSistem.toLocaleString("id-ID")} {row.satuan}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
