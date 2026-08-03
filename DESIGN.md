# Store Kit Admin Design

## Direction

The admin is a mobile-first retail operating tool for bright shop environments. It is light-first, Mongolian-first, task-led, and practical. Shopify Mobile and Square are workflow references only.

The selected visual probe is `.impeccable/probes/admin-retail-ledger.png`. Use its edge-to-edge product ledger and direct mobile hierarchy. Do not copy its generated gradient or exact styling.

## Color

Use a restrained palette:

- true white primary canvas
- cool neutral secondary surfaces
- graphite primary text
- readable gray secondary text
- one flat burnt-orange identity accent
- green, amber, and red only for real semantic state

Do not use purple, violet, gradients, glass effects, decorative color blocks, forced dark mode, or storefront-specific themes.

## Typography

Use Inter throughout.

- mobile body and input text: 16px minimum
- supporting text: 14px minimum
- metadata: 12px only when nonessential and still readable
- compact page titles with clear weight, not oversized display type
- tabular numbers for money, stock, order numbers, and dates

Use plain Mongolian commerce language. Hide technical implementation terms from primary workflows.

## Layout

Start at 360px.

- use edge-to-edge content and separators rather than floating card grids
- use labeled four-item bottom navigation on phones
- keep the primary screen action in the thumb zone
- use 44–48px touch targets
- put secondary filters and actions in sheets or progressive disclosures
- use dedicated mobile product and order summaries
- enhance records into complete tables on desktop
- add persistent desktop navigation only when space supports it

## Components

Customize the copied Zaidan system. Do not add another component library.

- buttons use flat fills or quiet borders, never gradients
- fields remain visible and familiar
- cards are reserved for grouped records that need a contained tap target
- mobile list records are usually edge-to-edge with separators
- icons appear only when they improve recognition
- alerts are concise and close to the affected content
- destructive confirmations remain explicit

## Product flows

### Dashboard

Show the next work:

1. orders requiring attention
2. inventory requiring attention
3. incomplete store setup

Counts link to the relevant work. A new store receives a short readiness sequence instead of empty metric blocks.

### Catalog

Mobile product records show image, name, status, price, and stock. Search remains visible. Secondary filters open in a sheet. The full desktop table appears only at larger content-driven breakpoints.

### Product creation

The first draft asks for:

- product image
- name
- price
- stock
- generated SKU
- category when useful

Generated URL, merchandising, compare-at price, options, ordering, and long content use progressive disclosure. Keep one reachable save action.

### Orders

Mobile order records show order number, customer, total, payment state, and fulfillment state. Details and secondary metadata belong on the order screen.

### Settings

Use a direct mobile form with clear checkout consequences. Keep save state reachable and preserve unsaved values after errors.

## States and accessibility

Support loading, true-empty, filtered-empty, transport error, expected business error, conflict, upload, saved, unsaved, archive, restore, and destructive states.

Meet WCAG AA. Use visible focus, semantic structure, text labels, reduced motion, keyboard operation on desktop, touch operation without hover, and status communication that does not depend on color alone.

## Anti-patterns

Reject:

- generic AI dashboard composition
- dark developer-console styling
- automatic purple or neon accents
- icon tiles and blanket icon use
- nested or repeated cards
- desktop tables squeezed onto phones
- controls smaller than 44px on coarse pointers
- technical copy such as atomic save, slug, initial variant, or sort order in primary workflows
