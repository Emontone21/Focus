import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// The base path is overridable via VITE_BASE so the same config works for:
//   - local dev (default '/')
//   - GitHub Pages under a project subpath (set VITE_BASE in CI)
//   - Capacitor iOS WebView (must be './' for relative asset paths)
const base = process.env.VITE_BASE ?? '/';

export default defineConfig({
  base,
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
