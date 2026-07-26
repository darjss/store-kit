import tailwindcss from '@tailwindcss/vite'
import solid from 'vite-plugin-solid'
import { defineConfig } from 'vite-plus'

export default defineConfig({
  build: {
    rolldownOptions: {
      external: ['cloudflare:workers'],
    },
  },
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [
    tailwindcss(),
    solid({
      ssr: { app: 'src/App.tsx' },
      serverFunctions: { components: true },
    }),
  ],
})
