export const productImageLayouts = {
  hero: {
    breakpoints: [480, 768, 960, 1200],
    sizes: '(max-width: 767px) 100vw, 50vw',
  },
  card: {
    breakpoints: [320, 480, 640, 800],
    sizes: '(max-width: 767px) 50vw, (max-width: 1023px) 33vw, 25vw',
  },
  row: {
    breakpoints: [240, 320, 480, 640],
    sizes: '(max-width: 767px) 33vw, 20vw',
  },
  detail: {
    breakpoints: [480, 768, 960, 1200],
    sizes: '(max-width: 767px) 100vw, 55vw',
  },
  thumbnail: {
    breakpoints: [80, 120, 160],
    sizes: '120px',
  },
} as const

export type ProductImageLayout = keyof typeof productImageLayouts
