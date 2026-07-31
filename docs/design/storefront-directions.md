# Storefront design directions

Reference links for prospect conversations. When a store owner talks to us,
send these links and let them pick a direction. Each clone then keeps its own
colors (sampled from the store's logo), typography voice, and layout motif.

Last verified: 2026-07-22. All links reachable.

## What makes a store look like a template

The "Shopify look" comes from layout grammar, not colors:

- centered logo header, one hero with a button
- a grid of identical rounded product cards
- an icon strip (free shipping, returns, secure payment)
- safe gray-on-white text and one soft shadow everywhere

Changing colors alone does not escape this. Each store must change its
composition, typography, and image direction, not only its palette.

## The three levers per store

1. **Color system.** Sample the logo color, convert to OKLCH, and drive CSS
   custom properties: accent, tinted neutrals, surfaces. Clamp the accent so
   text on it keeps at least 4.5:1 contrast.
2. **Typography voice.** A small fixed set of tuned pairings. No per-store
   font experiments. Must handle long Mongolian Cyrillic words.
3. **Layout motif.** A small fixed set of home and catalog compositions.
   Two stores on the same codebase must look unrelated.

Also: prospect imagery comes from their Instagram posts. Mixed quality,
mixed crops. The design must carry the brand through type and layout so
imperfect photos still look intentional.

## Direction A — Korean editorial commerce (default)

Typography-led, magazine-like, product-dense. Korean fashion commerce is the
biggest influence on Mongolian Instagram fashion taste. Type-led design
survives mixed photo quality.

| Site | Link | What to take |
| ---- | ---- | ------------ |
| 29CM | <https://www.29cm.co.kr> | Home as a curation, not a grid. Editorial headlines next to products. |
| SSENSE | <https://www.ssense.com> | Oversized product imagery with small precise type. |

Use as the template default. Mobile-first, bottom navigation on phones.

## Direction B — Lookbook-led brand store

Home is outfit stories, not products. Best when the prospect posts styled
fits rather than flat product shots.

| Site | Link | What to take |
| ---- | ---- | ------------ |
| Aimé Leon Dore | <https://www.aimeleondore.com> | Editorial imagery leads, commerce one tap away. |
| Kith | <https://kith.com> | Full-bleed campaign blocks with clear sale lines. |
| Noah | <https://www.noahny.com> | Lookbook, journal, and shop blended on one home page. |
| Our Legacy | <https://www.ourlegacy.com> | Understated, confident product pages. |

Use when the store has real styled photography. Skip when it does not.

## Direction C — Precise minimal catalog

Strict grid discipline, generous whitespace, one brand accent. The safe
fallback. Easiest direction to retheme by color alone. A dense variant covers
high-SKU stores that want marketplace-like fullness.

| Site | Link | What to take |
| ---- | ---- | ------------ |
| Musinsa | <https://www.musinsa.com> | Dense marketplace-style catalog, strong filter UX, brand chips. For stores with many SKUs. |
| Stüssy | <https://www.stussy.com> | A plain grid stays interesting when type and one accent are right. |
| COS | <https://www.cos.com> | Spacing rhythm and calm product pages. |
| Dover Street Market | <https://shop.doverstreetmarket.com> | Asymmetric index layouts with structure. |

Use for stores with many products and weak photography.

## Direction D — Character and story

Only for prospects with a genuine craft narrative.

| Site | Link | What to take |
| ---- | ---- | ------------ |
| Story mfg | <https://storymfg.com> | Handmade voice, honest detail. |
| Bode | <https://www.bode.com> | The product page as a story. |

## Imagery policy for demos

- Product galleries use the store's real scraped photos. The buyer and the
  owner must recognize the exact product. Never regenerate a sellable
  product's photo.
- AI image generation is allowed for presentation contexts only: hero
  banners, category banners, and background normalization (consistent
  backdrop and aspect ratio). Always edit from the real photo. Never let the
  model invent garment details, logos, or colors.
