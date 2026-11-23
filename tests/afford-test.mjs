import { JSDOM } from "jsdom";
import vm from "node:vm";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const __dirname = dirname(fileURLToPath(import.meta.url));

// DSH 0.2.x renders its own selection toolbar ("引用") right where our "＋ 添加注释" pill wants to
// sit, so the pill has to step aside when something foreign already floats there. These tests pin
// that: conversation text must NOT push it away, a floating bar must, and the pill must always end
// up at a normal position (never left parked off-screen).
const clientSrc = fs.readFileSync(join(__dirname, "..", "lib", "client.js"), "utf8");
const dom = new JSDOM(
  '<!doctype html><html><body><div data-conversation-scroll><p><span id="bodyVal">本轮只做执行前开工卡：梳理目标、验证密钥、不会产生费用或生成文件。</span></p></div></body></html>',
  { url: "http://127.0.0.1:3080/", pretendToBeVisual: true, runScripts: "dangerously" }
);
const window = dom.window, document = window.document;
const RECT = { left: 100, top: 300, width: 80, height: 16, right: 180, bottom: 316 };
if (window.Range && !window.Range.prototype.getClientRects) window.Range.prototype.getClientRects = function(){ return [RECT]; };
if (window.Range && !window.Range.prototype.getBoundingClientRect) window.Range.prototype.getBoundingClientRect = function(){ return RECT; };

// What sits under the pill's would-be spot: null (free), a conversation <p>, or a floating bar.
let underPoint = null;   // null | "bar" | an element
document.elementFromPoint = function(x, y){
  if (underPoint === "bar") {
    if (x >= 90 && x <= 250 && y >= 250 && y <= 284) return document.getElementById("native-selection-bar");
    return document.querySelector("[data-conversation-scroll] p");   // content elsewhere
  }
  return underPoint;
};

window.fetch = () => Promise.resolve({ json: () => Promise.resolve({ ok: true, annotations: [], deleted: [] }) });
let captured = null;
window.__ModuleLoader__ = { load: (def) => { captured = def; } };
vm.runInContext(clientSrc, dom.getInternalVMContext());
const apply = captured.factory(() => { throw new Error("no require"); }).apply;
const ctx = { sessions: { list: { getSnapshot: () => ({ current: "sess-1" }) } }, on: () => {}, conversations: {} };
apply(ctx);

let pass = 0, fail = 0;
function assert(n, c, d){ if (c) { pass++; console.log("PASS  " + n); } else { fail++; console.log("FAIL  " + n + (d ? "  =>  " + d : "")); } }
function select(){
  const b = document.getElementById("bodyVal");
  const sel = window.getSelection();
  sel.removeAllRanges();
  const r = document.createRange();
  r.setStart(b.firstChild, 0); r.setEnd(b.firstChild, 6);
  sel.addRange(r);
  document.dispatchEvent(new window.MouseEvent("mouseup", { bubbles: true }));
}
function top(){ const a = document.querySelector(".ic-afford"); return a ? a.style.top : "(none)"; }
function left(){ const a = document.querySelector(".ic-afford"); return a ? a.style.left : "(none)"; }

console.log("flow1 nothing floating above the selection -> default spot");
underPoint = null;
select();
assert("keeps the default 36px offset", top() === "264px", top());
assert("not left parked off-screen", left() !== "-9999px", left());

console.log("flow2 conversation text under the spot is not a blocker");
underPoint = document.querySelector("[data-conversation-scroll] p");
select();
assert("text does not push the pill away", top() === "264px", top());

console.log("flow3 DSH's own floating toolbar pushes the pill up a step");
const bar = document.createElement("div");
bar.id = "native-selection-bar";
bar.style.cssText = "position:fixed;left:90px;top:250px;width:160px;height:34px;";
// jsdom 不做布局，显式给出尺寸：探针要靠"小个子=浮动条"来区分正文
bar.getBoundingClientRect = () => ({ left: 90, top: 250, width: 160, height: 34, right: 250, bottom: 284 });
document.body.appendChild(bar);          // outside [data-conversation-scroll] = a floating UI
underPoint = "bar";
select();
assert("steps up until the bar is cleared", top() === "196px", top());
assert("still lands at a real position", left() === "102px", left());

console.log("flow4 negative control shape: with the probe blind it would overlap (264px)");
document.elementFromPoint = function(){ return null; };
select();
assert("blind probe falls back to the default spot (the overlap this fixes)", top() === "264px", top());

console.log("RESULT afford pass=" + pass + " fail=" + fail);
process.exit(fail ? 1 : 0);
