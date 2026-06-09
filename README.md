# KST Executive Dashboard Frontend

Frontend dashboard KST UB untuk autentikasi pengguna, approval akun, pemantauan ringkasan dashboard, navigasi modul per KST, dan unduh laporan. Aplikasi dibuat dengan React, TypeScript, Vite, Tailwind CSS v4, shadcn/ui, React Router, Recharts, dan helper API berbasis `fetch`.

Dokumentasi ini menggantikan catatan lama yang masih berisi template Vite dan mock authentication. Kondisi saat ini sudah terhubung ke backend API melalui `VITE_API_BASE_URL`.

## Daftar Isi

- [Kebutuhan Awal](#kebutuhan-awal)
- [Cara Menjalankan Project](#cara-menjalankan-project)
- [Konfigurasi Environment](#konfigurasi-environment)
- [Alur Authentication](#alur-authentication)
- [Role dan Hak Akses](#role-dan-hak-akses)
- [Struktur Folder](#struktur-folder)
- [Routing Aplikasi](#routing-aplikasi)
- [Modul Dashboard](#modul-dashboard)
- [API Client dan Format Response](#api-client-dan-format-response)
- [Panduan Menambah Halaman Baru](#panduan-menambah-halaman-baru)
- [Panduan Mengambil Data dari API](#panduan-mengambil-data-dari-api)
- [Build dan Validasi](#build-dan-validasi)
- [Troubleshooting](#troubleshooting)

## Kebutuhan Awal

Pastikan sudah tersedia:

- Node.js versi modern yang kompatibel dengan Vite dan React 19.
- npm.
- Backend API KST berjalan dan bisa diakses dari browser.
- File `.env.local` di root project.

Dependency utama:

- `react` dan `react-dom`
- `react-router-dom`
- `@tailwindcss/vite`
- `lucide-react`
- `react-icons`
- `recharts`
- `sonner`
- komponen UI lokal di `src/components/ui`

## Cara Menjalankan Project

Install dependency:

```bash
npm install
```

Jalankan development server:

```bash
npm run dev
```

Buka URL yang muncul di terminal, biasanya:

```text
http://localhost:5173
```

Build production:

```bash
npm run build
```

Preview hasil build:

```bash
npm run preview
```

Lint:

```bash
npm run lint
```

## Konfigurasi Environment

File environment yang dipakai:

```text
.env.local
```

Isi minimal:

```env
VITE_API_BASE_URL=http://localhost:8000
```

Frontend membaca nilai tersebut di `src/api/config.ts`. Jika variabel tidak ada, default backend adalah:

```text
http://localhost:8000
```

Catatan:

- Jangan tambahkan trailing slash. Kode sudah membersihkan trailing slash, tetapi format tanpa trailing slash lebih rapi.
- Jika backend berjalan di port lain, ubah `VITE_API_BASE_URL`.
- Setelah mengubah `.env.local`, restart `npm run dev`.

## Alur Authentication

Authentication dikendalikan oleh `AuthProvider` di:

```text
src/contexts/AuthContext.tsx
```

Hook yang dipakai komponen:

```text
src/hooks/useAuth.ts
```

Alur login:

1. User membuka `/login`.
2. Form memanggil `login(usernameOrEmail, password)`.
3. Frontend mengirim request ke `POST /auth/login`.
4. Jika backend mengembalikan `accessToken` dan `user`, frontend menyimpan:
   - `access_token`
   - `currentUser`
5. User diarahkan ke `/dashboard`.

Alur refresh session:

1. Saat aplikasi dimuat, `AuthProvider` membaca `access_token` dan `currentUser` dari `localStorage`.
2. Jika token ada, frontend memanggil `GET /auth/me`.
3. Jika token expired, `apiClient` mencoba `POST /auth/refresh`.
4. Jika refresh berhasil, token baru disimpan.
5. Jika refresh gagal, session dibersihkan dan user kembali ke login.

Alur register:

1. User membuka `/register`.
2. User mengisi nama, username, email, password, role yang diajukan, dan KST jika role operator.
3. Frontend memanggil `POST /auth/register`.
4. Akun tidak langsung aktif.
5. User akan melihat pesan bahwa registrasi menunggu approval super admin.
6. Setelah beberapa saat user diarahkan ke `/login`.

Alur logout:

1. User klik tombol logout di sidebar.
2. Frontend memanggil `POST /auth/logout`.
3. `access_token` dan `currentUser` dihapus dari `localStorage`.

Validasi register di frontend:

- Nama wajib diisi.
- Username wajib diisi.
- Email wajib diisi dan harus format email.
- Password minimal 8 karakter.
- Konfirmasi password harus sama.
- Role `operator` wajib memilih satu KST.

## Role dan Hak Akses

Role yang dipakai frontend:

| Role | Keterangan |
| --- | --- |
| `super_admin` | Bisa membuka dashboard dan halaman Kelola Akun. |
| `manajemen` | Bisa membuka dashboard dan modul sesuai akses KST dari backend. |
| `operator` | Bisa membuka dashboard dan modul sesuai KST yang ditugaskan. |

Identifier KST:

| Identifier | Label |
| --- | --- |
| `ngijo` | KST Ngijo |
| `cangar` | KST Cangar |
| `jatikerto` | KST Jatikerto |

Proteksi route ada di:

```text
src/routes/ProtectedRoute.tsx
```

Contoh proteksi role:

```tsx
<ProtectedRoute allowedRoles={["super_admin"]}>
  <KelolaAkun />
</ProtectedRoute>
```

Contoh proteksi KST:

```tsx
<ProtectedRoute allowedKst="cangar">
  <StokOpname />
</ProtectedRoute>
```

Sidebar juga menyaring menu berdasarkan `user.activeRole` dan `user.kstAccess`, sehingga menu yang tidak boleh diakses tidak ditampilkan.

## Struktur Folder

Struktur utama:

```text
src/
  api/
    config.ts              # API client, token, refresh token, download URL
    hooks.ts               # useApiData, usePageData, parser pagination
  assets/
    logo.png
    dikst.jpg
  components/ui/           # Komponen UI reusable
  contexts/
    AuthContext.tsx        # State auth global
  hooks/
    useAuth.ts
    use-mobile.tsx
  layouts/
    dashboardLayout/
      DashboardLayout.tsx
      components/
        AppNavbar.tsx
        AppSidebar.tsx
        SearchCommand.tsx
        ReportDownloadCommand.tsx
  pages/
    login/
    register/
    dashboard/
    kst-cangar/
    kst-jatikerto/
    kst-ngijo/
  routes/
    index.tsx              # Deklarasi semua route
    routes.ts              # Konstanta path
    ProtectedRoute.tsx
  lib/
    utils.ts
  App.tsx
  main.tsx
  style.css
```

Alias import:

```ts
import { Button } from "@/components/ui/button";
```

Alias `@` mengarah ke `src`, dikonfigurasi di `vite.config.ts` dan `tsconfig.app.json`.

## Routing Aplikasi

Konstanta path ada di:

```text
src/routes/routes.ts
```

Route utama:

| Path | Halaman | Akses |
| --- | --- | --- |
| `/login` | Login | Public |
| `/register` | Register | Public |
| `/dashboard` | Dashboard utama | Authenticated |
| `/kelola-akun` | Kelola akun dan approval registrasi | `super_admin` |
| `/tracker-inovasi` | KST Ngijo - Tracker Inovasi | Akses KST Ngijo |
| `/keberlanjutan` | KST Ngijo - Keberlanjutan | Akses KST Ngijo |
| `/stok-opname` | KST Cangar - Stok Opname | Akses KST Cangar |
| `/booklist-atp` | KST Cangar - Booklist ATP | Akses KST Cangar |
| `/pertanian` | KST Jatikerto - Pertanian | Akses KST Jatikerto |
| `/peternakan` | KST Jatikerto - Peternakan | Akses KST Jatikerto |
| `/konservasi` | KST Jatikerto - Konservasi | Akses KST Jatikerto |
| `/pelayanan-akademik` | KST Jatikerto - Pelayanan Akademik | Akses KST Jatikerto |
| `/kemitraan` | KST Jatikerto - Kemitraan | Akses KST Jatikerto |

Semua route dashboard menggunakan layout:

```text
src/layouts/dashboardLayout/DashboardLayout.tsx
```

Layout terdiri dari:

- Sidebar navigasi.
- Navbar dengan breadcrumb dan search command.
- Area konten memakai `Outlet` dari React Router.

## Modul Dashboard

### Dashboard Utama

File:

```text
src/pages/dashboard/Dashboard.tsx
```

Endpoint yang dipakai:

- `GET /dashboard/summary`
- `GET /dashboard/collaboration?period=6months`
- `GET /dashboard/research-projects?period=6months`

Halaman ini menampilkan ringkasan pengunjung, KST aktif, total produksi, operasional aktif, chart proyek riset, green performance, dan total mitra.

### Kelola Akun

File:

```text
src/pages/dashboard/KelolaAkun.tsx
```

Endpoint yang dipakai:

- `GET /users?limit=50`
- `GET /approvals/registrations?status=pending&limit=50`
- `PATCH /users/:userId/roles`
- `DELETE /users/:userId`
- `POST /approvals/registrations/:id/approve`
- `POST /approvals/registrations/:id/reject`

Fitur:

- Melihat daftar user aktif/nonaktif.
- Filter user berdasarkan status.
- Search berdasarkan nama atau email.
- Mengubah hak akses user.
- Menghapus user.
- Approve atau reject registrasi baru.

### KST Ngijo

Halaman:

- `src/pages/kst-ngijo/trackerInovasi/TrackerInovasi.tsx`
- `src/pages/kst-ngijo/keberlanjutan/Keberlanjutan.tsx`

Route:

- `/tracker-inovasi`
- `/keberlanjutan`

Keduanya hanya tampil untuk user dengan `kstAccess` berisi `ngijo`.

### KST Cangar

Halaman:

- `src/pages/kst-cangar/stopOpname/StokOpname.tsx`
- `src/pages/kst-cangar/booklistAtp/BooklistAtp.tsx`

Route:

- `/stok-opname`
- `/booklist-atp`

Keduanya hanya tampil untuk user dengan `kstAccess` berisi `cangar`.

### KST Jatikerto

Halaman:

- `src/pages/kst-jatikerto/pertanian/Pertanian.tsx`
- `src/pages/kst-jatikerto/peternakan/Peternakan.tsx`
- `src/pages/kst-jatikerto/konservasi/Konservasi.tsx`
- `src/pages/kst-jatikerto/pelayananAkademik/PelayananAkademik.tsx`
- `src/pages/kst-jatikerto/kemitraan/Kemitraan.tsx`

Route:

- `/pertanian`
- `/peternakan`
- `/konservasi`
- `/pelayanan-akademik`
- `/kemitraan`

Semua hanya tampil untuk user dengan `kstAccess` berisi `jatikerto`.

### Unduh Laporan

Tombol unduh laporan ada di sidebar:

```text
src/layouts/dashboardLayout/components/AppSidebar.tsx
```

Endpoint:

```text
GET /reports/download
```

Query yang dikirim:

- `kst`
- `report`
- `year`
- `month`
- `format`

Token dikirim sebagai header:

```text
Authorization: Bearer <access_token>
```

Format yang tersedia di UI:

- CSV
- Excel
- PDF

Pilihan KST di modal unduh laporan mengikuti `user.kstAccess`.

## API Client dan Format Response

API client utama:

```text
src/api/config.ts
```

Helper yang tersedia:

```ts
apiClient.get<T>(path, query)
apiClient.post<T>(path, body, query)
apiClient.patch<T>(path, body)
apiClient.delete<T>(path)
getDownloadUrl(path, query)
```

Frontend mengharapkan response backend dalam envelope:

```ts
interface ApiEnvelope<T> {
  timestamp: string;
  response: T;
  error?: {
    code: number;
    message: string;
  };
}
```

Jika `response.ok` false atau `envelope.error` ada, `apiClient` akan throw `ApiError`.

Token behavior:

- `access_token` diambil dari `localStorage`.
- Jika token ada, request dikirim dengan header `Authorization`.
- Untuk request lintas cookie, `credentials: "include"` selalu aktif.
- Jika mendapat 401, client mencoba refresh lewat `POST /auth/refresh`.

## Panduan Menambah Halaman Baru

Contoh: menambah halaman KST Ngijo bernama Produksi.

### 1. Buat file halaman

Buat folder dan file:

```text
src/pages/kst-ngijo/produksi/Produksi.tsx
```

Contoh isi minimal:

```tsx
export default function Produksi() {
  return (
    <div className="p-4 md:p-6">
      <h1 className="text-xl font-bold text-gray-900">Produksi</h1>
    </div>
  );
}
```

### 2. Tambahkan konstanta route

Edit:

```text
src/routes/routes.ts
```

Tambahkan:

```ts
PRODUKSI: "/produksi",
```

### 3. Daftarkan route

Edit:

```text
src/routes/index.tsx
```

Import halaman:

```tsx
import Produksi from "@/pages/kst-ngijo/produksi/Produksi";
```

Tambahkan di dalam route protected dashboard:

```tsx
<Route
  path={ROUTES.PRODUKSI.substring(1)}
  element={
    <ProtectedRoute allowedKst="ngijo">
      <Produksi />
    </ProtectedRoute>
  }
/>
```

### 4. Tambahkan menu sidebar

Edit:

```text
src/layouts/dashboardLayout/components/AppSidebar.tsx
```

Tambahkan item ke grup KST Ngijo:

```ts
{
  title: "Produksi",
  url: ROUTES.PRODUKSI,
  icon: Package,
}
```

Pastikan icon sudah di-import dari `lucide-react`.

### 5. Tambahkan breadcrumb

Edit:

```text
src/layouts/dashboardLayout/components/AppNavbar.tsx
```

Tambahkan case:

```ts
case ROUTES.PRODUKSI:
  return { parent: "KST Ngijo", title: "Produksi" };
```

### 6. Validasi

Jalankan:

```bash
npm run build
```

Jika build berhasil, jalankan dev server dan cek halaman lewat browser.

## Panduan Mengambil Data dari API

Untuk data biasa, gunakan `useApiData`.

```tsx
import { useApiData } from "@/api/hooks";

interface SummaryResponse {
  totalVisitors: number;
}

export default function ExamplePage() {
  const { data, isLoading, error } = useApiData<SummaryResponse>("/dashboard/summary");

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;

  return <div>{data?.totalVisitors ?? 0}</div>;
}
```

Untuk data list/pagination, gunakan `usePageData`.

```tsx
import { usePageData } from "@/api/hooks";

interface Row {
  id: string;
  name: string;
}

export default function ExampleTable() {
  const { items, page, isLoading, error } = usePageData<Row>("/items", {
    limit: 10,
    offset: 0,
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;

  return (
    <div>
      <p>Total: {page?.total ?? items.length}</p>
      {items.map((item) => (
        <div key={item.id}>{item.name}</div>
      ))}
    </div>
  );
}
```

`usePageData` bisa membaca dua bentuk response:

```ts
{
  offset: number;
  limit: number;
  hasNext: boolean;
  total?: number;
  items: T[];
}
```

atau:

```ts
{
  data: {
    offset: number;
    limit: number;
    hasNext: boolean;
    total?: number;
    items: T[];
  }
}
```

## Build dan Validasi

Sebelum push atau deploy, jalankan:

```bash
npm run build
```

Opsional:

```bash
npm run lint
```

Build melakukan:

- TypeScript build (`tsc -b`)
- Vite production build

Jika build gagal karena error TypeScript, perbaiki error berdasarkan file dan line yang ditampilkan terminal.

## Troubleshooting

### Halaman selalu kembali ke `/login`

Kemungkinan:

- `access_token` tidak ada di `localStorage`.
- Token expired dan refresh gagal.
- Backend `GET /auth/me` mengembalikan error.
- Backend tidak berjalan atau `VITE_API_BASE_URL` salah.

Solusi:

1. Pastikan backend berjalan.
2. Cek `.env.local`.
3. Restart `npm run dev`.
4. Hapus `access_token` dan `currentUser` dari `localStorage`, lalu login ulang.

### Menu KST tidak muncul

Menu mengikuti data user dari backend:

```ts
user.kstAccess
```

Jika user tidak punya `ngijo`, `cangar`, atau `jatikerto`, grup menu terkait tidak ditampilkan.

### Kelola Akun tidak muncul

Halaman Kelola Akun hanya untuk:

```ts
activeRole === "super_admin"
```

Pastikan backend mengembalikan `activeRole` yang benar.

### Request API 401

`apiClient` akan mencoba refresh token otomatis. Jika tetap gagal:

- Pastikan endpoint `POST /auth/refresh` tersedia.
- Pastikan cookie refresh token dikirim oleh browser.
- Pastikan CORS backend mengizinkan credentials.
- Pastikan frontend memakai `credentials: "include"`.

### Data tabel kosong

Kemungkinan:

- Backend mengembalikan response dengan bentuk yang belum didukung.
- Query `limit`, `offset`, `status`, atau filter lain tidak sesuai.
- User tidak punya hak akses data tersebut.

Cek response Network tab di browser dan sesuaikan mapping di halaman terkait.

### File laporan gagal diunduh

Pastikan endpoint berikut tersedia:

```text
GET /reports/download
```

Pastikan backend menerima query:

- `kst`
- `report`
- `year`
- `month`
- `format`

Pastikan response mengembalikan file/blob dan status 2xx.
