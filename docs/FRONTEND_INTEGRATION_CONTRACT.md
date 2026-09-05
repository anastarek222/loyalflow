# Frontend Integration Contract

Status: pre-Stitch product and behavior authority.

This contract tells frontend implementation and Stitch which behavior is real,
which behavior still needs a backend contract, and which work is presentation
only. Visual styling is intentionally excluded.

## Status vocabulary

- **Implemented**: the UI may present the behavior now.
- **Structural fix applied**: placement, terminology, or navigation was corrected
  before visual design.
- **Backend contract required**: do not simulate or design the happy path as if it
  were live.
- **Live certification**: source exists, but provider/runtime proof is separate.
- **Stitch presentation**: behavior is frozen; Stitch owns the final visual state.

## Acquisition and identity

| Journey | Contract | Status |
| --- | --- | --- |
| Super Admin → Add Business | Every Add Business CTA resolves to `/businesses/new`; the route directly renders the managed Business Setup Wizard | Structural fix applied |
| Managed Business setup | One submission creates the Business and its attached active, verified Owner using the existing transactional action | Implemented |
| Marketing → Start Free Trial | Marketing owns new Owner acquisition; `/get-started` collects the bounded Trial identity contract and sends the secure continuation email | Implemented in source; Staging migration/E2E required |
| Existing account | The acquisition surface keeps a direct `/login` path; submitted acquisition identities receive neutral responses that do not disclose an existing account | Implemented |
| Secure setup email | A recipient follows the signed, expiring URL, sets a password, then continues to login/onboarding | Implemented; user terminology corrected |
| Secure token failures | Invalid, expired, and used tokens remain neutral token states; never reveal unrelated account or business data | Implemented; Stitch presentation |

The secure implementation may continue to use `OwnerInvitation` internally.
Frontend copy must use “Complete setup”, “Secure setup link”, and “Set password”
unless an internal support/admin context genuinely requires the technical term.

## Public Start Free Trial contract

The acquisition form implements these behaviors as one contract:

1. Required identity and business fields are finalized.
2. Email and phone are normalized under a documented identity policy.
3. One trial per eligible identity is enforced by persisted database authority,
   not only an application pre-check.
4. Concurrent submissions cannot create multiple trials or businesses.
5. Duplicate, used-trial, review, and rate-limit outcomes return neutral public
   responses without account enumeration.
6. Successful submission queues the secure continuation email and presents a
   neutral “check your email” state.
7. The seven-day Trial starts at the approved lifecycle event and remains
   persisted as the entitlement authority.

The additive database migration must be deployed before enabling this source in
Staging or Production. Runtime certification must prove the complete email and
onboarding journey; source readiness alone is not that certification.

## Feature placement contracts

| Feature | User-visible contract | Source/runtime note |
| --- | --- | --- |
| Referral | Public Customer Card is the customer share surface; Customer Detail may retain compact operational code management | Existing referral engine and card presentation retained |
| Automatic WhatsApp | Event-driven messages do not require an Owner Send action | Existing outbox/retry source retained; live Meta certification remains separate |
| Manual WhatsApp | Customer Detail shortcuts are explicitly staff-sent and must not imply automation | Terminology fix applied |
| WhatsApp sender | Readiness and credentials are business-scoped in Settings | Cross-business sender reuse is forbidden; any inbound/global fallback requires separate backend closure |
| Trial | Active, days remaining, expired, and entitlement-disabled states derive from persisted lifecycle data | Public acquisition trigger still requires contract |
| Custom Card | Super Admin manages paired front/back artwork through no-artwork, draft, preview, retained pairs, publish, published, and storage-error states; ordinary Owners do not upload artwork | Source architecture retained; live Production E2E is Owner-deferred |
| Team | Owner directly creates Staff/Manager/Viewer with email, initial password, role, and active state | Team Invitation email is not current V1 |

## State contract for Stitch

Every affected surface must have applicable states for loading, empty, success,
validation error, server error, rate limited, disabled, and external integration
unavailable. Domain states additionally include:

- Trial active, days remaining, Trial expired, entitlement disabled.
- Secure setup valid, expired, invalid, already used, password validation error,
  accepted.
- WhatsApp connected/ready, not configured, failed, delivery pending, sent,
  delivered, read, failed.
- No customers, no rewards, reward ready, reward redeemed.
- Card no artwork, draft, preview, publish confirmation, published, and
  storage/configuration error.

Stitch must not introduce new actions, duplicate canonical actions, or make a
provider-certified claim from source readiness alone.

## Role and action priority

| Role/surface | Primary actions | Must remain secondary or absent |
| --- | --- | --- |
| Super Admin Businesses | Add Business, inspect/manage business | No Owner Invitation product option |
| Owner Dashboard | Business operations and setup status | Platform administration absent |
| Staff/Manager mobile operations | Scan, earn, redeem, customer lookup | Configuration and reporting below daily actions |
| Customer Card | Balance/progress/reward and referral sharing | No admin referral-management controls |

## Release boundary

- Source readiness is not Production certification for Email, WhatsApp, Google
  Sheets, or Blob-backed Custom Card flows.
- Merge, environment mutation, provider mutation, and Production deployment are
  Owner approval gates.
- Final spacing, typography, color, responsive composition, and component polish
  belong to Stitch after the behavior contracts above are closed.
