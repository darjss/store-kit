// @ts-check
import cloudflare from '@astrojs/cloudflare'
import solid from '@astrojs/solid-js'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'astro/config'

export default defineConfig({
  output: 'server',
  adapter: cloudflare({ imageService: 'passthrough' }),
  integrations: [solid()],
  vite: {
    plugins: [tailwindcss()],
    resolve: { tsconfigPaths: true },
  },
})
