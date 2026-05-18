import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  root: '.',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      name: 'SiyeFlowDesigner',
      formats: ['umd', 'es'],
      fileName: (format) => `siye-flow-designer.${format}.js`,
    },
    cssCodeSplit: false,
    rollupOptions: {
      external: [],
      output: {
        globals: {},
        inlineDynamicImports: true,
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'style.css') {
            return 'style.css';
          }
          return assetInfo.name || 'asset';
        },
      },
    },
  },
  server: {
    port: 3001,
    open: true,
  },
});

