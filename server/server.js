import http from 'http';
import fs from 'fs';
import path from 'path';
import { URL, fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT || 3000);
const ROOT_DIR = path.join(__dirname, '..', 'public');
const TESTS_DIR = path.join(__dirname, '..', 'tests');
const ROUTES_DIR = path.join(ROOT_DIR, 'data', 'routes');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8'
};

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(body);
}

function collectRequestBody(req, maxBytes = 5 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;

    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(new Error('Payload too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on('end', () => {
      resolve(Buffer.concat(chunks).toString('utf8'));
    });

    req.on('error', (error) => reject(error));
  });
}

async function handleApiRoutes(req, res, pathname) {
  if (req.method === 'GET' && pathname === '/api/health') {
    sendJson(res, 200, { ok: true });
    return true;
  }

  if (req.method === 'GET' && pathname === '/api/list-routes') {
    try {
      const files = await fs.promises.readdir(ROUTES_DIR);
      const routes = [];

      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        try {
          const content = await fs.promises.readFile(path.join(ROUTES_DIR, file), 'utf8');
          const data = JSON.parse(content);
          routes.push({ filename: file, name: data.name || file });
        } catch {
          // Skip unreadable/invalid files
        }
      }

      sendJson(res, 200, { ok: true, routes });
    } catch (error) {
      console.error('Failed to list routes:', error);
      sendJson(res, 500, { ok: false, message: 'Failed to list routes' });
    }
    return true;
  }

  if (req.method === 'POST' && pathname === '/api/create-route') {
    try {
      const rawBody = await collectRequestBody(req);
      const { filename, name } = JSON.parse(rawBody);

      if (!filename || !filename.match(/^[a-z0-9\-]+\.json$/)) {
        sendJson(res, 400, { ok: false, message: 'Invalid filename' });
        return true;
      }

      const routeFile = path.join(ROUTES_DIR, filename);

      // Prevent overwriting an existing file
      try {
        await fs.promises.access(routeFile);
        sendJson(res, 409, { ok: false, message: 'A route with that name already exists' });
        return true;
      } catch {
        // File doesn't exist — safe to create
      }

      const template = {
        name: name || '',
        personalBest: '',
        sumOfBest: '',
        segments: []
      };

      await fs.promises.writeFile(routeFile, `${JSON.stringify(template, null, 2)}\n`, 'utf8');
      sendJson(res, 200, { ok: true });
    } catch (error) {
      if (error instanceof SyntaxError) {
        sendJson(res, 400, { ok: false, message: 'Invalid JSON body' });
      } else {
        console.error('Failed to create route:', error);
        sendJson(res, 500, { ok: false, message: 'Failed to create route' });
      }
    }
    return true;
  }

  if (req.method === 'POST' && pathname === '/api/save-route') {
    try {
      const rawBody = await collectRequestBody(req);
      const parsedBody = JSON.parse(rawBody);
      
      // Support both old format (direct data) and new format (with filename)
      const routeData = parsedBody.data || parsedBody;
      const routeFilename = parsedBody.filename || 'act-1-100-percent.json';
      
      // Validate filename to prevent path traversal
      if (!routeFilename.match(/^[a-z0-9\-]+\.json$/i)) {
        sendJson(res, 400, { ok: false, message: 'Invalid filename' });
        return true;
      }
      
      const routeFile = path.join(ROUTES_DIR, routeFilename);
      const json = `${JSON.stringify(routeData, null, 2)}\n`;
      await fs.promises.writeFile(routeFile, json, 'utf8');
      sendJson(res, 200, { ok: true });
    } catch (error) {
      if (error && error.message === 'Payload too large') {
        sendJson(res, 413, { ok: false, message: 'Payload too large' });
      } else if (error instanceof SyntaxError) {
        sendJson(res, 400, { ok: false, message: 'Invalid JSON body' });
      } else {
        console.error('Failed to save route data:', error);
        sendJson(res, 500, { ok: false, message: 'Failed to save route data' });
      }
    }
    return true;
  }

  return false;
}

function safeResolvePath(requestPath) {
  const normalized = path.normalize(requestPath).replace(/^([/\\])+/, '');
  const unixPath = normalized.replace(/\\/g, '/');

  if (unixPath === 'tests' || unixPath.startsWith('tests/')) {
    const testsRelativePath = unixPath === 'tests' ? 'index.html' : unixPath.slice('tests/'.length);
    const publicTestsPath = path.resolve(ROOT_DIR, unixPath || 'index.html');
    if (publicTestsPath.startsWith(ROOT_DIR)) {
      try {
        const stats = fs.statSync(publicTestsPath);
        if (stats.isFile()) {
          return publicTestsPath;
        }
      } catch {
        // Fall back to server-side tests folder when public test asset is missing.
      }
    }

    const resolved = path.resolve(TESTS_DIR, testsRelativePath || 'index.html');
    if (!resolved.startsWith(TESTS_DIR)) {
      return null;
    }
    return resolved;
  }

  const resolved = path.resolve(ROOT_DIR, normalized || 'index.html');

  if (!resolved.startsWith(ROOT_DIR)) {
    return null;
  }

  return resolved;
}

function serveStaticFile(res, filePath) {
  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Not Found');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Internal Server Error');
      }
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-store'
    });
    res.end(content);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = decodeURIComponent(url.pathname);

    const apiHandled = await handleApiRoutes(req, res, pathname);
    if (apiHandled) return;

    const requestPath = pathname === '/' ? 'index.html' : pathname;
    const filePath = safeResolvePath(requestPath);

    if (!filePath) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Forbidden');
      return;
    }

    serveStaticFile(res, filePath);
  } catch (error) {
    console.error('Server error:', error);
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Internal Server Error');
  }
});

export function startServer(port = PORT) {
  return new Promise((resolve, reject) => {
    if (server.listening) {
      return resolve(server);
    }

    server.on('error', reject);
    server.listen(port, () => {
      console.log(`Stopwatch server running at http://localhost:${port}`);
      resolve(server);
    });
  });
}

export function stopServer() {
  return new Promise((resolve, reject) => {
    if (!server.listening) {
      return resolve();
    }

    server.close((err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  startServer();
}
