import { defineConfig } from 'astro/config'
import react from '@astrojs/react'
import cloudflare from '@astrojs/cloudflare'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // Intégrations
  integrations: [react()],

  // Déploiement Cloudflare Pages
  // Pages statiques pré-rendues par défaut, pages SSR via `export const prerender = false`
  adapter: cloudflare({
    platformProxy: { enabled: true },
  }),
  output: 'static',
  site: 'https://bayen.ma',

  // Build
  build: {
    // Assets dans _astro/ (compatible Cloudflare Pages)
    assets: '_astro',
  },

  // Vite
  vite: {
    plugins: [tailwindcss()],
    ssr: {
      noExternal: ['@radix-ui/*'],
    },
  },

  // Redirects
  redirects: {
    '/scanner': '/scan',
  },
})
