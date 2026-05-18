import { defineConfig } from 'vite';
import path from 'path';

// SPA build for GitHub Pages.
// Entry: index.html at the package root. Output: dist-site/.
// Base path is configurable via VITE_BASE so local previews work with '/'.
export default defineConfig({
  root: '.',
  base: process.env.VITE_BASE ?? '/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist-site',
    emptyOutDir: true,
    sourcemap: false,
  },
});
