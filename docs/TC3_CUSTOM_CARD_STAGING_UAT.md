# TC3 Custom Card Staging UAT

Date: 2026-08-14
Status: `STAGING_LIFECYCLE_VERIFIED_AND_CLEANED`
Environment: isolated `staging` Beta only

## Scope

This evidence closes the previously deferred Staging activation and lifecycle
UAT for the TC3 Custom Card Beta. It does not authorize Production, change the
preserve-all Beta storage rule, or approve a later retention/deletion policy.

## Isolated resources

- Vercel project: `anas-tarek/loyalflow`
- Git branch/environment binding: Preview (`staging`)
- Vercel Blob store: `loyalflow-staging-custom-card`
- Blob store ID: `store_xKfDamJ6W49ivkjl`
- Blob region/access: `iad1`, private
- Neon project: `ancient-tooth-70219018`
- Neon branch: `br-late-leaf-adwhj06g`
- Database: `neondb`
- Verified deployment: `dpl_23e9wS39fyA2P8VsJXc2EuK9nrfu`
- Deployment URL: `loyalflow-lqg1ktfbz-anas-tarek.vercel.app`
- Release: `cd2c4903f0ea`

The Blob token was scoped as Sensitive to Preview (`staging`). The temporary
broad Preview binding was removed before this UAT. No Production environment
variable or resource was changed.

## Lifecycle evidence

The synthetic Staging journey passed the following sequence:

1. Super Admin selected one PNG front and one PNG back fixture.
2. Upload created one immutable draft version and displayed both private assets
   in the authenticated draft preview.
3. The retained-version counter displayed one retained version.
4. Explicit Publish made the draft the active Custom Card artwork.
5. A read-only Neon check reported `cardDesignMode = CUSTOM`,
   `customCardArtworkEnabled = true`, both artwork references present, and
   `customCardSafeZoneVersion = ID1_V1`.
6. The token-bound public customer card displayed the published front and back
   on desktop and mobile. Customer identity, QR, loyalty ID, balance, reward,
   and progress remained application-rendered over the protected artwork.
7. The same public card returned to the Standard front after cleanup.

The public-card evidence proves delivery through the bounded application route;
no private Blob URL was exposed in the recorded evidence.

## Cleanup evidence

The business was returned to Standard Card mode after the public front/back
checks. A read-only Neon check at `2026-08-14T18:34:00.862Z` reported:

- `cardDesignMode = STANDARD`
- `customCardArtworkEnabled = false`
- no active front or back artwork reference on the business
- `customCardSafeZoneVersion = ID1_V1`

The implementation does not call Blob deletion, so clearing the active business
references did not delete the immutable Beta objects. This is consistent with
the approved preserve-all Beta rule. Object deletion or retention automation
remains forbidden until a later explicit policy decision.

## Result

TC3 Custom Card is operationally verified for isolated Staging Beta. The
remaining TC3 gate is the later retention/deletion policy required before any
Production activation. No schema, migration, application code, UI code, CSS,
design token, route, navigation, product behavior, or Production state changed
as part of this evidence record.
