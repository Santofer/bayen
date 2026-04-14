import { defineConfig } from 'astro/config'
import react from '@astrojs/react'
import cloudflare from '@astrojs/cloudflare'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  integrations: [react()],

  // Cloudflare Pages — SSR via Workers pour les pages dynamiques
  adapter: cloudflare({
    platformProxy: { enabled: true },
  }),
  output: 'static',
  site: 'https://bayen.n0.ma',

  build: {
    assets: '_astro',
  },

  vite: {
    plugins: [tailwindcss()],
    ssr: {
      noExternal: ['@radix-ui/*'],
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime'],
      exclude: ['zxing-wasm'],
    },
  },

  redirects: {
    '/scanner': '/scan',
  },
})
