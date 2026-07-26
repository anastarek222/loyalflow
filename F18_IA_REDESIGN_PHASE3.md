# LoyalFlow F18 — Phase 3: Simple-by-Default App Experience

## Product rule

**Simple by default. Professional by design. Advanced by choice.**

Phase 3 focuses on the two surfaces that shape the whole product experience:
the authenticated application shell and Simple Mode.

## Included from earlier F18 phases

This is a cumulative patch. It includes Phase 1, Phase 2, the verified
`PageHeader actions -> primaryAction` hotfix, and Phase 3.

### Earlier F18 work included
- Super Admin control-centre dashboard.
- Business Owners directory.
- Clear Add Business entry.
- Reduced primary navigation.
- Initial operational Simple Mode.
- Compact language switcher.
- Clearer Simple / Advanced selector.
- Visual Brand & Appearance settings.
- Advanced settings progressive disclosure.
- Updated architecture tests.

## Phase 3 changes

### 1. Simpler application shell
- Desktop sidebar reduced from 288px to 256px.
- Navigation density and spacing reduced.
- LoyalFlow header treatment is calmer and more compact.
- Single-business users no longer see the same business repeated in both
  sidebar and top bar.
- Multi-business users keep the business switcher.
- Top bar height is reduced while preserving touch/accessibility targets.

### 2. Rebuilt Simple Mode home
Simple Mode is now a focused operational workspace instead of a reduced
analytics dashboard.

Primary surface:
- Large **Scan customer** action.
- Large **Find customer** action.

Compact daily strip:
- Loyalty activity today.
- Redemptions today.
- Customers with a reward ready.

Operational follow-up:
- Needs attention list, capped to the most useful items.
- Recent activity, capped to three entries.
- Advanced tools entry only when policy allows switching.

Removed from the Simple Mode home:
- large analytics-style KPI cards,
- redundant business metadata,
- chart-like dashboard framing,
- management-first information density.

No permissions or backend rules were changed.

### 3. Mobile operations emphasis
- Scan remains in the centre of mobile bottom navigation.
- Scan now receives stronger visual emphasis and elevation.
- Other destinations remain low-noise navigation items.

### 4. Advanced Mode remains powerful
No advanced feature or route was removed. Advanced Mode still retains:
- Customers
- Scan
- Activity
- Rewards
- Offers
- Campaigns
- Recovery
- Reports
- Team
- Branches
- Settings

Specialist tools remain accessible through their parent surfaces rather than
being promoted as primary navigation.

## Safety boundary

Phase 3 intentionally does **not** change:
- Prisma schema or migrations
- Authentication
- Tenant isolation
- Capability/permission rules
- Loyalty calculations
- Financial integrity logic
- Scan idempotency
- Reward redemption rules
- Offers/campaign/recovery engines
- Public-card security

## Verification performed in the sandbox

A TypeScript parser pass was run across the changed TSX/test surfaces.

Result:

**0 parser/syntax diagnostics**

The final dependency-resolved gate must run on the Mac:

1. `pnpm run typecheck`
2. `pnpm run lint`
3. `pnpm test`
4. `pnpm run build`

Then rerun the existing Playwright browser UAT.
