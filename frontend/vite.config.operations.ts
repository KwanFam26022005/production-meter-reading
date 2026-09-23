import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const backendTarget = process.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000';

function htmlRenamePlugin(): Plugin {
  return {
    name: 'html-rename-operations',
    enforce: 'post',
    generateBundle(_, bundle) {
      for (const [fileName, file] of Object.entries(bundle)) {
        if (fileName === 'operations.html' && file.type === 'asset') {
          file.fileName = 'index.html';
        }
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), htmlRenamePlugin()],
  build: {
    outDir: 'dist/operations',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        operations: path.resolve(__dirname, 'operations.html'),
      },
    },
  },
  server: {
    port: 5174,
    host: '0.0.0.0',
    allowedHosts: true,
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
