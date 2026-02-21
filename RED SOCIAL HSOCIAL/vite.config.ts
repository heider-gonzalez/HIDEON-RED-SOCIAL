import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// Console removal is now handled by Terser configuration

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
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
  // Configuración para producción en Render.com
  base: mode === 'production' ? '/' : '/',
  build: {
    // Production optimizations
    minify: 'terser',
    sourcemap: false,
    assetsInlineLimit: 0, // Prevent inline assets that can cause MIME issues
    terserOptions: {
      compress: {
        // Remove console.log, console.debug, console.info in production
        // Keep console.warn and console.error for important debugging
        drop_console: false,
        pure_funcs: ['console.log', 'console.debug', 'console.info'],
      },
    },
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name]-[hash]-${Date.now()}.js`,
        chunkFileNames: `assets/[name]-[hash]-${Date.now()}.js`,
        assetFileNames: `assets/[name]-[hash]-${Date.now()}.[ext]`,
        manualChunks: {
          // Core vendor libraries
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          
          // Database and query management
          supabase: ['@supabase/supabase-js'],
          query: ['@tanstack/react-query'],
          
          // UI component libraries
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-avatar'],
          radix: ['@radix-ui/react-toast', '@radix-ui/react-tabs', '@radix-ui/react-select'],
          
          // Animation and styling
          animations: ['framer-motion'],
          icons: ['lucide-react'],
          
          // Charts library - heavy, should be separate chunk
          charts: ['recharts'],
          
          // Utilities
          utils: ['date-fns', 'lodash-es', 'clsx', 'class-variance-authority'],
        },
      },
    },
  },
}));
