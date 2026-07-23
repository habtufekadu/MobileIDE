const http = require('http');
const { exec } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const WORKSPACE_ROOT = path.join(os.homedir(), 'storage', 'shared', 'MobileIDE', 'workspace');
if (!fs.existsSync(WORKSPACE_ROOT)) {
  fs.mkdirSync(WORKSPACE_ROOT, { recursive: true });
  console.log('📁 Workspace created at:', WORKSPACE_ROOT);
}

function safePath(relativePath) {
  const safe = path.normalize(relativePath).replace(/^(\.\.[/\\])+/, '');
  const full = path.join(WORKSPACE_ROOT, safe);
  if (!full.startsWith(WORKSPACE_ROOT)) {
    throw new Error('Path traversal denied');
  }
  return full;
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // =============================================
  // 1. LIST TREE (GET /list-tree)
  // =============================================
  if (req.method === 'GET' && req.url === '/list-tree') {
    exec('git status --porcelain', { cwd: WORKSPACE_ROOT }, (gitErr, stdout, stderr) => {
      const gitStatusMap = {};

      if (!gitErr && stdout) {
        const lines = stdout.split('\n');
        for (const line of lines) {
          if (!line.trim()) continue;
          
          const code = line.substring(0, 2);
          let filePath = line.substring(3).trim();
          
          if (filePath.startsWith('"') && filePath.endsWith('"')) {
            filePath = filePath.slice(1, -1);
          }

          const normalizedPath = filePath.replace(/\\/g, '/');

          if (code.includes('M')) {
            gitStatusMap[normalizedPath] = 'modified';
          } else if (code.includes('??')) {
            gitStatusMap[normalizedPath] = 'untracked';
          }
        }
      }

      try {
        function walkDir(dir, relativePath = '') {
          const entries = fs.readdirSync(dir, { withFileTypes: true });
          const result = [];
          for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            const relPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;
            
            const currentStatus = gitStatusMap[relPath] || null;

            if (entry.isDirectory()) {
              if (entry.name === '.git') continue;

              const children = walkDir(fullPath, relPath);
              
              let folderStatus = currentStatus;
              if (!folderStatus && children.length > 0) {
                const hasModified = children.some(c => c.status === 'modified' || c.status === 'sub-modified');
                const hasUntracked = children.some(c => c.status === 'untracked' || c.status === 'sub-untracked');
                if (hasModified) folderStatus = 'sub-modified';
                else if (hasUntracked) folderStatus = 'sub-untracked';
              }

              result.push({
                name: entry.name,
                type: 'folder',
                path: relPath,
                status: folderStatus,
                children: children
              });
            } else {
              result.push({
                name: entry.name,
                type: 'file',
                path: relPath,
                status: currentStatus
              });
            }
          }
          return result;
        }

        const tree = walkDir(WORKSPACE_ROOT);
        res.writeHead(200);
        res.end(JSON.stringify({ tree }));
      } catch (e) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Failed to list tree' }));
      }
    });
    return;
  }

  // =============================================
  // 2. SAVE FILE (POST /save) - supports nested paths
  // =============================================
  if (req.method === 'POST' && req.url === '/save') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const json = JSON.parse(body);
        let filePath = json.filePath || json.fileName;
        if (!filePath) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'filePath or fileName is required' }));
          return;
        }
        const content = json.content || '';
        const fullPath = safePath(filePath);
        const dir = path.dirname(fullPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`💾 Saved: ${filePath}`);
        res.writeHead(200);
        res.end(JSON.stringify({ success: true, path: filePath }));
      } catch (e) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Invalid JSON or path: ' + e.message }));
      }
    });
    return;
  }

  // =============================================
  // 3. LOAD FILE (GET /load?fileName=xxx)
  // =============================================
  if (req.method === 'GET' && req.url.startsWith('/load')) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const filePath = url.searchParams.get('fileName');
    if (!filePath) {
      res.writeHead(400);
      res.end(JSON.stringify({ error: 'fileName is required' }));
      return;
    }
    const fullPath = safePath(filePath);
    if (!fs.existsSync(fullPath)) {
  // ===== SERVE STATIC FILES (web/ folder) =====
  const staticRoot = path.join(__dirname, "..", "web");
  let requestedPath = req.url;
  if (requestedPath === "/" || requestedPath === "") {
    requestedPath = "/index.html";
  }
  const staticFile = path.join(staticRoot, requestedPath);
  if (staticFile.startsWith(staticRoot) && fs.existsSync(staticFile) && fs.statSync(staticFile).isFile()) {
    const ext = path.extname(staticFile);
    const mime = {
      ".html": "text/html",
      ".js": "application/javascript",
      ".mjs": "application/javascript",
      ".css": "text/css",
      ".json": "application/json",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".svg": "image/svg+xml",
      ".ico": "image/x-icon",
      ".txt": "text/plain",
      ".woff": "font/woff",
      ".woff2": "font/woff2",
      ".ttf": "font/ttf",
      ".eot": "application/vnd.ms-fontobject"
    };
    res.writeHead(200, { "Content-Type": mime[ext] || "application/octet-stream" });
    res.end(fs.readFileSync(staticFile));
    return;
  }
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'File not found' }));
      return;
    }
    try {
      const content = fs.readFileSync(fullPath, 'utf8');
      res.writeHead(200);
      res.end(JSON.stringify({ content }));
    } catch (e) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'Failed to read file' }));
    }
    return;
  }

  // =============================================
  // 4. DELETE (POST /delete)
  // =============================================
  if (req.method === 'POST' && req.url === '/delete') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const json = JSON.parse(body);
        const targetPath = json.path;
        if (!targetPath) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'path is required' }));
          return;
        }
        const fullPath = safePath(targetPath);
        if (!fs.existsSync(fullPath)) {
  // ===== SERVE STATIC FILES (web/ folder) =====
  const staticRoot = path.join(__dirname, "..", "web");
  let requestedPath = req.url;
  if (requestedPath === "/" || requestedPath === "") {
    requestedPath = "/index.html";
  }
  const staticFile = path.join(staticRoot, requestedPath);
  if (staticFile.startsWith(staticRoot) && fs.existsSync(staticFile) && fs.statSync(staticFile).isFile()) {
    const ext = path.extname(staticFile);
    const mime = {
      ".html": "text/html",
      ".js": "application/javascript",
      ".mjs": "application/javascript",
      ".css": "text/css",
      ".json": "application/json",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".svg": "image/svg+xml",
      ".ico": "image/x-icon",
      ".txt": "text/plain",
      ".woff": "font/woff",
      ".woff2": "font/woff2",
      ".ttf": "font/ttf",
      ".eot": "application/vnd.ms-fontobject"
    };
    res.writeHead(200, { "Content-Type": mime[ext] || "application/octet-stream" });
    res.end(fs.readFileSync(staticFile));
    return;
  }
          res.writeHead(404);
          res.end(JSON.stringify({ error: 'File or folder not found' }));
          return;
        }
        fs.rmSync(fullPath, { recursive: true, force: true });
        console.log(`🗑️ Deleted: ${targetPath}`);
        res.writeHead(200);
        res.end(JSON.stringify({ success: true }));
      } catch (e) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Delete failed: ' + e.message }));
      }
    });
    return;
  }

  // =============================================
  // 5. RENAME (POST /rename)
  // =============================================
  if (req.method === 'POST' && req.url === '/rename') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const json = JSON.parse(body);
        const oldPath = json.oldPath;
        const newPath = json.newPath;
        if (!oldPath || !newPath) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'oldPath and newPath are required' }));
          return;
        }
        const fullOld = safePath(oldPath);
        const fullNew = safePath(newPath);
        if (!fs.existsSync(fullOld)) {
  // ===== SERVE STATIC FILES (web/ folder) =====
  const staticRoot = path.join(__dirname, "..", "web");
  let requestedPath = req.url;
  if (requestedPath === "/" || requestedPath === "") {
    requestedPath = "/index.html";
  }
  const staticFile = path.join(staticRoot, requestedPath);
  if (staticFile.startsWith(staticRoot) && fs.existsSync(staticFile) && fs.statSync(staticFile).isFile()) {
    const ext = path.extname(staticFile);
    const mime = {
      ".html": "text/html",
      ".js": "application/javascript",
      ".mjs": "application/javascript",
      ".css": "text/css",
      ".json": "application/json",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".svg": "image/svg+xml",
      ".ico": "image/x-icon",
      ".txt": "text/plain",
      ".woff": "font/woff",
      ".woff2": "font/woff2",
      ".ttf": "font/ttf",
      ".eot": "application/vnd.ms-fontobject"
    };
    res.writeHead(200, { "Content-Type": mime[ext] || "application/octet-stream" });
    res.end(fs.readFileSync(staticFile));
    return;
  }
          res.writeHead(404);
          res.end(JSON.stringify({ error: 'File or folder not found' }));
          return;
        }
        if (fs.existsSync(fullNew)) {
          res.writeHead(409);
          res.end(JSON.stringify({ error: 'Target already exists' }));
          return;
        }
        fs.renameSync(fullOld, fullNew);
        console.log(`✏️ Renamed: ${oldPath} → ${newPath}`);
        res.writeHead(200);
        res.end(JSON.stringify({ success: true }));
      } catch (e) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Rename failed: ' + e.message }));
      }
    });
    return;
  }

  // =============================================
  // 6. CREATE FOLDER (POST /create-folder)
  // =============================================
  if (req.method === 'POST' && req.url === '/create-folder') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const json = JSON.parse(body);
        const folderPath = json.folderPath;
        if (!folderPath) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'folderPath is required' }));
          return;
        }
        const fullPath = safePath(folderPath);
        if (fs.existsSync(fullPath)) {
          res.writeHead(409);
          res.end(JSON.stringify({ error: 'Folder already exists' }));
          return;
        }
        fs.mkdirSync(fullPath, { recursive: true });
        console.log(`📁 Created folder: ${folderPath}`);
        res.writeHead(200);
        res.end(JSON.stringify({ success: true }));
      } catch (e) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Create folder failed: ' + e.message }));
      }
    });
    return;
  }

  // =============================================
  // 7. RUN JAVASCRIPT (POST /run)
  // =============================================
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
          res.writeHead(200);
          res.end(JSON.stringify({ output: output.trim() }));
        });
      } catch (e) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  // ===== SERVE STATIC FILES (web/ folder) =====
  const staticRoot = path.join(__dirname, "..", "web");
  let requestedPath = req.url;
  if (requestedPath === "/" || requestedPath === "") {
    requestedPath = "/index.html";
  }
  const staticFile = path.join(staticRoot, requestedPath);
  if (staticFile.startsWith(staticRoot) && fs.existsSync(staticFile) && fs.statSync(staticFile).isFile()) {
    const ext = path.extname(staticFile);
    const mime = {
      ".html": "text/html",
      ".js": "application/javascript",
      ".mjs": "application/javascript",
      ".css": "text/css",
      ".json": "application/json",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".svg": "image/svg+xml",
      ".ico": "image/x-icon",
      ".txt": "text/plain",
      ".woff": "font/woff",
      ".woff2": "font/woff2",
      ".ttf": "font/ttf",
      ".eot": "application/vnd.ms-fontobject"
    };
    res.writeHead(200, { "Content-Type": mime[ext] || "application/octet-stream" });
    res.end(fs.readFileSync(staticFile));
    return;
  }
  res.writeHead(404);
  res.end('Not found');
});

const PORT = 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
  console.log(`📁 Workspace: ${WORKSPACE_ROOT}`);
  console.log('📂 /list-tree - nested tree (with Git status decoration)');
  console.log('💾 /save - save file (supports nested paths)');
  console.log('📖 /load - load file');
  console.log('🗑️ /delete - delete file/folder');
  console.log('✏️ /rename - rename file/folder');
  console.log('📁 /create-folder - create folder');
  console.log('⚡ /run - execute JavaScript');
});
