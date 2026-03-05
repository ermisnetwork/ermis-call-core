import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 3001,
    host: true,
  },
  resolve: {
    alias: {
      'ermis-call-core': path.resolve(__dirname, '../../src'),
    },
  },
  // Allow loading .wasm files
  assetsInclude: ['**/*.wasm'],
});
