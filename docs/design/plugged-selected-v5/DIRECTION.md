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

## Interaction direction

If implemented later, keep the static hierarchy complete before motion:

- pressable controls use a subtle `scale(0.97)` active response around 120–160 ms
- rail/header and product-strip interactions use transform/opacity only
- use a strong ease-out curve for entry and direct state feedback
- never animate keyboard-initiated search or cart actions
- reduced motion keeps the same layout with movement removed

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
