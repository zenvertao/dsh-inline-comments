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
let captured = null;
window.__ModuleLoader__ = { load: (def) => { captured = def; } };
vm.runInContext(clientSrc, dom.getInternalVMContext());
if (!captured) { console.log("FAIL client did not load"); process.exit(1); }
const applied = captured.factory(() => { throw new Error("no require"); });
const apply = applied.apply;
let curSession = "sess-1";
const ctx = { sessions: { list: { getSnapshot: () => ({ current: curSession }) } }, on: () => {} };
const dispose = apply(ctx);

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
function pillHidden(){ const p = document.querySelector(".ic-pill"); return p && p.style.display === "none"; }
function storedCount(k){ const v = JSON.parse(window.localStorage.getItem("dsh-inline-comments:" + k) || "[]"); return v.length; }
function openDetail(){ document.querySelector(".ic-pill").dispatchEvent(new window.MouseEvent("mouseenter", { bubbles: true })); }
function detailQt(){ const el = document.querySelector(".ic-detail .qt"); return el ? el.textContent : "(no qt)"; }

let pass=0, fail=0;
function assert(name, cond, detail){ if(cond){pass++;console.log("PASS  "+name);}else{fail++;console.log("FAIL  "+name+(detail?"  =>  "+detail:""));} }

console.log("flow1 new annotation -> count 1");
select(0,6); clickAfford(); typeSave("test comment 1");
assert("pill = 1 条注", pillText() === "1 条注", pillText());
assert("stored count = 1", storedCount("sess-1") === 1, String(storedCount("sess-1")));

console.log("flow2 re-annotate SAME text -> edit, count stays 1");
select(0,6); clickAfford(); typeSave("updated comment");
assert("pill still 1 条注", pillText() === "1 条注", pillText());
assert("stored count still 1", storedCount("sess-1") === 1, String(storedCount("sess-1")));
const stored = JSON.parse(window.localStorage.getItem("dsh-inline-comments:sess-1") || "[]");
assert("comment updated", stored[0] && stored[0].comment === "updated comment", stored[0] && stored[0].comment);

console.log("flow3 delete via editor trash -> count 0");
select(0,6); clickAfford();
document.querySelector(".ic-editor .ic-iconbtn").click();
assert("pill hidden after delete", pillHidden(), "display="+(document.querySelector(".ic-pill")&&document.querySelector(".ic-pill").style.display));
assert("stored count 0", storedCount("sess-1") === 0, String(storedCount("sess-1")));

console.log("flow4 new annotation then clearAll via pill x -> count 0");
select(0,6); clickAfford(); typeSave("comment A");
assert("pill = 1 条注 again", pillText() === "1 条注", pillText());
document.querySelector(".ic-pill .x").click();
assert("after x, stored count 0", storedCount("sess-1") === 0, String(storedCount("sess-1")));

console.log("flow6 add two, delete first -> remaining renumbered to 1");
select(0,6); clickAfford(); typeSave("comment A");
select(7,13); clickAfford(); typeSave("comment B");
assert("two annotations", storedCount("sess-1") === 2, String(storedCount("sess-1")));
assert("pill = 2 条注", pillText() === "2 条注", pillText());
select(0,6); clickAfford();   // opens existing A
document.querySelector(".ic-editor .ic-iconbtn").click(); // delete A
assert("one annotation left", storedCount("sess-1") === 1, String(storedCount("sess-1")));
assert("pill = 1 条注 after delete", pillText() === "1 条注", pillText());
openDetail();
assert("detail renumbered to 1", detailQt().indexOf("1。 所选文本：") === 0, detailQt());

console.log("flow5 session keying isolation");
assert("sess-2 store isolated (0)", storedCount("sess-2") === 0, String(storedCount("sess-2")));

console.log("flow7 reverse: invisible char injected on annotate, withdrawn on clear");
let fakeDraft = "", setDraftCalls = [];
ctx.conversation = { input: { shell: function(){ return {
  setDraft: function(v){ setDraftCalls.push(v); fakeDraft = v; },
  state: { getSnapshot: function(){ return { draft: fakeDraft }; } }
}; } } };
// clear any leftover annotation from flow6 (also exercises empty->no-op branch)
if (document.querySelector(".ic-pill .x")) document.querySelector(".ic-pill .x").click();
select(0,6); clickAfford(); typeSave("reverse test");
assert("draft becomes invisible char on annotate", fakeDraft === "\u200b", JSON.stringify(fakeDraft));
document.querySelector(".ic-pill .x").click();
assert("draft withdrawn to empty on clear", fakeDraft === "", JSON.stringify(fakeDraft));

console.log("flow8 send-clean + editor Enter/Shift semantics");
// reset to a clean slate
if (document.querySelector(".ic-pill .x")) document.querySelector(".ic-pill .x").click();
fakeDraft = ""; setDraftCalls = [];

// annotate -> pushDraft injects invisible char
select(0,6); clickAfford(); typeSave("flow8 A");
assert("annotate injects invisible char", fakeDraft === "\u200b", JSON.stringify(fakeDraft));

// send via button -> appends summary to the visible draft (the feature), then clears locally
const sb = document.createElement("button"); sb.textContent = "发送";
document.body.appendChild(sb);
sb.dispatchEvent(new window.MouseEvent("mousedown", { bubbles: true }));
assert("send appends summary to draft", fakeDraft === "[1] 原文：本轮只做执行\n    批注：flow8 A", JSON.stringify(fakeDraft));
assert("send clears annotations locally", storedCount("sess-1") === 0, String(storedCount("sess-1")));
sb.remove();

// editor Enter saves
select(7,13); clickAfford();
let ta8 = document.querySelector(".ic-editor textarea");
ta8.value = "enter-saves"; ta8.dispatchEvent(new window.Event("input", { bubbles: true }));
ta8.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
assert("editor Enter saves", storedCount("sess-1") === 1, String(storedCount("sess-1")));

// editor Shift+Enter does NOT save (newline only)
select(14,20); clickAfford();
ta8 = document.querySelector(".ic-editor textarea");
ta8.value = "shift-newline"; ta8.dispatchEvent(new window.Event("input", { bubbles: true }));
ta8.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Enter", shiftKey: true, bubbles: true }));
assert("editor Shift+Enter does not save", storedCount("sess-1") === 1, String(storedCount("sess-1")));

if (dispose) dispose();
console.log("RESULT pass=" + pass + " fail=" + fail);
process.exit(fail ? 1 : 0);
