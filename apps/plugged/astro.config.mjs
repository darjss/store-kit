// @ts-check
import cloudflare from '@astrojs/cloudflare'
import solid from '@astrojs/solid-js'
import tailwindcss from '@tailwindcss/vite'
import { imageService } from '@unpic/astro/service'
import { defineConfig } from 'astro/config'

export default defineConfig({
  devToolbar: { enabled: false },
  output: 'server',
  adapter: cloudflare({ imageService: 'passthrough' }),
  image: { service: imageService({ fallbackService: 'cloudflare' }) },
  integrations: [solid()],
  vite: {
    plugins: [tailwindcss()],
    resolve: { tsconfigPaths: true },
  },
})
