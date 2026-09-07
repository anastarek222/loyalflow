# Pre-Frontend WhatsApp First-Run Unification — 2026-09-08

Status: `SOURCE PATCH / VALIDATION PENDING`

This slice starts from Draft PR #507 exact head `fddf7ac8f5ba70407ba8a633bf9d06da154db846`.

## Product intent

- A newly launched Business is immediately shown a first-run WhatsApp setup checkpoint.
- The checkpoint routes the Owner to the existing Business-scoped `Connect WhatsApp` flow.
- It also routes the Owner to the existing three-message editor: Welcome, Balance Update, and Reward.
- Manual and automatic delivery continue to share those same saved Business messages.
- The old pre-Business raw `Phone Number ID` / `Access Token` onboarding UI is removed.
- No new sender store, message fields, template store, Meta transport, or fallback copy is introduced.
- Meta availability does not block Business creation; the Owner can continue and return to the same canonical setup later.

## Explicit non-scope

- no schema or migration change;
- no Production change;
- no Meta credential/configuration mutation;
- no change to automatic event semantics, opt-in, webhook, outbox, retries, or template approval rules;
- no merge into #507, `staging`, or `main` without a separate decision.
