import "dotenv/config";

import {
  getGoogleSheetsClient,
  getSpreadsheetId,
} from "../lib/google-sheets";
import { logServerError } from "../lib/server/logging";

async function main() {
  const sheets = await getGoogleSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  const response = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "properties.title,sheets.properties.title",
  });

  const title =
    response.data.properties?.title ?? "Unknown";

  const tabs =
    response.data.sheets
      ?.map((sheet) => sheet.properties?.title)
      .filter(Boolean)
      .join(", ") || "No tabs";

  console.log("✅ Google Sheets connected successfully");
  console.log(`Spreadsheet: ${title}`);
  console.log(`Current tabs: ${tabs}`);
}

main().catch((error) => {
  console.error("❌ Google Sheets connection failed");
  logServerError("google_sheets_connection_test_failed", error);
  process.exitCode = 1;
});
