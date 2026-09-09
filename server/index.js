/**
 * SciTech Learning — lightweight API server (zero dependencies)
 *
 * Serves:
 *   - REST API under /api  (worksheets + worksheet submissions, JSON file persistence)
 *   - Static files from dist/ (production mode) so ONE server can host
 *     both the app and the API on the same port for the whole LAN.
 *
 * Run:  node server/index.js            (API on :3001)
 *   or PORT=5173 node server/index.js   (API + static dist/ on :5173)
 *
 * Data file: server/data.json (auto-created, git-ignorable)
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const envPort = Number(process.env.PORT);
const PORT = Number.isFinite(envPort) && envPort > 0 ? envPort : 3001;
const DATA_FILE = path.join(__dirname, 'data.json');
const DIST_DIR = path.join(__dirname, '..', 'dist');

// ---------- tiny JSON-file store ----------
function loadData() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (e) {
    return { worksheets: [], submissions: [] };
  }
}

function saveData(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Failed to write data file:', e.message);
  }
}

let db = loadData();
// Stash in-flight writes; keeps id allocation monotonic across restarts
let nextWorksheetId = db.worksheets.reduce((m, w) => Math.max(m, w.id), 0) + 1;
let nextSubmissionId = db.submissions.reduce((m, s) => Math.max(m, s.id), 0) + 1;

// ---------- helpers ----------
function sendJson(res, status, body) {
  const json = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'no-store',
  });
  res.end(json);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => {
      raw += chunk;
      if (raw.length > 5 * 1024 * 1024) { // 5MB cap (worksheet images are base64)
        reject(new Error('Payload too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      try { resolve(raw ? JSON.parse(raw) : {}); }
      catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

function serveStatic(req, res) {
  const urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let filePath = path.normalize(path.join(DIST_DIR, urlPath));
  if (!filePath.startsWith(DIST_DIR)) { res.writeHead(403); res.end(); return; }
  if (urlPath === '/' || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(DIST_DIR, 'index.html'); // SPA fallback
  }
  if (!fs.existsSync(filePath)) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('dist/ not built yet — run: npm run build');
    return;
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
}

// ---------- API routes ----------
const routes = [
  ['GET', /^\/api\/worksheets$/, (req, res) => sendJson(res, 200, db.worksheets)],
  ['POST', /^\/api\/worksheets$/, async (req, res) => {
    const body = await readBody(req);
    const worksheet = { ...body, id: nextWorksheetId++ };
    db.worksheets.unshift(worksheet);
    saveData(db);
    sendJson(res, 201, worksheet);
  }],
  ['PUT', /^\/api\/worksheets\/(\d+)$/, async (req, res, m) => {
    const id = Number(m[1]);
    const body = await readBody(req);
    const idx = db.worksheets.findIndex(w => w.id === id);
    if (idx === -1) return sendJson(res, 404, { error: 'not found' });
    db.worksheets[idx] = { ...db.worksheets[idx], ...body, id };
    saveData(db);
    sendJson(res, 200, db.worksheets[idx]);
  }],
  ['DELETE', /^\/api\/worksheets\/(\d+)$/, (req, res, m) => {
    const id = Number(m[1]);
    const before = db.worksheets.length;
    db.worksheets = db.worksheets.filter(w => w.id !== id);
    // Keep data consistent: drop submissions of a deleted worksheet
    db.submissions = db.submissions.filter(s => s.worksheet_id !== id);
    saveData(db);
    sendJson(res, 200, { deleted: before - db.worksheets.length });
  }],
  ['GET', /^\/api\/submissions$/, (req, res) => sendJson(res, 200, db.submissions)],
  ['POST', /^\/api\/submissions$/, async (req, res) => {
    const body = await readBody(req);
    // One submission per (worksheet, student): replace on re-submit
    db.submissions = db.submissions.filter(
      s => !(s.worksheet_id === body.worksheet_id && s.student_id === body.student_id)
    );
    const submission = { ...body, id: nextSubmissionId++ };
    db.submissions.unshift(submission);
    saveData(db);
    sendJson(res, 201, submission);
  }],
  ['PUT', /^\/api\/submissions\/(\d+)$/, async (req, res, m) => {
    const id = Number(m[1]);
    const body = await readBody(req);
    const idx = db.submissions.findIndex(s => s.id === id);
    if (idx === -1) return sendJson(res, 404, { error: 'not found' });
    db.submissions[idx] = { ...db.submissions[idx], ...body, id };
    saveData(db);
    sendJson(res, 200, db.submissions[idx]);
  }],
];

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    return res.end();
  }
  for (const [method, pattern, handler] of routes) {
    if (req.method === method) {
      const m = req.url.match(pattern);
      if (m) {
        try { await handler(req, res, m); }
        catch (e) { sendJson(res, 400, { error: e.message }); }
        return;
      }
    }
  }
  if (req.url.startsWith('/api/')) return sendJson(res, 404, { error: 'unknown api route' });
  serveStatic(req, res);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`SciTech API server listening on http://0.0.0.0:${PORT}`);
  console.log(`  data file: ${DATA_FILE}`);
});
