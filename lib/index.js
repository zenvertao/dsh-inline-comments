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
      id: typeof a.id === 'number' && Number.isFinite(a.id) ? a.id : 0,
      so: typeof a.so === 'number' ? a.so : 0,
      eo: typeof a.eo === 'number' ? a.eo : 0,
      text: typeof a.text === 'string' ? a.text : '',
      comment: typeof a.comment === 'string' ? a.comment : '',
      // Merge metadata: `t` decides which copy wins when two windows hold the same id, and
      // pre/post carry the surrounding text used to re-anchor a selection after a re-render.
      t: typeof a.t === 'number' && Number.isFinite(a.t) ? a.t : 0,
      pre: typeof a.pre === 'string' ? a.pre.slice(0, 64) : '',
      post: typeof a.post === 'string' ? a.post.slice(0, 64) : '',
    }));
}

// Merge writers instead of replacing them. Two windows can hold the same session (the web profile
// and the desktop app share this file), so a window that loaded before the other added an
// annotation must not be able to wipe it, and a window holding a stale list must not be able to
// resurrect a deletion. Ids are unique per annotation (the client derives them from a timestamp);
// `t` resolves same-id edits; deletions and clears leave timestamps that block older upserts.
const TOMBSTONE_LIMIT = 500;

function readRecord(value) {
  // v1 stored a bare array per session; upgrade it on read.
  if (Array.isArray(value)) return { anns: normalizeAnns(value), del: {}, clearedAt: 0 };
  if (value && typeof value === 'object') {
    const del = {};
    if (value.del && typeof value.del === 'object' && !Array.isArray(value.del)) {
      for (const [key, stamp] of Object.entries(value.del)) {
        const id = Number(key);
        if (Number.isFinite(id) && typeof stamp === 'number' && Number.isFinite(stamp)) del[id] = stamp;
      }
    }
    return {
      anns: normalizeAnns(value.anns),
      del,
      clearedAt: typeof value.clearedAt === 'number' && Number.isFinite(value.clearedAt) ? value.clearedAt : 0,
    };
  }
  return { anns: [], del: {}, clearedAt: 0 };
}

function pruneTombstones(del) {
  const ids = Object.keys(del);
  if (ids.length <= TOMBSTONE_LIMIT) return;
  ids.sort((a, b) => del[a] - del[b]).slice(0, ids.length - TOMBSTONE_LIMIT).forEach((id) => { delete del[id]; });
}

function mergeRecord(stored, incoming, deleted, now) {
  const record = readRecord(stored);
  const floor = record.clearedAt;
  const byId = new Map(record.anns.map((a) => [a.id, a]));
  for (const id of deleted) {
    byId.delete(id);
    record.del[id] = Math.max(record.del[id] || 0, now);
  }
  for (const a of incoming) {
    // Block only what an actual clear or delete beat; `t === 0` is the legacy no-timestamp shape.
    // Strict `<` keeps an annotation created in the same millisecond as a clear alive.
    const tomb = record.del[a.id] || 0;
    if ((floor && a.t < floor) || (tomb && a.t < tomb)) continue;
    const current = byId.get(a.id);
    if (!current || a.t >= current.t) byId.set(a.id, a);
  }
  record.anns = [...byId.values()].sort((x, y) => x.id - y.id);
  pruneTombstones(record.del);
  return record;
}

function recordPayload(record) {
  return { annotations: record.anns, deleted: Object.keys(record.del).map(Number) };
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
          if (!sessionId) { writeJson(res, 200, { ok: true, annotations: [], deleted: [] }); return; }
          const store = loadStore(file);
          writeJson(res, 200, Object.assign({ ok: true }, recordPayload(readRecord(store[sessionId]))));
          return;
        }

        if (op === 'save' || op === 'clear') {
          if (!sessionId) { writeJson(res, 400, { ok: false, message: 'missing sessionId' }); return; }
          const store = loadStore(file);
          const now = Date.now();
          if (op === 'clear') {
            // Keep only the timestamp: a clear must survive a stale window's next save.
            store[sessionId] = { anns: [], del: {}, clearedAt: now };
          } else {
            const deleted = Array.isArray(body.deleted)
              ? body.deleted.filter((n) => typeof n === 'number' && Number.isFinite(n))
              : [];
            const record = mergeRecord(store[sessionId], normalizeAnns(body.annotations), deleted, now);
            if (record.anns.length === 0 && Object.keys(record.del).length === 0 && record.clearedAt === 0) delete store[sessionId];
            else store[sessionId] = record;
          }
          const ok = writeStore(file, store);
          // Hand the merged view back so the writer adopts whatever the other window added.
          writeJson(res, ok ? 200 : 500, Object.assign({ ok }, recordPayload(readRecord(store[sessionId]))));
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
