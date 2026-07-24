import type { PublicImage } from '@store-kit/contracts'

export type ProductImageMetadata = PublicImage

export const productImageLayouts = {
  hero: {
    breakpoints: [480, 768, 960, 1200],
    sizes: '(max-width: 767px) 92vw, 52vw',
  },
  wall: {
    breakpoints: [320, 480, 640, 768],
    sizes: '(max-width: 767px) 70vw, 36vw',
  },
  card: {
    breakpoints: [320, 480, 640, 800],
    sizes: '(max-width: 767px) 50vw, 45vw',
  },
  listingHalf: {
    breakpoints: [240, 320, 480, 640, 800],
    sizes: '(max-width: 767px) 50vw, 45vw',
  },
  listingFull: {
    breakpoints: [320, 480, 640, 800],
    sizes: '(max-width: 767px) 100vw, 45vw',
  },
  detail: {
    breakpoints: [480, 768, 960, 1200],
    sizes: '(max-width: 767px) 100vw, 50vw',
  },
  thumbnail: {
    breakpoints: [80, 120, 160],
    sizes: '120px',
  },
} as const

export type ProductImageLayout = keyof typeof productImageLayouts

export const productImageFallback = (url: string) => {
  if (url.startsWith('/media/')) return
  return 'cloudflare' as const
}

export const productImageOptions = (url: string) => {
  if (url.startsWith('/media/')) return
  return { cloudflare: { domain: new URL(url).hostname } }
}
