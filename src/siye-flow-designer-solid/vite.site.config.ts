import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';
import path from 'path';

// SPA build for GitHub Pages
export default defineConfig({
  plugins: [solidPlugin()],
  root: '.',
  base: process.env.VITE_BASE ?? '/',
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  build: {
    outDir: 'dist-site',
    emptyOutDir: true,
    rollupOptions: {
      input: { main: path.resolve(__dirname, 'index.html') },
    },
  },
});
