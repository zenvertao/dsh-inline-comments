import { JSDOM } from "jsdom";
import vm from "node:vm";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const __dirname = dirname(fileURLToPath(import.meta.url));

// Anchoring after a refresh: the stored text alone is ambiguous whenever the same sentence appears in
// more than one place, and a text that changed used to make the highlight vanish with no trace. These
// tests pin the context-scored re-location, the visible "anchor lost" state, and the promise that a
// redraw walks the DOM at most once no matter how many annotations need locating.
const clientSrc = fs.readFileSync(join(__dirname, "..", "lib", "client.js"), "utf8");
const dom = new JSDOM(
  '<!doctype html><html><body><div data-conversation-scroll>'
  + '<p id="p1">开头的背景说明，这个方案可行，接下来看细节。</p>'
  + '<p id="p2">另一个完全不同的段落，这个方案可行，但是要改预算。</p>'
  + '<p id="p3">这段是给新建批注用的句子，方便验证上下文有没有被记下来。</p>'
  + '</div></body></html>',
  { url: "http://127.0.0.1:3080/", pretendToBeVisual: true, runScripts: "dangerously" }
);
const window = dom.window, document = window.document;
if (window.Range && !window.Range.prototype.getClientRects) window.Range.prototype.getClientRects = function(){ return [{ left: 10, top: 50, width: 60, height: 16, right: 70, bottom: 66 }]; };
if (window.Range && !window.Range.prototype.getBoundingClientRect) window.Range.prototype.getBoundingClientRect = function(){ return { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 }; };

// count DOM traversals: the index must be built once per redraw, not once per annotation
let walks = 0;
const realWalk = document.createTreeWalker.bind(document);
document.createTreeWalker = function(){ walks += 1; return realWalk.apply(null, arguments); };

// Post-refresh state: Range nodes are gone, only offsets/text/context remain.
window.localStorage.setItem("dsh-inline-comments:sess-1", JSON.stringify([
  { id: 101, so: 0, eo: 6, text: "这个方案可行", comment: "second one", t: 1, pre: "另一个完全不同的段落，", post: "，但是要改预算。" },
  { id: 102, so: 0, eo: 6, text: "这个方案可行", comment: "stale context", t: 2, pre: "完全对不上的前缀", post: "完全对不上的后缀" },
  { id: 103, so: 0, eo: 4, text: "这段文字已经不存在了", comment: "lost", t: 3, pre: "", post: "" },
  { id: 104, so: 0, eo: 6, text: "这个方案可行", comment: "first one", t: 4, pre: "开头的背景说明，", post: "，接下来看细节。" }
]));

let captured = null;
window.__ModuleLoader__ = { load: (def) => { captured = def; } };
vm.runInContext(clientSrc, dom.getInternalVMContext());
const apply = captured.factory(() => { throw new Error("no require"); }).apply;
const ctx = { sessions: { list: { getSnapshot: () => ({ current: "sess-1" }) } }, on: () => {} };
const dispose = apply(ctx);

let pass = 0, fail = 0;
function assert(n, c, d){ if (c) { pass++; console.log("PASS  " + n); } else { fail++; console.log("FAIL  " + n + (d ? "  =>  " + d : "")); } }
function marksIn(id){ return Array.from(document.querySelectorAll(".ic-hl")).filter((m) => m.closest("p") && m.closest("p").id === id).length; }
function stored(){ return JSON.parse(window.localStorage.getItem("dsh-inline-comments:sess-1") || "[]"); }
function select(s, e, id){
  const b = document.getElementById(id);
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

console.log("flow1 repeated text is disambiguated by the stored context");
// id 101 carries p2's context while 102 (stale context) and 104 (p1's context) belong on p1. Ignoring
// the context would pile all three onto the first occurrence: p1 3 / p2 0.
assert("context puts the second-paragraph annotation on the second paragraph", marksIn("p2") === 1, JSON.stringify({ p1: marksIn("p1"), p2: marksIn("p2") }));
assert("the other two stay on the first paragraph", marksIn("p1") === 2, JSON.stringify({ p1: marksIn("p1"), p2: marksIn("p2") }));

console.log("flow2 a text that changed is visible, not silently dropped");
assert("no highlight for the lost one", Array.from(document.querySelectorAll(".ic-hl")).length === 3, String(document.querySelectorAll(".ic-hl").length));
assert("pill warns about the lost anchor", /⚠/.test(document.querySelector(".ic-pill span:nth-child(2)").textContent || ""), document.querySelector(".ic-pill span:nth-child(2)").textContent);
document.querySelector(".ic-pill").dispatchEvent(new window.MouseEvent("mouseenter", { bubbles: true }));
assert("detail row is tagged", !!document.querySelector(".ic-detail .miss"), "no .miss row");
assert("the lost note is still listed", document.querySelectorAll(".ic-detail .row").length === 4, String(document.querySelectorAll(".ic-detail .row").length));
document.querySelector(".ic-pill").dispatchEvent(new window.MouseEvent("mouseleave", { bubbles: true }));

console.log("flow3 one redraw walks the DOM once, however many annotations need locating");
walks = 0;
window.dispatchEvent(new window.Event("resize"));
assert("exactly one traversal per redraw", walks === 1, "walks=" + walks);

console.log("flow4 new annotations record the surrounding context");
select(5, 11, "p3"); clickAfford(); typeSave("with context");
const created = stored().filter((a) => a.id > 1e12)[0] || {};
assert("selected text captured", created.text === "建批注用的句", JSON.stringify(created.text));
assert("pre context captured", created.pre === "这段是给新", JSON.stringify(created.pre));
assert("post context captured", created.post === "子，方便验证上下文有没有被记下来。", JSON.stringify(created.post));

dispose();
console.log("RESULT anchor pass=" + pass + " fail=" + fail);
process.exit(fail ? 1 : 0);
