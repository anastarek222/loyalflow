# LoyalFlow Production Reset Break-Glass Process

Status: `DOCUMENTED_NOT_AUTHORIZED_BY_DEFAULT`

This runbook defines the minimum human and technical controls required before `pnpm reset:production-data` may ever be used. It does not authorize a Production reset and it must not be used for routine maintenance, testing, beta cleanup, or troubleshooting.

## Entry conditions

A reset is a last-resort destructive recovery action. Before execution, the incident owner must record the reason a reset is required, why non-destructive recovery is insufficient, the affected environment, and the intended recovery outcome.

Execution requires explicit approval from both the Product Owner and the designated technical operator. The person operating the reset must not infer approval from a ticket status, CI result, or prior beta permission.

## Pre-reset safety gate

Before the reset command is started, the operator must verify all of the following:

- The target is the intended Production project and database, not Staging, Preview, test, local, or a developer branch.
- A restorable backup or point-in-time recovery position exists and its restore path is understood.
- Current migration status is healthy and the database identity matches the configured Production database.
- The preserved global Super Admin account and the replacement credential owner are known to the operator without placing credentials in tickets, chat, source control, or logs.
- A privacy-safe record of the approval, reason, expected impact, and recovery checkpoint is attached to the incident/change record.
- Customer-facing impact and any required communication are owned by a named person.

If any check is uncertain, the reset must not proceed.

## Execution

Run only the repository-managed `pnpm reset:production-data` command from an approved secure operator environment. Do not copy the deletion logic into ad-hoc SQL or a dashboard query console.

The script must retain all of its built-in fail-closed checks: database-script environment guard, exact Production environment, explicit database identity, exact typed confirmation, migration-status verification, foreign-key-derived deletion ordering, protected global configuration, and post-reset verification.

The replacement Super Admin password must be supplied interactively and must never be written to repository files, command history, CI variables, issue comments, or application logs.

## Post-reset verification

A reset is not complete until the operator verifies that tenant data counts match the script's expected empty state, the preserved Super Admin is active and tenant-independent, migration status remains healthy, authentication works with the replacement credential, and the application can reach the Production database without unexpected runtime errors.

Any failed post-reset check is an incident. Stop further mutation and use the recorded restore checkpoint rather than attempting unreviewed cleanup commands.

## Recovery and audit

Keep the pre-reset restore checkpoint until the Product Owner accepts the post-reset verification. Record the command outcome, verification results, operator, approvers, and completion time in the incident/change record without secrets or participant data.

Production resets are never part of automated CI/CD, routine deployment, Closed Beta preparation, or test-fixture cleanup. Staging and test fixtures must use their dedicated guarded fixture/cleanup paths instead.
