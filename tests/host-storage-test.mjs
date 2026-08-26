import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdtempSync, rmSync, readFileSync, existsSync } from "node:fs";
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

  // save empty array == clear (no residue key in the file)
  await call({ op: "save", sessionId: "s3", annotations: [{ id: 1, text: "x", comment: "y" }] });
  await call({ op: "save", sessionId: "s3", annotations: [] });
  const raw = JSON.parse(readFileSync(storeFile, "utf8"));
  assert("save empty removes key (no residue)", !("s3" in raw), JSON.stringify(raw));

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

