# Plugged catalog data provenance

The current MVP catalog is a focused import from the old Plugged repository at
`/home/darjs/dev/plugged`. It sells IEMs and portable DAC amplifiers. DAC
remains a primary category. Standalone cables are outside the current selling
scope.

The storefront direction reserves one broad future Accessories destination
rather than a homepage Eartips category. It may eventually contain
source-backed eartips, replacement cables, cases or pouches, plug adapters, ear
hooks or clips, filters or nozzles, and cleaning tools. None of those product
types should be described as stocked until a real purchasable source is added.

## Imported sources

- Product identity, category, source titles, variants, and CNY prices:
  `scripts/data/iem-yangkeduo-prices-en.json` in the old repository.
- Retail MNT conversion: the old `scripts/build-seed-sql.mjs` rule. It uses
  `1 CNY = 500 MNT`, applies a `1.5×` markup at or below 100 CNY and `1.75×`
  above 100 CNY, then rounds up to the next 5,000 MNT.
- Product images: URLs and R2 keys recorded by the old local
  `scripts/data/seed-images.json` manifest. The selected files are copied into
  `data/images/catalog/`; `catalog.seed.json` references only these local
  files and persists no remote media URLs.
- Stock: the old seed script's development default of 10 units per variant.
- Checkout settings: retained from the validated Store Kit seed.

The imported MVP subset is:

- TANGZU Wan'er 2 Red Lion
- TRUTHEAR Gate
- KZ PRX
- TANCHJIM Bunny
- TRUTHEAR KEYX
- JCALLY JM12

## Accessories source gap

The old source has no defensible standalone eartip product with a purchasable
price. It mentions Qianer candy eartips and slow-rebound foam tips only as free
IEM bundle additions. The seed therefore includes the `eartips` category but
does not invent an eartip product, SKU, price, stock level, or image. This empty
technical category preserves the source constraint; it must not be promoted as
a homepage category or interpreted as in-stock Accessories inventory.
