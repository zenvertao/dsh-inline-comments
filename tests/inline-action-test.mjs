import { JSDOM } from "jsdom";
import vm from "node:vm";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const __dirname = dirname(fileURLToPath(import.meta.url));

// DSH 0.2.x renders its text-selection surface as [data-text-interaction-surface] and hosts one
// keyed action there ("引用"). We append our own button to that surface so both actions sit in one
// row; when the surface is absent the floating pill must still appear (old DSH, or a selection
// outside an eligible text region).
const clientSrc = fs.readFileSync(join(__dirname, "..", "lib", "client.js"), "utf8");
const dom = new JSDOM(
  '<!doctype html><html><body><div data-conversation-scroll><p><span id="bodyVal">本轮只做执行前开工卡：梳理目标、验证密钥、不会产生费用或生成文件。</span></p></div></body></html>',
  { url: "http://127.0.0.1:3080/", pretendToBeVisual: true, runScripts: "dangerously" }
);
const window = dom.window, document = window.document;
const RECT = { left: 100, top: 300, width: 80, height: 16, right: 180, bottom: 316 };
if (window.Range && !window.Range.prototype.getClientRects) window.Range.prototype.getClientRects = function(){ return [RECT]; };
if (window.Range && !window.Range.prototype.getBoundingClientRect) window.Range.prototype.getBoundingClientRect = function(){ return RECT; };
window.fetch = () => Promise.resolve({ json: () => Promise.resolve({ ok: true, annotations: [], deleted: [] }) });

let captured = null;
window.__ModuleLoader__ = { load: (def) => { captured = def; } };
vm.runInContext(clientSrc, dom.getInternalVMContext());
const apply = captured.factory(() => { throw new Error("no require"); }).apply;
const ctx = { sessions: { list: { getSnapshot: () => ({ current: "sess-1" }) } }, on: () => {} };
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
function pill(){ const a = document.querySelector(".ic-afford"); return a ? a.style.display : "(none)"; }
function inline(){ return document.querySelector("[data-ic-inline-action]"); }

console.log("flow1 no official surface -> the floating pill is used (fallback)");
select();
assert("pill visible without a surface", pill() !== "none", pill());
assert("no inline action injected", !inline(), String(!!inline()));

console.log("flow2 official surface present -> our action joins it and the pill hides");
const surface = document.createElement("div");
surface.setAttribute("data-text-interaction-surface", "");
const quote = document.createElement("button");
quote.type = "button"; quote.textContent = "引用";
surface.appendChild(quote);
document.body.appendChild(surface);        // outside [data-conversation-scroll]
select();
const btn = inline();
assert("inline action injected", !!btn, "(missing)");
assert("it lives inside the official surface", btn && btn.parentNode === surface, btn ? btn.parentNode && btn.parentNode.tagName : "(none)");
const kids = Array.from(surface.children).map((x) => x.getAttribute("data-ic-inline-action") !== null ? "ours" : x.textContent);
assert("it sits next to the quote action", JSON.stringify(kids) === JSON.stringify(["引用", "ours"]), JSON.stringify(kids));
assert("floating pill hidden while the surface hosts us", pill() === "none" || pill() === "(none)", pill());
assert("label reads like an action", btn && btn.textContent.indexOf("添加注释") >= 0, btn && btn.textContent);

console.log("flow3 clicking it opens the editor for the current selection");
btn.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
const editor = document.querySelector(".ic-editor");
assert("editor opened", !!editor && editor.style.display === "block", editor && editor.style.display);
assert("editor quotes the selected text", document.querySelector(".ic-editor .quote").textContent === "本轮只做执行", document.querySelector(".ic-editor .quote").textContent);

console.log("flow4 surface gone -> back to the pill, no stray button left");
surface.remove();
window.getSelection().removeAllRanges();
document.dispatchEvent(new window.MouseEvent("mouseup", { bubbles: true }));
select();
assert("pill returns", pill() !== "none", pill());
assert("the injected button went with the surface", !document.querySelector("[data-ic-inline-action]"), String(!!document.querySelector("[data-ic-inline-action]")));

console.log("RESULT inline-action pass=" + pass + " fail=" + fail);
process.exit(fail ? 1 : 0);
