import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// VITE_BASE é definido no deploy do GitHub Pages (ex.: /smarthail/).
export default defineConfig({
  base: process.env.VITE_BASE || '/',
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },
  build: {
    // O chunk do mapa (MapLibre) é grande, mas só carrega nas telas com mapa.
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          map: ['leaflet', 'react-leaflet', 'maplibre-gl', '@maplibre/maplibre-gl-leaflet'],
          charts: ['recharts'],
          motion: ['framer-motion'],
        },
      },
    },
  },
});
