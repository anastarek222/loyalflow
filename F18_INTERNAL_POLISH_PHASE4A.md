# LoyalFlow F18 — Phase 4A: Core Operations Premium Polish

## Scope

Phase 4A polishes the highest-frequency internal screens first:

1. Customers
2. Customer Profile
3. Scan
4. Scan Customer Operation

The product rule remains:

> Simple by default. Professional by design. Advanced by choice.

This is a cumulative package and includes F18 Phases 1, 2 and 3 plus the verified
Phase 2 PageHeader hotfix.

## Customers

### Simple Mode
- Customer search/list is now the primary workspace.
- Add Customer is collapsed into a clear optional panel instead of occupying a
  permanent large column.
- Advanced filters remain available without dominating the screen.
- Customer cards have quieter surfaces and a lighter profile action.
- Scan stays available but does not compete visually with Add Customer on the
  Customers management screen.

### Advanced Mode
- Retains the full filters, bulk tools, duplicate review and export features.
- The Add Customer side panel remains available only where the wider management
  experience makes sense.
- Two-column density is slightly reduced for better readability.

## Customer Profile

- Replaced the heavy dark profile banner with a calm neutral identity header.
- Customer name, status, phone and code are easier to scan.
- Tags remain visible in Advanced Mode without cluttering Simple Mode.
- Simple Mode loyalty balance is promoted as the operational focus.
- Smart campaign/WhatsApp suggestions no longer interrupt Simple Mode.
- No CRM, loyalty or customer mutation logic changed.

## Scan Landing

- Rebuilt the top of the Scan page as a focused operational surface.
- Removed the visually broken white-text-on-neutral business banner.
- Business context is now a compact strip above the scanner.
- Scanner remains the primary interaction.
- Search-by-name/phone remains the human-friendly fallback.
- Raw/manual QR value entry is preserved but moved into an optional disclosure
  so it no longer competes with the normal workflow.

## Scan Customer Operation

- Balance is visually stronger and easier to read immediately after customer
  resolution.
- Earn/Redeem operations remain the primary workspace.
- Recent activity is preserved but moved behind an optional disclosure.
- Success state and Scan Next behaviour remain unchanged.

## Safety Boundary

No changes were made to:
- Prisma schema or migrations
- authentication
- tenant isolation
- capability checks
- customer persistence
- loyalty calculations
- financial integrity
- reward eligibility
- idempotency
- branch/staff attribution
- public card security

## Verification

A TypeScript parser pass was run across all Phase 4A changed TSX files.

Result:

**0 parser/syntax diagnostics**

The apply script runs the full Mac production gate:
- `pnpm run typecheck`
- `pnpm run lint`
- `pnpm test`
- `pnpm run build`

Then the existing Playwright browser UAT should be rerun.
