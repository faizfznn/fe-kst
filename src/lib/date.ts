const ID_MONTHS = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

type CalendarParts = {
  year: number;
  month: number;
  day: number;
  hour?: string;
  minute?: string;
};

const KST_TIME_ZONE = "Asia/Jakarta";

const ID_MONTH_INDEX = ID_MONTHS.reduce<Record<string, number>>((acc, month, index) => {
  acc[month.toLowerCase()] = index;
  return acc;
}, {});

function partsInKstTimeZone(text: string): CalendarParts | null {
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return null;

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: KST_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(parsed);

  const valueOf = (type: string) => parts.find((part) => part.type === type)?.value;
  const year = Number(valueOf("year"));
  const month = Number(valueOf("month"));
  const day = Number(valueOf("day"));
  if (!year || !month || !day) return null;

  return {
    year,
    month,
    day,
    hour: valueOf("hour"),
    minute: valueOf("minute"),
  };
}

export function extractCalendarParts(value?: unknown): CalendarParts | null {
  if (value === undefined || value === null) return null;

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return {
      year: value.getFullYear(),
      month: value.getMonth() + 1,
      day: value.getDate(),
      hour: String(value.getHours()).padStart(2, "0"),
      minute: String(value.getMinutes()).padStart(2, "0"),
    };
  }

  const text = String(value).trim();
  if (!text) return null;

  const isoDateTime = text.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,9})?)?(Z|[+-]\d{2}:?\d{2})?$/);
  if (isoDateTime) {
    const isUtcMidnight =
      isoDateTime[7] === "Z" &&
      isoDateTime[4] === "00" &&
      isoDateTime[5] === "00" &&
      (!isoDateTime[6] || isoDateTime[6] === "00");

    if (!isUtcMidnight) {
      const kstParts = partsInKstTimeZone(text);
      if (kstParts) return kstParts;
    }

    return {
      year: Number(isoDateTime[1]),
      month: Number(isoDateTime[2]),
      day: Number(isoDateTime[3]),
      hour: isoDateTime[4],
      minute: isoDateTime[5],
    };
  }

  const isoDate = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoDate) {
    return {
      year: Number(isoDate[1]),
      month: Number(isoDate[2]),
      day: Number(isoDate[3]),
    };
  }

  const idDate = text.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})(?:,\s*(\d{1,2})[.:](\d{2}))?/);
  if (idDate) {
    const monthIndex = ID_MONTH_INDEX[idDate[2].toLowerCase()];
    if (monthIndex !== undefined) {
      return {
        year: Number(idDate[3]),
        month: monthIndex + 1,
        day: Number(idDate[1]),
        hour: idDate[4],
        minute: idDate[5],
      };
    }
  }

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return null;

  return {
    year: parsed.getFullYear(),
    month: parsed.getMonth() + 1,
    day: parsed.getDate(),
    hour: text.match(/\d{1,2}:(\d{2})/) ? String(parsed.getHours()).padStart(2, "0") : undefined,
    minute: text.match(/\d{1,2}:(\d{2})/) ? String(parsed.getMinutes()).padStart(2, "0") : undefined,
  };
}

export function parseCalendarDate(value?: unknown) {
  const parts = extractCalendarParts(value);
  if (!parts) return null;
  return new Date(parts.year, parts.month - 1, parts.day);
}

function formatCalendarParts(parts: CalendarParts) {
  const monthName = ID_MONTHS[parts.month - 1];
  if (!monthName) return null;
  return `${parts.day} ${monthName} ${parts.year}`;
}

export function formatDateOnly(value?: unknown) {
  const parts = extractCalendarParts(value);
  if (!parts) return value ? String(value) : "-";

  return formatCalendarParts(parts) ?? (value ? String(value) : "-");
}

export function formatIndonesianCalendarDate(value?: unknown, options?: { includeTime?: boolean }) {
  const parts = extractCalendarParts(value);
  if (!parts) return value ? String(value) : "-";

  const formattedDate = formatCalendarParts(parts);
  if (!formattedDate) return value ? String(value) : "-";

  if (!options?.includeTime || !parts.hour || !parts.minute) return formattedDate;
  return `${formattedDate}, ${String(parts.hour).padStart(2, "0")}.${String(parts.minute).padStart(2, "0")}`;
}

export function formatDateInputValueSafe(value?: unknown) {
  const parts = extractCalendarParts(value);
  if (!parts) return "";
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}
