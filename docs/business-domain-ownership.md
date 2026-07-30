# Business domain ownership

This Gate 2 map documents persisted fields without removing or migrating them.
“Creation” writers initialize a new Business; they are not competing settings
writers. Server actions remain responsible for authentication, authorization,
validation and tenant scoping.

## Business Identity

| Field | Written by | Principal readers | Canonical settings writer | Disabled/legacy writer | Compatibility |
| --- | --- | --- | --- | --- | --- |
| `name` | Add Business, Owner Onboarding, Business Settings | authenticated navigation, public pages, card | Business Settings | none | persisted name/slug behavior unchanged |
| `industry`, `description` | creation flows, Business Settings | dashboards, public join | Business Settings | none | nullable legacy values remain |
| `email`, `website` | Add Business, Business Settings | public/customer contact surfaces | Business Settings using shared identity schema | duplicated validation removed | URL normalization preserved |
| `contactPhone` | creation flows, Customer Card Details | public card/contact display | Customer Card Details after creation | none | normalized creation value and existing nullable data remain |
| `country`, `city` | creation flows, Business Settings | dashboards, public pages, card | Business Settings using shared identity schema | duplicated country validation removed | stored country names remain |
| `address` | Customer Card Details | public card | Customer Card Details | none | nullable legacy values remain |
| `currency`, `timezone` | creation flows, Business Settings | loyalty formatting, reports | Business Settings using shared identity schema | duplicated validation removed | nullable legacy values remain |
| `taxNumber`, `employeeCount` | Add Business, Business Settings | administration | Business Settings | none | existing fields retained |
| `logoUrl` | creation flows, Card Design | dashboard avatar, public pages, canonical card | Card Design | legacy large Settings form is read-only and server-ignored | one persisted value retained |

## Loyalty Program

Business fields are the **default milestone**. They do not replace the advanced
`Reward` catalogue.

| Concept / field | Written by | Principal readers | Canonical settings writer | Other deliberate writer | Compatibility |
| --- | --- | --- | --- | --- | --- |
| Mode / `loyaltyMode` | creation flows, Business Settings | ledger, reports, card | Business Settings via shared loyalty schema | explicitly confirmed Playbook | enum unchanged |
| Unit / `unitName` | creation flows, Business Settings | ledger copy, reports, card | Business Settings via shared loyalty schema | explicitly confirmed Playbook | `pointsName` remains compatibility copy only |
| Earn / `earnAmount` | creation flows, Business Settings | transaction engine, reports | Business Settings via shared loyalty schema | explicitly confirmed Playbook | semantics unchanged |
| Target / `rewardThreshold` | creation flows, Business Settings | progress/unlock engine, fallback reward | Business Settings via shared loyalty schema | explicitly confirmed Playbook | default milestone retained |
| Reward / `rewardName` | creation flows, Business Settings | card, fallback redemption | Business Settings via shared loyalty schema | explicitly confirmed Playbook | catalogue remains separate |
| `rewardType`, `rewardCode`, `rewardDescription` | Business Settings | fallback redemption/card | Business Settings | explicitly confirmed Playbook where applicable | no `Reward` rows created |
| `loyaltyProgramName` | Business Settings | customer-facing copy | Business Settings | explicitly confirmed Playbook | nullable |

## Card Design

| Field | Written by | Principal readers | Canonical writer | Disabled/legacy writer | Compatibility |
| --- | --- | --- | --- | --- | --- |
| `logoUrl` | creation flows, Card Design | all logo consumers | Card Design | large Settings form | shared Business value |
| `cardDesignMode` | creation flows, Card Design | canonical card renderer | Card Design with role/stored-state permission check | none | Owner cannot alter Custom |
| `primaryColor`, `themePreset` | creation flows, Card Design | standard card and customer experience compatibility | Card Design | large Settings form disabled and server-ignored | old preset values remain readable |
| standard artwork fields | creation flows, Card Design | standard card renderer | Card Design | none | Standard preserved |
| custom artwork/safe-zone fields | Super Admin Card Design | custom card renderer | Super Admin Card Design | Owner submissions rejected | Custom preserved |
| `secondaryColor`, `cardStyle`, `fontFamily` | legacy creation/API | public compatibility readers | no active card editor | large Settings form read-only | fields retained until a later migration gate |

## Customer Experience

| Field | Written by | Principal readers | Canonical writer | Compatibility |
| --- | --- | --- | --- | --- |
| `coverImageUrl`, social links | Business Settings | public join/customer surfaces | Business Settings | existing uploads/URLs retained |
| `welcomeMessage` | Business Settings | public/customer copy | Business Settings | Playbook may explicitly reset during confirmed apply |
| `cardDefaultLanguage` | Business Settings | public card | Business Settings | customer override remains |
| `cardTerms` | Customer Card Details | public card | Customer Card Details | nullable legacy values remain |
| `qrStyle`, `qrPosition` | Business Settings | public QR/card compatibility | Business Settings | limited public-facing compatibility |
| WhatsApp templates | Business Settings | customer communication links | Business Settings | existing defaults retained |

## Authenticated dashboard boundary

- New authenticated pages must use LoyalFlow global design tokens.
- `getCustomerExperienceTheme()` is the public/customer branding resolver.
- `getBusinessTheme()` remains a deprecated compatibility alias for existing
  authenticated callers only; Gate 2 does not visually change those pages.
- No new tenant colour/theme ownership was added to the authenticated app.

## Legacy field classification

The executable classification is
`lib/business/domain-ownership.ts`.

| Field | Status | Reason |
| --- | --- | --- |
| `pointsName`, `membershipName` | `ACTIVE_COMPATIBILITY` | old white-label/customer copy; not the canonical loyalty unit |
| `secondaryColor` | `ACTIVE_COMPATIBILITY` | public surfaces still read it; active card editors do not write it |
| `themePreset` | `ACTIVE_CANONICAL` | constrained Light/Dark Standard Card setting |
| `cardStyle` | `DEPRECATED_READ_ONLY` | old card layout; canonical card renderer owns layout |
| `fontFamily` | `ACTIVE_COMPATIBILITY` | public legacy theme reader |
| `backgroundColor`, `buttonStyle` | `DEAD_CANDIDATE` | persisted fields are not authoritative theme inputs |
| `qrPosition`, `qrStyle` | `ACTIVE_COMPATIBILITY` | limited public-facing QR support |

