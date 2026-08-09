# T006 Marketing and Onboarding Completion — Contract

Date: 2026-08-09
Branch: `feat/t006-marketing-onboarding-foundation`

## Goal

Complete the smallest safe public-conversion and owner-onboarding slices needed before Closed Beta without changing authentication topology, billing/payment behavior, persistence, or production configuration.

## First bounded slice

The first implementation slice replaces the logged-out root redirect with a bilingual public marketing homepage while preserving the authenticated-user redirect to `/dashboard`.

The page must:

- use the existing T005 locale cookie and typed catalog as the only new copy source;
- render correct AR/EN direction without introducing a second locale mechanism;
- expose truthful product value, workflow, and role-oriented positioning based on capabilities already present in the repository;
- provide a primary sign-in CTA and a bounded owner-invitation acceptance path rather than inventing public self-service signup before that lifecycle is approved;
- preserve existing authentication, onboarding, billing, database, and tenant behavior unchanged.

## Non-goals for this slice

- No public self-service account creation.
- No payment or subscription checkout.
- No analytics provider or tracking SDK.
- No dependency or lockfile changes.
- No database schema, migration, seed, backfill, or data command.
- No auth architecture changes.
- No production deployment or provider/environment mutation.

## T006 remaining work after this slice

- SEO/metadata and conversion-route completeness.
- Owner onboarding inline validation and live-preview review.
- Browser/mobile UAT evidence.
- Analytics decision/implementation, if separately approved when it requires provider or dependency changes.
- Final T006 verification and tracker update.
