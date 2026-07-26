# ДУНД design system

## 1. Direction

### Physical scene

A customer stands in an Ulaanbaatar apartment entryway at 08:10. Hard blue winter light comes through the open door. A saturated honey wall catches the sun. The customer removes one layer before entering a +23°C room.

This scene forces a bright, light-first interface. Pure white keeps product information clear. Honey amber carries the brand. Near-black and cobalt connect the interface to the garments and winter light.

### Selected direction: Doorway Sequence

The homepage uses an offset doorway as its main frame. The hero puts direct copy on a white field and a full-height campaign image beside it. A temperature rail connects `−24°` and `+23°`. The second fold explains one modular product before it shows the full capsule.

The selected mock is `design/mockups/homepage-doorway-sequence.png`.

Use the mock as a composition reference, not as final UI artwork. Its generated Cyrillic headline and product details are not approved copy. All interface text must remain semantic HTML.

### Direction review

Two homepage directions were inspected:

1. **Doorway Sequence — selected.** It gives the brand one clear memory device, keeps the primary product and CTA easy to find, and can recompose for a phone without losing its story.
2. **Wardrobe Rail — rejected.** The rail made the capsule relationship clear, but the black-dominant desktop layout exposed too many products, controls, and prices at once. It would become a dense catalog on a phone. Keep only its useful idea: a later capsule section can show pieces in outfit order.

## 2. Brand language

### Name

- Mongolian wordmark: `ДУНД`
- Latin fallback: `DUND`
- Customer line: `Гаднаас дотогш.`
- Product promise: `−24°-өөс +23° хүртэл, давхарга бүр ажиллана.`

Use the wordmark as live text. Do not put it in a square. Do not add a symbol for launch.

### Signature device

Use an offset rectangular doorway frame with one straight seam line that crosses its threshold. The device can frame photography, mark a selected layer, or connect outdoor and indoor values.

Do not use it as a repeated border around every section. Do not use traditional Mongolian ornament as decoration.

## 3. Color

### Strategy

Use a **Committed** strategy. Honey amber carries 30–50% of the homepage hero and selected campaign sections. Pure white remains the main information surface. Cobalt appears in garments, focus states, links, and one service band. Alert red is only for low stock and errors.

```css
:root {
  --color-canvas: oklch(1 0 0);
  --color-surface: oklch(0.94 0.012 250);
  --color-ink: oklch(0.12 0 0);
  --color-muted: oklch(0.45 0.018 260);
  --color-amber: oklch(0.774 0.174 65.1);
  --color-amber-action: oklch(0.52 0.15 65.1);
  --color-cobalt: oklch(0.32 0.16 264);
  --color-alert: oklch(0.58 0.22 28);
}
```

### Contrast pairs

- Ink on canvas: 20.3:1
- Muted on canvas: 7.4:1
- Ink on amber: 9.6:1
- White on amber action: 5.7:1
- White on cobalt: 13.2:1
- White on alert: 4.8:1

Use ink text on the bright amber field. Use white text on the darker amber action and cobalt fills. Never put muted gray text on a colored field.

### Color rules

- Canvas is pure white, not cream.
- Amber is an architectural field and action color. It is not a soft background tint.
- Cobalt means active, selected, focused, or indoor layer.
- Alert red means low stock, validation error, or destructive action.
- Stock state also needs a label or icon.
- Do not use gradients.

## 4. Typography

Use one family: **Onest Variable**. It supports Cyrillic and combines geometric structure with humanist reading forms. One family keeps the store practical. Weight, size, width, and space create contrast.

Load only the required variable range or static weights 400, 600, and 800. Self-host WOFF2 files when implementation starts. Use `font-display: swap` and a metric-adjusted fallback.

The first reflex choices were Inter, Oswald, and a fashion serif. Reject them. Inter is generic, Oswald would make the transit reference literal, and a fashion serif would push the store into the rejected editorial lane.

### Type roles

| Role | Size | Weight | Line height | Tracking |
| --- | --- | --- | --- | --- |
| Hero | `clamp(3rem, 7vw, 5.75rem)` | 800 | 0.94 | `-0.03em` |
| Section title | `clamp(2.25rem, 4.5vw, 4.5rem)` | 800 | 0.98 | `-0.025em` |
| Product title | `clamp(1.5rem, 2.5vw, 2.5rem)` | 700 | 1.05 | `-0.015em` |
| Lead | `1.25rem` | 500 | 1.45 | normal |
| Body | `1rem` | 400 | 1.6 | normal |
| Label | `0.875rem` | 600 | 1.35 | `0.02em` |
| Caption | `0.75rem` | 500 | 1.4 | `0.02em` |

Use sentence case for Mongolian copy. Reserve uppercase for the wordmark, sizes, and short control labels. Do not place a small uppercase eyebrow above every heading. Balance headings and use pretty wrapping for body copy. Keep prose between 45 and 70 characters per line.

## 5. Layout

### Grid and spacing

Use a 4-point spacing base with this working scale: 4, 8, 12, 16, 24, 32, 48, 64, and 96 pixels. Use Tailwind scale values where they match. Use `clamp()` for page gutters and section separation.

- Content maximum: 90rem
- Page gutter: `clamp(1rem, 3vw, 3rem)`
- Section gap: `clamp(4rem, 8vw, 7rem)`
- Tight content group: 8–16px
- Product information group: 24–32px

### Homepage sequence

1. Utility header with wordmark, product navigation, search, account, and cart
2. Doorway hero with temperature rail, product promise, two actions, and campaign image
3. Bridge coat system with one large product image, price, color, size, stock, and add-to-cart path
4. Five-piece capsule shown in layer order, not as equal cards
5. Three asymmetric product entries with clear MNT prices
6. Delivery and payment reassurance strip
7. Material and fit explanation
8. Compact footer with contact, delivery, returns, and social links

### Responsive composition

- **320–639px:** one column. Copy comes before the hero image. Convert the temperature rail to a horizontal scale. Keep one primary CTA above the fold. Use a 4:5 campaign crop. Product selectors wrap without fixed text widths.
- **640–1023px:** split the hero 42/58 when space allows. Keep the coat information below the image. Use horizontal overflow only for the capsule rail, with visible next-item affordance and scroll snap.
- **1024px and wider:** hero uses about 35% copy and 65% image. The product stage uses a two-column layout. Keep the page within 90rem on very large screens.

Use content-driven breakpoints. Do not hide search, cart, stock, fit, delivery, or payment information on a phone. Touch targets stay at least 44px. Use `viewport-fit=cover` and safe-area padding for sticky mobile actions.

## 6. Imagery

Use real or generated original fashion photography. Product images need accurate source dimensions, useful alt text, responsive candidates, and Cloudflare Image Transformations through Unpic when implementation starts.

### Image language

- Hard winter daylight
- Clean architectural shadows
- Honey amber, white, ink, cobalt, and cool silver
- Real skin and fabric texture
- Direct weekday poses, not runway poses
- Doorways, thresholds, and layer changes

Do not use sepia, grain overlays, torn edges, contact sheets, film borders, or generic beige studios.

### Selected assets

- `design/assets/hero-threshold.webp`: campaign hero. Suggested alt: `Хар шилжилт хүрэм, хөх дотор давхаргатай загварыг өвлийн гэрэлтэй үүдэнд өмссөн хүн.`
- `design/assets/bridge-coat-system.webp`: modular coat and liner. Suggested alt: `Хар урт хүрэм ба салдаг хөх дотор давхаргыг зэрэгцүүлэн өлгөсөн нь.`

The small garment-neck detail in the product image is not a brand mark. Crop or retouch it before production if it reads as text at a delivered size.

## 7. Components and interaction

### Header

The desktop header stays short and does not cover the hero. Search opens a proper top-layer dialog or existing accessible sheet. On mobile, use a compact sticky header with wordmark, search, and cart. Put secondary navigation in a menu with focus management and light dismiss.

### Product selection

Show color, size, price, compare-at price when present, stock, quantity, and the total add-to-cart value. A selected swatch needs a ring and a text name. Disabled sizes remain visible with a clear unavailable treatment.

### Cart

Use the shared cart behavior: separate cart visibility from persisted cart data, validate price and stock, preserve corrections, and gate checkout. The visual treatment must follow ДУНД, not Plugged.

### Control states

Specify default, hover, focus-visible, active, disabled, loading, error, and success states. Focus rings are 2–3px and have at least 3:1 contrast. Validate forms on blur. Place errors below fields and connect them with `aria-describedby`.

### Motion

Use one signature entrance:

- Text is visible in its default state.
- The doorway image reveals with a 600ms clipped wipe and ease-out-expo.
- The temperature marker moves once from `−24°` to `+23°` over 480ms after the image begins.
- The primary action appears without a separate flourish.

Use 120–180ms color and press feedback for controls. Product image swaps can crossfade and move by no more than 2% over 220–280ms. Do not add fade-and-rise animation to each section.

For reduced motion, remove the wipe and marker travel. Use an immediate image display and a short opacity crossfade only.

## 8. Commerce behavior

Reuse the proven storefront behavior from `apps/plugged`, but do not reuse its visual language:

- Astro pages with Solid islands
- catalog search and filters
- product image gallery
- color and size variants
- current MNT price and stock
- persistent guest cart and separate cart sheet state
- cart validation and correction
- guest checkout
- QPay and manual bank transfer
- order status lookup

The homepage must use real catalog data. It must not promise an unavailable product, size, color, discount, delivery time, review, or material claim.

## 9. Hardening

Design these states before implementation is complete:

- catalog loading, empty, no-result, and transport error
- missing or failed product image
- product with one image or many images
- long Mongolian product names and option values
- one variant, many variants, no stock, and three-or-fewer stock
- price change and stock correction in the cart
- empty cart
- checkout validation, duplicate submit prevention, payment pending, payment failure, and retry
- 404 product and order

Keep UI text flexible. Add `min-width: 0` to shrinking grid and flex children. Use wrapping or line clamps only when the full text remains available on the destination page. Do not use fixed-width buttons for Mongolian labels.

## 10. Do not copy from the mock

- Generated or inaccurate Cyrillic text
- Rasterized navigation, prices, controls, or icons
- Exact model identity as a brand requirement
- Fake products, stock, or claims
- Any layout that fails at 320px or 200% zoom
