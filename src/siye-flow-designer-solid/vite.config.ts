import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';
import path from 'path';

// Library build — drop-in replacement for SiyeFlow.UI embed
export default defineConfig({
  plugins: [solidPlugin()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/lib.ts'),
      name: 'SiyeFlowDesigner',
      formats: ['umd', 'es'],
      fileName: (format) => `siye-flow-designer.${format}.js`,
    },
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
        assetFileNames: (a) => (a.name === 'style.css' ? 'style.css' : (a.name ?? 'asset')),
      },
    },
  },
  server: { port: 3002, open: true },
});
