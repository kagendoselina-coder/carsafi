const http = require('http');
const fs = require('fs');
const path = require('path');
const { initDb, loginUser, getServices, createService } = require('./db');

const hostname = '0.0.0.0';
const port = process.env.PORT || 3000;
const rootDir = __dirname;

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8'
};

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1e6) {
        req.destroy();
        reject(new Error('Request body too large'));
      }
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function respondJson(res, statusCode, data) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

async function handleApi(req, res, url) {
  if (url.pathname === '/api/login' && req.method === 'POST') {
    try {
      const body = JSON.parse(await readBody(req));
      const user = await loginUser(body.email, body.password);
      if (!user) {
        respondJson(res, 401, { success: false, message: 'Invalid email or password' });
        return;
      }
      respondJson(res, 200, { success: true, user });
      return;
    } catch (error) {
      respondJson(res, 400, { success: false, message: 'Invalid login payload' });
      return;
    }
  }

  if (url.pathname === '/api/services' && req.method === 'GET') {
    const services = await getServices();
    respondJson(res, 200, { success: true, services });
    return;
  }

  if (url.pathname === '/api/services' && req.method === 'POST') {
    try {
      const body = JSON.parse(await readBody(req));
      const service = await createService(body);
      respondJson(res, 201, { success: true, service });
      return;
    } catch (error) {
      respondJson(res, 400, { success: false, message: 'Invalid service payload' });
      return;
    }
  }

  respondJson(res, 404, { success: false, message: 'Not found' });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname.startsWith('/api/')) {
    await handleApi(req, res, url);
    return;
  }

  const requestPath = decodeURIComponent(url.pathname);
  const safePath = requestPath === '/' ? '/index.html' : requestPath;
  const filePath = path.normalize(path.join(rootDir, safePath));

  if (!filePath.startsWith(rootDir)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (error, stats) => {
    if (error || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }

    const extension = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[extension] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    const stream = fs.createReadStream(filePath);
    stream.on('error', () => {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Server error');
    });
    stream.pipe(res);
  });
});

(async () => {
  try {
    await initDb();
    server.listen(port, hostname, () => {
      const localUrl = `http://localhost:${port}`;
      const networkHint = `http://<your-device-ip>:${port}`;
      console.log(`Carsafi prototype is running at ${localUrl}`);
      console.log(`Open this on another device using ${networkHint}`);
    });
  } catch (error) {
    console.error('Failed to initialize Carsafi database:', error.message);
    process.exit(1);
  }
})();
