import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdtempSync, rmSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { apply } from "../lib/index.js";

const dir = mkdtempSync(join(tmpdir(), "dic-storage-"));
const storeFile = join(dir, "anns.json");
process.env.DSH_INLINE_COMMENTS_STORAGE = storeFile;

let pass = 0, fail = 0;
function assert(n, c, d){ if(c){pass++;console.log("PASS  "+n);}else{fail++;console.log("FAIL  "+n+(d?"  =>  "+d:""));} }

// capture the route handler
let handler = null;
apply({ webServer: { register: (opts) => { handler = opts.handler; return () => {}; } } });

function makeReq(body, opts = {}) {
  const chunks = [Buffer.from(JSON.stringify(body))];
  return {
    method: opts.method || "POST",
    socket: { remoteAddress: opts.remoteAddress || "127.0.0.1" },
    headers: Object.assign({ host: "127.0.0.1:3080" }, opts.headers || {}),
    [Symbol.asyncIterator]() {
      let i = 0;
      return { next: () => (i < chunks.length ? Promise.resolve({ value: chunks[i++], done: false }) : Promise.resolve({ done: true })) };
    },
  };
}
function makeRes() {
  return {
    statusCode: 0, headers: {}, body: "",
    writeHead(code, headers){ this.statusCode = code; Object.assign(this.headers, headers || {}); },
    end(payload){ this.body = (payload || "").toString(); },
  };
}
async function call(body, opts) {
  const res = makeRes();
  await handler(makeReq(body, opts), res);
  return { status: res.statusCode, body: JSON.parse(res.body || "{}") };
}

(async () => {
  assert("handler captured", typeof handler === "function");

  // load on empty store
  let r = await call({ op: "load", sessionId: "s1" });
  assert("load empty -> ok + []", r.status === 200 && r.body.ok === true && Array.isArray(r.body.annotations) && r.body.annotations.length === 0, JSON.stringify(r.body));

  // save -> file written
  r = await call({ op: "save", sessionId: "s1", annotations: [{ id: 1, so: 0, eo: 6, text: "hello", comment: "hi" }] });
  assert("save -> ok", r.status === 200 && r.body.ok === true, JSON.stringify(r.body));
  assert("file exists after save", existsSync(storeFile));

  // load returns normalized data
  r = await call({ op: "load", sessionId: "s1" });
  assert("load returns 1 annotation", r.body.annotations.length === 1, JSON.stringify(r.body));
  assert("annotation fields preserved", r.body.annotations[0].text === "hello" && r.body.annotations[0].comment === "hi", JSON.stringify(r.body.annotations[0]));

  // save strips non-JSON-safe fields (DOM nodes etc.)
  await call({ op: "save", sessionId: "s1", annotations: [{ id: 1, so: 0, eo: 6, text: "hello", comment: "hi", start: {}, end: {}, extra: "x" }] });
  r = await call({ op: "load", sessionId: "s1" });
  const a = r.body.annotations[0];
  assert("save strips non-JSON-safe fields", !("start" in a) && !("end" in a) && !("extra" in a), JSON.stringify(a));

  // session isolation
  r = await call({ op: "load", sessionId: "s2" });
  assert("s2 isolated", r.body.annotations.length === 0, JSON.stringify(r.body));

  // clear
  r = await call({ op: "clear", sessionId: "s1" });
  assert("clear -> ok", r.status === 200 && r.body.ok === true, JSON.stringify(r.body));
  r = await call({ op: "load", sessionId: "s1" });
  assert("cleared -> empty", r.body.annotations.length === 0, JSON.stringify(r.body));

  // save merges instead of replacing. Two windows can hold one session (the web profile and the
  // desktop app share this file), so a window that loaded earlier must not wipe a later writer's
  // annotations, and an empty save is a no-op rather than a wipe (wiping is the explicit `clear`).
  await call({ op: "save", sessionId: "s3", annotations: [{ id: 11, text: "a", comment: "mine", t: 100 }] });
  const afterEmpty = await call({ op: "save", sessionId: "s3", annotations: [] });
  assert("empty save is a no-op, not a wipe", afterEmpty.body.annotations.length === 1, JSON.stringify(afterEmpty.body));
  const merged = await call({ op: "save", sessionId: "s3", annotations: [{ id: 12, text: "b", comment: "theirs", t: 200 }] });
  assert("two writers merge", merged.body.annotations.map((a) => a.id).join(",") === "11,12", JSON.stringify(merged.body));
  const edited = await call({ op: "save", sessionId: "s3", annotations: [{ id: 11, text: "a", comment: "edited", t: 300 }] });
  assert("newer edit wins", edited.body.annotations.filter((a) => a.id === 11)[0].comment === "edited", JSON.stringify(edited.body));
  const stale = await call({ op: "save", sessionId: "s3", annotations: [{ id: 11, text: "a", comment: "stale", t: 50 }] });
  assert("older copy ignored", stale.body.annotations.filter((a) => a.id === 11)[0].comment === "edited", JSON.stringify(stale.body));
  const removed = await call({ op: "save", sessionId: "s3", annotations: [{ id: 11, text: "a", comment: "edited", t: 300 }], deleted: [12] });
  assert("explicit delete removes the id", removed.body.annotations.map((a) => a.id).join(",") === "11", JSON.stringify(removed.body));
  const revive = await call({ op: "save", sessionId: "s3", annotations: [{ id: 12, text: "b", comment: "theirs", t: 200 }] });
  assert("stale list cannot resurrect a deletion", revive.body.annotations.map((a) => a.id).join(",") === "11", JSON.stringify(revive.body));
  await call({ op: "clear", sessionId: "s3" });
  const afterClear = await call({ op: "save", sessionId: "s3", annotations: [{ id: 11, text: "a", comment: "edited", t: 300 }] });
  assert("a clear survives a stale save", afterClear.body.annotations.length === 0, JSON.stringify(afterClear.body));
  const fresh = await call({ op: "save", sessionId: "s3", annotations: [{ id: 21, text: "n", comment: "new", t: Date.now() }] });
  assert("fresh annotations after a clear still land", fresh.body.annotations.map((a) => a.id).join(",") === "21", JSON.stringify(fresh.body));

  // v1 stored a bare array per session; reading it must still work and upgrade its shape.
  const rawV1 = JSON.parse(readFileSync(storeFile, "utf8"));
  rawV1.s9 = [{ id: 7, so: 1, eo: 4, text: "old", comment: "v1" }];
  writeFileSync(storeFile, JSON.stringify(rawV1));
  const legacy = await call({ op: "load", sessionId: "s9" });
  assert("v1 array storage still loads", legacy.body.annotations.length === 1 && legacy.body.annotations[0].comment === "v1", JSON.stringify(legacy.body));
  assert("v1 annotation gets a merge timestamp", legacy.body.annotations[0].t === 0, JSON.stringify(legacy.body));

  // security: non-loopback / non-POST / cross-site rejected
  r = await call({ op: "load", sessionId: "s1" }, { remoteAddress: "203.0.113.7" });
  assert("non-loopback rejected (405)", r.status === 405, String(r.status));
  r = await call({ op: "load", sessionId: "s1" }, { method: "GET" });
  assert("non-POST rejected (405)", r.status === 405, String(r.status));
  r = await call({ op: "load", sessionId: "s1" }, { headers: { "sec-fetch-site": "cross-site" } });
  assert("cross-site rejected (405)", r.status === 405, String(r.status));

  // unknown op / missing sessionId
  r = await call({ op: "nope", sessionId: "s1" });
  assert("unknown op rejected (400)", r.status === 400, String(r.status));
  r = await call({ op: "save", annotations: [] });
  assert("save missing sessionId -> 400", r.status === 400, String(r.status));

  rmSync(dir, { recursive: true, force: true });
  console.log("RESULT host-storage pass=" + pass + " fail=" + fail);
  process.exit(fail ? 1 : 0);
})();

