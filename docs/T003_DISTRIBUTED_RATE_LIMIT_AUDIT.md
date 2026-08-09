# T003 Distributed Rate Limiting Audit

Date: 2026-08-09

## Current state

LoyalFlow currently uses `lib/utils/rate-limiter.ts`, which stores counters in an in-process `Map`. The implementation explicitly documents itself as a process-local limiter that complements rather than replaces an edge/platform-level limiter.

This means the current protection is not shared across multiple Next.js processes, serverless instances, regions, or deploys. A client can therefore receive separate buckets when requests land on different instances, and limiter state is lost when an instance restarts.

## Dependency and environment audit

The current `package.json` contains no Redis, Upstash, Vercel KV, or equivalent distributed-rate-limit client dependency. The committed production environment template also contains no distributed rate-limit provider URL/token/secret.

Therefore a real distributed limiter cannot be completed within the existing dependency/environment surface without introducing at least one of:

1. a new external KV/Redis provider plus credentials/environment variables;
2. a new dependency/client for that provider;
3. a platform-native rate limiting capability configured outside this repository.

All three are protected changes under the project operating contract and require explicit approval before implementation.

## Scope recommendation

Preserve existing caller semantics and keep `rateLimit(key, { limit, windowMs })` as the compatibility boundary where practical. Replace only the storage/coordination layer so callers do not need broad rewrites.

Recommended production behavior:

- atomic increment + expiry in a shared store;
- deterministic `allowed`, `remaining`, and `retryAfterSeconds` outputs;
- fail-closed or explicitly documented degraded behavior for security-sensitive endpoints;
- namespaced keys per environment/application;
- no plaintext passwords, tokens, email verification tokens, MFA codes, or other secrets in keys;
- bounded retention matching each rate-limit window;
- behavioral tests proving counters are shared between independent limiter clients/process simulations.

## Decision required

Choose the distributed coordination mechanism before implementation. The smallest bounded option is a managed Redis/KV service with a server-only URL/token and a thin adapter behind the existing limiter API. This will require explicit permission for dependency and environment-variable changes unless an already-configured platform-native service is selected.

No dependency, lockfile, environment variable, database, migration, or production configuration change was made during this audit.
