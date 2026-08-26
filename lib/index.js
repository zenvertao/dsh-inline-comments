// dsh-inline-comments — host half. The whole interaction UI lives in the browser half
// (lib/client.js). This node half provides the one piece the browser cannot do on its own:
// cross-refresh persistence. The controlled browser resets localStorage on every refresh, so
// annotations are mirrored to a single JSON file on the host, keyed by session id, over a
// loopback-only HTTP route. The client clears a session's entry right after send, so the file
// never accumulates stale data.
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { readFileSync, writeFileSync, mkdirSync, renameSync, existsSync } from 'node:fs';

export const name = 'inline-comments';
export const inject = ['webServer'];

const ROUTE = '/_dsh/inline-comments/storage';
const DEFAULT_STORAGE_PATH = join(homedir(), '.dsh', 'dsh-inline-comments.json');

// Storage path resolution: explicit plugin config wins, then an env override (used by tests),
// then the default ~/.dsh/dsh-inline-comments.json.
function storagePath(config) {
  const cfg = config && typeof config.storagePath === 'string' && config.storagePath.trim() !== ''
    ? config.storagePath.trim()
    : '';
  return cfg || process.env.DSH_INLINE_COMMENTS_STORAGE || DEFAULT_STORAGE_PATH;
}

function loadStore(file) {
  try {
    if (!existsSync(file)) return {};
    const parsed = JSON.parse(readFileSync(file, 'utf8'));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function writeStore(file, data) {
  try {
    mkdirSync(dirname(file), { recursive: true });
    const tmp = `${file}.tmp-${process.pid}-${Date.now()}`;
    writeFileSync(tmp, JSON.stringify(data), { mode: 0o600 });
    try {
      renameSync(tmp, file);
    } catch {
      // Same-dir rename should not fail; fall back to a direct write as a last resort.
      writeFileSync(file, JSON.stringify(data), { mode: 0o600 });
    }
    return true;
  } catch {
    return false;
  }
}

// Keep only JSON-safe fields; drop any live DOM Range nodes the client may have included.
function normalizeAnns(list) {
  if (!Array.isArray(list)) return [];
  return list
    .filter((a) => a && typeof a === 'object')
    .map((a) => ({
      id: typeof a.id === 'number' ? a.id : 0,
      so: typeof a.so === 'number' ? a.so : 0,
      eo: typeof a.eo === 'number' ? a.eo : 0,
      text: typeof a.text === 'string' ? a.text : '',
      comment: typeof a.comment === 'string' ? a.comment : '',
    }));
}

// Only accept same-origin loopback requests; annotations can carry selected conversation text,
// which must never be reachable from a non-local origin.
function trustedLoopback(req) {
  const address = req.socket && req.socket.remoteAddress;
  if (address !== '127.0.0.1' && address !== '::1' && address !== '::ffff:127.0.0.1') return false;
  const host = req.headers && req.headers.host;
  if (typeof host !== 'string') return false;
  let hostUrl;
  try { hostUrl = new URL(`http://${host}`); } catch { return false; }
  if (hostUrl.hostname !== '127.0.0.1' && hostUrl.hostname !== 'localhost' && hostUrl.hostname !== '[::1]') return false;
  if (req.headers && req.headers['sec-fetch-site'] === 'cross-site') return false;
  const origin = req.headers && req.headers.origin;
  if (origin === undefined) return true;
  try { return new URL(origin).host === hostUrl.host; } catch { return false; }
}

async function readJsonBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 64 * 1024) return undefined;
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return undefined; }
}

function writeJson(res, status, body) {
  try {
    res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'referrer-policy': 'no-referrer' });
    res.end(JSON.stringify(body));
  } catch {
    res.writeHead(500).end();
  }
}

export default function inlineCommentsPlugin(ctx, config) {
  const file = storagePath(config);
  const webServer = ctx && ctx.webServer ? ctx.webServer : null;
  let disposeRoute = () => {};

  if (webServer && typeof webServer.register === 'function') {
    disposeRoute = webServer.register({
      kind: 'exact',
      path: ROUTE,
      handler: async (req, res) => {
        if (!trustedLoopback(req) || req.method !== 'POST') {
          writeJson(res, 405, { ok: false, message: 'loopback POST only' });
          return;
        }
        const body = await readJsonBody(req);
        const op = body && typeof body.op === 'string' ? body.op : '';
        const sessionId = body && typeof body.sessionId === 'string' && body.sessionId !== '' ? body.sessionId : null;

        if (op === 'load') {
          if (!sessionId) { writeJson(res, 200, { ok: true, annotations: [] }); return; }
          const store = loadStore(file);
          writeJson(res, 200, { ok: true, annotations: normalizeAnns(store[sessionId]) });
          return;
        }

        if (op === 'save' || op === 'clear') {
          if (!sessionId) { writeJson(res, 400, { ok: false, message: 'missing sessionId' }); return; }
          const store = loadStore(file);
          if (op === 'clear') {
            delete store[sessionId];
          } else {
            const annotations = normalizeAnns(body.annotations);
            if (annotations.length === 0) delete store[sessionId];
            else store[sessionId] = annotations;
          }
          const ok = writeStore(file, store);
          writeJson(res, ok ? 200 : 500, { ok });
          return;
        }

        writeJson(res, 400, { ok: false, message: 'unknown op' });
      },
    });
  }

  if (ctx && typeof ctx.effect === 'function') {
    ctx.effect(() => () => disposeRoute(), 'dsh-inline-comments cleanup');
  }
}

inlineCommentsPlugin.inject = inject;
export { inlineCommentsPlugin as apply };
