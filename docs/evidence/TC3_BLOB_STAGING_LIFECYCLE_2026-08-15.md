# TC3 Vercel Blob Staging lifecycle — 2026-08-15

Status: `PASS — TC3_BLOB_STAGING_LIFECYCLE_VERIFIED`

- Environment: isolated Vercel Preview branch `staging`; Neon branch
  `staging`; no Production access.
- Release: commit `0eb72b086333e7dc4eecbf2ec2b99dfaa98dad4d`;
  deployment `dpl_BicNVV3Q4PbHsmVRwtMPXc73msQD` was `READY`.
- Fixture: one synthetic business, one synthetic Super Admin with MFA, and one
  synthetic customer.
- Blob activation: the Custom Card manager rendered as configured.
- Upload: one front/back PNG pair created immutable private version
  `e8be71c7-4468-47b0-b385-34b341f46a77`.
- Authenticated preview: both draft artwork sides rendered through the bounded
  business preview routes.
- Publish: the Business moved to `cardDesignMode=CUSTOM`, enabled Custom Card,
  stored both private Blob URLs, retained `ID1_V1`, and wrote one settings
  audit activity.
- Public delivery: the synthetic customer card selected the bounded
  `/api/card-artwork/{token}/front` and `.../back` routes; private Blob URLs
  were not exposed to the public card.
- Cleanup: database verification returned zero fixture businesses, users,
  customers, MFA rows, and activities; browser sessions and local upload files
  were removed.
- Retention boundary: the two immutable Blob objects remain intentionally under
  the approved preserve-all Beta policy. Provider deletion/rollback and the
  final retention policy remain mandatory before Production.

This is Internal/Synthetic Beta evidence only. It does not satisfy
`DEFERRED_REAL_CLOSED_BETA`, real-business acceptance, Production readiness,
or GA authorization.
