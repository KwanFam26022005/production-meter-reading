import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const backendTarget = process.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000';
const hmrClientPort = process.env.VITE_HMR_CLIENT_PORT
  ? parseInt(process.env.VITE_HMR_CLIENT_PORT, 10)
  : (process.env.VITE_TUNNEL === '1' ? 443 : undefined);

function htmlRenamePlugin(): Plugin {
  return {
    name: 'html-rename-user',
    enforce: 'post',
    generateBundle(_, bundle) {
      for (const [fileName, file] of Object.entries(bundle)) {
        if (fileName === 'user.html' && file.type === 'asset') {
          file.fileName = 'index.html';
        }
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), htmlRenamePlugin()],
  build: {
    outDir: 'dist/user',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        user: path.resolve(__dirname, 'user.html'),
      },
    },
  },
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
