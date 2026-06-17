import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Check,
  Search,
  Trash2,
  UserRound,
  X,
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
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { apiClient } from "@/api/config";
import { useApiData } from "@/api/hooks";

interface UserRow {
  no: number;
  name: string;
  email: string;
  role: "Administrator" | "Manajemen" | "Operator";
  isCurrentUser?: boolean;
  tanggalDaftar: string;
  status: "Aktif" | "Nonaktif";
  userId?: string;
  kstIdentifier?: string | null;
}

interface BackendUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  status: "pending_approval" | "active" | "rejected" | "inactive";
  roles: Array<{
    role: "super_admin" | "manajemen" | "operator";
    kstIdentifier: string | null;
    isActive: boolean;
  }>;
}

interface RegistrationRequest {
  id: string;
  requestedRole: "manajemen" | "operator";
  requestedKstIdentifier: "ngijo" | "cangar" | "jatikerto" | null;
  status: "pending" | "approved" | "rejected" | "cancelled";
  createdAt: string;
  user: {
    id: string;
    username: string;
    name: string;
    email: string;
    status: string;
  };
}

export const userData: UserRow[] = [
  {
    no: 1,
    name: "Admin Pusat",
    email: "admin@admin.com",
    role: "Administrator",
    isCurrentUser: true,
    tanggalDaftar: "3/5/2026",
    status: "Aktif",
  },
  {
    no: 2,
    name: "Manajer Proyek",
    email: "budi.santoso@perusahaan.com",
    role: "Manajemen",
    tanggalDaftar: "15/8/2025",
    status: "Aktif",
  },
  {
    no: 3,
    name: "Tim Keuangan",
    email: "sari.dewi@perusahaan.com",
    role: "Manajemen",
    tanggalDaftar: "1/12/2024",
    status: "Aktif",
  },
  {
    no: 4,
    name: "Tim Pengembangan",
    email: "rizky.pratama@perusahaan.com",
    role: "Manajemen",
    tanggalDaftar: "22/3/2026",
    status: "Aktif",
  },
  {
    no: 5,
    name: "Support Pelanggan",
    email: "dewi.lestari@perusahaan.com",
    role: "Manajemen",
    tanggalDaftar: "10/1/2027",
    status: "Aktif",
  },
  {
    no: 6,
    name: "Operator KST Ngijo",
    email: "operator.ngijo@perusahaan.com",
    role: "Operator",
    tanggalDaftar: "12/2/2026",
    status: "Aktif",
  },
  {
    no: 7,
    name: "Operator KST Cangar",
    email: "operator.cangar@perusahaan.com",
    role: "Operator",
    tanggalDaftar: "19/2/2026",
    status: "Aktif",
  },
  {
    no: 8,
    name: "Operator KST Jatikerto",
    email: "operator.jatikerto@perusahaan.com",
    role: "Operator",
    tanggalDaftar: "25/2/2026",
    status: "Nonaktif",
  },
];

function getRoleBadgeClass(role: UserRow["role"]) {
  if (role === "Administrator") {
    return "bg-[#E6F6EB] text-[#30A46C] border-[#CDEFD8]";
  }

  if (role === "Manajemen") {
    return "bg-blue-50 text-blue-600 border-blue-100";
  }

  return "bg-gray-50 text-gray-600 border-gray-200";
}

export default function KelolaAkun() {
  const [activeView, setActiveView] = useState<"users" | "registrations">(
    "users",
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("semua");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState("5");
  const [users, setUsers] = useState<UserRow[]>([]);
  const [userToDelete, setUserToDelete] = useState<UserRow | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const { data: backendUsers } = useApiData<{
    items: BackendUser[];
  }>("/users", { limit: 50, refreshKey });
  const { data: registrationApprovals } = useApiData<{
    items: RegistrationRequest[];
  }>("/approvals/registrations", {
    status: "pending",
    limit: 50,
    refreshKey,
  });

  useEffect(() => {
    if (!backendUsers?.items) return;

    const approvedUsers = backendUsers.items.filter(
      (user) => user.status === "active" || user.status === "inactive",
    );

    setUsers(
      approvedUsers.map((user, index) => {
        const primaryRole = user.roles.find((role) => role.isActive) ?? user.roles[0];
        const role =
          primaryRole?.role === "super_admin"
            ? "Administrator"
            : primaryRole?.role === "manajemen"
              ? "Manajemen"
              : "Operator";

        return {
          no: index + 1,
          userId: user.id,
          name: user.name,
          email: user.email,
          role,
          tanggalDaftar: new Date(user.createdAt).toLocaleDateString("id-ID"),
          status: user.status === "active" ? "Aktif" : "Nonaktif",
          kstIdentifier: primaryRole?.kstIdentifier,
        };
      }),
    );
  }, [backendUsers]);

  const filteredData = useMemo(() => {
    return users.filter((user) => {
      const keyword = searchQuery.toLowerCase();

      const matchSearch =
        user.name.toLowerCase().includes(keyword) ||
        user.email.toLowerCase().includes(keyword);

      const matchStatus =
        selectedStatus === "semua" ||
        user.status.toLowerCase() === selectedStatus;

      return matchSearch && matchStatus;
    });
  }, [searchQuery, selectedStatus, users]);

  const rowsPerPageNumber = Number(rowsPerPage);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredData.length / rowsPerPageNumber)
  );

  const paginatedData = filteredData.slice(
    (currentPage - 1) * rowsPerPageNumber,
    currentPage * rowsPerPageNumber
  );

  const openDeleteModal = (user: UserRow) => {
    setUserToDelete(user);
  };

  const closeDeleteModal = () => {
    setUserToDelete(null);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;

    if (!userToDelete.userId) return;
    await apiClient.delete(`/users/${userToDelete.userId}`);
    setUsers((prev) => prev.filter((user) => user.no !== userToDelete.no));
    setCurrentPage(1);
    setUserToDelete(null);
  };

  const refreshData = () => {
    setRefreshKey((value) => value + 1);
  };

  const approveRegistration = async (request: RegistrationRequest) => {
    await apiClient.post(`/approvals/registrations/${request.id}/approve`);
    setActionMessage(`Akun ${request.user.email} berhasil disetujui.`);
    refreshData();
  };

  const rejectRegistration = async (request: RegistrationRequest) => {
    const reason =
      window.prompt(`Alasan menolak registrasi ${request.user.email}:`) ??
      "Ditolak oleh super admin.";
    if (!reason.trim()) return;
    await apiClient.post(`/approvals/registrations/${request.id}/reject`, {
      reason,
    });
    setActionMessage(`Registrasi ${request.user.email} ditolak.`);
    refreshData();
  };

  const pendingRegistrations = registrationApprovals?.items ?? [];

  return (
    <>
      <div className="flex flex-col gap-5 p-4 md:p-6 bg-gray-50/50 min-h-screen">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
            {[
              { key: "users", label: "List Pengguna" },
              {
                key: "registrations",
                label: `Approval Registrasi (${pendingRegistrations.length})`,
              },
            ].map((item) => (
              <button
                key={item.key}
                onClick={() =>
                  setActiveView(item.key as "users" | "registrations")
                }
                className={cn(
                  "h-8 px-3 rounded-lg text-[13px] font-semibold transition-colors",
                  activeView === item.key
                    ? "bg-gray-900 text-white"
                    : "text-gray-600 hover:bg-gray-50",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>

          {activeView === "users" && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />

              <input
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Cari nama atau email..."
                className="h-9 w-[260px] rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-[13px] font-medium outline-none placeholder:text-gray-400 focus:border-gray-300 focus:ring-2 focus:ring-gray-100"
              />
            </div>

            <Select
              value={selectedStatus}
              onValueChange={(value) => {
                setSelectedStatus(value);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="h-9 w-[150px] border-gray-200 bg-white text-[13px] font-medium">
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="semua">Semua Status</SelectItem>
                <SelectItem value="aktif">Aktif</SelectItem>
                <SelectItem value="nonaktif">Nonaktif</SelectItem>
              </SelectContent>
            </Select>
          </div>
          )}
        </div>

        {actionMessage && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] font-semibold text-emerald-700">
            {actionMessage}
          </div>
        )}

        {activeView === "registrations" ? (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <Table className="min-w-[950px]">
                <TableHeader>
                  <TableRow className="bg-gray-50/80 hover:bg-gray-50/80">
                    <TableHead className="font-bold text-gray-500 text-[12px] w-[55px] text-center">
                      No.
                    </TableHead>
                    <TableHead className="font-bold text-gray-500 text-[12px] min-w-[260px]">
                      Pengguna
                    </TableHead>
                    <TableHead className="font-bold text-gray-500 text-[12px] min-w-[160px]">
                      Role Diajukan
                    </TableHead>
                    <TableHead className="font-bold text-gray-500 text-[12px] min-w-[140px]">
                      KST
                    </TableHead>
                    <TableHead className="font-bold text-gray-500 text-[12px] min-w-[150px]">
                      Tanggal
                    </TableHead>
                    <TableHead className="font-bold text-gray-500 text-[12px] min-w-[180px] text-center">
                      Aksi
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingRegistrations.length > 0 ? (
                    pendingRegistrations.map((request, index) => (
                      <TableRow key={request.id} className="hover:bg-gray-50/50">
                        <TableCell className="text-[13px] text-gray-500 font-medium text-center">
                          {index + 1}.
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="size-9 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center">
                              <UserRound className="size-5 text-gray-400" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[13px] font-bold text-gray-900">
                                {request.user.name}
                              </span>
                              <span className="text-[11px] text-gray-400 font-medium">
                                {request.user.email}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-[13px] font-semibold text-gray-700">
                          {request.requestedRole === "manajemen"
                            ? "Manajemen"
                            : "Operator"}
                        </TableCell>
                        <TableCell className="text-[13px] text-gray-600">
                          {request.requestedKstIdentifier
                            ? `KST ${request.requestedKstIdentifier}`
                            : "-"}
                        </TableCell>
                        <TableCell className="text-[13px] text-gray-600">
                          {new Date(request.createdAt).toLocaleDateString(
                            "id-ID",
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              onClick={() => approveRegistration(request)}
                              className="h-8 gap-1.5 bg-[#27A376] px-3 text-[12px] text-white hover:bg-[#1f8a63]"
                            >
                              <Check className="size-3.5" />
                              Approve
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => rejectRegistration(request)}
                              className="h-8 gap-1.5 border-red-200 px-3 text-[12px] text-red-500 hover:bg-red-50"
                            >
                              <X className="size-3.5" />
                              Reject
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="h-32 text-center text-[13px] text-gray-400 font-medium"
                      >
                        Tidak ada registrasi yang menunggu approval.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <Table className="min-w-[880px]">
              <TableHeader>
                <TableRow className="bg-gray-50/80 hover:bg-gray-50/80">
                  <TableHead className="font-bold text-gray-500 text-[12px] w-[55px] text-center">
                    No.
                  </TableHead>

                  <TableHead className="font-bold text-gray-500 text-[12px] min-w-[300px]">
                    Nama Pengguna
                  </TableHead>

                  <TableHead className="font-bold text-gray-500 text-[12px] min-w-[160px] text-center">
                    Role
                  </TableHead>

                  <TableHead className="font-bold text-gray-500 text-[12px] min-w-[150px] text-center">
                    Tanggal daftar
                  </TableHead>

                  <TableHead className="w-[60px]" />
                </TableRow>
              </TableHeader>

              <TableBody>
                {paginatedData.length > 0 ? (
                  paginatedData.map((user, index) => (
                    <TableRow
                      key={user.no}
                      className="hover:bg-gray-50/50 group"
                    >
                      <TableCell className="text-[13px] text-gray-500 font-medium text-center">
                        {(currentPage - 1) * rowsPerPageNumber + index + 1}.
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="size-9 rounded-full bg-gray-100 border border-gray-200 ring-2 ring-gray-50 shrink-0 flex items-center justify-center">
                            <UserRound className="size-5 text-gray-400" />
                          </div>

                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className="text-[13px] font-bold text-gray-900 leading-tight">
                                {user.name}
                              </span>

                              {user.isCurrentUser && (
                                <span className="inline-flex items-center justify-center rounded-full border border-gray-200 bg-white px-2.5 py-0.5 text-[10px] font-bold text-gray-700">
                                  Anda
                                </span>
                              )}
                            </div>

                            <span className="text-[11px] text-gray-400 font-medium">
                              {user.email}
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="text-center">
                        <span
                          className={cn(
                            "inline-flex items-center justify-center rounded-md border px-2.5 py-1 text-[11px] font-bold",
                            getRoleBadgeClass(user.role)
                          )}
                        >
                          {user.role}
                        </span>
                      </TableCell>

                      <TableCell className="text-[13px] text-gray-600 font-medium text-center whitespace-nowrap">
                        {user.tanggalDaftar}
                      </TableCell>

                      <TableCell className="text-center">
                        <button
                          onClick={() => openDeleteModal(user)}
                          disabled={user.isCurrentUser}
                          className="p-1.5 rounded-md text-red-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="h-32 text-center text-[13px] text-gray-400 font-medium"
                    >
                      Data pengguna tidak ditemukan.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

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
                ].map((button, index) => (
                  <button
                    key={index}
                    onClick={button.action}
                    disabled={button.disabled}
                    className="p-1.5 rounded-md border border-gray-200 text-gray-400 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <button.icon className="size-4" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
        )}
      </div>

      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4 backdrop-blur-[2px]">
          <div className="w-full max-w-[420px] rounded-2xl border border-gray-200 bg-white shadow-2xl animate-in fade-in-0 zoom-in-95 duration-150">
            <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4">
              <div>
                <h2 className="text-[16px] font-bold text-gray-900">
                  Hapus Pengelola?
                </h2>
                <p className="mt-1 text-[13px] text-gray-500">
                  Tindakan ini akan menghapus akses pengguna dari dashboard.
                </p>
              </div>

              <button
                onClick={closeDeleteModal}
                className="rounded-lg p-1.5 hover:bg-gray-100 transition-colors"
              >
                <X className="size-4 text-gray-500" />
              </button>
            </div>

            <div className="px-5 py-4">
              <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center">
                    <UserRound className="size-5 text-gray-400" />
                  </div>

                  <div className="flex flex-col">
                    <span className="text-[13px] font-bold text-gray-900">
                      {userToDelete.name}
                    </span>
                    <span className="text-[11px] text-gray-400 font-medium">
                      {userToDelete.email}
                    </span>
                  </div>
                </div>
              </div>

              <p className="mt-3 text-[12px] text-gray-500 leading-relaxed">
                Apakah kamu yakin ingin menghapus pengelola ini? Data yang
                sudah dihapus tidak bisa dikembalikan dari tampilan ini.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-5 py-4">
              <Button
                variant="outline"
                onClick={closeDeleteModal}
                className="h-9 px-4 text-[13px]"
              >
                Batal
              </Button>

              <Button
                onClick={confirmDeleteUser}
                className="h-9 px-4 bg-red-500 text-white hover:bg-red-600 text-[13px]"
              >
                Hapus
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
