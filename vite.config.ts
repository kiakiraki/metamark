/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        // This project runs on Vite 8, which bundles rolldown as the
        // default bundler — `output.manualChunks` (Rollup's classic API)
        // is deprecated here in favor of `codeSplitting.groups`. Split
        // React (+ its transitive deps like scheduler) and framer-motion
        // into their own vendor chunks so app code changes don't bust the
        // cache for rarely-changing libraries, and framer-motion (not
        // needed for first paint) can load separately from React itself.
        codeSplitting: {
          groups: [
            {
              name: 'vendor',
              test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
              priority: 2,
            },
            {
              name: 'framer-motion',
              test: /[\\/]node_modules[\\/]framer-motion[\\/]/,
              priority: 1,
            },
          ],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
