# LoyalFlow F18 — Phase 2: Premium Simplicity & Customisation

## Goal

Phase 2 continues the F18 product simplification without changing backend behaviour.

The design rule is now:

> Simple by default. Professional by design. Advanced by choice.

## Implemented

### 1. Compact language control
- Replaced the large two-button language segmented control in the authenticated top bar.
- The top bar now shows one compact language switch action.
- The same server-side language action remains authoritative.
- English/Arabic behaviour and RTL/LTR infrastructure are unchanged.

### 2. Clearer Simple / Advanced choice
- The experience-mode picker now explains what each option is for.
- Simple = fast daily operations.
- Advanced = reports, growth and administration.
- Exact accessible names are preserved for browser UAT.

### 3. Advanced Owner dashboard simplification
- Added a compact Quick Actions strip for the most-used actions.
- Scan remains the strongest action when the user has permission.
- Removed the redundant large Growth Tools card from the overview.
- Rewards, Offers, Campaigns and Recovery remain fully available through navigation.
- No feature or route was removed.

### 4. Brand & Appearance Studio
The business settings experience now provides visual choices instead of technical-looking dropdowns for the most important branding decisions.

Added:
- Native colour picker + HEX field for primary colour.
- Native colour picker + HEX field for secondary colour.
- Visual theme cards with swatches.
- Clear theme naming: Clean, Minimal, Modern, Elegant, Dark and Gradient.
- Visual digital-card layout choices: Classic, Compact and Premium.
- Simplified typography chooser.
- Bilingual labels for the new experience.
- Existing live customer-card preview remains available.

No branding database fields were changed. The existing theme/card/font values are still used.

### 5. Settings information architecture
- Reward catalogue, business playbooks and Google Sheets sync are now grouped under an optional:
  **Advanced tools & integrations**
- This reduces initial settings-page cognitive load.
- Existing features remain available and unchanged.

### 6. Navigation test alignment
- Updated the navigation tests to match the deliberate F18 information architecture:
  - Duplicates stays inside the Customers toolset instead of the main sidebar.
  - Staff Reports stays under Reports rather than the main sidebar.
  - Playbooks stays accessible from Settings rather than the main sidebar.
- Added a test assertion for the Super Admin Business Owners directory.

## Phase 1 included in this cumulative patch

This package is cumulative and also includes:
- Super Admin control-centre dashboard.
- Business Owners directory.
- Add Business visibility for Super Admin.
- Simplified main navigation.
- Rebuilt operational Simple Mode home.

You do not need to install the Phase 1 patch first.

## Intentionally unchanged
- Prisma schema and migrations.
- Authentication.
- Tenant isolation.
- Permissions/capabilities.
- Loyalty calculations.
- Scan business logic.
- Rewards/offers/campaign/recovery business logic.
- Existing routes.

## Verification in sandbox
A TypeScript parser pass was run against the changed TSX/test files.

Result:
- **0 parser/syntax diagnostics**

A full dependency-resolved gate is intentionally delegated to the Mac because the safe audit ZIP excludes `node_modules`.

The apply script runs:
1. `pnpm run typecheck`
2. `pnpm run lint`
3. `pnpm test`
4. `pnpm run build`

After those pass, rerun the existing Playwright UAT.
