import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

import fs from 'fs';

const backendTarget = process.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000';
const hmrClientPort = process.env.VITE_HMR_CLIENT_PORT
  ? parseInt(process.env.VITE_HMR_CLIENT_PORT, 10)
  : (process.env.VITE_TUNNEL === '1' ? 443 : undefined);

function devHtmlRewritePlugin(): Plugin {
  return {
    name: 'dev-html-rewrite-user',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url === '/' || req.url === '/index.html' || req.url?.startsWith('/?')) {
          try {
            const htmlPath = path.resolve(__dirname, 'user.html');
            let html = fs.readFileSync(htmlPath, 'utf-8');
            html = await server.transformIndexHtml(req.url, html);
            res.statusCode = 200;
            res.setHeader('Content-Type', 'text/html');
            res.end(html);
            return;
          } catch (e) {
            return next(e);
          }
        }
        next();
      });
    },
  };
}

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
  plugins: [devHtmlRewritePlugin(), react(), htmlRenamePlugin()],
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
