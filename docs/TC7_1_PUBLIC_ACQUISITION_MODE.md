# TC7.1 Public Acquisition Mode

Date: 2026-08-13
Status: `BETA_INVITATION_ONLY`

## Decision

Current acquisition is limited to existing-account sign-in and secure Owner invitation acceptance on isolated Staging Beta. Public self-service signup and payment checkout remain disabled.

## Boundaries

- no new account or tenant writer;
- no trial, subscription, billing, payment, or provider activation;
- no schema, migration, database command, credential, or Production action;
- Arabic and English public copy state the invitation-only Beta boundary;
- unknown acquisition paths fail closed;
- real-participant Closed Beta and human Go/No-Go remain required before Production/public launch.

## Verification

- focused tests: 4/4 passed;
- full tests: 916/916 passed;
- typecheck, workspace validation, lint, and production build passed;
- lint retained only the two pre-existing unused-parameter warnings.
