import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

const repoRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  // Demo sources live in demo/; the build overwrites the committed root
  // index.html with the self-contained page (all JS and CSS inlined), which
  // opens straight from the file system and deploys to GitHub Pages as-is.
  root: 'demo',
  base: './',
  publicDir: false,
  plugins: [
    viteSingleFile(),
    {
      // In dev, serve the generated fonts/ from the repo root (outside the
      // Vite root) by rewriting to Vite's /@fs/ file server; `?direct` keeps
      // stylesheets raw instead of Vite's JS-wrapped CSS modules.
      apply: 'serve',
      configureServer(server) {
        server.middlewares.use((req, _res, next) => {
          if (req.url?.startsWith('/fonts/')) {
            let file = decodeURIComponent(req.url);
            if (file.endsWith('.css')) file += '?direct';
            req.url = `/@fs${path.posix.join(pathToFileURL(repoRoot).pathname, file)}`;
          }
          next();
        });
      },
    },
  ],
  build: {
    outDir: '..',
    emptyOutDir: false,
  },
});
