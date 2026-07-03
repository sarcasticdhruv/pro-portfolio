// Dev-only Vite plugin: serves the /api/* Edge Functions during `vite dev`.
//
// In production Vercel runs the functions in /api. Locally, plain `vite` does
// not, so this middleware loads the same handler modules and runs them in the
// Node dev process - adapting Node's req/res to the Web Request/Response the
// handlers speak. Keys are read from .env into process.env here (server-side
// only), so they still never reach the browser bundle.
import type { Plugin } from 'vite';
import { loadEnv } from 'vite';
import path from 'node:path';

const ROUTES: Record<string, string> = {
  '/api/llm': 'api/llm.ts',
  '/api/image': 'api/image.ts',
};

function readBody(req: import('node:http').IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export function devApiPlugin(): Plugin {
  return {
    name: 'dev-api',
    apply: 'serve',
    configureServer(server) {
      // Load ALL env vars (empty prefix) into process.env so the handlers,
      // which read globalThis.process.env, pick up the non-VITE_ keys locally.
      const env = loadEnv(server.config.mode, process.cwd(), '');
      for (const [k, v] of Object.entries(env)) {
        if (process.env[k] === undefined) process.env[k] = v;
      }

      server.middlewares.use(async (req, res, next) => {
        const rawUrl = req.url || '';
        const route = rawUrl.split('?')[0];
        const modPath = ROUTES[route];
        if (!modPath) return next();

        try {
          const mod = await server.ssrLoadModule(path.resolve(process.cwd(), modPath));
          const handler = mod.default as (r: Request) => Promise<Response>;

          const host = req.headers.host || 'localhost';
          const isBodyless = req.method === 'GET' || req.method === 'HEAD';
          const body = isBodyless ? undefined : await readBody(req);

          const webReq = new Request(`http://${host}${rawUrl}`, {
            method: req.method,
            headers: req.headers as Record<string, string>,
            body: body && body.length ? body : undefined,
          });

          const webRes = await handler(webReq);
          res.statusCode = webRes.status;
          webRes.headers.forEach((val, key) => {
            if (key.toLowerCase() === 'content-encoding') return; // already decoded
            res.setHeader(key, val);
          });

          if (webRes.body) {
            const reader = webRes.body.getReader();
            for (;;) {
              const { done, value } = await reader.read();
              if (done) break;
              res.write(Buffer.from(value));
            }
          }
          res.end();
        } catch (e) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: e instanceof Error ? e.message : 'dev api error' }));
        }
      });
    },
  };
}
