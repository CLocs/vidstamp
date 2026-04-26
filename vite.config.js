import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

import { cloudflare } from "@cloudflare/vite-plugin";

// https://vite.dev/config/
// For Cloudflare Pages at root: set env VITE_BASE_URL=/ (in Pages build settings).
// Omit it for GitHub Pages so base stays /vidstamp/
export default defineConfig({
  plugins: [react(), cloudflare()],
  base: process.env.VITE_BASE_URL || '/vidstamp/',
})