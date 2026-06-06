import { resolve } from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  // HMR needs the browser's WebSocket client to reach the dev server. When the
  // app is viewed through a proxy that doesn't forward WS upgrades (e.g. the
  // Claude Preview pane), default HMR breaks and you see "no updates" until
  // you reload. Pinning clientPort/host tells the browser to open a direct WS
  // to localhost:3041, bypassing whatever proxy served the HTML.
  server: {
    host: true, // listen on 0.0.0.0 so proxies can reach the dev server
    port: 3041,
    strictPort: true,
    hmr: {
      host: 'localhost',
      clientPort: 3041,
      protocol: 'ws',
    },
    proxy: {
      '/api': {
        target: 'http://localhost:4001',
        changeOrigin: true,
        ws: true, // forward WebSocket upgrades for /api/* if BE ever needs them
      },
    },
    // Watch the workspace's shared package too — without this, edits to
    // packages/shared don't trigger HMR because Vite skips symlinked deps.
    watch: {
      ignored: ['!**/packages/shared/**', '**/node_modules/**', '**/dist/**'],
    },
    fs: {
      // Allow Vite to serve files from sibling workspace packages.
      allow: ['..', '../..'],
    },
  },
  // Don't pre-bundle the shared workspace package — let HMR see source changes.
  optimizeDeps: {
    exclude: ['@simple-invoice/shared'],
  },
});
