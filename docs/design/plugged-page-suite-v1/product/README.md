# Plugged product-detail reference

This directory contains design-only raster references for the TANGZU Wan'er 2
Red Lion product-detail experience.

## Approved experience: interactive product stage

The product page is an interactive product stage. These rasters show the
static states; the implemented page adds the physical stage behavior.

- The stage is the dominant object. The product sits on the deep-petrol field
  like a physical object under cold fluorescent light.
- Gallery and variant changes swap the product on the stage physically: the
  outgoing sheet peels away and the incoming sheet settles onto the stack.
  Motion uses transform and opacity only, stays interruptible, and respects
  reduced motion.
- Title, price, stock, variants, quantity, and the add action stay grouped as
  sharp paper strips in one scanning column. Controls do not animate unless
  the user acts on them.
- The IEM's attached cable may remain visible inside product photography as
  part of the listening chain. It is never merchandise: no category, name,
  price, action, or isolated treatment.

## Files

- `product-desktop.png` — 1440 × 1200 complete desktop page.
- `product-mobile.png` — 390 × 825 true mobile page composition.
- `product-mobile-variant.png` — 390 × 850 mobile interaction state with the
  USB-C / microphone variant selected, quantity set to two, updated total,
  cart count, and non-obscuring add-to-cart confirmation.

## Catalog facts shown

The references use the values in `apps/plugged/data/catalog.seed.json` and
`docs/design/plugged-selected-v5/DIRECTION.md`:

| Variant | Price | Compare at | Stock |
| --- | ---: | ---: | ---: |
| 3.5 mm / No microphone | 135,000 ₮ | 145,000 ₮ | 10 |
| 3.5 mm / With microphone | 140,000 ₮ | 150,000 ₮ | 10 |
| USB-C / With microphone | 150,000 ₮ | 155,000 ₮ | 10 |

The interaction reference shows two USB-C / microphone units for a total of
300,000 ₮. The cart count updates to two.

## Layout

### Desktop

- Keep the shared chrome: ink-black top bar with the category navigation, the
  persistent search/cart action strip, and the paper rail edges.
- Use a practical 58/42 gallery-to-purchase split. The gallery is the dominant
  visual object, while title, price, stock, variants, quantity, and the primary
  action remain grouped in one scanning column.
- Keep the four gallery thumbnails adjacent to the main image and expose the
  current image count.
- Place benefits and concise specifications below the purchase-critical
  content. They should support the decision without competing with the add
  action.
- Preserve sharp paper cuts and slight editorial imbalance around the grid,
  but align all interactive controls to a predictable commerce rhythm.

### Mobile

- Recompose into one column; do not shrink the desktop split layout.
- Keep the product stage bounded so the item remains large while purchase
  controls arrive quickly.
- Put thumbnails directly under the hero image. Follow with title, price,
  stock, variants, quantity, and add-to-cart in that order.
- Keep the purchase row separate from the persistent 68 px bottom navigation.
  Neither may cover the product or the confirmation strip.
- The selected/add state uses an inline confirmation strip above bottom
  navigation instead of a modal or cart drawer.

## Interaction

- A variant row is a full-width radio target. Selection uses a cyan radio dot,
  hard cyan edge, and registration mark; it does not rely on color alone.
- Selecting a variant updates price, compare-at price, stock, gallery state
  when linked imagery exists, and the add-to-cart total.
- Quantity controls have 44 px minimum targets. Quantity is clamped to the
  selected stock and to the storefront maximum of ten.
- Add-to-cart keeps the action label and computed total together. Success
  updates the header cart count and exposes `САГС ҮЗЭХ →` without blocking
  continued shopping.
- Press feedback may use `scale(0.97)` for 120–160 ms. Respect reduced motion;
  variant imagery may use the existing 200 ms transform/opacity transition.

## Typography

- Use a Cyrillic-safe, normal-width functional grotesk for Mongolian labels,
  stock, navigation, specifications, and controls.
- Reserve condensed display treatment for Latin product naming and short
  section labels. Never stretch Cyrillic.
- Keep prices tabular and visually paired with their variants. Preserve the
  tugrik symbol and comma grouping.

## Navigation rule

- Category navigation is `IEM`, `DAC`, and `ACCESSORIES`. Never label
  navigation Eartips, and never imply unseeded accessory stock.

## Texture and color

- Base: ink black and deep petrol.
- Reading layer: dirty silver scanned paper and clean off-white utility strips.
- Accent: restrained electric cyan for active controls, rules, and registration
  marks.
- Product color: the Red Lion shells supply the controlled red saturation.
- Texture: subtle photocopy grain, paper fiber, and black tape. Keep texture
  behind text and out of control hit areas.
- Do not introduce an orange field, gradients, glass, rounded SaaS cards,
  generic ecommerce tiles, or decorative pseudo-SVG marks.

The IEM's attached braided cable may remain naturally visible inside product
photography. It is not a separate product: do not give it a category, name,
price, action, or isolated merchandising treatment.

## Responsive implementation notes

- Preserve information order and state semantics across breakpoints even when
  composition changes.
- Desktop thumbnails may form a vertical rail; mobile thumbnails become a
  horizontal row.
- Keep product imagery responsive and uncropped with explicit dimensions and
  accurate `sizes`. The first gallery image is the LCP candidate; later images
  should load lazily.
- The mobile purchase controls should sit in normal flow or in a carefully
  offset sticky region above bottom navigation and safe-area insets.
- Long variant names must wrap inside the label without pushing price or radio
  controls outside the viewport.
- Maintain visible keyboard focus, semantic radio inputs, quantity button
  labels, an `aria-live` success announcement, and sufficient contrast under
  texture.

## Generation record

All three references were generated with the default image-generation tool in
`ui-mockup` mode. The source references were:

- `docs/design/plugged-selected-v5/home-desktop.png`
- `docs/design/plugged-selected-v5/home-mobile.png`
- `docs/design/plugged-selected-v5/DIRECTION.md`

The prompts required the verified product name, variants, prices, stock,
gallery, quantity, cart feedback, Cyrillic-safe typography, cold dark palette,
scanned-paper/tape texture, and sharp purchase-readable controls. They
prohibited orange backgrounds, generic cards, light brutalism, glass,
gradients, rounded panels, fake decoration, standalone cable merchandising,
and obscured mobile controls.

The final candidates were inspected at full generated resolution and again
after export at the requested widths. No corrective regeneration was required.
