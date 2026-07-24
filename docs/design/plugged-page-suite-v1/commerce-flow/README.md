# Plugged commerce-flow raster references

Design-only UI references for the existing cart, checkout, payment, and order-status behavior. These files do not add provider capabilities or define new application data.

## Checkout raster rejection and the ORDER DOSSIER replacement

`checkout-desktop.png` and `checkout-mobile-error.png` are REJECTED as layout references. They must not determine checkout layout. Only their recorded behavioral states remain requirements, and those states are specified below as text.

Checkout is a mobile-first ORDER DOSSIER:

- Numbered clipped sections (contact, delivery, payment) read as clipped
  paper files inside one dossier. Numbers are earned: checkout is a real
  sequence.
- Layered paper files stack with slight physical offsets on the night field.
  No generic cards, no glass, no rounded panels.
- Progress and status are stamped onto the paper. No pill badges.
- Errors are clear and field-specific. A failed submit keeps every submitted
  value, marks only the invalid fields, and focuses the first invalid control.
- A persistent submit action stays visible on mobile and clears the bottom
  navigation and safe-area inset.
- Validation timing, focus order, value preservation, and the disabled busy
  submit (`Баталгаажуулж байна…`) stay exactly as the current implementation
  behaves.

## Visual anchor

- `docs/design/plugged-selected-v5/home-desktop.png`
- `docs/design/plugged-selected-v5/home-mobile.png`
- `docs/design/plugged-selected-v5/DIRECTION.md`

Carry forward the cold ink-black/deep-petrol field, scanned dirty-silver paper, hard black frames, restrained electric-cyan registration marks, controlled editorial skew, torn fibers, and photocopy grain. Keep transactional controls level, high-contrast, and readable. Texture belongs behind or around content, never across input values, errors, prices, or button labels.

Orange is intentionally absent from these references. Do not reinterpret the screens as light brutalism, generic SaaS cards, gradients, glass panels, rounded dashboard panels, or decorative SVG grunge.

## Exact UI states

### `cart-mobile.png` — 390 × 843

- Open full-screen mobile cart sheet, normal server-validated state with no corrections or transport error.
- Two real catalog-reference items: `TANGZU Wan’er 2 Red Lion` at `135,000 ₮` and `TRUTHEAR KEYX` at `130,000 ₮`.
- Each line exposes the real quantity decrement/output/increment controls and the `Хасах` action.
- Subtotal is `Барааны дүн / 265,000 ₮`.
- Primary action is `Захиалга үргэлжлүүлэх →`.
- The KEYX thumbnail is a compact right-angle USB-C DAC, not another IEM.
- No invented “last updated” timestamp, delivery fee, provider status, or cart badge is present.

### `checkout-desktop.png` — 1440 × 1025 — REJECTED LAYOUT

Do not use this raster for layout. Keep only these behavioral facts:

- Valid checkout details with a submit currently pending.
- Preserved repository test values: `Бат`, `9911 2233`, `Баянзүрх`, `1`, and `Энхтайвны өргөн чөлөө 1`.
- `QPay` is selected with `QR болон банкны апп`; `Дансаар шилжүүлэх` is unselected with `Ажилтан баталгаажуулна`.
- The order summary matches the current text-only aside: item/quantity/line-price rows plus the exact server-confirmed-delivery-fee note. It intentionally does not invent a checkout subtotal or delivery amount.
- The only submit control is the disabled, busy state with spinner and `Баталгаажуулж байна…`.
- This pre-submit state does not show a QR code, bank account, or provider app list.

### `checkout-mobile-error.png` — 390 × 825 — REJECTED LAYOUT

Do not use this raster for layout. Keep only these behavioral facts:

- Failed-submit validation state with values preserved.
- Top notice: `Мэдээллээ шалгана уу.` and `Тодруулсан талбаруудыг засаад дахин оролдоно уу.`
- `Нэр` remains `Бат` and is not marked invalid.
- `Утас` remains `9911`, is the focused first invalid field, and shows `Утасны дугаараа шалгана уу.`
- `Дүүрэг` remains `Баянзүрх` and is not marked invalid.
- `Хороо` remains an empty text input—not a select—and shows `Хороогоо оруулна уу.`
- `Дэлгэрэнгүй хаяг` remains `Энхтайвны өргөн чөлөө 1` and is not marked invalid.
- `QPay` remains selected. The submit button remains visible and disabled until the invalid fields are corrected.
- No errors appear on untouched valid fields; no values are cleared.

### `order-mobile.png` — 390 × 901

- Ready order with number `PLG-1001`, order status `Төлбөр хүлээж байна`, and QPay payment status pending.
- Retryable QPay verification failure: `Төлбөрийг шалгаж чадсангүй. Дахин оролдоно уу.`
- Real recovery actions: `QPay төлбөр шалгах` and `Төлөв шинэчлэх`.
- Item lines, total `265,000 ₮`, and the preserved delivery fixture remain visible.
- This QPay state intentionally omits QR, bank-account details, and the bank-transfer claim action.

## Implementation guidance

- Preserve the current behavioral owners: `CartSheet`, the shared storefront `Checkout`/TanStack Form state, and `OrderStatus`.
- Use the shared UI controls for inputs, textarea, native district select, radio items, alerts, buttons, button groups, spinner, field labels, descriptions, and field errors.
- Keep a minimum 44 px target for quantity, remove, radio, close, retry, and submit controls.
- Keep validation field-specific. Render a field error only from that field's validation state, retain submitted values, set `aria-invalid`, wire `aria-describedby`, and focus the first invalid named control after a failed submit.
- Treat pending submit as disabled and busy. Replace the button label with `Баталгаажуулж байна…`; do not add a second active submit action.
- Keep the checkout summary honest: the current UI says the server confirms delivery and adds it to the total. Do not display a final checkout total until the server supplies one.
- Preserve payment branching. Pre-submit choices are QPay or bank transfer. QPay instructions and app links appear only after a successful checkout response. Bank details appear only for a bank-transfer `nextAction`.
- On the order route, pending QPay exposes QPay refresh; pending bank transfer exposes `Би төлбөр шилжүүлсэн`; claimed bank transfer shows the staff-confirmation waiting state. Never combine those mutually exclusive actions.
- Keep recovery copy specific: retryable network/provider checks offer retry; non-retryable checks direct the customer to the store. Never imply automatic payment confirmation.
- Use normal-width Cyrillic-safe body type. Condensed display treatment is acceptable for short headings and order numbers only.
- Recreate paper grain and torn edges as background/structural treatments. Do not use these PNGs as production UI sprites or flatten live controls into images.

## Generation and review

The four finals were generated with the built-in Codex image-generation path in `ui-mockup` mode, using both approved selected-v5 rasters as image references. Corrections were regenerated for the KEYX product type, unsupported timestamps and totals, the `Хороо` control type, submit-button placement, and clipped/overlapping controls. Final files were visually inspected after correction and resized to the requested viewport widths.

The two checkout finals were later reviewed against the ORDER DOSSIER direction and rejected as layout references. They stay in this directory only as behavioral-state records.
