import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const exportRoute = readFileSync(
  "app/businesses/[slug]/customers/export/route.ts",
  "utf8",
);
const customersPage = readFileSync(
  "app/businesses/[slug]/customers/page.tsx",
  "utf8",
);

test("customer CSV export gates tag filtering behind notes/tags access", () => {
  assert.match(exportRoute, /canViewCustomerNotesTags/);
  assert.match(
    exportRoute,
    /canViewCustomerNotesTags\(session\.user, business\.id, business\.plan\)/,
  );
  assert.match(exportRoute, /return Response\.json\(\{ error: "Forbidden" \}, \{ status: 403 \}\)/);
});

test("customer CSV export validates the requested tag inside the same business", () => {
  assert.match(exportRoute, /const requestedTagId = url\.searchParams\.get\("tag"\)/);
  assert.match(
    exportRoute,
    /prisma\.customerTag\.findFirst\(\{[\s\S]*?id: requestedTagId,[\s\S]*?businessId: business\.id,/,
  );
  assert.match(
    exportRoute,
    /selectedTagId \? getCustomerTagWhere\(selectedTagId\) : \{\}/,
  );
});

test("customer page preserves segment and tag filters for header and bulk CSV export", () => {
  assert.match(
    customersPage,
    /customerExportParameters\.set\("segment", segment\)/,
  );
  assert.match(
    customersPage,
    /customerExportParameters\.set\("tag", selectedTagId\)/,
  );
  assert.match(customersPage, /href=\{customerExportUrl\}/);
  assert.match(customersPage, /exportUrl=\{customerExportUrl\}/);
});
