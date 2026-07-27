# ДУНД design handoff

This directory contains design work only. It does not contain an Astro app, package manifest, routes, components, or storefront scaffold.

Read these files before implementation:

1. `../PRODUCT.md`
2. `../DESIGN.md`
3. this file

## Decision

Two distinct desktop homepage directions were generated and inspected.

| Direction | Main structure | Decision |
| --- | --- | --- |
| Doorway Sequence | White copy field, temperature rail, honey doorway, full-height campaign image, one featured modular product | **Selected**. The outdoor-to-indoor transition is clear in one glance. The layout has one primary action and can recompose cleanly for mobile. |
| Wardrobe Rail | Black product stage, five garments on one rail, outfit builder, dense product index | Rejected. The system idea was strong, but the first viewport had too many decisions. The dark, dense layout would become catalog-heavy on mobile. |

Only the selected mock was copied into the project. The rejected mock and the palette draft were not copied.

## Files

| Path | Dimensions | Purpose |
| --- | --- | --- |
| `mockups/homepage-doorway-sequence.png` | 1586 × 992 | Selected desktop north-star composition |
| `assets/hero-threshold.webp` | 1122 × 1402 | Portrait campaign image for the hero and mobile art direction |
| `assets/bridge-coat-system.webp` | 1448 × 1086 | Feature image for the modular coat and removable liner |
| `assets/udur-overshirt.webp` | 1122 × 1402 | White and cobalt structured overshirts |
| `assets/dund-wool-mid-layer.webp` | 1122 × 1402 | Asphalt and coral fine-wool mid-layers |
| `assets/suuri-base-tshirt.webp` | 1122 × 1402 | White and cobalt base T-shirts |
| `assets/shuluun-everyday-trousers.webp` | 1122 × 1402 | Asphalt and black straight trousers |

All seven files are original generated assets for this fictional project. The Pi `codex_generate_image` tool used `gpt-image-2` through the Codex backend. No stock image or existing clothing-brand asset was used. The six delivered WebP assets were stripped and re-encoded at quality 82 for the storefront; each is 46–128 KB.

## Mock limits

The mock is not a screenshot specification.

- Generated Cyrillic in the hero and product area is inaccurate. Use the approved copy in `PRODUCT.md`.
- Build the wordmark, navigation, headline, prices, selectors, buttons, and icons as semantic UI.
- Use real catalog data for names, prices, stock, colors, and sizes.
- Keep the offset doorway, the temperature transition, the 35/65 desktop balance, the honey field, and the product-first second fold.
- Do not copy small generated details that resemble a label or logo.

## Asset use

### Hero threshold

Use `hero-threshold.webp` as the desktop and mobile hero source until production photography exists. Keep the model and open doorway visible. The left side has room for copy, but a split layout should place semantic copy outside the image when possible.

Suggested alt text:

`Хар шилжилт хүрэм, хөх дотор давхаргатай загварыг өвлийн гэрэлтэй үүдэнд өмссөн хүн.`

### Bridge coat system

Use `bridge-coat-system.webp` in the first product feature. Keep both pieces visible. The image explains that the cobalt liner is removable.

Suggested alt text:

`Хар урт хүрэм ба салдаг хөх дотор давхаргыг зэрэгцүүлэн өлгөсөн нь.`

Inspect the small neck area before production delivery. Crop or retouch it if it reads as generated text at the final rendered size.

### Capsule product assets

The four catalog assets use the hero and coat images only as visual references for the honey-amber set, hard winter light, cobalt accent, and practical product-photography language. Their prompts requested the named original garment and color variants in a portrait 4:5, square-crop-safe composition. Every prompt prohibited people, logos, labels, readable text, watermarks, beige styling, grunge, editorial fashion layouts, Uniqlo products, and Uniqlo visual styling.

The demo publishes content-addressed copies under `public/media/` because this phase was authorized to create only D1, KV, and Worker resources. Move the same immutable keys to a dedicated DUND R2 media domain before production launch.

## Final image prompts

### Selected homepage mock

```text
Use case: ui-mockup
Asset type: high-fidelity desktop ecommerce homepage north-star mock
Primary request: Direction A for “ДУНД / DUND”, an original fictional Mongolian wardrobe-essentials brand made for the transition between severe outdoor cold and overheated interiors. Design a realistic, shippable fashion storefront homepage, showing the full first viewport and enough of the second fold to establish the system.
Scene/backdrop: pure white and honey-amber architectural color fields, no paper texture
Subject: a full-body Mongolian adult model in an original modular near-black bridge coat with a visible cobalt removable inner layer, straight charcoal trousers, and sturdy unbranded shoes; hard winter daylight through a modern apartment doorway
Style/medium: polished ecommerce UI mockup plus photorealistic original fashion campaign photography; direct, tailored, alert, weatherwise; not editorial-magazine
Composition/framing: “Doorway Sequence” direction. A narrow practical top navigation; asymmetric hero with the model crossing a large offset doorway frame; bold condensed Cyrillic headline area kept as simple blocks rather than decorative magazine type; a vertical temperature rail showing outdoor-to-indoor transition; one clear primary shop action. Second fold uses one large product image, a compact product list, prices in MNT, color and size selectors, and a concise delivery reassurance strip. Strong hierarchy, no generic card grid.
Color palette: committed honey amber primary inspired by oklch(0.774 0.174 65.1), pure white, near-black, vivid dark cobalt, cool silver, tiny alert-red accent
Text: “ДУНД”, “−24° → +23°”, “БҮГДИЙГ ҮЗЭХ”, “₮”
Constraints: original fictional brand and clothing only; practical ecommerce behavior visible; crisp flat UI color; fashion image must look plausible and producible; no logos on garments; no watermark; 16:10 desktop screenshot
Avoid: beige, cream, sand, paper, grunge, distressed type, torn edges, collage, generic luxury serif, editorial magazine layout, streetwear graffiti, glassmorphism, identical rounded cards, gradients, red-square logo, Uniqlo branding, Uniqlo trade dress, Japanese minimal retail imitation
```

### Hero campaign asset

```text
Use case: photorealistic-natural
Asset type: homepage hero campaign photograph for the fictional Mongolian fashion brand DUND
Primary request: an original full-body Mongolian adult model stepping from a bright winter exterior through a modern apartment-building doorway, dressed in DUND’s modular near-black mid-calf bridge coat with a vivid dark-cobalt removable quilted inner layer visible at the collar and opening, straight charcoal trousers, and sturdy unbranded black shoes
Scene/backdrop: modern Ulaanbaatar apartment threshold with a clear visual transition between hard blue-white winter daylight outside and a large honey-amber interior wall; clean architecture; dry snow and distant city apartment forms visible outside; no signs or readable text
Style/medium: photorealistic premium but natural fashion campaign photography, direct and practical rather than glossy luxury editorial
Composition/framing: portrait 4:5 crop, full body and shoes visible, model slightly right of center, doorway creates a bold offset frame, useful open honey-amber and white space on the left for semantic webpage copy, camera at waist height, 50mm lens
Lighting/mood: crisp low winter sun, long clean architectural shadow, alert weekday morning, realistic skin and fabric texture
Color palette: honey amber, pure white, near-black, dark cobalt, cool winter blue
Materials/textures: matte weatherproof coat shell, lightly quilted liner, brushed trouser cloth, painted metal and glass doorway
Constraints: original clothing design only; no garment branding; no logos; no text; no watermark; realistic proportions; hands and shoes anatomically correct; image must work as a fashion ecommerce hero
Avoid: beige, cream, sepia, grunge, distressed texture, film borders, magazine typography, collage, streetwear pose, runway pose, Uniqlo products, Uniqlo visual styling, obvious brand resemblance
```

### Bridge coat asset

```text
Use case: product-mockup
Asset type: ecommerce homepage feature photograph for the fictional Mongolian fashion brand DUND
Primary request: original modular DUND bridge coat system shown as two coordinated pieces—a near-black matte mid-calf weatherproof coat and its detachable dark-cobalt quilted sleeveless liner—displayed together without a model, clearly showing how the liner fits inside the coat
Scene/backdrop: crisp honey-amber architectural studio set with one pure-white offset doorway-shaped plane and a cool-silver brushed metal hanging rail; clean floor plane
Style/medium: photorealistic high-end ecommerce product photography, direct, tactile, technically clear
Composition/framing: landscape 4:3, coat hanging front-three-quarter with hem fully visible; cobalt liner beside it and slightly forward; generous negative space; clear silhouette and hardware; no floating impossible geometry
Lighting/mood: hard directional winter-like studio light with one clean long shadow, bright and precise
Color palette: honey amber, pure white, near-black, dark cobalt, cool silver
Materials/textures: matte technical shell, quilted liner, black zipper and snaps, brushed steel
Constraints: original fictional garments only; no logos; no labels; no text; no watermark; realistic tailoring; ecommerce-ready image
Avoid: beige, cream, sepia, grunge, paper texture, distressed set, luxury perfume styling, streetwear styling, Uniqlo products, Uniqlo visual styling, red-square logo, generic fashion brand marks
```

## Implementation boundary

When implementation starts, create the app with the repository Astro and Solid conventions. Use Tailwind for presentation and Unpic with Cloudflare Image Transformations for product media. Reuse shared Store Kit commerce behavior. Do not import Plugged styles, textures, brand assets, or page composition.
