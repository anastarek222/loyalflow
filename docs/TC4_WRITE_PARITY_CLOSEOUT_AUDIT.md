# TC4 Beta Write-Parity Closeout Audit

Status: `IMPLEMENTED_AND_SOURCE_TESTED`; isolated Staging proof remains open.

This closeout audit does not create a new TC identifier. It inventories the existing TC4 runtime-entitlement slices and classifies every exported business-operational Server Action currently present in the repository.

## Audited scope

The audit covers business-scoped actions for:

- branches and staff assignments;
- customer creation, maintenance, status, bulk operations, referral identity, tags, notes, loyalty earn, adjustment, and redemption;
- offers, rewards, and playbooks;
- business profile, programme, messages, operations, card design/details, Custom Card lifecycle, Sheets sync, and export-permission settings;
- team-account creation and experience-access topology.

The regression inventory fails if one of these action modules gains or loses an exported action without an explicit classification.

## Classification result

### Subscription-enforced operations

All current business-scoped expansion and operational mutation families have a canonical lifecycle policy in their authoritative path. The focused historical tests remain the detailed evidence for intent (`EXPAND` or `OPERATE`), replay behavior, transaction ordering, and bilingual feedback.

### Explicit safety and exit controls

The following remain intentionally outside subscription gating:

- authorized business deletion, so subscription state cannot trap a tenant or prevent an approved exit;
- team-account activation/deactivation and password reset, because they are security/session-revocation controls.

They retain their existing authentication, authorization, confirmation, tenant, and audit boundaries.

### Platform lifecycle authorities

Super Admin billing, payment recording, plan assignment, platform suspension/reactivation, and subscription-lifecycle transition actions are controllers of the lifecycle itself. They remain outside tenant entitlement checks so the policy cannot block its own authoritative administration. Super Admin authorization and the canonical lifecycle transition service remain required.

### Acquisition, identity, and preference actions

Business/Owner creation and invitation acceptance, authentication, email verification, password recovery, MFA, language, experience-mode preference, and onboarding are governed by their own acquisition/security contracts. They are not reclassified as tenant operational writes by this audit.

## Evidence and limitations

- The static inventory and existing focused TC4 suites provide source-level regression evidence.
- This audit changes no application code, UI, CSS, token, component, route behavior, schema, migration, dependency, environment variable, provider, credential, or Production behavior.
- It does not prove isolated Staging behavior and does not close the deployment/health gate.
- Provider events, referral rewards, campaign execution, checkout, and billing activation remain deferred product/provider work rather than hidden runtime-parity gaps.
- Any future exported business mutation must receive an explicit classification and risk-appropriate tests.

## Closeout interpretation

The current source inventory contains no unclassified business-operational mutation bypass. TC4 runtime write parity can be treated as technically implemented and source-tested only. Operational completion remains blocked until the cumulative candidate is merged through the approved workflow and exercised on isolated Staging with the required health evidence.
