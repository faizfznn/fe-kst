export const CANGAR_EMPTY_TEXT = "Data belum tersedia";
export const CANGAR_PREPARING_TEXT = "Data sedang disiapkan";

export function cangarFriendlyMessage(_message?: string | null, fallback = CANGAR_PREPARING_TEXT) {
  return fallback;
}
