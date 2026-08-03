import prisma from "@/lib/prisma";
import { getUniqueGoogleSheetTitle, sanitizeGoogleSheetTitle } from "@/lib/google-sheets-title";
import {
  getGoogleSheetsClient,
  getGoogleSpreadsheetMetadata,
  type GoogleSheetsConfigurationReason,
} from "@/lib/google-sheets";
import { getConfiguredPublicAppUrl } from "@/lib/public-app-url";


export type GoogleSheetsSyncFailureReason =
  | GoogleSheetsConfigurationReason
  | "GOOGLE_AUTH_FAILED"
  | "SPREADSHEET_INACCESSIBLE"
  | "MAPPED_SHEET_MISSING"
  | "MAPPING_CONFLICT"
  | "GOOGLE_API_FAILED";

export type GoogleSheetsSyncResult =
  | { status: "success"; businessId: string; sheetId: number; sheetTitle: string }
  | { status: "failure"; businessId: string; reason: GoogleSheetsSyncFailureReason; retryable: boolean };

export class GoogleSheetsSyncError extends Error {
  constructor(public readonly reason: GoogleSheetsSyncFailureReason, public readonly retryable = true) {
    super(`Google Sheets sync failed: ${reason}`);
    this.name = "GoogleSheetsSyncError";
  }
}

export { getUniqueGoogleSheetTitle, sanitizeGoogleSheetTitle } from "@/lib/google-sheets-title";

function escapeTabName(name: string) {
  return `'${name.replaceAll("'", "''")}'`;
}

function safeCellValue(value: string | number | boolean | null | undefined) {
  if (value === null || value === undefined) return "";
  if (typeof value !== "string") return value;
  return /^[=+\-@]/.test(value) ? `'${value}` : value;
}

async function resolveMappedSheet(business: { id: string; name: string; slug: string; googleSheetId: number | null }) {
  const metadata = await getGoogleSpreadsheetMetadata(); // read-only authentication and ownership check before any write
  if (business.googleSheetId !== null) {
    const mapped = metadata.sheets.find((sheet) => sheet.sheetId === business.googleSheetId);
    if (!mapped) throw new GoogleSheetsSyncError("MAPPED_SHEET_MISSING", false);
    return { ...mapped, spreadsheetId: metadata.spreadsheetId };
  }

  // A missing mapping deliberately never claims a same-named legacy tab.
  let title: string;
  try {
    title = getUniqueGoogleSheetTitle(
      sanitizeGoogleSheetTitle(business.name, business.slug),
      metadata.sheets.map((sheet) => sheet.title),
    );
  } catch {
    throw new GoogleSheetsSyncError("MAPPING_CONFLICT", false);
  }
  const sheets = getGoogleSheetsClient();
  let created: { sheetId: number; title: string };
  try {
    const response = await sheets.spreadsheets.batchUpdate({
      spreadsheetId: metadata.spreadsheetId,
      requestBody: { requests: [{ addSheet: { properties: { title, gridProperties: { frozenRowCount: 1 } } } }] },
    });
    const properties = response.data.replies?.[0]?.addSheet?.properties;
    if (typeof properties?.sheetId !== "number" || typeof properties.title !== "string") throw new Error("missing addSheet response");
    created = { sheetId: properties.sheetId, title: properties.title };
  } catch {
    throw new GoogleSheetsSyncError("GOOGLE_API_FAILED");
  }

  const saved = await prisma.business.updateMany({
    where: { id: business.id, googleSheetId: null },
    data: { googleSheetId: created.sheetId, googleSheetTitle: created.title },
  });
  if (saved.count !== 1) throw new GoogleSheetsSyncError("MAPPING_CONFLICT", false);
  return { ...created, spreadsheetId: metadata.spreadsheetId };
}

export async function syncBusinessToGoogleSheet(businessId: string): Promise<GoogleSheetsSyncResult> {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    include: { customers: { orderBy: { createdAt: "desc" }, include: { _count: { select: { redemptions: true } } } } },
  });
  if (!business) throw new GoogleSheetsSyncError("GOOGLE_API_FAILED", false);

  const sheet = await resolveMappedSheet(business);
  const headers = ["Customer ID", "Customer Name", "Phone Number", "Card Link", "Current Balance", "Unit", "Gifts Redeemed", "Lifetime Earned", "Lifetime Redeemed", "Status", "Registration Date", "Last Updated"];
  const baseUrl =
    getConfiguredPublicAppUrl() ??
    "http://localhost:3000";
  const rows = business.customers.map((customer) => [
    safeCellValue(customer.customerCode),
    safeCellValue([customer.firstName, customer.lastName].filter(Boolean).join(" ")),
    safeCellValue(customer.phone),
    `${baseUrl}/card/${customer.publicToken}`,
    customer.balance,
    safeCellValue(business.unitName),
    customer._count.redemptions,
    customer.lifetimeEarned,
    customer.lifetimeRedeemed,
    customer.isActive ? "Active" : "Inactive",
    customer.createdAt.toISOString(),
    customer.updatedAt.toISOString(),
  ]);

  const sheets = getGoogleSheetsClient();
  const range = `${escapeTabName(sheet.title)}!A:L`;
  try {
    // Controlled rewrite is limited to the verified, mapped tab and managed A:L range.
    await sheets.spreadsheets.values.clear({ spreadsheetId: sheet.spreadsheetId, range });
    await sheets.spreadsheets.values.update({ spreadsheetId: sheet.spreadsheetId, range: `${escapeTabName(sheet.title)}!A1`, valueInputOption: "RAW", requestBody: { values: [headers, ...rows] } });
    await sheets.spreadsheets.batchUpdate({ spreadsheetId: sheet.spreadsheetId, requestBody: { requests: [
      { updateSheetProperties: { properties: { sheetId: sheet.sheetId, gridProperties: { frozenRowCount: 1 } }, fields: "gridProperties.frozenRowCount" } },
      { repeatCell: { range: { sheetId: sheet.sheetId, startRowIndex: 0, endRowIndex: 1 }, cell: { userEnteredFormat: { backgroundColor: { red: 0.06, green: 0.09, blue: 0.16 }, textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } } } }, fields: "userEnteredFormat(backgroundColor,textFormat)" } },
      { autoResizeDimensions: { dimensions: { sheetId: sheet.sheetId, dimension: "COLUMNS", startIndex: 0, endIndex: headers.length } } },
    ] } });
  } catch {
    throw new GoogleSheetsSyncError("GOOGLE_API_FAILED");
  }
  return { status: "success", businessId, sheetId: sheet.sheetId, sheetTitle: sheet.title };
}

export async function syncAllBusinessesToGoogleSheets() {
  const businesses = await prisma.business.findMany({ select: { id: true }, orderBy: { createdAt: "asc" } });
  return Promise.all(businesses.map((business) => syncBusinessToGoogleSheet(business.id)));
}
