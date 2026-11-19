import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'vault-document-csp',
      transformIndexHtml(html, ctx) {
        // Vite injects CSS as <style> in development. Production CSS is an external asset.
        // Keep scripts restricted to same-origin in both modes; never allow inline scripts.
        const style = ctx.server ? "style-src 'self' 'unsafe-inline'" : "style-src 'self'";
        const policy = `default-src 'none'; script-src 'self'; ${style}; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'`;
        return html.replace('__VAULT_CSP__', policy);
      }
    }
  ],
  build: { outDir: 'dist', sourcemap: false },
  server: { host: '127.0.0.1', strictPort: true },
  test: { environment: 'node' }
});
