import { createServer } from 'node:http';
import { createReadStream, existsSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const root = 'C:/Users/lawso/Documents/my-project/jotek/apps/storefront';
const appRoot = join(root, '.next/server/app');
const staticRoot = join(root, '.next/static');
const publicRoot = join(root, 'public');
const port = 3002;

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function safeJoin(base, requestPath) {
  const target = normalize(join(base, requestPath));
  return target.startsWith(normalize(base)) ? target : null;
}

async function serveFile(res, file) {
  if (!file || !existsSync(file) || !(await stat(file)).isFile()) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Not found');
    return;
  }

  res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' });
  createReadStream(file).pipe(res);
}

createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${port}`);
  const path = decodeURIComponent(url.pathname);

  if (path.startsWith('/_next/static/')) {
    return serveFile(res, safeJoin(staticRoot, path.replace('/_next/static/', '')));
  }

  const publicFile = safeJoin(publicRoot, path.replace(/^\//, ''));
  if (publicFile && existsSync(publicFile)) {
    return serveFile(res, publicFile);
  }

  const clean = path === '/' ? 'index' : path.replace(/^\/|\/$/g, '');
  return serveFile(res, safeJoin(appRoot, `${clean}.html`));
}).listen(port, '127.0.0.1', () => {
  console.log(`Jotek static preview running at http://127.0.0.1:${port}`);
});
