const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const server = http.createServer((req, res) => {
  // Parse the request URL
  const parsedUrl = url.parse(req.url, true);
  let filePath = parsedUrl.pathname;

  // Default to index.html for root or if no extension
  if (filePath === '/' || !path.extname(filePath)) {
    filePath = '/index.html';
  }

  // Construct full file path
  const distPath = path.join(__dirname, 'dist');
  const fullPath = path.join(distPath, filePath);

  // Security: prevent directory traversal
  if (!fullPath.startsWith(distPath)) {
    res.statusCode = 403;
    res.end('Forbidden');
    return;
  }

  // Check if file exists
  fs.access(fullPath, fs.constants.F_OK, (err) => {
    if (err) {
      // If file doesn't exist and it's not an API/WebSocket request, serve index.html (SPA routing)
      if (!filePath.startsWith('/api/') && !filePath.startsWith('/ws')) {
        const indexPath = path.join(distPath, 'index.html');
        fs.readFile(indexPath, 'utf8', (err, data) => {
          if (err) {
            res.statusCode = 404;
            res.end('Not Found');
            return;
          }
          res.statusCode = 200;
          res.setHeader('Content-Type', 'text/html;charset=utf-8');
          res.end(data);
        });
        return;
      }
      res.statusCode = 404;
      res.end('Not Found');
      return;
    }

    // Determine content type
    const ext = path.extname(fullPath).toLowerCase();
    const contentTypes = {
      '.html': 'text/html;charset=utf-8',
      '.js': 'application/javascript',
      '.css': 'text/css',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',
      '.woff': 'font/woff',
      '.woff2': 'font/woff2',
      '.ttf': 'font/ttf',
      '.eot': 'application/vnd.ms-fontobject',
    };

    const contentType = contentTypes[ext] || 'application/octet-stream';

    // Read and serve the file
    fs.readFile(fullPath, (err, data) => {
      if (err) {
        res.statusCode = 500;
        res.end('Internal Server Error');
        return;
      }

      res.statusCode = 200;
      res.setHeader('Content-Type', contentType);
      
      // Set cache headers for static assets
      if (ext === '.js' || ext === '.css' || ext === '.png' || ext === '.jpg' || ext === '.jpeg' || ext === '.gif' || ext === '.svg' || ext === '.woff' || ext === '.woff2') {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      } else {
        res.setHeader('Cache-Control', 'no-cache');
      }

      res.end(data);
    });
  });
});

if ("SOCKET" in process.env) {
  const socket = process.env.SOCKET;
  // Socket must be removed before starting server. This action is required. Otherwise server will not start if socket exists.
  if (fs.existsSync(socket)) {
    fs.unlinkSync(socket);
  }
  server.listen(socket, () => {
    fs.chmodSync(socket, 0660);
    console.log(`Listening ${socket}`);
  });
} else if ("PORT" in process.env) {
  const hostname = process.env.INSTANCE_HOST || '0.0.0.0';
  const port = process.env.PORT;
  server.listen(port, hostname, () => {
    console.log(`Listening http://${hostname}:${port}/`);
  });
} else {
  console.error('Error: Either SOCKET or PORT environment variable must be set');
  process.exit(1);
}
