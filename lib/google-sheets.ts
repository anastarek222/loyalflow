import { google, type sheets_v4 } from "googleapis";

export type GoogleSheetsConfigurationReason =
  | "MISSING_SPREADSHEET_ID"
  | "MISSING_SERVICE_ACCOUNT_EMAIL"
  | "MISSING_PRIVATE_KEY"
  | "MALFORMED_CREDENTIAL";

export type GoogleSheetsConfiguration =
  | { configured: true; spreadsheetId: string; credentials: { client_email: string; private_key: string } }
  | { configured: false; reason: GoogleSheetsConfigurationReason };

type EnvironmentSource = Record<string, string | undefined>;

export function normalizeGooglePrivateKey(value: string) {
  return value.trim().replace(/\\n/g, "\n");
}

export function getGoogleSheetsConfiguration(
  environment: EnvironmentSource = process.env,
): GoogleSheetsConfiguration {
  const spreadsheetId = environment.GOOGLE_SPREADSHEET_ID?.trim();
  if (!spreadsheetId) return { configured: false, reason: "MISSING_SPREADSHEET_ID" };

  const clientEmail = environment.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  if (!clientEmail) return { configured: false, reason: "MISSING_SERVICE_ACCOUNT_EMAIL" };

  const rawPrivateKey = environment.GOOGLE_PRIVATE_KEY?.trim();
  if (!rawPrivateKey) return { configured: false, reason: "MISSING_PRIVATE_KEY" };

  const privateKey = normalizeGooglePrivateKey(rawPrivateKey);
  if (!clientEmail.includes("@") || !/^-----BEGIN PRIVATE KEY-----[\s\S]+-----END PRIVATE KEY-----$/.test(privateKey)) {
    return { configured: false, reason: "MALFORMED_CREDENTIAL" };
  }

  return { configured: true, spreadsheetId, credentials: { client_email: clientEmail, private_key: privateKey } };
}

export class GoogleSheetsConfigurationError extends Error {
  constructor(public readonly reason: GoogleSheetsConfigurationReason) {
    super(`Google Sheets configuration error: ${reason}`);
    this.name = "GoogleSheetsConfigurationError";
  }
}

export class GoogleSheetsReadinessError extends Error {
  constructor(public readonly reason: "GOOGLE_AUTH_FAILED" | "SPREADSHEET_INACCESSIBLE") {
    super(`Google Sheets readiness error: ${reason}`);
    this.name = "GoogleSheetsReadinessError";
  }
}

export function getGoogleSheetsClient(configuration = getGoogleSheetsConfiguration()): sheets_v4.Sheets {
  if (!configuration.configured) throw new GoogleSheetsConfigurationError(configuration.reason);
  const auth = new google.auth.GoogleAuth({
    credentials: configuration.credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return google.sheets({ version: "v4", auth });
}

export function getSpreadsheetId(configuration = getGoogleSheetsConfiguration()) {
  if (!configuration.configured) throw new GoogleSheetsConfigurationError(configuration.reason);
  return configuration.spreadsheetId;
}

function isAuthenticationFailure(error: unknown) {
  const candidate = error as { response?: { status?: number }; code?: number } | undefined;
  return candidate?.response?.status === 401 || candidate?.code === 401 || candidate?.code === 400;
}

export async function getGoogleSpreadsheetMetadata(configuration = getGoogleSheetsConfiguration()) {
  const sheets = getGoogleSheetsClient(configuration);
  const spreadsheetId = getSpreadsheetId(configuration);
  try {
    const response = await sheets.spreadsheets.get({
      spreadsheetId,
      fields: "properties.title,sheets.properties(sheetId,title)",
    });
    return {
      spreadsheetId,
      title: response.data.properties?.title ?? "",
      sheets: (response.data.sheets ?? []).flatMap((sheet) =>
        typeof sheet.properties?.sheetId === "number" && typeof sheet.properties.title === "string"
          ? [{ sheetId: sheet.properties.sheetId, title: sheet.properties.title }]
          : [],
      ),
    };
  } catch (error) {
    throw new GoogleSheetsReadinessError(isAuthenticationFailure(error) ? "GOOGLE_AUTH_FAILED" : "SPREADSHEET_INACCESSIBLE");
  }
}
