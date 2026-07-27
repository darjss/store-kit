# ДУНД

## Register

brand

## Platform

web

## Users

ДУНД serves adults in Ulaanbaatar who move between severe outdoor cold, warm cars or buses, and overheated indoor spaces. They want a small wardrobe that is easy to layer, easy to combine, and suitable for work and daily errands.

The primary customer is 24–40 years old and buys practical clothing online from a phone. The customer needs clear fit, material, warmth, stock, delivery, and payment information before purchase.

## Product Purpose

ДУНД is a fictional Mongolian wardrobe-essentials brand. It sells a small set of coordinated layers for the temperature change between outdoors and indoors.

The first capsule contains five product families:

- Шилжилт хүрэм — modular bridge coat
- Өдөр цамц — structured overshirt
- Дунд ноосон цамц — fine wool mid-layer
- Суурь футболк — breathable base T-shirt
- Шулуун өмд — straight everyday trousers

The store must help a customer understand how the pieces work together, select a size and color, confirm stock, add an item to the cart, and complete a guest checkout in MNT.

## Positioning

ДУНД makes the useful middle layer: fewer pieces that work from −24°C outdoors to +23°C indoors.

## Conversion & proof

- Primary CTA: `Шилжилт хүрэм үзэх`
- Secondary CTA: `5 хэсгийн капсул үзэх`
- Ten-second line: `−24°-өөс +23° хүртэл, давхарга бүр ажиллана.`
- Belief ladder: the climate change is a real wardrobe problem; each item has a clear layer role; five pieces make complete daily outfits; fit, stock, delivery, and payment are clear; guest purchase is safe and quick.
- Proof on hand: no external testimonials, press, or partner marks. At launch, use specific material facts, layer diagrams, real product photography, visible stock, and clear delivery and payment terms. Do not invent social proof.

## Brand Personality

Tailored, alert, weatherwise.

The voice is direct and useful. It names temperature, material, fit, and function without outdoor-performance jargon. Mongolian is the primary language. Short English product-system terms are not part of the customer voice.

The desired feeling is the first clear winter sunlight in an apartment entryway: awake, prepared, and ready to leave.

## Anti-references

- Plugged visual styling, especially grunge, distressed surfaces, torn paper, stamps, and xerox texture
- Generic beige, cream, sand, or quiet-luxury fashion styling
- Uniqlo names, logos, red-square devices, campaign structure, product language, store layout, or other trade dress
- Generic luxury serif typography and fashion-magazine composition
- Black-and-white editorial pages with small monospace labels and ruled columns
- Streetwear graffiti, runway theatrics, or heritage ornament used as decoration
- Large grids of identical rounded product cards

## Design Principles

1. **Show the transition.** Put the outdoor-to-indoor temperature change in the product story and page structure.
2. **Make the layer system visible.** Show how a garment works alone and with the other pieces.
3. **Use facts before claims.** State material, warmth role, fit, stock, price, delivery, and payment clearly.
4. **Keep the choice small.** Merchandise a concise capsule instead of presenting an endless catalog.
5. **Treat Mongolian copy as the source.** Layout and controls must fit real Mongolian Cyrillic text without abbreviation by default.

## Accessibility & Inclusion

Target WCAG 2.2 AA. Body text needs at least 4.5:1 contrast. Large text and controls need at least 3:1 contrast. Keyboard focus must stay visible. Touch targets must be at least 44 × 44 CSS pixels. Product meaning must not depend on color alone.

Support 200% browser zoom, reduced motion, keyboard-only use, and narrow screens from 320 CSS pixels. Use direct alt text that describes the garment, layer, pose, and setting. Do not infer gender from a product category. Use fit notes and garment measurements instead of gendered sizing claims.

## Checkout runtime requirement

The guest cart is browser-owned and persists in `localStorage`. A direct checkout request cannot send those cart lines to the server without JavaScript. Therefore, ДУНД deliberately requires JavaScript to start checkout. The checkout page shows this limitation in a `noscript` notice and does not render a customer form when the browser cannot restore a cart.

The rendered checkout form uses an explicit POST Router action. Customer names, phone numbers, and addresses must not enter a GET URL. The server rebuilds and validates the full checkout command from `FormData`; client fields and hidden cart lines are not trusted.
