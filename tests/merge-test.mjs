import { JSDOM } from "jsdom";
import vm from "node:vm";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const __dirname = dirname(fileURLToPath(import.meta.url));

// Two windows can hold one session: the web profile and the desktop app share the host store, and
// each browser window keeps its own localStorage. These tests pin the merge behaviour that keeps
// one window from wiping the other, and that stops a stale list from resurrecting a deletion.
const clientSrc = fs.readFileSync(join(__dirname, "..", "lib", "client.js"), "utf8");
const dom = new JSDOM(
  '<!doctype html><html><body><div data-conversation-scroll>'
  + '<p><span id="bodyVal">本轮只做执行前开工卡：梳理目标、验证密钥、不会产生费用或生成文件。</span></p>'
  + '<p><span id="otherVal">这一句来自另一个窗口的批注。</span></p>'
  + '</div></body></html>',
  { url: "http://127.0.0.1:3080/", pretendToBeVisual: true, runScripts: "dangerously" }
);
const window = dom.window, document = window.document;
if (window.Range && !window.Range.prototype.getClientRects) window.Range.prototype.getClientRects = function(){ return [{ left: 10, top: 50, width: 60, height: 16, right: 70, bottom: 66 }]; };
if (window.Range && !window.Range.prototype.getBoundingClientRect) window.Range.prototype.getBoundingClientRect = function(){ return { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 }; };

// scripted host: every request is recorded, `load` answers from the current view, `save` answers
// with whatever the test staged (which is how the other window's deletion reaches this one).
const requests = [];
let hostView = { ok: true, annotations: [], deleted: [] };
let hostSaveReply = { ok: true, annotations: [], deleted: [] };
window.fetch = (url, init) => {
  const body = JSON.parse(init.body);
  requests.push(body);
  const reply = body.op === "load" ? hostView : hostSaveReply;
  return Promise.resolve({ json: () => Promise.resolve(reply) });
};

// this window already has one annotation of its own
window.localStorage.setItem("dsh-inline-comments:sess-1", JSON.stringify([
  { id: 1, so: 0, eo: 6, text: "本轮只做执行前开工卡", comment: "mine", t: 100 }
]));
// the other window added its own while this one was open (so it is NOT in the local list)
hostView = {
  ok: true,
  annotations: [{ id: 2, so: 0, eo: 14, text: "这一句来自另一个窗口的批注", comment: "theirs", t: 200, pre: "", post: "" }],
  deleted: [],
};

let captured = null;
window.__ModuleLoader__ = { load: (def) => { captured = def; } };
vm.runInContext(clientSrc, dom.getInternalVMContext());
const apply = captured.factory(() => { throw new Error("no require"); }).apply;
const ctx = { sessions: { list: { getSnapshot: () => ({ current: "sess-1" }) } }, on: () => {} };
const dispose = apply(ctx);

let pass = 0, fail = 0;
function assert(n, c, d){ if (c) { pass++; console.log("PASS  " + n); } else { fail++; console.log("FAIL  " + n + (d ? "  =>  " + d : "")); } }
function stored(){ return JSON.parse(window.localStorage.getItem("dsh-inline-comments:sess-1") || "[]"); }
function select(s, e, id){
  const b = document.getElementById(id || "bodyVal");
  const sel = window.getSelection();
  sel.removeAllRanges();
  const r = document.createRange();
  r.setStart(b.firstChild, s); r.setEnd(b.firstChild, e);
  sel.addRange(r);
  document.dispatchEvent(new window.MouseEvent("mouseup", { bubbles: true }));
}
function clickAfford(){ document.querySelector(".ic-afford").dispatchEvent(new window.MouseEvent("mousedown", { bubbles: true })); }
function typeSave(t){
  const ta = document.querySelector(".ic-editor textarea");
  ta.value = t; ta.dispatchEvent(new window.Event("input", { bubbles: true }));
  document.querySelector(".ic-editor .ic-btn.primary").click();
}

await new Promise((r) => setTimeout(r, 60));   // let the startup host load settle

console.log("flow1 the other window's annotation is merged in, the local one is not dropped");
assert("startup asked the host for this session", requests.some((rq) => rq.op === "load" && rq.sessionId === "sess-1"), JSON.stringify(requests));
assert("both annotations are present after the merge", stored().length === 2, JSON.stringify(stored()));
assert("the host-echoed annotation kept its id", stored().some((a) => a.id === 2), JSON.stringify(stored()));
assert("the local-only annotation survived", stored().some((a) => a.id === 1), JSON.stringify(stored()));
assert("both badges render", document.querySelectorAll(".ic-badge").length === 2, String(document.querySelectorAll(".ic-badge").length));

console.log("flow2 a new annotation gets a collision-resistant id");
select(0, 6, "otherVal"); clickAfford(); typeSave("new one");
const ids = stored().map((a) => a.id);
assert("three annotations stored", ids.length === 3, JSON.stringify(ids));
assert("new ids are time-derived, not small counters", ids.filter((id) => id > 1e12).length === 1, JSON.stringify(ids));
const created = stored().filter((a) => a.id > 1e12)[0];
assert("the save carried the new annotation", requests.some((rq) => rq.op === "save" && (rq.annotations || []).some((a) => a.id === created.id)), JSON.stringify(requests.slice(-2)));

console.log("flow3 the other window's deletion is adopted and cannot be resurrected");
hostSaveReply = {
  ok: true,
  annotations: [{ id: 1, so: 0, eo: 6, text: "本轮只做执行前开工卡", comment: "mine", t: 100, pre: "", post: "" }, created],
  deleted: [2],
};
select(0, 6); clickAfford(); typeSave("trigger another save");
await new Promise((r) => setTimeout(r, 60));
assert("deleted id is gone locally", !stored().some((a) => a.id === 2), JSON.stringify(stored()));
// The next write must not carry the deleted id back to the host (it was removed before the save that
// follows), otherwise a stale window would resurrect it on the host's tombstone rules.
select(0, 6, "otherVal"); clickAfford(); typeSave("after the deletion");
await new Promise((r) => setTimeout(r, 60));
const lastSave = requests.filter((rq) => rq.op === "save").slice(-1)[0] || {};
assert("the adopted deletion is not re-pushed", !(lastSave.annotations || []).some((a) => a.id === 2), JSON.stringify(lastSave));
assert("later annotations still save", (lastSave.annotations || []).length === 3, JSON.stringify(lastSave));

dispose();
console.log("RESULT merge pass=" + pass + " fail=" + fail);
process.exit(fail ? 1 : 0);
