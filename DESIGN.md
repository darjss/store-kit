# Store Kit Admin Design

## Direction

The admin is a mobile-first retail operating tool for bright shop environments. It is light-first, Mongolian-first, task-led, and practical. Shopify Mobile and Square are workflow references only.

The selected direction is `prototypes/admin-directions/combined-command-center.html`. Use its cobalt shell, pale blue work canvas, square record panels, strong section headers, task queue, and dense product ledger. Port the visual hierarchy into real data and controls; do not copy prototype-only state or fake content.

## Color

Use a committed cobalt palette:

- pale cool-blue work canvas that clearly separates from records
- true white primary record surfaces
- stronger blue-tinted utility and table-header surfaces
- graphite primary text and readable blue-gray secondary text
- saturated cobalt for the desktop shell, primary actions, links, focus, and selected state
- red only for urgent and destructive state
- green and amber only for real semantic state

Do not use purple, violet, gradients, glass effects, forced dark mode, or storefront-specific themes. Cobalt provides identity; semantic colors must not compete with it.

## Typography

Use Inter throughout.

- mobile body and input text: 16px minimum
- supporting text: 14px minimum
- metadata: 12px only when nonessential and still readable
- bold 30–32px page titles with tight but readable tracking
- tabular numbers for money, stock, order numbers, and dates

Use plain Mongolian commerce language. Hide technical implementation terms from primary workflows.

## Layout

Start at 360px.

- use a pale work canvas, white record surfaces, strong rules, and square or lightly rounded corners
- use labeled four-item bottom navigation on phones
- use a full-height cobalt navigation shell on desktop
- keep the primary screen action in the thumb zone
- use 44–48px touch targets
- put secondary filters and actions in sheets or progressive disclosures
- use dedicated mobile product and order summaries
- enhance records into complete tables on desktop
- use asymmetric desktop grids to make the current task more prominent than supporting records

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
