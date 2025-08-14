import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      base: '/adYKS-COACH/',
      server: {
        port: parseInt(env.VITE_PORT) || 3000,
        host: true, // Allow external connections
      },
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        // Optimize build output
        target: 'es2020',
        minify: 'terser',
        terserOptions: {
          compress: {
            drop_console: mode === 'production',
            drop_debugger: mode === 'production',
          },
        },
        rollupOptions: {
          output: {
            // Manual chunk splitting for better caching
            manualChunks: {
              vendor: ['react', 'react-dom'],
              firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
              ui: ['lucide-react', 'recharts'],
              ai: ['@google/genai'],
            },
          },
        },
        // Increase chunk size warning limit
        chunkSizeWarningLimit: 1000,
      },
      optimizeDeps: {
        // Pre-bundle dependencies for faster dev server startup
        include: [
          'react',
          'react-dom',
          'firebase/app',
          'firebase/auth', 
          'firebase/firestore',
          'lucide-react',
          'recharts',
          '@google/genai'
        ],
      },
    };
});
