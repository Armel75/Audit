import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, '../../', '');
  const isBuild = command === 'build';
  return {
    plugins: [react(), tailwindcss()],
    envDir: '../../',
    base: isBuild ? '/audit/' : '/audit/',
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 5173,
      strictPort: true,
      proxy: {
        '/api/v1': {
          target: 'http://localhost:3003',
          changeOrigin: true,
          // rewrite: (path) => path.replace(/^\/api/, '/api/v1'),
        },
      },
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
}); 