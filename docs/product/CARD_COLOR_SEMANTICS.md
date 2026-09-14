# Card Color Semantics

Status: `PRODUCT_CONTRACT`

The persisted fields keep their existing names and meanings across Standard
Card, Custom Card overlays, public-card presentation, join surfaces, wallet
passes, previews, and APIs:

- `primaryColor` is the accent color. It owns actions, QR/progress emphasis,
  and the first color in card gradients.
- `secondaryColor` is the supporting-surface color. It owns secondary panels,
  reward surfaces, and the companion color in card gradients.

Neither field means unrestricted page background or text color. Readable text
is derived by the relevant renderer. Custom artwork owns its own background;
the two stored colors apply only to system-owned overlays and controls.

This contract changes no schema, stored value, card geometry, or artwork.
