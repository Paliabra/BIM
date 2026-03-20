import { defineConfig } from 'vite';

export default defineConfig({
  optimizeDeps: {
    exclude: ['web-ifc'],
  },
  build: {
    target: 'esnext',
  },
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
});
