import { JSDOM } from "jsdom";
import vm from "node:vm";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const __dirname = dirname(fileURLToPath(import.meta.url));


const clientSrc = fs.readFileSync(join(__dirname, "..", "lib", "client.js"), "utf8");
// conversation scroll starts EMPTY — the annotated text loads later, like an async message load after refresh
const dom = new JSDOM('<!doctype html><html><body><div data-conversation-scroll></div></body></html>', { url: "http://127.0.0.1:3080/", pretendToBeVisual: true, runScripts: "dangerously" });
const window = dom.window, document = window.document;
if (window.Range && !window.Range.prototype.getClientRects) window.Range.prototype.getClientRects = function(){ return [{left:10, top:50, width:60, height:16, right:70, bottom:66}]; };
let captured = null;
window.__ModuleLoader__ = { load: (def) => { captured = def; } };
vm.runInContext(clientSrc, dom.getInternalVMContext());
const apply = captured.factory(() => { throw new Error("no require"); }).apply;

// seeded annotation with Range nodes = {} (post-refresh state)
window.localStorage.setItem("dsh-inline-comments:sess-1", JSON.stringify([
  { id: 1, start: {}, so: 0, end: {}, eo: 6, text: "本轮只做执行", comment: "refresh test" }
]));

const ctx = { sessions: { list: { getSnapshot: () => ({ current: "sess-1" }) } }, on: () => {} };
const dispose = apply(ctx);

let pass = 0, fail = 0;
function assert(n, c, d){ if(c){pass++;console.log("PASS  "+n);}else{fail++;console.log("FAIL  "+n+(d?"  =>  "+d:""));} }

// before the text loads, nothing to attach
assert("no badge before text loads", !document.querySelector(".ic-badge"));

// simulate conversation load: a user message bubble + the annotated text
const scroll = document.querySelector("[data-conversation-scroll]");
const user = document.createElement("div");
user.className = "user message";
user.textContent = "这条是历史用户消息";
const p = document.createElement("p");
const span = document.createElement("span");
span.textContent = "本轮只做执行前开工卡：梳理目标、验证密钥、不会产生费用或生成文件。";
p.appendChild(span);
scroll.appendChild(user);
scroll.appendChild(p);

await new Promise(r => setTimeout(r, 200));  // let MutationObserver + rAF fire

// the historical user message must NOT have cleared the restored annotations
const stored = JSON.parse(window.localStorage.getItem("dsh-inline-comments:sess-1") || "[]");
assert("annotations still in localStorage (no false clear)", stored.length === 1, String(stored.length));
assert("badge re-attached after async load", !!document.querySelector(".ic-badge"), "(none)");
assert("highlight re-attached", document.querySelectorAll(".ic-hl").length > 0, String(document.querySelectorAll(".ic-hl").length));

dispose();
console.log("RESULT refresh-async pass=" + pass + " fail=" + fail);
process.exit(fail ? 1 : 0);
