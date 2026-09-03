import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
export default defineConfig({
  plugins: [react()],
  resolve: { alias: [{ find: /^.*\/supabaseClient$/, replacement: path.resolve('src/supabaseStubMovil.js') }] },
  build: { outDir: 'dist-movil', rollupOptions: { input: path.resolve('harnessMovil.html') } },
})
