import plugin, { name, inject, apply } from "../lib/index.js";

let pass = 0, fail = 0;
function assert(n, c, d){ if(c){pass++;console.log("PASS  "+n);}else{fail++;console.log("FAIL  "+n+(d?"  =>  "+d:""));} }

assert("name is inline-comments", name === "inline-comments", String(name));
assert("inject includes webServer", Array.isArray(inject) && inject.includes("webServer"), JSON.stringify(inject));
assert("apply is a function", typeof apply === "function");
assert("default export is a function", typeof plugin === "function");
assert("default.inject matches inject", plugin.inject === inject, JSON.stringify(plugin.inject));

// no webServer -> apply({}) no-ops without throwing
let threw = false;
try { apply({}); } catch(e){ threw = true; }
assert("apply({}) is a no-op without webServer", !threw);

// with a webServer mock -> registers the exact route, returns nothing (no effect hook)
let registered = null;
const webServer = { register: (opts) => { registered = opts; return () => { registered = null; }; } };
threw = false;
try { apply({ webServer }); } catch(e){ threw = true; }
assert("apply with webServer does not throw", !threw);
assert("registers an exact route", !!registered && registered.kind === "exact", JSON.stringify(registered && registered.kind));
assert("route path is /_dsh/inline-comments/storage", !!registered && registered.path === "/_dsh/inline-comments/storage", registered && registered.path);
assert("handler is a function", !!registered && typeof registered.handler === "function");

console.log("RESULT host pass=" + pass + " fail=" + fail);
process.exit(fail ? 1 : 0);

