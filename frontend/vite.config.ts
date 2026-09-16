import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const backendTarget = process.env.VITE_BACKEND_URL || 'http://127.0.0.1:8001';
const hmrClientPort = process.env.VITE_HMR_CLIENT_PORT
  ? parseInt(process.env.VITE_HMR_CLIENT_PORT, 10)
  : (process.env.VITE_TUNNEL === '1' ? 443 : undefined);

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: '0.0.0.0',
    allowedHosts: true,
    ...(hmrClientPort ? { hmr: { clientPort: hmrClientPort } } : {}),
    proxy: {
      '/api': {
        target: backendTarget,
        changeOrigin: true,
      },
      '/health': {
        target: backendTarget,
        changeOrigin: true,
      },
    },
  },
});
