import prisma from "@/lib/prisma";

import {
  getGoogleSheetsClient,
  getSpreadsheetId,
} from "@/lib/google-sheets";

function sanitizeTabName(name: string, slug: string) {
  const cleaned = name
    .replace(/[\[\]:*?/\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return (cleaned || slug).slice(0, 90);
}

function escapeTabName(name: string) {
  return `'${name.replaceAll("'", "''")}'`;
}

function safeCellValue(
  value: string | number | boolean | null | undefined
) {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value !== "string") {
    return value;
  }

  if (/^[=+\-@]/.test(value)) {
    return `'${value}`;
  }

  return value;
}

async function getOrCreateSheet(
  tabName: string
): Promise<{
  sheetId: number;
  title: string;
}> {
  const sheets = await getGoogleSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  const spreadsheet = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets.properties",
  });

  const existingSheet =
    spreadsheet.data.sheets?.find(
      (sheet) => sheet.properties?.title === tabName
    );

  const existingSheetId =
    existingSheet?.properties?.sheetId;

  const existingSheetTitle =
    existingSheet?.properties?.title;

  if (
    typeof existingSheetId === "number" &&
    typeof existingSheetTitle === "string"
  ) {
    return {
      sheetId: existingSheetId,
      title: existingSheetTitle,
    };
  }

  const response = await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          addSheet: {
            properties: {
              title: tabName,
              gridProperties: {
                frozenRowCount: 1,
              },
            },
          },
        },
      ],
    },
  });

  const createdSheet =
    response.data.replies?.[0]?.addSheet?.properties;

  const createdSheetId = createdSheet?.sheetId;
  const createdSheetTitle = createdSheet?.title;

  if (
    typeof createdSheetId !== "number" ||
    typeof createdSheetTitle !== "string"
  ) {
    throw new Error(
      `Could not create Google Sheet tab: ${tabName}`
    );
  }

  return {
    sheetId: createdSheetId,
    title: createdSheetTitle,
  };
}

export async function syncBusinessToGoogleSheet(
  businessId: string
) {
  const business = await prisma.business.findUnique({
    where: {
      id: businessId,
    },
    include: {
      customers: {
        orderBy: {
          createdAt: "desc",
        },
        include: {
          _count: {
            select: {
              redemptions: true,
            },
          },
        },
      },
    },
  });

  if (!business) {
    throw new Error(
      `Business was not found: ${businessId}`
    );
  }

  const sheets = await getGoogleSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  const tabName = sanitizeTabName(
    business.name,
    business.slug
  );

  const sheet = await getOrCreateSheet(tabName);
  const escapedTabName = escapeTabName(sheet.title);

  const baseUrl = (
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000"
  ).replace(/\/$/, "");

  const headers = [
    "Customer ID",
    "Customer Name",
    "Phone Number",
    "Card Link",
    "Current Balance",
    "Unit",
    "Gifts Redeemed",
    "Lifetime Earned",
    "Lifetime Redeemed",
    "Status",
    "Registration Date",
    "Last Updated",
  ];

  const rows = business.customers.map((customer) => {
    const customerName = [
      customer.firstName,
      customer.lastName,
    ]
      .filter(Boolean)
      .join(" ");

    const cardUrl =
      `${baseUrl}/card/${customer.publicToken}`;

    return [
      safeCellValue(customer.customerCode),
      safeCellValue(customerName),
      safeCellValue(customer.phone),
      cardUrl,
      customer.balance,
      safeCellValue(business.unitName),
      customer._count.redemptions,
      customer.lifetimeEarned,
      customer.lifetimeRedeemed,
      customer.isActive ? "Active" : "Inactive",
      customer.createdAt.toISOString(),
      customer.updatedAt.toISOString(),
    ];
  });

  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `${escapedTabName}!A:L`,
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${escapedTabName}!A1`,
    valueInputOption: "RAW",
    requestBody: {
      values: [headers, ...rows],
    },
  });

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          updateSheetProperties: {
            properties: {
              sheetId: sheet.sheetId,
              gridProperties: {
                frozenRowCount: 1,
              },
            },
            fields: "gridProperties.frozenRowCount",
          },
        },
        {
          repeatCell: {
            range: {
              sheetId: sheet.sheetId,
              startRowIndex: 0,
              endRowIndex: 1,
            },
            cell: {
              userEnteredFormat: {
                backgroundColor: {
                  red: 0.06,
                  green: 0.09,
                  blue: 0.16,
                },
                textFormat: {
                  bold: true,
                  foregroundColor: {
                    red: 1,
                    green: 1,
                    blue: 1,
                  },
                },
              },
            },
            fields:
              "userEnteredFormat(backgroundColor,textFormat)",
          },
        },
        {
          autoResizeDimensions: {
            dimensions: {
              sheetId: sheet.sheetId,
              dimension: "COLUMNS",
              startIndex: 0,
              endIndex: headers.length,
            },
          },
        },
      ],
    },
  });

  return {
    businessName: business.name,
    tabName: sheet.title,
    customersCount: business.customers.length,
  };
}

export async function syncAllBusinessesToGoogleSheets() {
  const businesses = await prisma.business.findMany({
    select: {
      id: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  const results = [];

  for (const business of businesses) {
    results.push(
      await syncBusinessToGoogleSheet(business.id)
    );
  }

  return results;
}
