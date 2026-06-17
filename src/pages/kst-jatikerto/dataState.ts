export function getJatikertoDataMessage(input: {
  isLoading: boolean;
  error: string | null;
  errorStatus?: number | null;
  hasItems: boolean;
}) {
  if (input.isLoading) return null;
  if (input.errorStatus === 403) return "Anda tidak memiliki akses untuk melihat data ini.";
  if (input.errorStatus === 404) return "Data belum tersedia";
  if (input.errorStatus === 503) return "Data sedang disiapkan";
  if (input.error) return "Data sedang disiapkan";
  if (!input.hasItems) return "Data belum tersedia";
  return null;
}
