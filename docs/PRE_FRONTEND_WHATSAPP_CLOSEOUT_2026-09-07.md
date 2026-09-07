# Pre-Frontend WhatsApp Closeout — 2026-09-07

Status: `SOURCE CLOSED / LIVE META CERTIFICATION GATED`

This record is scoped to the exact Pre-Frontend integration head in Draft PR
#507. It does not claim a real Meta send, Production mutation, or Closed Beta
acceptance.

## Closed source contract

- Exactly three Business-authored messages exist for WhatsApp delivery:
  Welcome, Balance Update, and Reward.
- Manual customer, suggestion, campaign, and recovery handoffs reuse those
  same three saved messages. One-away and win-back use Balance Update; they do
  not own fallback copy.
- Blank saved copy disables both automatic delivery and every matching manual
  handoff. Tanee supplies no fallback wording.
- Manual customer-profile handoffs remain behind `CUSTOMERS_EDIT` and direct
  customer reads remain tenant-scoped.
- Automatic sends require current customer opt-in both at enqueue and again at
  delivery time.
- Sender credentials are persisted per Business. Runtime delivery has no
  global phone-number or access-token fallback, and the environment contract
  no longer advertises legacy global sender credentials.
- Business access tokens use authenticated server-side encryption. WABA,
  phone-number ID, template binding, language, approval state, and current-copy
  hash must all match before delivery.
- Standard and Coexistence Embedded Signup completion resolve the selected WABA
  phone fail-closed and subscribe the Meta app before persisting the Business
  connection.
- Signed webhooks own opt-out, template-status, and delivery-status intake.
  Invalid signatures are rejected before payload parsing.
- The durable outbox owns idempotency, leases, bounded retries, terminal
  failures, provider message correlation, and non-resending delivery updates.
- Manual and automatic paths share the same Egyptian-to-international phone
  normalization.

## Automated evidence

- Full test suite: `1794 passed / 0 failed`.
- TypeScript: passed.
- Workspace boundaries: passed.
- ESLint: `0 errors`; three pre-existing warnings outside this WhatsApp slice.
- Production build: passed with the repository Production environment guards.
- Patch whitespace: passed.

## Live Meta certification gate

The following can become `PASS` only against the real Meta estate and cannot be
inferred from source or automated tests:

- real Meta App and Embedded Signup Config ID;
- real WABA and sender phone resolution for Standard and Coexistence;
- app subscription and signed webhook receipt;
- approved Welcome, Balance Update, and Reward templates matching current
  Business copy hashes;
- one real manual handoff plus automatic Welcome, Balance Update, and Reward;
- opt-out, failed delivery, disconnect, reconnect, and wrong-WABA/phone
  fail-closed cases.

Until an authorized operator supplies that exact-head evidence, the truthful
release state is:

> WhatsApp product logic and Meta integration source are closed. Live Meta
> certification remains an external release gate.
