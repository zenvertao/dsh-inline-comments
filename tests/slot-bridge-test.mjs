import { JSDOM } from "jsdom";
import vm from "node:vm";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const __dirname = dirname(fileURLToPath(import.meta.url));

// Regression: DSH 0.2.x no longer registers a `conversation.input` service, so ctx.conversation.input
// is undefined and the old getShell() returned null forever — annotations were added to the page but
// never injected into the outgoing message ("批注没跟过去"). The composer now publishes its draft state
// and actions to whoever occupies the `conversation.input.overlay` slot.
//
// This test wires exactly that shape: NO legacy shell, only `slots`. It asserts the bridge occupant is
// registered, renders nothing, takes the send click over (via inputActions.submit) with the annotation
// summary on top of the draft, and keeps the user's own draft body below the divider.

const clientSrc = fs.readFileSync(join(__dirname, "..", "lib", "client.js"), "utf8");
const dom = new JSDOM('<!doctype html><html><body><div data-conversation-scroll><p><span id="bodyVal">本轮只做执行前开工卡：梳理目标、验证密钥、不会产生费用或生成文件。</span></p></div></body></html>', { url: "http://127.0.0.1:3080/", pretendToBeVisual: true, runScripts: "dangerously" });
const window = dom.window, document = window.document;
if (window.Range && !window.Range.prototype.getClientRects) window.Range.prototype.getClientRects = function(){ return [{left:10, top:50, width:60, height:16, right:70, bottom:66}]; };
if (window.Range && !window.Range.prototype.getBoundingClientRect) window.Range.prototype.getBoundingClientRect = function(){ return { left:0, top:0, right:0, bottom:0, width:0, height:0 }; };

// Host store: nothing persisted, and the client's clear-after-send must not blow up.
const fetchOps = [];
window.fetch = (url, opts) => {
  const body = JSON.parse(opts.body);
  fetchOps.push(body.op);
  return Promise.resolve({ json: () => Promise.resolve(body.op === "load" ? { ok: true, annotations: [] } : { ok: true }) });
};

let captured = null;
// A live bridge must never be reported as broken: that console line is what users check to decide
// whether annotations can reach the message at all.
const warns = [];
window.console.warn = function(m){ warns.push(String(m)); };
window.__ModuleLoader__ = { load: (def) => { captured = def; } };
vm.runInContext(clientSrc, dom.getInternalVMContext());
if (!captured) { console.log("FAIL client did not load"); process.exit(1); }
const apply = captured.factory(() => { throw new Error("no require"); }).apply;

// ---- Fake slot system + composer actions (the 0.2.x contract) -----------------------------------
const injectedInto = [];
const occupants = [];
let draft = "";
const submits = [];
const inputActions = {
  setDraft: function(v){ draft = v; },
  insertText: function(){},
  captureInsertion: function(){ return {}; },
  submit: function(){ submits.push(draft); }
};
const slots = {
  inject: function(name, cb){ injectedInto.push(name); cb(); },
  register: function(desc, Component){ occupants.push({ desc: desc, Component: Component }); return function(){}; }
};
const ctx = {
  sessions: { list: { getSnapshot: () => ({ current: "sess-1" }) } },
  on: () => {},
  conversation: {},              // 0.2.x: the `input` sub-service is gone
  slots: slots
};
const dispose = apply(ctx);

// React re-invokes the occupant on every render, which is what refreshes the bridge's cached draft.
function render(){ for (const o of occupants) o.Component({ inputActions: inputActions, sessionId: "sess-1", useInput: (sel) => sel({ draft: draft }) }); }

let pass = 0, fail = 0;
function assert(n, c, d){ if(c){pass++;console.log("PASS  "+n);}else{fail++;console.log("FAIL  "+n+(d?"  =>  "+d:""));} }
function tick(ms){ return new Promise(r => setTimeout(r, ms)); }
function select(s, e){
  const b = document.getElementById("bodyVal");
  const sel = window.getSelection();
  sel.removeAllRanges();
  const r = document.createRange();
  r.setStart(b.firstChild, s); r.setEnd(b.firstChild, e);
  sel.addRange(r);
  document.dispatchEvent(new window.MouseEvent("mouseup", { bubbles: true }));
}
function addAnnotation(text){ select(7, 13); document.querySelector(".ic-afford").dispatchEvent(new window.MouseEvent("mousedown", { bubbles: true })); const ta = document.querySelector(".ic-editor textarea"); ta.value = text; ta.dispatchEvent(new window.Event("input", { bubbles: true })); document.querySelector(".ic-editor .ic-btn.primary").click(); }
function clickSend(label){
  const b = document.createElement("button");
  b.setAttribute("aria-label", label);
  document.body.appendChild(b);
  b.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
}

(async () => {
  assert("precondition: no legacy shell in this ctx", ctx.conversation.input === undefined, JSON.stringify(ctx.conversation));

  // ---- Bridge wiring ---------------------------------------------------------------------------
  assert("plugin injects into conversation.input.overlay", injectedInto.indexOf("conversation.input.overlay") >= 0, JSON.stringify(injectedInto));
  const bridgeEntry = occupants.filter(o => o.desc && o.desc.id === "dsh-inline-comments-bridge")[0];
  assert("bridge occupant registered under its own id", !!bridgeEntry, JSON.stringify(occupants.map(o => o.desc && o.desc.id)));
  if (bridgeEntry) {
    const returned = bridgeEntry.Component({ inputActions: inputActions, sessionId: "sess-1", useInput: (sel) => sel({ draft: draft }) });
    assert("bridge occupant renders nothing", returned === null || returned === undefined, JSON.stringify(returned));
  }

  render();
  await tick(30);
  assert("load op still issued after apply", fetchOps.indexOf("load") >= 0, JSON.stringify(fetchOps));

  // ---- Send-button path: inject, then submit exactly once ---------------------------------------
  addAnnotation("slot path");
  await tick(20);
  assert("draft marker pushed through the bridge", draft === "\u200b", JSON.stringify(draft));

  submits.length = 0;
  let bubbled = 0;
  const bubbleSpy = () => { bubbled += 1; };
  document.body.addEventListener("click", bubbleSpy);
  clickSend("发送消息");
  await tick(20);
  document.body.removeEventListener("click", bubbleSpy);

  assert("send click submits through inputActions exactly once", submits.length === 1, JSON.stringify(submits));
  assert("submit sees the injected summary first", String(submits[0] || "").indexOf("[1] ") === 0, JSON.stringify(String(submits[0]).slice(0, 60)));
  assert("send click does not reach the composer", bubbled === 0, String(bubbled));

  // ---- Enter path -------------------------------------------------------------------------------
  const ce = document.createElement("div");
  ce.setAttribute("data-composer-input", "");
  ce.setAttribute("contenteditable", "true");
  document.body.appendChild(ce);
  render();
  draft = "";
  addAnnotation("enter via bridge");
  await tick(20);
  ce.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
  await tick(20);
  assert("Enter injects the summary through the bridge", draft.indexOf("[1] ") === 0, JSON.stringify(draft.slice(0, 70)));

  // ---- useInput keeps the cached draft in sync, so a user draft survives below the divider ------
  draft = "hello";
  render();
  addAnnotation("second");
  await tick(20);
  submits.length = 0;
  clickSend("发送");
  await tick(20);
  const sent = String(submits[0] || "");
  assert("injected draft keeps the user's body after the divider", sent.indexOf("\n\n---\n\nhello") >= 0, JSON.stringify(sent.slice(0, 120)));
  assert("injection happens once per send", submits.length === 1, JSON.stringify(submits));

  // ---- The startup probe must not cry wolf -------------------------------------------------------
  // apply() probes the composer right away, but the bridge only fills in on the composer's first
  // render. Without the deferred re-check this reports a working bridge as broken.
  await tick(1400);
  assert("no 'composer bridge unavailable' warning while the bridge is live", warns.filter(w => w.indexOf("composer bridge unavailable") >= 0).length === 0, JSON.stringify(warns));

  dispose();
  console.log("RESULT slot-bridge pass=" + pass + " fail=" + fail);
  process.exit(fail ? 1 : 0);
})();
