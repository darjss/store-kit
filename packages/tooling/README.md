# Plugged catalog seed

For local development, migrate and seed local D1 while catalog images continue to use the remote
custom-domain origin configured in `.dev.vars`:

```sh
vp run db:migrate:plugged:local
vp run catalog:seed:plugged:local
```

Remote operations require an explicit Wrangler environment and exact R2 bucket:

```sh
PLUGGED_MEDIA_BUCKET=<development-r2-bucket> vp run catalog:media:plugged:development
vp run db:migrate:plugged:development
PLUGGED_MEDIA_BUCKET=<development-r2-bucket> vp run catalog:seed:plugged:development
```

Production additionally requires a bucket-specific confirmation:

```sh
PLUGGED_MEDIA_BUCKET=<production-r2-bucket> \
  PLUGGED_PRODUCTION_CONFIRMATION=production:<production-r2-bucket> \
  vp run catalog:media:plugged:production
```

The commands read `apps/plugged/data/catalog.seed.json`. Image `source` paths are relative to
`apps/plugged`. The file and each referenced image must exist before you run them. Local seeding
writes D1 data only. Remote media and data are separate operations so migrations can be applied
before the real remote D1 seed.

## Required JSON shape

The validator rejects unknown fields. All fields in the example are required unless this document marks them as optional. All IDs are fixed UUIDs. Keep the same IDs, slugs, SKUs, image keys, and image sort orders on later runs.

```json
{
  "brands": [
    {
      "id": "11111111-1111-4111-8111-111111111111",
      "slug": "example-brand",
      "name": "Example Brand",
      "description": "Optional; may also be null or omitted.",
      "websiteUrl": "https://example.com"
    }
  ],
  "categories": [
    {
      "id": "22222222-2222-4222-8222-222222222222",
      "slug": "iems",
      "name": "IEMs",
      "description": null,
      "sortOrder": 0,
      "active": true
    }
  ],
  "products": [
    {
      "id": "33333333-3333-4333-8333-333333333333",
      "slug": "example-iem",
      "brandSlug": "example-brand",
      "categorySlug": "iems",
      "name": "Example IEM",
      "shortDescription": "Optional; may also be null or omitted.",
      "description": null,
      "status": "active",
      "featured": false,
      "details": {
        "driver": "Dynamic",
        "impedance": 32,
        "wireless": false,
        "soundSignatures": ["Balanced", "Warm"]
      },
      "images": [
        {
          "id": "44444444-4444-4444-8444-444444444444",
          "source": "data/images/example-iem.webp",
          "r2Key": "catalog/example-iem/main.webp",
          "contentType": "image/webp",
          "width": 1200,
          "height": 900,
          "alt": "Example IEM",
          "sortOrder": 0
        }
      ],
      "variants": [
        {
          "id": "55555555-5555-4555-8555-555555555555",
          "sku": "EXAMPLE-IEM-DEFAULT",
          "name": "Default",
          "options": {},
          "priceMnt": 199000,
          "compareAtPriceMnt": null,
          "stockQuantity": 10,
          "active": true,
          "sortOrder": 0,
          "imageKeys": []
        }
      ]
    }
  ]
}
```

`brandSlug`, `categorySlug`, `description`, `websiteUrl`, `shortDescription`, `details`, and `compareAtPriceMnt` are optional. Optional text, details, and compare-at prices can also be `null`. Each image requires its source width, source height, and meaningful alt text. A product must have at least one variant. Product detail values can be a string, number, boolean, or string array. Variant option values must be strings. `imageKeys` must contain R2 keys from the same product. Use an empty array when a variant uses the shared product gallery.

Supported image content types are `image/avif`, `image/gif`, `image/jpeg`, `image/png`, `image/svg+xml`, and `image/webp`.

The commands validate all data and assets before writing resources. The media task uploads each
image to the explicit `PLUGGED_MEDIA_BUCKET` with immutable cache metadata. Local and remote data
tasks upsert D1 rows in this order: brands, categories, products, images, variants, and
variant-image links. Repeated runs replace remote objects at the same R2 keys and update rows at the
same IDs without adding duplicates.
