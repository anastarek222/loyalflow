# T004 Vercel Deployment / Observability Evidence — 2026-08-09

Source: user-provided read-only screenshot of a Vercel deployment details page. No provider configuration was changed and no secret value was inspected or recorded.

## Observed deployment evidence

The screenshot shows a Vercel deployment with:

- Environment: `Production`.
- Status: `Ready Latest`.
- Source branch: `main`.
- Source commit shown in the provider UI: `46a266f` (merge of PR #48 distributed rate limiting).
- Production domains are attached to this deployment.

This is useful provider-side evidence that the screenshot is of a real production deployment, but it is not evidence of an isolated Preview/Staging deployment.

## Observability evidence

The deployment page visibly exposes:

- Runtime Logs.
- Observability.
- Speed Insights marked `Not Enabled`.
- Web Analytics marked `Not Enabled`.

The screenshot does not show a configured alert policy, test alert, recipient, notification channel, or delivered alert. Therefore external alert routing remains unverified.

## T004 interpretation

- Production deployment identity: **VERIFIED FROM PROVIDER UI**.
- Preview/Staging deployment isolation: **NOT VERIFIED FROM THIS SCREENSHOT**.
- External monitoring/alert delivery: **NOT VERIFIED**.

This evidence authorises no deployment, provider mutation, monitoring configuration change, environment-variable change, secret access, or database operation.
