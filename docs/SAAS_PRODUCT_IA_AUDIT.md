# SaaS Product IA Audit

Status: implementation authority for the pre-Stitch structural closeout.

This audit incorporates the Owner Product & IA Authority Addendum. It records
product ownership, canonical placement, and mobile information hierarchy. It is
not a visual design specification.

## Placement and terminology decisions

| Capability or action | Canonical surface | Current decision | Pre-Stitch action |
| --- | --- | --- | --- |
| Super Admin creates a business | `/businesses/new` | Direct managed Business Setup Wizard | Applied: chooser and Owner Invitation option removed |
| Super Admin attaches the initial owner | Same Business Setup Wizard | Owner name, email, initial password, and business details are one managed setup | Applied: direct wizard remains canonical |
| New Owner acquisition | Marketing website, then `/get-started` | Marketing owns acquisition; the route collects the bounded Trial identity contract and returns neutral public outcomes | Source implementation complete; migration deployment and browser certification remain gated |
| Existing user entry | `/login` | Sign in; do not send an existing user through business acquisition | Keep; final presentation belongs to Stitch |
| Secure Owner setup continuation | Token URL in transactional email | Internal mechanism remains `OwnerInvitation`; customer language is “Complete setup” and “Set password” | Applied: backend retained, user-facing legacy terminology removed |
| Public invitation discovery | None | A secure continuation URL must only arrive through email | Applied: Contact page no longer links to the token page |
| Customer referral sharing | Public Customer Card | Canonical customer-facing referral CTA | Keep; do not rebuild |
| Referral code administration | Customer detail | Operational support/create/copy context, not a second customer acquisition page | Keep compact and secondary |
| Automatic WhatsApp notifications | Settings and delivery/event history | System behavior; Owner does not press Send | Keep automatic terminology |
| Manual WhatsApp shortcuts | Customer detail | Staff-initiated contact, separate from automatic notifications | Applied: explicitly labeled manual |
| Custom Card artwork | Program card workspace for Super Admin | Super Admin-managed draft, preview, retained-pair, and publish workflow; ordinary Owners do not upload artwork | Architecture retained; final states belong to Stitch |
| Team provisioning | Team | Direct managed user creation with initial password | Keep; Team Invitation email is not V1 |

## Mobile information hierarchy audit

The order below is product structure, not final layout or styling.

| Surface | Primary mobile job | Secondary information | Current structural result | Stitch boundary |
| --- | --- | --- | --- | --- |
| Dashboard | Reach the role-appropriate next action | Summary metrics and recent activity | Role-aware actions already exist; Add Business destination corrected | Visual hierarchy and density |
| Businesses | Find/manage a business; add one | Status and plan filters | Add Business is canonical; mobile filters use one accessible disclosure and reopen when active | Final visual treatment only |
| Business Owners | Review owner/subscription records | Search and lifecycle filters | Destination and terminology corrected; mobile filters use the shared disclosure | Final row/action styling |
| Business Overview | Operate the selected business | Health and summary information | Existing role-aware actions retained | Visual prioritization |
| Customers | Find a customer or scan | Filters and bulk tools | Existing compact mobile list and collapsible filters retained | Final density |
| Customer Detail | Earn, redeem, and inspect balance | Referral administration and manual contact | Mobile operation shortcuts retained; manual WhatsApp distinguished from automation | Secondary-section presentation |
| Scan | Complete the daily counter operation | Context and validation feedback | Existing task-first flow retained | Final camera/result states |
| Team | Create and maintain staff access | Role/status filters | Product ownership is correct; filters collapse on mobile and reopen when active | Final form/list presentation |
| Activity | Review events and failures | Multi-field filters | High-density filters now collapse behind one mobile disclosure | Final visual treatment |
| Program | Configure loyalty behavior; expose Custom Card management only to Super Admin | Manual message templates | Correct placement; automatic delivery must not be implied by manual template controls | Section hierarchy and state styling |
| WhatsApp Settings | See readiness, configure this business | Provider status and diagnostics | Per-business configuration remains canonical | Connected/not configured/failed states |
| Public Customer Card | Show identity, balance, progress, reward and referral | Notification/access details | Canonical referral experience already exists | Final customer-facing presentation |

## Explicit non-actions

- Do not delete or rename the internal `OwnerInvitation` token model or secure
  acceptance route.
- Do not weaken `/get-started` into a cosmetic form: persisted one-trial
  eligibility, normalized phone identity, race protection, and neutral response
  states are part of the implemented contract.
- Do not rebuild Referral. The public Customer Card remains the customer-facing
  share surface.
- Do not convert manual `wa.me` shortcuts into automatic sends. They are separate
  behaviors.
- Do not perform final visual redesign in this closeout.

## Remaining structural decisions before Stitch

1. Deploy the additive acquisition identity migration to isolated Staging only
   after the Owner approves that mutation gate.
2. Run permanent browser E2E for request → email → password → login → onboarding
   → persisted seven-day Trial on the exact Staging release.
3. Finish the route-by-route mobile presentation pass now that the acquisition
   and login behavior contracts are frozen; Stitch owns the final visuals.
