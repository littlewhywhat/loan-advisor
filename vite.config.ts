import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  root: path.resolve(__dirname, './src'),
  publicDir: path.resolve(__dirname, './public'),
  build: {
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: true,
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    root: path.resolve(__dirname),
    include: ['src/**/*.test.ts'],
  },
});
