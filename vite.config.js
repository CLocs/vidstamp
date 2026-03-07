import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

import { cloudflare } from "@cloudflare/vite-plugin";

// https://vite.dev/config/
// base must match your GitHub repo name so assets load correctly on GitHub Pages
export default defineConfig({
  plugins: [react(), cloudflare()],
  base: '/vidstamp/',
})