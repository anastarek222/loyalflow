const DATE_INPUT_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function formatUtcDateInput(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function parseUtcDateInput(
  value: string | null | undefined,
  endOfDay = false
) {
  if (!value || !DATE_INPUT_PATTERN.test(value)) {
    return null;
  }

  const date = new Date(
    `${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`
  );

  if (
    Number.isNaN(date.getTime()) ||
    formatUtcDateInput(date) !== value
  ) {
    return null;
  }

  return date;
}

export function getDefaultUtcDateRange(
  now = new Date(),
  days = 30
) {
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
