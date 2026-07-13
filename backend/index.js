const http = require('http');
const { exec } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url === '/run') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const json = JSON.parse(body);
        const code = json.code || '';
        const tempFile = path.join(os.tmpdir(), `code_${Date.now()}.js`);
        fs.writeFileSync(tempFile, code);
        exec(`qjs ${tempFile}`, (error, stdout, stderr) => {
          fs.unlinkSync(tempFile);
          let output = '';
          if (stdout) output += stdout;
          if (stderr) output += stderr;
          if (error && !output) output += 'Error: ' + error.message;
          if (!output.trim()) output = '✅ Code executed successfully (no output)';
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ output: output.trim() }));
        });
      } catch (e) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

const PORT = 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
  console.log('QuickJS execution engine is ready.');
});
