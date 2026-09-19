# Frontend Visual QA Matrix

Use this matrix for customer-visible routes and states.

## Core combinations

| Locale | Theme | Viewport |
| --- | --- | --- |
| EN | Light | Desktop |
| AR | Light | Desktop |
| EN | Dark | Desktop |
| AR | Dark | Desktop |
| EN | Light | Mobile |
| AR | Light | Mobile |
| EN | Dark | Mobile |
| AR | Dark | Mobile |

If a route intentionally does not support dark mode yet, record that explicitly instead of marking it as passed.

## Minimum viewport references

- 360px narrow mobile
- 390px primary mobile
- 768px tablet smoke
- 1024px compact desktop/tablet landscape
- 1366px laptop
- 1440px desktop reference

## State coverage

Where relevant, verify:

- normal
- hover
- active
- focus-visible
- disabled
- loading
- skeleton
- empty
- error
- success
- warning
- invalid/expired
- modal/dialog
- dropdown/popover
- long Arabic text
- long business/customer names

## Pixel checks

Verify the following do not drift across locale/theme unless intentionally specified:

- logo height and optical baseline
- header height
- control height
- nav-item spacing
- heading line-height
- card padding
- border radius
- icon/text alignment
- section spacing
- mobile safe-area clearance
- RTL arrow and drawer direction

Light/dark toggles should not change layout metrics such as width, height, margin, wrapping, or logo position.
