const DATE_INPUT_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
export const MAX_REPORT_RANGE_DAYS = 366;

function safeTimeZone(timeZone: string) {
  try {
    new Intl.DateTimeFormat("en", { timeZone }).format(new Date(0));
    return timeZone;
  } catch {
    return "UTC";
  }
}

function parseDateInputParts(value: string | null | undefined) {
  if (!value || !DATE_INPUT_PATTERN.test(value)) return null;

  const [year, month, day] = value.split("-").map(Number);
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() !== month - 1 ||
    probe.getUTCDate() !== day
  ) {
    return null;
  }

  return { year, month, day };
}

function getTimeZoneOffsetMs(date: Date, timeZone: string) {
  const roundedMs = Math.floor(date.getTime() / 1000) * 1000;
  const rounded = new Date(roundedMs);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(rounded);
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );

  return Date.UTC(
    values.year,
    values.month - 1,
    values.day,
    values.hour,
    values.minute,
    values.second,
  ) - roundedMs;
}

function dateInputToUtcStart(value: string, timeZone: string) {
  const parts = parseDateInputParts(value);
  if (!parts) return null;

  const zone = safeTimeZone(timeZone);
  const localWallClockMs = Date.UTC(parts.year, parts.month - 1, parts.day);
  let offset = getTimeZoneOffsetMs(new Date(localWallClockMs), zone);
  let instant = new Date(localWallClockMs - offset);
  const correctedOffset = getTimeZoneOffsetMs(instant, zone);

  if (correctedOffset !== offset) {
    offset = correctedOffset;
    instant = new Date(localWallClockMs - offset);
  }

  return instant;
}

function addDateInputDays(value: string, days: number) {
  const parts = parseDateInputParts(value);
  if (!parts) return null;

  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  date.setUTCDate(date.getUTCDate() + days);
  return formatUtcDateInput(date);
}

function countCalendarDaysInclusive(fromInput: string, toInput: string) {
  const from = parseDateInputParts(fromInput);
  const to = parseDateInputParts(toInput);
  if (!from || !to) return null;

  const fromMs = Date.UTC(from.year, from.month - 1, from.day);
  const toMs = Date.UTC(to.year, to.month - 1, to.day);
  return Math.floor((toMs - fromMs) / (24 * 60 * 60 * 1000)) + 1;
}

export function formatUtcDateInput(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function formatDateInputInTimeZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: safeTimeZone(timeZone),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return `${values.year}-${values.month}-${values.day}`;
}

export function parseUtcDateInput(
  value: string | null | undefined,
  endOfDay = false,
) {
  if (!parseDateInputParts(value)) return null;

  const date = new Date(
    `${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`,
  );

  return Number.isNaN(date.getTime()) ? null : date;
}

export function getDefaultUtcDateRange(now = new Date(), days = 30) {
  const toInput = formatUtcDateInput(now);
  const fromDate = new Date(now);
  fromDate.setUTCDate(fromDate.getUTCDate() - (days - 1));
  const fromInput = formatUtcDateInput(fromDate);

  return {
    fromInput,
    toInput,
    from: parseUtcDateInput(fromInput)!,
    to: parseUtcDateInput(toInput, true)!,
  };
}

type ReportDateRangeInput = {
  from?: string | null;
  to?: string | null;
  now?: Date;
  days?: number;
  timeZone?: string;
};

export function getDefaultReportDateRange(
  now = new Date(),
  days = 30,
  timeZone = "UTC",
) {
  const toInput = formatDateInputInTimeZone(now, timeZone);
  const fromInput = addDateInputDays(toInput, -(days - 1))!;
  const from = dateInputToUtcStart(fromInput, timeZone)!;
  const nextDayInput = addDateInputDays(toInput, 1)!;
  const toExclusive = dateInputToUtcStart(nextDayInput, timeZone)!;

  return {
    fromInput,
    toInput,
    from,
    to: new Date(toExclusive.getTime() - 1),
    toExclusive,
  };
}

/**
 * Canonical report/export boundary parser. Date-only filters mean complete
 * calendar days in the business timezone, then become UTC instants for DB
 * queries. Boundaries are derived from local midnights, not 24-hour durations,
 * so DST-short and DST-long days stay correct.
 */
export function parseReportDateRange({
  from: requestedFrom,
  to: requestedTo,
  now = new Date(),
  days = 30,
  timeZone = "UTC",
}: ReportDateRangeInput) {
  const defaults = getDefaultReportDateRange(now, days, timeZone);
  const fromInput = requestedFrom ?? defaults.fromInput;
  const toInput = requestedTo ?? defaults.toInput;
  const rangeDays = countCalendarDaysInclusive(fromInput, toInput);

  if (!rangeDays || rangeDays < 1 || rangeDays > MAX_REPORT_RANGE_DAYS) {
    return null;
  }

  const from = dateInputToUtcStart(fromInput, timeZone);
  const nextDayInput = addDateInputDays(toInput, 1);
  const toExclusive = nextDayInput
    ? dateInputToUtcStart(nextDayInput, timeZone)
    : null;

  if (!from || !toExclusive || from >= toExclusive) return null;

  return {
    fromInput,
    toInput,
    from,
    to: new Date(toExclusive.getTime() - 1),
    toExclusive,
  };
}

export function getReportPresetDateRange(
  period: "today" | "7d" | "30d",
  now = new Date(),
  timeZone = "UTC",
) {
  const days = period === "today" ? 1 : period === "7d" ? 7 : 30;
  return getDefaultReportDateRange(now, days, timeZone);
}
