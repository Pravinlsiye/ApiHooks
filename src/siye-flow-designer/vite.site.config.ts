import { defineConfig } from 'vite';
import path from 'path';

// Multi-page SPA build for GitHub Pages:
//   /              -> designer (index.html)
//   /Home/         -> product / docs landing
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
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        home: path.resolve(__dirname, 'Home/index.html'),
      },
    },
  },
});
