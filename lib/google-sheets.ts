import { readFile } from "node:fs/promises";
import path from "node:path";
import { google } from "googleapis";

type GoogleCredentials = {
  client_email: string;
  private_key: string;
};

export async function getGoogleSheetsClient() {
  const credentialsPath = path.join(
    process.cwd(),
    "secrets",
    "google-service-account.json"
  );

  const credentials = JSON.parse(
    await readFile(credentialsPath, "utf8")
  ) as GoogleCredentials;

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: [
      "https://www.googleapis.com/auth/spreadsheets",
    ],
  });

  return google.sheets({
    version: "v4",
    auth,
  });
}

export function getSpreadsheetId() {
  const spreadsheetId =
    process.env.GOOGLE_SPREADSHEET_ID?.trim();

  if (!spreadsheetId) {
    throw new Error(
      "GOOGLE_SPREADSHEET_ID is missing from .env"
    );
  }

  return spreadsheetId;
}
