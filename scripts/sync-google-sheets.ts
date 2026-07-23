import "dotenv/config";

import { syncAllBusinessesToGoogleSheets } from "../lib/google-sheets-sync";
import prisma from "../lib/prisma";
import { logServerError } from "../lib/server/logging";

async function main() {
  console.log("\nStarting Google Sheets sync...\n");

  const results =
    await syncAllBusinessesToGoogleSheets();

  for (const result of results) {
    console.log(
      `✅ ${result.businessName} → ${result.tabName} (${result.customersCount} customers)`
    );
  }

  console.log("\n✅ Google Sheets sync completed");
}

main()
  .catch((error) => {
    console.error("\n❌ Google Sheets sync failed");
    logServerError("google_sheets_sync_script_failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
