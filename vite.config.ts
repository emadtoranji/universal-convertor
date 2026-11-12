import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

function rewriteDateRequest(
  req: { url?: string },
  _res: unknown,
  next: () => void,
): void {
  const url = req.url ?? '';
  const path = url.split('?')[0];
  if (path === '/date' || path === '/date/') {
    const query = url.includes('?') ? url.slice(url.indexOf('?')) : '';
    req.url = `/date.html${query}`;
  }
  next();
}

function dateRoutePlugin(): Plugin {
  return {
    name: 'date-route',
    configureServer(server) {
      server.middlewares.use(rewriteDateRequest);
    },
    configurePreviewServer(server) {
      server.middlewares.use(rewriteDateRequest);
    },
  };
}

export default defineConfig({
  plugins: [react(), dateRoutePlugin()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  build: {
    target: 'esnext',
    outDir: 'dist',
    assetsInlineLimit: 0,
    sourcemap: false,
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        date: fileURLToPath(new URL('./date.html', import.meta.url)),
      },
    },
  },
  worker: {
    format: 'es',
  },
});
