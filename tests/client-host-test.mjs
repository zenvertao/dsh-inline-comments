import { JSDOM } from "jsdom";
import vm from "node:vm";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const __dirname = dirname(fileURLToPath(import.meta.url));


const clientSrc = fs.readFileSync(join(__dirname, "..", "lib", "client.js"), "utf8");
const dom = new JSDOM('<!doctype html><html><body><div data-conversation-scroll><p><span id="bodyVal">本轮只做执行前开工卡：梳理目标、验证密钥、不会产生费用或生成文件。</span></p></div></body></html>', { url: "http://127.0.0.1:3080/", pretendToBeVisual: true, runScripts: "dangerously" });
const window = dom.window, document = window.document;
if (window.Range && !window.Range.prototype.getClientRects) window.Range.prototype.getClientRects = function(){ return [{left:10, top:50, width:60, height:16, right:70, bottom:66}]; };
if (window.Range && !window.Range.prototype.getBoundingClientRect) window.Range.prototype.getBoundingClientRect = function(){ return { left:0, top:0, right:0, bottom:0, width:0, height:0 }; };

// Fake host: in-memory store keyed by session id + a fetch mock that implements load/save/clear.
const hostStore = { "sess-1": [{ id: 1, so: 0, eo: 6, text: "本轮只做执行", comment: "from host" }] };
const fetchCalls = [];
window.fetch = (url, opts) => {
  const body = JSON.parse(opts.body);
  fetchCalls.push({ url, op: body.op, sessionId: body.sessionId, annotations: body.annotations });
  const reply = (data) => Promise.resolve({ json: () => Promise.resolve(data) });
  if (body.op === "load") return reply({ ok: true, annotations: hostStore[body.sessionId] || [] });
  if (body.op === "save") {
    if (body.annotations && body.annotations.length) hostStore[body.sessionId] = body.annotations;
    else delete hostStore[body.sessionId];
    return reply({ ok: true });
  }
  if (body.op === "clear") { delete hostStore[body.sessionId]; return reply({ ok: true }); }
  return reply({ ok: false });
};

let captured = null;
window.__ModuleLoader__ = { load: (def) => { captured = def; } };
vm.runInContext(clientSrc, dom.getInternalVMContext());
if (!captured) { console.log("FAIL client did not load"); process.exit(1); }
const apply = captured.factory(() => { throw new Error("no require"); }).apply;

const ctx = { sessions: { list: { getSnapshot: () => ({ current: "sess-1" }) } }, on: () => {} };
const dispose = apply(ctx);

let pass = 0, fail = 0;
function assert(n, c, d){ if(c){pass++;console.log("PASS  "+n);}else{fail++;console.log("FAIL  "+n+(d?"  =>  "+d:""));} }

function select(s, e){
  const b = document.getElementById("bodyVal");
  const sel = window.getSelection();
  sel.removeAllRanges();
  const r = document.createRange();
  r.setStart(b.firstChild, s); r.setEnd(b.firstChild, e);
  sel.addRange(r);
  document.dispatchEvent(new window.MouseEvent("mouseup", { bubbles: true }));
}
function clickAfford(){ var a = document.querySelector(".ic-afford"); a.dispatchEvent(new window.MouseEvent("mousedown", { bubbles: true })); }
function typeSave(t){
  const ta = document.querySelector(".ic-editor textarea");
  ta.value = t; ta.dispatchEvent(new window.Event("input", { bubbles: true }));
  document.querySelector(".ic-editor .ic-btn.primary").click();
}
function pillText(){ const el = document.querySelector(".ic-pill span:nth-child(2)"); return el ? el.textContent : "(none)"; }
function storedCount(k){ const v = JSON.parse(window.localStorage.getItem("dsh-inline-comments:" + k) || "[]"); return v.length; }

(async () => {
  // Phase 1: cross-refresh restore from host (localStorage empty, host seeded)
  await new Promise(r => setTimeout(r, 50));
  assert("host load op issued", fetchCalls.some(c => c.op === "load" && c.sessionId === "sess-1"), JSON.stringify(fetchCalls.map(c=>c.op)));
  assert("pill restored from host (1 条注释)", pillText() === "1 条注释", pillText());
  assert("badge re-attached from host", !!document.querySelector(".ic-badge"));
  assert("localStorage mirrored from host", storedCount("sess-1") === 1, String(storedCount("sess-1")));
  // Phase 1b: opening the editor on a RESTORED annotation must position it (regression: was top-left)
  const badge1 = document.querySelector(".ic-badge");
  assert("badge present to open editor", !!badge1);
  if (badge1) {
    badge1.getBoundingClientRect = function(){ return { left: 100, right: 120, top: 200, bottom: 218, width: 20, height: 18 }; };
    badge1.dispatchEvent(new window.MouseEvent("mousedown", { bubbles: true }));
    const ed = document.querySelector(".ic-editor");
    assert("editor opens on restored annotation", !!ed && ed.style.display === "block", ed && ed.style.display);
    assert("editor anchored to badge rect (right+14, top)", !!ed && ed.style.left === "134px" && ed.style.top === "200px", "left='" + (ed && ed.style.left) + "' top='" + (ed && ed.style.top) + "'");
    // close it again so Phase 2 starts from a clean state
    document.body.dispatchEvent(new window.MouseEvent("mousedown", { bubbles: true }));
  }

  // Phase 2: save mirrors to host
  fetchCalls.length = 0;
  select(7, 13); clickAfford(); typeSave("client comment");
  await new Promise(r => setTimeout(r, 20));
  assert("save op issued to host", fetchCalls.some(c => c.op === "save" && c.sessionId === "sess-1"), JSON.stringify(fetchCalls.map(c=>c.op)));
  assert("host store updated with new comment", (hostStore["sess-1"] || []).some(a => a.comment === "client comment"), JSON.stringify(hostStore["sess-1"]));

  // Phase 3: send clears host
  let fakeDraft = "";
  ctx.conversation = { input: { shell: function(){ return {
    setDraft: function(v){ fakeDraft = v; },
    state: { getSnapshot: function(){ return { draft: fakeDraft }; } }
  }; } } };
  fetchCalls.length = 0;
  const sb = document.createElement("button"); sb.textContent = "发送";
  document.body.appendChild(sb);
  sb.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  await new Promise(r => setTimeout(r, 20));
  assert("clear op issued to host on send", fetchCalls.some(c => c.op === "clear" && c.sessionId === "sess-1"), JSON.stringify(fetchCalls.map(c=>c.op)));
  assert("host store empty after send", !hostStore["sess-1"], JSON.stringify(hostStore["sess-1"]));
  assert("localStorage cleared after send", storedCount("sess-1") === 0, String(storedCount("sess-1")));

  dispose();
  console.log("RESULT client-host pass=" + pass + " fail=" + fail);
  process.exit(fail ? 1 : 0);
})();

