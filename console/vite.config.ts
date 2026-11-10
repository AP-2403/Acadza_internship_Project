import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Using relative base './' ensures the built bundle works seamlessly
// on any hosting provider: Vercel, Netlify, Render, or GitHub Pages subpaths.
export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    port: 3000
  }
});
