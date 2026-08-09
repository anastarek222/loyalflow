# T006 Public Browser UAT Contract

## Goal

Add browser-level evidence for the already-merged public marketing and conversion surfaces without changing product behavior, persistence, authentication topology, dependencies, or deployment configuration.

## In scope

- public `/` marketing route
- public `/get-started` conversion selector
- canonical EN/AR locale cookie behavior
- LTR/RTL direction on those public surfaces
- supported conversion destinations only: `/login` and `/accept-owner-invitation`
- desktop Chromium and mobile Chromium coverage through the existing Playwright harness

## Non-goals

- no database commands, migrations, schema changes, seed/reset, or production data
- no dependency or lockfile changes
- no analytics provider activation
- no signup or payment flow
- no production deployment
- no owner-onboarding fixture mutation in this slice

## Exit evidence

- Playwright tests prove the marketing CTA reaches `/get-started`
- `/get-started` exposes only the two supported account paths
- EN renders LTR and AR renders RTL after using the existing language switcher
- desktop and mobile Chromium projects pass using the existing browser UAT configuration
- normal typecheck, lint, unit tests, and production build remain green
