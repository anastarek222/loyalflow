function safeTimeZone(timeZone: string) {
  try {
    new Intl.DateTimeFormat("en", { timeZone }).format(new Date(0));
    return timeZone;
  } catch {
    return "UTC";
  }
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

export function localOfferDayBoundaryToUtc(
  value: string,
  timeZone: string,
  boundary: "start" | "end",
) {
  const [year, month, day] = value.split("-").map(Number);
  const localWallClockMs = Date.UTC(
    year,
    month - 1,
    day,
    boundary === "end" ? 23 : 0,
    boundary === "end" ? 59 : 0,
    boundary === "end" ? 59 : 0,
    boundary === "end" ? 999 : 0,
  );
  const zone = safeTimeZone(timeZone);
  let offset = getTimeZoneOffsetMs(new Date(localWallClockMs), zone);
  let instant = new Date(localWallClockMs - offset);
  const correctedOffset = getTimeZoneOffsetMs(instant, zone);
  if (correctedOffset !== offset) {
    offset = correctedOffset;
    instant = new Date(localWallClockMs - offset);
  }
  return instant;
}

export function formatOfferDateInput(value: Date | null, timeZone: string) {
  if (!value) return "";
  const zone = safeTimeZone(timeZone);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  return `${values.year}-${values.month}-${values.day}`;
}
