# Plugged selected direction v5

## Decision

Use a cold, full-bleed warehouse-night composition that preserves the selected
route-inspired reference's strongest structure:

- black navigation rail or header
- skewed stage cropped by the viewport
- large dirty-silver cut-paper Mongolian headline
- photographic product objects intersecting long white price/action strips
- deliberate editorial imbalance with clear commerce hierarchy
- one tactile IEM cable forming a visible physical signal path from the featured
  IEM to the featured DAC

The physical scene is an after-show listener scanning a pasted audio wall under
cold fluorescent light: ink-black edges, deep petrol wall, dirty silver paper,
and a small electric-cyan registration accent.

The selected screenshot at
`/home/darjs/.cache/dms/clipboard/1784876903625892254.png` was used only as a
composition reference. It is not an application asset.

## Attached cable rule

The featured IEM's own attached cable is a required part of this selected
composition.

- The cable must visibly and continuously run from the featured IEM into the
  featured DAC.
- Both the IEM attachment and the plug inserted into the DAC must be legible.
- The cable may curve across the stage as a tactile line that organizes the
  composition, provided it does not obstruct copy, prices, or controls.
- The cable is part of the listening chain and the IEM product photography. It
  is never a third product.
- Never add a cable SKU, cable category navigation, cable name, cable
  price/action strip, cable slogan, or separate loose cable being sold.
- IEM products may naturally retain their attached cables.
- Small included accessories may remain within verified product photography,
  but they must not replace the visible IEM-to-DAC connection or become
  homepage merchandise.

## Catalog shown

The mockups use verified products from `apps/plugged/data/catalog.seed.json`:

| Product | Category | Display price |
| --- | --- | ---: |
| TANGZU Wan'er 2 Red Lion | IEM | 135,000 ₮ |
| KZ PRX | IEM | 105,000 ₮ |
| TRUTHEAR KEYX | DAC | 130,000 ₮ |

IEMs receive the largest visual weight, and DAC remains a primary category.
Use one broad future `ACCESSORIES` destination; it may eventually include
source-backed eartips, replacement cables, cases or pouches, plug adapters, ear
hooks or clips, filters or nozzles, and cleaning tools, but it must not imply
that unseeded products are in stock. Do not implement the legacy
`ЧИХНИЙ ХОШУУ` label visible in these supplied rasters as a homepage category.
There is no cable category or standalone sellable cable.

## Navigation and shared chrome

- The category navigation is exactly `IEM`, `DAC`, and `ACCESSORIES`.
  `ACCESSORIES` points at the controlled `eartips` category destination until
  a broader seeded destination exists. It never claims that unseeded accessory
  types are in stock, and it never uses Eartips as a navigation label.
- There is no cable navigation entry anywhere.
- The shared chrome is an ink-black top bar with the paper-tile logo, the
  category links, and the `БҮХ БАРАА →` primary action. On mobile the
  categories move to a horizontal strip directly below the bar.
- Search and cart live in a persistent action strip: fixed at the top right of
  the header on desktop, and fixed as a bottom bar on mobile for thumb reach.
  The bottom bar keeps `Нүүр` and `Дэлгүүр` for wayfinding and clears the
  safe-area inset.
- The active category carries an electric-cyan state. The state never relies
  on color alone.
- Chrome surfaces stay ink black with hard paper rails. Texture and cut-paper
  treatments belong to page bodies, not to controls.

## Desktop composition

`home-desktop.png` is a 1536 × 1024 wide homepage view.

- The black left rail keeps logo and category navigation continuously visible.
- The petrol stage is rotated and clipped inside the viewport.
- `СОНС. / ТААРУУЛ. / АВ.` is set on three separately cut paper strips.
- The TANGZU IEM is the featured object; its braided cable creates a continuous
  line to a plug visibly inserted into the TRUTHEAR KEYX DAC.
- The connected TANGZU, secondary KZ PRX, and TRUTHEAR KEYX align with long
  white strips carrying name, MNT price, and `СОНГОХ →`.
- Search, cart, category navigation, and the `БҮХ БАРАА →` primary action are
  visible without relying on hover.

## Mobile composition

`home-mobile.png` is a tall portrait mockup representing a roughly 390 px CSS
viewport.

- The desktop rail becomes a compact black top bar with logo, search, cart, and
  menu controls.
- Categories become a horizontal strip immediately below the header.
- The cut-paper headline keeps its physical offset without overflowing.
- The featured TANGZU IEM leads into the TRUTHEAR KEYX through one continuously
  visible attached cable; the path remains legible without crossing text or
  controls.
- Products form an alternating vertical narrative rather than scaled-down
  desktop columns or a generic card stack.
- KZ PRX remains a secondary IEM section, and the final `БҮХ БАРАА →` action is
  reachable at the bottom of the composition.

## Visual system

- **Base:** ink black and deep petrol, not pure black
- **Reading layer:** dirty silver and clean off-white paper
- **Accent:** electric cyan used for active state, registration marks, and
  actions
- **Product color:** controlled red and blue product hardware supplies the only
  secondary saturation
- **Texture:** subtle paper fiber and photocopy grain; texture stays behind
  readable text
- **Typography:** normal-width Mongolian Cyrillic with high contrast; large
  Latin/product display may be condensed, but Cyrillic is never stretched
- **Shapes:** sharp paper cuts and hard strips; no rounded SaaS cards,
  glassmorphism, cream page field, or neon gamer treatment

## Page suite direction

The page-suite rasters in `docs/design/plugged-page-suite-v1/` are secondary
references. The selected-v5 rasters and this file stay primary.

### Product page: interactive product stage

The product page is an interactive product stage, not a spec sheet with an
image box.

- The stage is the dominant object. The product sits on the petrol field like
  a physical object on the warehouse table.
- Gallery and variant changes swap the product on the stage physically: the
  outgoing sheet peels away, the incoming sheet settles onto the stack.
- The purchase controls form a stack of sharp paper strips beside or below the
  stage. Variant selection, quantity, price, and the add action stay in one
  predictable scanning column.
- An IEM's attached cable may stay visible inside product photography. It is
  never a product, and it never gets a name, price, or action.

### Checkout: ORDER DOSSIER

The generated checkout rasters (`checkout-desktop.png`,
`checkout-mobile-error.png`) are REJECTED. They must not determine checkout
layout. Their recorded behavioral states (validation timing, focus, value
preservation, pending submit) remain requirements as text.

The replacement is a mobile-first ORDER DOSSIER:

- Numbered clipped sections (contact, delivery, payment) read as clipped paper
  files in one dossier.
- Layered paper files stack with slight physical offsets, not generic cards.
- Progress and status are stamped, not badged with pills.
- Errors are clear, field-specific, and keep submitted values.
- A persistent submit action stays visible on mobile.

### Motion language: physical paper plus signal cable

Motion continues the physical scene. Sheets of paper and the attached signal
cable are the only moving materials.

- Sheets stack, peel, and settle. Entries use a strong ease-out; sheets that
  follow the pointer use the drawer curve.
- Products swap physically on the stage; content never fades through black or
  slides as a generic carousel.
- The featured IEM's attached cable can move as one continuous signal path,
  but it never animates across copy, prices, or controls.
- All motion is interruptible and uses transform and opacity where practical.
  Never use `transition-all`.
- Pressable controls use a subtle `scale(0.97)` active response around
  120–160 ms.
- Never animate keyboard-initiated search or cart actions.
- Reduced motion keeps the same layout with movement removed. Opacity-only
  state feedback may remain.

### Mobile rules

- Design mobile-first at 390 px and verify 320 px. Validate 768 px and
  1440 px after.
- Do not shrink desktop compositions. Recompose into one vertical narrative.
- Persistent actions (navigation, submit) stay reachable and respect safe-area
  insets.

## Generation record

Both finals were generated with `codex_generate_image` in `ui-mockup` mode.
The prompt set used the selected screenshot, the current selected-v5 mockups,
and the corrected desktop candidate as composition and visual-system
references.

The desktop prompt required the black rail, skewed petrol stage, cut-paper
headline, three verified product/price strips, visible commerce controls,
normal-width Cyrillic, and a single attached TANGZU cable visibly plugged into
the TRUTHEAR KEYX. It prohibited every standalone cable merchandising pattern.

The mobile prompt required a genuine roughly 390 px responsive
reinterpretation with a top bar, horizontal categories, vertically alternating
products, full-width price/action strips, and the same verified copy. It also
required the connected cable path and its inserted DAC plug to remain legible
without covering copy or controls.

Both generated candidates were inspected at full resolution. Each visibly
connects the featured IEM to the featured DAC, reads as one listening chain,
and contains no standalone cable listing, so no corrective regeneration was
needed.
