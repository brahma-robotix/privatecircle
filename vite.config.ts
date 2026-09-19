/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Exposes server to local network (Wi-Fi) so phones/tablets can connect
    allowedHosts: true, // Allows tunnels like Cloudflare/ngrok to connect without 403
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
