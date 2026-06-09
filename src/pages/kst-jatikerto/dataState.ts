export function getJatikertoDataMessage(input: {
  isLoading: boolean;
  error: string | null;
  errorStatus?: number | null;
  hasItems: boolean;
}) {
  if (input.isLoading) return "Memuat data...";
  if (input.errorStatus === 403) return "Anda tidak memiliki akses";
  if (input.errorStatus === 404) return "Endpoint data tidak ditemukan";
  if (input.errorStatus === 503) return "Backend Jatikerto belum tersedia";
  if (input.error) return input.error;
  if (!input.hasItems) return "Data belum tersedia";
  return null;
}
