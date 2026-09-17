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

// Fake composer shell, wired BEFORE apply() so the host-restore path has a shell to push the invisible
// draft marker into. Regression: restored annotations used to leave the draft empty -> DSH keeps the send
// button disabled -> the click never reaches injectBeforeSend ("点发送没反应").
let fakeDraft = "";
// Shell.submit is toggled per phase: absent reproduces a composer we can only inject into (legacy
// fallback), present reproduces current DSH where the plugin takes the send click over.
let shellSubmitEnabled = false;
const submitCalls = [];
const shellObj = {
  setDraft: function(v){ fakeDraft = v; },
  state: { getSnapshot: function(){ return { draft: fakeDraft }; } },
  get submit(){
    return shellSubmitEnabled
      ? function(mode){ submitCalls.push({ mode: mode, draft: fakeDraft }); }
      : undefined;
  }
};
const ctx = {
  sessions: { list: { getSnapshot: () => ({ current: "sess-1" }) } },
  on: () => {},
  conversation: { input: { shell: function(){ return shellObj; } } }
};
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
  assert("pill restored from host (1 条注释)", pillText() === "条注释", pillText());
  assert("badge re-attached from host", !!document.querySelector(".ic-badge"));
  assert("localStorage mirrored from host", storedCount("sess-1") === 1, String(storedCount("sess-1")));
  assert("draft marker pushed after host restore", fakeDraft === "\u200b", JSON.stringify(fakeDraft));
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
  fakeDraft = "";
  select(7, 13); clickAfford(); typeSave("client comment");
  await new Promise(r => setTimeout(r, 20));
  assert("save op issued to host", fetchCalls.some(c => c.op === "save" && c.sessionId === "sess-1"), JSON.stringify(fetchCalls.map(c=>c.op)));
  assert("host store updated with new comment", (hostStore["sess-1"] || []).some(a => a.comment === "client comment"), JSON.stringify(hostStore["sess-1"]));
  assert("saved draft keeps text and marker", fakeDraft === "\u200b", JSON.stringify(fakeDraft));

  // Phase 2b: backstop — marker wiped while annotations persist gets re-injected by the session poll
  fakeDraft = "";
  await new Promise(r => setTimeout(r, 900));
  assert("draft marker re-injected by backstop poll", fakeDraft === "\u200b", JSON.stringify(fakeDraft));

  // Phase 2c: a whitespace-only draft keeps the user's text (marker is appended, not overwritten)
  fakeDraft = "   ";
  window.dispatchEvent(new window.Event("resize"));
  assert("whitespace draft preserved, marker appended", fakeDraft === "   \u200b", JSON.stringify(fakeDraft));

  // Phase 3: send clears host
  fakeDraft = "";
  fetchCalls.length = 0;
  const sb = document.createElement("button"); sb.textContent = "发送";
  document.body.appendChild(sb);
  sb.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  await new Promise(r => setTimeout(r, 20));
  assert("clear op issued to host on send", fetchCalls.some(c => c.op === "clear" && c.sessionId === "sess-1"), JSON.stringify(fetchCalls.map(c=>c.op)));
  assert("host store empty after send", !hostStore["sess-1"], JSON.stringify(hostStore["sess-1"]));
  assert("localStorage cleared after send", storedCount("sess-1") === 0, String(storedCount("sess-1")));
  assert("no shell.submit -> nothing to take over", submitCalls.length === 0, JSON.stringify(submitCalls));

  // Phase 3b: with a submit-capable shell the plugin must take the send click over — inject FIRST,
  // then submit exactly once, and stop the click so the composer's own handler cannot also run.
  // Regression: handing the click back needs a second click because the draft write re-renders the
  // composer mid-click and the button's handler is lost.
  shellSubmitEnabled = true;
  select(7, 13); clickAfford(); typeSave("button path");
  await new Promise(r => setTimeout(r, 20));
  submitCalls.length = 0;
  fakeDraft = "\u200b";
  let bubbled = 0;
  const bubbleSpy = () => { bubbled += 1; };
  document.body.addEventListener("click", bubbleSpy);
  const sb2 = document.createElement("button"); sb2.setAttribute("aria-label", "发送消息");
  document.body.appendChild(sb2);
  sb2.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  await new Promise(r => setTimeout(r, 20));
  document.body.removeEventListener("click", bubbleSpy);
  assert("send click submits exactly once", submitCalls.length === 1, JSON.stringify(submitCalls));
  assert("submit sees the injected summary", String((submitCalls[0] || {}).draft || "").indexOf("[1] ") === 0, JSON.stringify(String((submitCalls[0] || {}).draft).slice(0, 60)));
  assert("submit uses queue mode", (submitCalls[0] || {}).mode === "queue", JSON.stringify((submitCalls[0] || {}).mode));
  assert("send click does not reach the composer", bubbled === 0, String(bubbled));
  shellSubmitEnabled = false;

  // Phase 4: Enter inside the CONTENTEDITABLE composer (current DSH) must inject before submit.
  // Regression: the handler required tagName === "textarea", so DSH's rich-text composer never
  // triggered injection — the annotations stayed in the pill and never reached the message.
  const ce = document.createElement("div");
  ce.setAttribute("data-composer-input", "");
  ce.setAttribute("contenteditable", "true");
  document.body.appendChild(ce);
  fakeDraft = "";
  select(7, 13); clickAfford(); typeSave("enter path");
  await new Promise(r => setTimeout(r, 20));
  assert("contenteditable composer: draft marker pushed", fakeDraft === "\u200b", JSON.stringify(fakeDraft));
  ce.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
  await new Promise(r => setTimeout(r, 20));
  assert("contenteditable composer: Enter injects the summary", fakeDraft.indexOf("[1] ") === 0, JSON.stringify(fakeDraft.slice(0, 70)));
  assert("contenteditable composer: annotations cleared after inject", document.querySelector(".ic-pill").style.display === "none" && !document.querySelector(".ic-badge"), document.querySelector(".ic-pill").style.display);
  // Shift+Enter must stay a newline: no injection, annotations untouched.
  fakeDraft = "";
  select(7, 13); clickAfford(); typeSave("enter path 2");
  await new Promise(r => setTimeout(r, 20));
  fakeDraft = "line";
  ce.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Enter", shiftKey: true, bubbles: true, cancelable: true }));
  await new Promise(r => setTimeout(r, 20));
  assert("contenteditable composer: Shift+Enter does not inject", fakeDraft === "line", JSON.stringify(fakeDraft));

  dispose();
  // Phase 5: dispose() must unhook every document-level listener. A leaked one survives an HMR
  // reload as a zombie instance that still injects on send clicks (and can double-inject).
  assert("dispose removes the plugin DOM", !document.querySelector(".ic-root"), "root still present");
  const draftAfterDispose = fakeDraft;
  const sbDispose = document.createElement("button"); sbDispose.textContent = "发送";
  document.body.appendChild(sbDispose);
  sbDispose.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  await new Promise(r => setTimeout(r, 20));
  assert("dispose unhooks the send-click listener", fakeDraft === draftAfterDispose, "still injected after dispose: " + JSON.stringify(String(fakeDraft).slice(0, 40)));

  console.log("RESULT client-host pass=" + pass + " fail=" + fail);
  process.exit(fail ? 1 : 0);
})();

