import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// Console removal is now handled by Terser configuration

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    // Headers removidos para evitar conflictos con el servidor de Vite
    // Vite maneja automáticamente los tipos MIME correctos
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Configuración para producción en Render.com
  base: mode === 'production' ? '/' : '/',
  build: {
    // Production optimizations
    minify: 'esbuild',
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
        manualChunks(id) {
          if (!id.includes('node_modules')) return;

          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
            return 'vendor';
          }
          if (id.includes('node_modules/react-router') || id.includes('node_modules/@remix-run/router')) {
            return 'router';
          }

          if (id.includes('node_modules/@supabase/')) return 'supabase';
          if (id.includes('node_modules/@tanstack/')) return 'query';

          if (id.includes('node_modules/recharts/') || id.includes('node_modules/d3-')) return 'charts';

          if (id.includes('node_modules/@radix-ui/')) return 'radix';
          if (id.includes('node_modules/@floating-ui/')) return 'floating';
          if (id.includes('node_modules/@hookform/')) return 'forms';
          if (id.includes('node_modules/zod/')) return 'zod';

          if (id.includes('node_modules/framer-motion/')) return 'animations';
          if (id.includes('node_modules/lucide-react/')) return 'icons';

          if (id.includes('node_modules/date-fns/')) return 'date';
          if (id.includes('node_modules/lodash-es/')) return 'lodash';

          return 'vendor-other';
        },
      },
    },
  },
}));
