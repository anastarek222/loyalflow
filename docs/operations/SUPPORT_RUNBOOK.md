# LoyalFlow Support Runbook

Status: current operator handoff for Staging / provider-assisted V1. This document does not authorize Production mutation, database repair, secret changes, payment activation, or provider configuration changes.

## Purpose

Use this runbook to triage a reported LoyalFlow problem without changing product authority or crossing tenant, credential, database, or Production boundaries. It is a first-response and escalation guide, not a repair script.

Public support channels are configured only through `NEXT_PUBLIC_SUPPORT_EMAIL`, `NEXT_PUBLIC_SUPPORT_WHATSAPP`, and `NEXT_PUBLIC_SUPPORT_PHONE`. Do not hard-code a support address or number into operational evidence when those values are unset.

## First-response record

Create a sanitized incident record containing only:

- timestamp and environment;
- release SHA / deployment identity if known;
- affected surface and role: public customer card, join, Owner, Manager, Staff, Viewer, or Super Admin;
- tenant-safe business identifier such as slug only when needed;
- symptom and exact user-visible error copy;
- route, HTTP status, and a safe request/trace identifier if one exists;
- reproduction steps that do not contain credentials, customer names, phone numbers, public card tokens, database URLs, or private notes.

Never paste passwords, MFA codes/recovery material, session cookies, API keys, connection strings, raw customer records, or full private logs into GitHub or support evidence.

## Severity

- **S0 — security/privacy or Production-boundary risk.** Suspected tenant isolation failure, credential exposure, unauthorized cross-tenant data, Production data mutation, or active compromise. Stop the affected flow and escalate to the Security Owner / Incident Commander immediately.
- **S1 — data integrity, authentication, or core loyalty failure.** Wrong balance, duplicate financial effect, redemption integrity issue, account state bypass, or widespread login failure. Stop the affected journey; do not compensate or mutate data manually.
- **S2 — material workflow failure with a safe workaround.** Business setup, card publishing, reporting, staff workflow, or email flow is blocked but no integrity/security boundary is crossed.
- **S3 — cosmetic, copy, layout, or low-impact presentation issue.** Continue normal service unless evidence shows a broader failure.

The accountable operational-role definitions remain in `docs/OPERATIONS/T004_OPERATIONAL_OWNERSHIP.md`. A role assignment does not itself grant credentials, provider access, or database authority.

## Safe triage order

### 1. Confirm environment and release

Do not infer environment from a hostname alone. Record the named environment and current release/deployment identity. If the environment is unclear, stop before any mutation.

### 2. Check application readiness

Use `GET /api/health` as the application readiness signal. It checks database readiness and the Staging isolation guard and returns a no-store response. A `503` is an availability/isolation failure to investigate; it is not permission to reset, restore, migrate, or edit environment variables.

### 3. Bound the failure surface

Determine whether the issue is limited to one of these surfaces:

- authentication / email verification / Super Admin MFA;
- tenant or role authorization;
- Owner onboarding / business setup;
- Staff Scan / earn / redeem;
- public join / customer card;
- Standard Card presentation;
- Custom Card draft preview / retained design / publish;
- offers / rewards / reports;
- transactional email delivery;
- hosting, database, queue, Blob, monitoring, or another external dependency.

Use the smallest safe reproduction. Never create or edit a real customer solely to reproduce an issue.

### 4. Check authorization before treating a result as a product defect

The current role/capability authority is documented in `docs/architecture/AUTH_ROLE_AUTHORITY.md`. A denied action can be correct behavior. Do not bypass a role guard to prove a UI issue.

### 5. Use sanitized logs only

Server logging is designed for compact redacted events. Do not add customer records or secrets to log context. If a log line contains sensitive material, stop copying it into support systems and escalate as a security incident.

### 6. Classify external dependency failures separately

A hosting/provider limit, unavailable email provider, database platform incident, monitoring delivery gap, or other provider failure must not be mislabeled as an application regression without application evidence. Record the provider symptom and the application behavior separately.

## Surface-specific boundaries

### Authentication / MFA

- Do not request a password, MFA seed, one-time code, recovery material, session cookie, or password-reset token from the user.
- Do not disable MFA or alter account state as a support shortcut.
- For a suspected credential compromise, stop normal troubleshooting and escalate to the Security Owner.

### Tenant / role authorization

- Never move a user between businesses or change a role merely to bypass a failed workflow.
- Cross-tenant visibility or mutation is S0.
- A correctly refused direct URL/form action is not a defect.

### Loyalty earn / redeem / balance

- Do not directly edit ledger or balance data to “fix” a support case.
- Wrong balance, duplicate financial effect, negative/invalid balance, or redemption against an ineligible reward is S1.
- Preserve the safe reproduction and transaction/activity identifiers; remediation requires the separately authorized financial/data procedure.

### Standard / Custom Card

- Standard Card remains system rendered and Owner managed within its constrained controls.
- Custom Card remains Provider/Super Admin managed and plan-gated. A draft is one Front + Back pair uploaded together; both sides are required and LoyalFlow never generates missing artwork.
- Do not publish a Custom Card merely to test a draft complaint. Use draft preview first; publish is an explicit confirmed action.
- Do not delete retained Custom Card pairs as a support shortcut.

### Transactional email

- Confirm whether the failure is application request generation or external delivery/provider state.
- Never expose `RESEND_API_KEY` or any provider credential in evidence.
- Sender/domain/provider mutations are separately controlled configuration changes.

## Database / deployment / recovery boundary

Support triage does not authorize database commands, migrations, restores, resets, environment changes, or Production deployment.

- Database backup/restore authority: `docs/OPERATIONS/P2_BACKUP_RESTORE_PROCEDURE.md` and `docs/OPERATIONS/P2_RPO_RTO_RUNBOOK.md`.
- Production reset break-glass: `docs/operations/PRODUCTION_RESET_BREAK_GLASS.md`.
- Production deployment/release authority: `docs/PRODUCTION_DEPLOYMENT.md` and `docs/PRODUCTION_RELEASE_CHECKLIST.md`.

If a support case appears to require one of those actions, stop the support procedure and hand the incident to the accountable owner under that authority.

## Closure

Close a support incident only when the record contains:

1. final severity;
2. affected environment/release;
3. sanitized reproduction or reason reproduction was unsafe;
4. root cause or bounded classification (`application`, `configuration`, `external provider`, `expected authorization`, or `unconfirmed`);
5. fix/evidence link or explicit accepted decision owner;
6. confirmation that no credential, customer-private data, unauthorized database change, or Production mutation was introduced during triage.

Do not convert an unconfirmed symptom into a “fixed” claim because CI, health, or a provider dashboard is green.
