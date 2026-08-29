import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// Console removal is now handled by Terser configuration

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8081,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:10000',
        changeOrigin: true,
      },
    },
    // Headers removidos para evitar conflictos con el servidor de Vite
    // Vite maneja automáticamente los tipos MIME correctos
  },
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Configuración para producción en Vercel
  base: mode === 'production' ? '/' : '/',
  // Ensure environment variables are properly loaded in production
  envPrefix: 'VITE_',
  envDir: './',
  preview: {
    allowedHosts: ['hideon-red-social.vercel.app', 'localhost', '.vercel.app'],
    host: true,
    port: 4173,
  },
  build: {
    // Production optimizations
    minify: 'terser',
    sourcemap: false,
    assetsInlineLimit: 0, // Prevent inline assets that can cause MIME issues
    chunkSizeWarningLimit: 1000, // Aumentar límite de warning
    terserOptions: {
      compress: {
        // Remove console.log, console.debug, console.info in production
        // Keep console.warn and console.error for important debugging
        drop_console: false,
        pure_funcs: ['console.log', 'console.debug', 'console.info'],
      },
      mangle: {
        safari10: true,
      },
    },
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name]-[hash]-${Date.now()}.js`,
        chunkFileNames: `assets/[name]-[hash]-${Date.now()}.js`,
        assetFileNames: `assets/[name]-[hash]-${Date.now()}.[ext]`,
        manualChunks: (id) => {
          // CORRECCIÓN: Core vendor libraries (React centralizado)
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
            return 'react-core';
          }
          if (id.includes('react-router-dom')) {
            return 'router';
          }
          
          // Database and query management
          if (id.includes('@supabase/supabase-js')) {
            return 'supabase';
          }
          if (id.includes('@tanstack/react-query')) {
            return 'query';
          }
          
          // Animation and styling
          if (id.includes('framer-motion')) {
            return 'animations';
          }
          if (id.includes('lucide-react')) {
            return 'icons';
          }
          
          // Charts library - heavy, should be separate chunk
          if (id.includes('recharts')) {
            return 'charts';
          }
          
          // UI components (Radix UI)
          if (id.includes('@radix-ui')) {
            return 'ui-components';
          }
          
          // Utilities
          if (id.includes('date-fns') || id.includes('lodash-es') || id.includes('clsx') || id.includes('class-variance-authority')) {
            return 'utils';
          }
          
          // Capacitor for mobile
          if (id.includes('@capacitor')) {
            return 'capacitor';
          }
        },
      },
    },
  },
}));
