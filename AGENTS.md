<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# LoyalFlow repository rules

- Use `staging` as the integration authority.
- Final Product Z1–Z14 is complete; do not invent Z15.
- Current source work is the bounded Pre-Frontend Closeout in Draft PR #507.
- Do not start Stitch / Final Visual implementation before the formal Pre-Frontend Freeze.
- Prefer semantic `--lf-*` tokens, `components/ui`, and `components/page-layout` over page-specific visual authorities.
- Preserve AR/EN parity and RTL/LTR behavior.
- Preserve tenant isolation, auth/MFA, permissions, entitlements, loyalty economics, idempotency, and protected card geometry.
- Do not change Production, schema/migrations, provider/payment behavior, environment variables, credentials, or secrets without explicit Product Owner authorization.
- Do not invent pricing, plan names, company claims, legal/analytics policy, or brand decisions.
- Use #507 as the current integration lane; parallel work must use non-overlapping branches, rebase onto its latest exact head, run full CI, and integrate only after conflict review.
- `staging` remains the repository integration authority; do not merge #507 to `staging` without an explicit Product Owner decision.
- Read `README.md`, `CLAUDE.md`, `DEVELOPER_HANDOFF.md`, and `docs/FINAL_VISUAL_OWNER_INPUTS.md` for the current workflow and boundaries.
