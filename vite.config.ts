import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      // Allow GitHub Pages deployments to serve under a subpath (repo name)
      // Set VITE_BASE in CI to e.g. "/smartlocalusaversion3/"; defaults to "/" for local/dev/Firebase Hosting.
      base: env.VITE_BASE || '/',
      server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: {
          '/api': {
            target: 'http://localhost:8080',
            changeOrigin: true,
            secure: false,
          },
          '/health': {
            target: 'http://localhost:8080',
            changeOrigin: true,
            secure: false,
          }
        }
      },
  plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
