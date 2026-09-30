window.__ModuleLoader__.load({
	id: "dsh-inline-comments",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

		var inject = ["sessions", "conversation", "locale"];
		var NS = "dsh-inline-comments:";
		var LOCALE_NS = "inline-comments";
		var IC_STR = {
			zh: {
				afford: "添加注释", placeholder: "添加可选评论…（Shift+回车换行）", trash: "删除注释",
				save: "保存", cancel: "取消", pill: "条注释",
				detailHead: "{n} 条注释 · 详情", detailQt: "{i}。 所选文本：{text}",
				detailCm: "用户评论：{comment}", noComment: "(无评论)", delete: "删除",
				origLabel: "原文", commentLabel: "批注",
				lostTip: "有 {n} 条批注的原文已变化，高亮找不到位置（批注内容仍在）", missTag: "原文已变"
			},
			en: {
				afford: "Add comment", placeholder: "Add optional comment… (Shift+Enter for a new line)", trash: "Delete comment",
				save: "Save", cancel: "Cancel", pill: "notes",
				detailHead: "{n} comments · details", detailQt: "{i}. Selected: {text}",
				detailCm: "Comment: {comment}", noComment: "(none)", delete: "Delete",
				origLabel: "Original", commentLabel: "Comment",
				lostTip: "{n} comment(s) lost their anchor because the text changed (the note itself is kept)", missTag: "anchor lost"
			}
		};

		// Overlay root. z-index 80 sits above message content and the layout chrome (DSH keeps those at
		// <=60) but below DSH's own floating layers, which start at 100 and reach 1100 — so a badge can
		// never cover one of DSH's panels (e.g. the background-jobs menu). The per-element z-index values
		// below only order our own children inside this stacking context.
		var CSS = ".ic-root{position:fixed;inset:0;pointer-events:none;z-index:80;}"
			+ ".ic-hl{position:absolute;background:color-mix(in srgb,var(--dsw-alias-state-business-primary,#3b6fff) 16%,transparent);border-radius:3px;pointer-events:none;}"
			+ ".ic-badge{position:absolute;pointer-events:auto;z-index:6;min-width:22px;height:22px;padding:0;border-radius:999px!important;corner-shape:round;background:var(--dsw-alias-state-business-primary,#3b6fff);color:#fff;font:700 11px/19px -apple-system,system-ui,sans-serif;display:grid;place-items:center;cursor:pointer;border:1.5px solid rgba(255,255,255,.95);box-sizing:border-box;box-shadow:0 2px 5px rgba(0,0,0,.28);}"
			+ ".ic-afford{position:absolute;pointer-events:auto;z-index:6;display:flex;align-items:center;gap:5px;background:var(--dsw-alias-bg-layer-3,#fff);color:var(--dsw-alias-state-business-primary,#3b6fff);border:1px solid var(--dsw-alias-border-l2,#e2e5ec);border-radius:18px;padding:5px 11px;font:600 12px -apple-system,system-ui,sans-serif;cursor:pointer;box-shadow:var(--dsw-shadow-lv2,0 3px 10px rgba(0,0,0,.14));white-space:nowrap;}"
			+ ".ic-afford .plus{font-size:13px;}"
			+ ".ic-editor{position:absolute;z-index:41;width:min(320px,calc(100vw - 16px));background:var(--dsw-alias-bg-layer-3,#fff);color:var(--dsw-alias-label-primary,#111);border:1px solid var(--dsw-alias-border-l2,#e2e5ec);border-radius:14px;box-shadow:var(--dsw-shadow-lv3,0 12px 34px rgba(0,0,0,.22));padding:12px;pointer-events:auto;box-sizing:border-box;}"
			+ ".ic-editor .quote{margin:6px 0;padding:6px 9px;background:color-mix(in srgb,var(--dsw-alias-state-business-primary,#3b6fff) 8%,transparent);border-left:3px solid var(--dsw-alias-state-business-primary,#3b6fff);border-radius:6px;font-size:13px;color:var(--dsw-alias-label-primary,#111);line-height:1.5;max-height:72px;overflow:auto;}"
			+ ".ic-editor textarea{width:100%;border:1px solid var(--dsw-alias-border-l2,#e2e5ec);border-radius:8px;background:var(--dsw-specific-input-major,#fff);color:var(--dsw-alias-label-primary,#111);padding:8px 10px;font-size:13px;resize:none;min-height:48px;overflow-y:hidden;outline:none;font-family:inherit;box-sizing:border-box;}"
			+ ".ic-editor textarea::placeholder{color:var(--dsw-alias-label-tertiary,#a0a6ad);}"
			+ ".ic-editor textarea:focus{border-color:var(--dsw-alias-state-business-primary,#3b6fff);}"
			+ ".ic-efoot{display:flex;align-items:center;gap:8px;margin-top:9px;}"
			+ ".ic-efoot .sp{flex:1;}"
			+ ".ic-iconbtn{border:none;background:none;color:var(--dsw-alias-label-tertiary,#8a9096);cursor:pointer;padding:5px;border-radius:6px;display:inline-flex;align-items:center;justify-content:center;}"
			+ ".ic-iconbtn:hover{color:var(--dsw-alias-label-primary,#111);}"
			+ ".ic-btn{border:1px solid var(--dsw-alias-border-l2,#e2e5ec);background:var(--dsw-alias-button-elevated-fill,#fff);color:var(--dsw-alias-label-primary,#111);border-radius:10px;padding:6px 14px;font:13px -apple-system,system-ui,sans-serif;cursor:pointer;}"
			+ ".ic-btn.primary{background:var(--dsw-alias-state-business-primary,#3b6fff);color:var(--dsw-alias-label-primary-foreground,#fff);border-color:transparent;}"
			+ ".ic-btn.primary.muted{opacity:.5;cursor:default;}.ic-btn.primary:disabled{opacity:.5;cursor:default;}"
			+ ".ic-detail{position:absolute;z-index:31;width:min(340px,calc(100vw - 16px));background:var(--dsw-alias-bg-layer-3,#fff);color:var(--dsw-alias-label-primary,#111);border:1px solid var(--dsw-alias-border-l2,#e2e5ec);border-radius:12px;box-shadow:var(--dsw-shadow-lv3,0 12px 30px rgba(0,0,0,.18));padding:8px;pointer-events:auto;}"
			+ ".ic-detail .dhead{font-size:11px;color:var(--dsw-alias-label-tertiary,#8a9096);font-weight:700;padding:4px 6px 6px;}"
			+ ".ic-detail .row{display:flex;gap:8px;padding:8px 6px;border-bottom:1px solid var(--dsw-alias-border-l2,#eef0f3);cursor:pointer;border-radius:7px;align-items:center;}"
			+ ".ic-detail .row:last-child{border-bottom:none;}"
			+ ".ic-detail .meta{flex:1;min-width:0;}"
			+ ".ic-detail .qt{font-size:12px;color:var(--dsw-alias-label-tertiary,#8a9096);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}"
			+ ".ic-detail .cm{font-size:13px;color:var(--dsw-alias-label-primary,#111);line-height:1.4;}"
			+ ".ic-detail .del{flex:0 0 auto;color:var(--dsw-alias-label-tertiary,#8a9096);cursor:pointer;font-size:13px;padding:0 4px;}"
			+ ".ic-pill{position:absolute;z-index:32;display:inline-flex;align-items:center;gap:7px;border:1px solid var(--dsw-alias-border-l2,#e2e5ec);border-radius:20px;padding:5px 13px;font:12px -apple-system,system-ui,sans-serif;color:var(--dsw-alias-label-primary,#111);background:var(--dsw-alias-bg-layer-3,#fff);cursor:pointer;box-shadow:var(--dsw-shadow-lv2,0 2px 8px rgba(0,0,0,.08));pointer-events:auto;}"
			+ ".ic-pill .dot{width:16px;height:16px;border-radius:50%!important;corner-shape:round;box-sizing:border-box;background:var(--dsw-alias-state-business-primary,#3b6fff);color:#fff;font:700 9px/16px sans-serif;display:grid;place-items:center;flex:none;}"
			+ ".ic-pill .x{position:absolute;right:5px;top:50%;transform:translateY(-50%);width:16px;height:16px;border-radius:50%!important;corner-shape:round;background:#d1d5db;color:#333;font:700 12px/16px -apple-system,system-ui,sans-serif;display:grid;place-items:center;cursor:pointer;opacity:0;transition:opacity .15s;}"
			+ ".ic-pill:hover .x{opacity:1;}"
			+ ".ic-detail .miss{margin-left:6px;font-size:11px;color:#d29b2a;}"
			+ "[data-conversation-scroll] summary{-webkit-user-select:text!important;user-select:text!important;}";

		function apply(ctx) {
			if (typeof window === "undefined" || !document.body) return function(){};
			document.querySelectorAll(".ic-root").forEach(function(el){ el.remove(); });

			// locale: register a zh/en dictionary and bind a live translate function (fallback to zh).
			var t, localeDispose = null;
			if (ctx.locale && ctx.locale.register && ctx.locale.bind){
				try { localeDispose = ctx.locale.register(LOCALE_NS, IC_STR); } catch(e){}
				t = ctx.locale.bind(LOCALE_NS);
			} else {
				t = function(key, params){
					var s = IC_STR.zh[key] || key;
					if (params) s = s.replace(/\{(\w+)\}/g, function(_, name){ return name in params ? String(params[name]) : _; });
					return s;
				};
			}

			// ==== Session & composer bridge ====
			// DSH keeps moving this bridge between releases, so it is probed through several paths instead of
			// one: 0.1.7 puts the active session on the conversation DOM ("data-conversation-session", which
			// the host itself resolves with closest()), 0.1.5 and earlier expose it through the sessions list
			// store. Prefer the DOM, fall back to the store. Anything that still cannot be resolved is
			// reported (see probe()) rather than failing silently: a no-op send path looks like a broken
			// plugin, which is exactly the bug this probe exists to make loud.
			function sessionIdSource(){
				try {
					var el = document.querySelector("[data-conversation-session]");
					var domId = el && el.getAttribute ? el.getAttribute("data-conversation-session") : null;
					if (typeof domId === "string" && domId) return { id: domId, via: "dom" };
				} catch(e){}
				try {
					var snap = (ctx.sessions && ctx.sessions.list && ctx.sessions.list.getSnapshot) ? ctx.sessions.list.getSnapshot() : null;
					var cur = snap && (snap.current || snap.currentId || snap.active);
					if (typeof cur === "string" && cur) return { id: cur, via: "store" };
				} catch(e){}
				return { id: null, via: "none" };
			}
			var sessionId = function(){ return sessionIdSource().id; };
			function getShell(){
				try {
					var hub = ctx.conversation && ctx.conversation.input;
					var sid = sessionId();
					if (!hub || !sid) return null;
					return hub.shell ? hub.shell(sid) : null;
				} catch(e){ return null; }
			}
			// ==== Capability probe (low-coupling rule) ====
			// Warn once per capability instead of silently degrading, so a DSH release that moves an API
			// shows up as one clear console line instead of "annotations can be added but never sent".
			var warned = {};
			function warnOnce(key, message){
				if (warned[key]) return;
				warned[key] = true;
				try { if (window.console && window.console.warn) window.console.warn("[dsh-inline-comments] " + message); } catch(e){}
			}
			function probe(){
				var sid = sessionIdSource();
				if (!sid.id) warnOnce("sid", "no active session id found ([data-conversation-session] and the sessions store both came back empty) — annotations stay in this page only.");
				var shell = getShell();
				if (!shell){ warnOnce("shell", "composer bridge unavailable (ctx.conversation.input.shell returned nothing) — annotations can be added but cannot be injected into the draft on send."); return; }
				if (typeof shell.setDraft !== "function") warnOnce("setDraft", "composer shell has no setDraft() — draft injection is disabled.");
				if (typeof shell.submit !== "function") warnOnce("submit", "composer shell has no submit() — the send button falls back to the composer's own handler.");
				if (!(shell.state && shell.state.getSnapshot)) warnOnce("state", "composer shell exposes no state.getSnapshot() — the draft is read as empty.");
			}
			// Trick: keep the draft non-empty with an invisible char so the send button lights up,
			// while the visible draft stays empty. The annotation summary is appended to the draft at send time (injectBeforeSend).
			// Current draft text as the composer's published state sees it ("" when the shell is absent).
			function currentDraft(shell){
				try { return (shell && shell.state && shell.state.getSnapshot) ? (shell.state.getSnapshot().draft || "") : ""; } catch(e){ return ""; }
			}
			function pushDraft(){
				try {
					var shell = getShell();
					if (!shell || !shell.setDraft) return;
					var cur = currentDraft(shell);
					if (anns.length){
						// Trick: keep the draft non-empty with an invisible char so the send button lights up,
						// while the visible draft stays empty. The annotation summary is appended to the draft at send time (injectBeforeSend).
						// Append instead of overwrite so a whitespace-only draft keeps the user's text; the guard keeps it idempotent.
						if (!cur.trim() && cur.indexOf("\u200b") < 0){
							shell.setDraft(cur + "\u200b");
						}
					} else {
						// Reverse: withdraw the injected invisible char so the input is truly empty again.
						var next = cur.replace(/\u200b/g, "");
						if (next !== cur) shell.setDraft(next);
					}
				} catch(e){}
			}
			// Right before send: append the annotation summary to the draft (visible body — this is the
			// feature), then clear annotations. Shift+Enter never reaches here (guarded in onComposerSubmit).
			function injectBeforeSend(){
				try {
					if (!anns.length) return;
					var shell = getShell();
					if (!shell || !shell.setDraft){ probe(); return; }   // nothing can be injected: say why, loudly
					var summary = anns.map(function(a, i){ return "[" + (i + 1) + "] " + t("origLabel") + "：" + a.text + "\n    " + t("commentLabel") + "：" + (a.comment || t("noComment")); }).join("\n");
					var cur = currentDraft(shell).replace(/\u200b/g, "").trim();
					// annotations first, then a "---" divider, then the user's draft body
					shell.setDraft(cur ? summary + "\n\n---\n\n" + cur : summary);
					clearLocalOnly();
				} catch(e){}
			}
			// ==== Persistence ====
			var skey = function(){ return NS + (sessionId() || "default"); };
			var load = function(){ try { var v = JSON.parse(localStorage.getItem(skey()) || "[]"); if(!Array.isArray(v)) return []; v.forEach(function(a){ if(!a.comment && a.comments && a.comments.length) a.comment = a.comments[a.comments.length-1].text; }); return v; } catch(e){ return []; } };
			// Ids must be unique across windows: the web profile and the desktop app write to the same
			// host store, so a per-window counter would make two different annotations collide and one
			// would silently win the merge. Derive them from the clock plus a small random suffix.
			function newId(){ return Date.now() * 1000 + Math.floor(Math.random() * 1000); }
			function stamp(a){ return { id: a.id, so: a.so, eo: a.eo, text: a.text, comment: a.comment, t: a.t || 0, pre: a.pre || "", post: a.post || "" }; }
			function cleanAnns(a){ return a.map(stamp); }
			var save = function(a){
				var clean = cleanAnns(a);
				var present = {};
				clean.forEach(function(x){ present[x.id] = 1; });
				var deleted = Object.keys(syncedIds).map(Number).filter(function(id){ return !present[id]; });
				clean.forEach(function(x){ syncedIds[x.id] = 1; });
				deleted.forEach(function(id){ delete syncedIds[id]; });
				try { localStorage.setItem(skey(), JSON.stringify(clean)); } catch(e){}
				saveToHost(clean, deleted);
				pushDraft();
			};
			// ==== Cross-refresh persistence (host JSON file) ====
			// The controlled browser resets localStorage on refresh, so the durable store lives on the
			// host side (a single JSON file keyed by session id, served over a loopback-only HTTP route).
			// localStorage stays as a fast same-page mirror; every mutation is mirrored to the host, and the
			// host entry is cleared after send. The host merges instead of replacing, so two open windows
			// cannot overwrite each other; deletions are reported explicitly. All host traffic is
			// best-effort: if fetch is unavailable (e.g. jsdom tests) the feature degrades to
			// localStorage-only.
			var HOST_ROUTE = "/_dsh/inline-comments/storage";
			var storeVersion = 0;
			// Ids the host has already been told about, so a removal can be reported as a deletion
			// instead of being inferred from an absent list (which a stale window cannot distinguish).
			var syncedIds = {};
			function hasFetch(){ return typeof fetch === "function"; }
			function hostRequest(op, sid, annotations, deleted){
				if (!hasFetch()) return Promise.resolve(null);
				var body = { op: op, sessionId: sid || null };
				if (annotations !== undefined) body.annotations = annotations;
				if (deleted !== undefined && deleted.length) body.deleted = deleted;
				return fetch(HOST_ROUTE, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })
					.then(function(res){ return res.json(); })
					.catch(function(){ return null; });
			}
			// Fold the host's authoritative view into the local one: union by id, keep the newer copy,
			// honor host-side deletions, and never drop a local-only annotation (it is pushed next save).
			function adoptHost(payload){
				if (!payload || !payload.ok) return;
				var gone = Array.isArray(payload.deleted) ? payload.deleted : [];
				var hostList = Array.isArray(payload.annotations) ? payload.annotations : [];
				var byId = {};
				anns.forEach(function(a){ byId[a.id] = a; });
				gone.forEach(function(id){ delete byId[id]; delete syncedIds[id]; });
				hostList.forEach(function(a){
					var cur = byId[a.id];
					// Strict `>` keeps the local entry (and its live Range nodes) whenever the host only
					// echoes back what we just wrote.
					if (!cur || (a.t || 0) > (cur.t || 0)) byId[a.id] = a;
				});
				var next = Object.keys(byId).map(function(k){ return byId[k]; }).sort(function(x, y){ return x.id - y.id; });
				if (JSON.stringify(cleanAnns(next)) === JSON.stringify(cleanAnns(anns))) return;
				anns = next;
				try { localStorage.setItem(skey(), JSON.stringify(cleanAnns(anns))); } catch(e){}
				redraw();
			}
			function saveToHost(list, deleted){
				if (!hasFetch()) return;
				storeVersion += 1;
				var reqVersion = storeVersion;
				hostRequest("save", sessionId(), list, deleted).then(function(data){
					if (reqVersion !== storeVersion) return;   // a newer local write superseded this one
					adoptHost(data);
				});
			}
			function clearHost(){
				if (!hasFetch()) return;
				storeVersion += 1;
				syncedIds = {};
				hostRequest("clear", sessionId());
			}
			// Pull the host view and fold it in. Runs at startup so a refresh restores annotations even
			// when localStorage is empty, and periodically afterwards so a second window (or the other
			// app) shows up live. The old version bailed out whenever local storage was non-empty, which
			// hid every annotation the other window added.
			function refreshFromHost(){
				if (!hasFetch()) return;
				var sid = sessionId();
				if (!sid) return;
				var reqVersion = storeVersion;
				hostRequest("load", sid).then(function(data){
					if (reqVersion !== storeVersion) return;
					adoptHost(data);
				});
			}

			var anns = load();
			anns.forEach(function(a){ syncedIds[a.id] = 1; });
			var editingId = null;
			var pending = null;
			var affordVisible = false;
			function hideAfford(){
				affordVisible = false;
				afford.style.display = "none";
				if (afford.parentNode) afford.parentNode.removeChild(afford);
			}

			// ==== DOM construction ====
			var style = document.createElement("style");
			style.textContent = CSS;
			document.head.appendChild(style);

			var root = document.createElement("div");
			root.className = "ic-root";
			document.body.appendChild(root);

			function mk(tag, cls, text){ var el = document.createElement(tag); if(cls) el.className = cls; if(text) el.textContent = text; root.appendChild(el); return el; }

			// Build the affordance label from a span + text node instead of an HTML string: nothing
			// user- or model-supplied may ever be assembled into markup.
			function setAffordLabel(){
				afford.textContent = "";
				var plus = document.createElement("span");
				plus.className = "plus";
				plus.textContent = "＋";
				afford.appendChild(plus);
				afford.appendChild(document.createTextNode(t("afford")));
			}
			// Same reason for the trash icon: real SVG nodes, not an innerHTML string.
			function trashIcon(){
				var NS = "http://www.w3.org/2000/svg";
				var svg = document.createElementNS(NS, "svg");
				[["viewBox", "0 0 24 24"], ["width", "15"], ["height", "15"], ["fill", "none"], ["stroke", "currentColor"],
				 ["stroke-width", "2"], ["stroke-linecap", "round"], ["stroke-linejoin", "round"], ["aria-hidden", "true"]]
					.forEach(function(pair){ svg.setAttribute(pair[0], pair[1]); });
				[["polyline", { points: "3 6 5 6 21 6" }],
				 ["path", { d: "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" }],
				 ["line", { x1: "10", y1: "11", x2: "10", y2: "17" }],
				 ["line", { x1: "14", y1: "11", x2: "14", y2: "17" }]].forEach(function(pair){
					var el = document.createElementNS(NS, pair[0]);
					Object.keys(pair[1]).forEach(function(k){ el.setAttribute(k, pair[1][k]); });
					svg.appendChild(el);
				});
				return svg;
			}
			// Coalesce scroll/resize-driven redraws into one per frame: the listeners below fire for
			// every scroll event, and a full redraw per event is what made long conversations janky.
			var drawQueued = false;
			function scheduleDraw(){
				if (drawQueued) return;
				drawQueued = true;
				try {
					window.requestAnimationFrame(function(){ drawQueued = false; drawAll(); });
				} catch(e){ drawQueued = false; drawAll(); }
			}
			var afford = document.createElement("div");
			afford.className = "ic-afford";
			setAffordLabel();
			afford.style.display = "none";

			// editor
			var editor = mk("div","ic-editor","");
			editor.style.display = "none";
			var edQuote = document.createElement("div"); edQuote.className = "quote";
			var edTa = document.createElement("textarea"); edTa.placeholder = t("placeholder");
			var efoot = document.createElement("div"); efoot.className = "ic-efoot";
			var edTrash = document.createElement("button"); edTrash.className="ic-iconbtn"; edTrash.title=t("trash");
			edTrash.appendChild(trashIcon());
			var sp = document.createElement("span"); sp.className="sp";

			var edCancel = document.createElement("button"); edCancel.className="ic-btn"; edCancel.textContent=t("cancel");
			var edSave = document.createElement("button"); edSave.className="ic-btn primary muted"; edSave.textContent=t("save");
			efoot.appendChild(edTrash); efoot.appendChild(sp); efoot.appendChild(edCancel); efoot.appendChild(edSave);
			editor.appendChild(edQuote); editor.appendChild(edTa); editor.appendChild(efoot);

			var detail = mk("div","ic-detail",""); detail.style.display="none";
			var pill = mk("div","ic-pill",""); pill.style.display="none";
			var pillDot = document.createElement("span"); pillDot.className="dot"; pillDot.textContent="0";
			var pillTxt = document.createElement("span"); pillTxt.textContent=t("pill", { n: 0 });
			var pillX = document.createElement("span"); pillX.className="x"; pillX.textContent = "×";
			pill.appendChild(pillDot); pill.appendChild(pillTxt); pill.appendChild(pillX);
			pillX.addEventListener("mousedown", function(e){ if (e && e.preventDefault) e.preventDefault(); clearAll(); });

			// ==== Selection & range helpers ====
			function viewport(){ return { w: window.innerWidth, h: window.innerHeight }; }
			var fixedOff = { x: 0, y: 0 };
			function measureFixedOffset(){ try { var probe = document.createElement("div"); probe.style.cssText = "position:fixed;left:0;top:0;width:0;height:0;pointer-events:none;"; document.body.appendChild(probe); var p = probe.getBoundingClientRect(); document.body.removeChild(probe); fixedOff = { x: p.left, y: p.top }; } catch(e){ fixedOff = { x: 0, y: 0 }; } }

			function rangeInfo(r){
				var rr = r.cloneRange();
				return { start: rr.startContainer, so: rr.startOffset, end: rr.endContainer, eo: rr.endOffset, text: rr.toString() };
			}
			function makeRange(a){ var r = document.createRange(); r.setStart(a.start, a.so); r.setEnd(a.end, a.eo); return r; }
			function rectsOf(a){ var r = annRange(a); if (!r) return []; return Array.from(r.getClientRects()).filter(function(q){ return q.width > 1 && q.height > 1; }); }
			// ==== Text index (one traversal per redraw) ====
			// Locating an annotation used to walk the whole document once per annotation and take the
			// first occurrence of the text. Both halves were wrong: repeated text highlighted in the
			// wrong place, and a long conversation paid a full scan per lost annotation. The index is
			// built at most once per redraw and every lookup reuses it. It is scoped to the
			// conversation so the sidebar/composer can never be matched by accident.
			var textIndex = null;
			function indexRoot(){ return document.querySelector("[data-conversation-scroll]") || document.body; }
			function buildIndex(){
				var texts = [], nodes = [], walker = document.createTreeWalker(indexRoot(), NodeFilter.SHOW_TEXT), node;
				while ((node = walker.nextNode())){
					var v = node.nodeValue; if (!v) continue;
					var p = node.parentNode;
					if (p && p.closest && p.closest(".ic-root")) continue;
					texts.push(v); nodes.push(node);
				}
				var starts = [], pos = 0;
				for (var i = 0; i < texts.length; i++){ starts.push(pos); pos += texts[i].length; }
				return { buf: texts.join(""), nodes: nodes, starts: starts };
			}
			function getIndex(){ if (!textIndex) textIndex = buildIndex(); return textIndex; }
			function rangeAt(index, idx, length){
				var startNode = null, startOff = 0, endNode = null, endOff = 0;
				for (var i = 0; i < index.nodes.length; i++){
					var nodeStart = index.starts[i], nodeEnd = nodeStart + (index.nodes[i].nodeValue || "").length;
					if (startNode === null && idx >= nodeStart && idx < nodeEnd){ startNode = index.nodes[i]; startOff = idx - nodeStart; }
					if (endNode === null){ var endIdx = idx + length; if (endIdx > nodeStart && endIdx <= nodeEnd){ endNode = index.nodes[i]; endOff = endIdx - nodeStart; } }
					if (startNode && endNode) break;
				}
				if (!startNode || !endNode) return null;
				var r = document.createRange();
				r.setStart(startNode, startOff); r.setEnd(endNode, endOff);
				return r;
			}
			// Score every occurrence by the stored context (the text right before/after the selection)
			// instead of trusting the first match, then hand back the live Range. Returns null only when
			// the selected text itself is gone — that case is surfaced in the UI, never swallowed.
			function locateText(target, pre, post){
				if (!target || !target.length) return null;
				var index = getIndex(), buf = index.buf;
				var best = -1, bestScore = -1, from = 0;
				for (;;){
					var idx = buf.indexOf(target, from);
					if (idx < 0) break;
					var score = 0;
					if (pre){
						var before = buf.slice(Math.max(0, idx - pre.length), idx);
						if (before === pre) score += 3;
						else if (pre.length > 4 && before.slice(-4) === pre.slice(-4)) score += 1;
					}
					if (post){
						var after = buf.slice(idx + target.length, idx + target.length + post.length);
						if (after === post) score += 3;
						else if (post.length > 4 && after.slice(0, 4) === post.slice(0, 4)) score += 1;
					}
					if (score > bestScore){ bestScore = score; best = idx; }   // ties keep the first occurrence
					from = idx + 1;
				}
				if (best < 0) return null;
				return rangeAt(index, best, target.length);
			}
			// Up to `len` characters on each side of a live selection, stored with the annotation so a
			// later re-location can tell two identical phrases apart.
			function contextAround(range, len){
				try {
					var pre = "", post = "";
					var sc = range.startContainer, ec = range.endContainer;
					if (sc && sc.nodeType === 3) pre = (sc.nodeValue || "").slice(Math.max(0, range.startOffset - len), range.startOffset);
					if (ec && ec.nodeType === 3) post = (ec.nodeValue || "").slice(range.endOffset, range.endOffset + len);
					return { pre: pre, post: post };
				} catch(e){ return { pre: "", post: "" }; }
			}
			// Resolve a live Range for an annotation. The stored Range nodes survive only within
			// the current page; after a localStorage round-trip (refresh) they serialize to {} and
			// are unusable, so we re-locate the selected text instead.
			function annRange(ann){
				if (!ann) return null;
				if (ann.start && ann.end && ann.start.nodeType && ann.end.nodeType){
					try { return makeRange(ann); } catch(e){}
				}
				return locateText(ann.text, ann.pre, ann.post);
			}
			function annRects(ann){
				var r = annRange(ann);
				if (!r) return [];
				return Array.from(r.getClientRects()).filter(function(q){ return q.width > 1 && q.height > 1; });
			}
			function setPos(el, x, y){ el.style.left = (Math.max(2, Math.min(x, viewport().w - el.offsetWidth - 4)) - fixedOff.x) + "px"; el.style.top = (Math.max(2, y) - fixedOff.y) + "px"; }

			function editableTarget(t){
				if (!t) return true;
				var node = t.nodeType === 1 ? t : t.parentElement;
				if (!node) return true;
				var tag = (node.tagName || "").toLowerCase();
				return tag === "textarea" || tag === "input" || node.isContentEditable === true;
			}
			function inConversation(node){
				if (!node) return false;
				var el = node.nodeType === 1 ? node : node.parentElement;
				if (!el || !el.closest) return false;
				var scroll = document.querySelector("[data-conversation-scroll]");
				return !!scroll && !!el.closest("[data-conversation-scroll]");
			}

			// ==== Rendering ====
			function drawAnn(ann, seq){
				// remove old marks/badge
				if (ann._marks) ann._marks.forEach(function(m){ m.remove(); });
				ann._marks = [];
				if (ann._badge) ann._badge.remove();
				ann._badge = null;
				var range = annRange(ann);
				var rects = range ? Array.from(range.getClientRects()).filter(function(q){ return q.width > 1 && q.height > 1; }) : [];
				// Remember the outcome so the pill/detail can say "the original text changed" instead of
				// letting the annotation disappear without a trace.
				ann._anchored = rects.length > 0;
				if (!rects.length) return;
				var target = annotContainer(range.startContainer);
				var base = target.getBoundingClientRect();
				rects.forEach(function(rc){
					var m = document.createElement("i");
					m.className = "ic-hl";
					m.style.position = "absolute";
					m.style.left = (rc.left - base.left) + "px"; m.style.top = (rc.top - base.top) + "px";
					m.style.width = rc.width + "px"; m.style.height = rc.height + "px";
					target.appendChild(m); ann._marks.push(m);
				});
				var last = rects[rects.length - 1];
				var b = document.createElement("span");
				b.className = "ic-badge"; b.textContent = String(seq); b.dataset.id = String(ann.id);
				b.style.position = "absolute";
				// viewport coordinates on the fixed overlay root; never clipped, repositioned on scroll.
				b.style.left = (last.right - 6 - fixedOff.x) + "px";
				b.style.top = (last.top - 24 - fixedOff.y) + "px";
				b.addEventListener("mousedown", function(e){ if (e && e.preventDefault) e.preventDefault(); openEditor(Number(b.dataset.id), b.getBoundingClientRect()); });
				root.appendChild(b); ann._badge = b;
				syncFloatVis(b);
			}

			function redraw(){
				textIndex = null;   // rebuilt lazily, at most once for this redraw
				document.querySelectorAll(".ic-hl").forEach(function(m){ if(m.parentNode) m.parentNode.removeChild(m); });
				document.querySelectorAll(".ic-badge").forEach(function(b){ if(b.parentNode) b.parentNode.removeChild(b); });
				anns.forEach(function(a, i){ drawAnn(a, i + 1); });
				updatePill();
				// Every restore path (host reload after refresh, session switch) ends in redraw(), so the
				// invisible draft marker is re-asserted here too — otherwise a restored annotation leaves
				// the composer draft empty, DSH disables the send button, and the click never reaches
				// injectBeforeSend (symptom: "点发送没反应 / 输入框空").
				pushDraft();
			}
			var lastSid = sessionId();
			function syncSession(){
				var sid = sessionId();
				if (sid !== lastSid){
					lastSid = sid;
					anns = load();
					// Switching sessions resets what the host has acknowledged for this one.
					syncedIds = {};
					anns.forEach(function(a){ syncedIds[a.id] = 1; });
					if (editor.style.display !== "none") closeEditor();
					if (detail.style.display !== "none") closeDetail();
					redraw();
					refreshFromHost();
				}
			}
			function drawAll(){ measureFixedOffset(); syncSession(); redraw(); positionAffordance(); }

			function findComposerTa(){
				var tas = Array.prototype.filter.call(document.querySelectorAll("textarea"), function(t){
					var s = window.getComputedStyle(t); var r = t.getBoundingClientRect();
					return s.display !== "none" && r.width > 0 && r.height > 0 && r.top >= 0 && r.bottom <= window.innerHeight + 6;
				});
				if (!tas.length) return null;
				tas.sort(function(a,b){ return b.getBoundingClientRect().bottom - a.getBoundingClientRect().bottom; });
				return tas[0];
			}
			// The composer used to be a plain <textarea>; current DSH renders a rich-text (Lexical)
			// contenteditable marked [data-composer-input]. Accept both, so the send-gesture
			// interception keeps working across DSH versions. isContentEditable is not implemented
			// in every DOM (jsdom returns undefined), hence the attribute check as well.
			function isEditableInput(el){
				if (!el) return false;
				var tag = (el.tagName || "").toLowerCase();
				return tag === "textarea" || el.isContentEditable === true || el.getAttribute("contenteditable") === "true";
			}
			function findComposerInput(){
				var host = document.querySelector("[data-composer-input]");
				if (host && !isEditableInput(host)) host = host.querySelector("textarea, [contenteditable]");
				if (isEditableInput(host)) return host;
				return findComposerTa();
			}
			function updatePill(){
				if (!anns.length){ pill.style.display = "none"; return; }
				pill.style.display = "inline-flex";
				var lost = anns.filter(function(a){ return a._anchored === false; }).length;
				pillDot.textContent = String(anns.length);
				pillTxt.textContent = t("pill", { n: anns.length }) + (lost ? " ⚠" : "");
				pill.title = lost ? t("lostTip", { n: lost }) : "";
				var box = document.querySelector("[data-composer-card]") || document.querySelector("[data-composer-seat]") || document.querySelector("[data-input-scroll]") || document.querySelector("[data-conversation-composer-overlay]");
				if (box){
					var r = box.getBoundingClientRect();
					var aw = pill.offsetWidth, ah = pill.offsetHeight;
					// prefer the LEFT side of the input box (in the margin) so the pill never
					// covers the message above; fall back to the right side, then above as last resort.
					var px = r.left - aw - 8;
					var py = r.top;
					if (px < 2){
						px = r.right + 8;
						if (px + aw > viewport().w - 4){
							px = r.left;
							py = r.top - ah - 6;
						}
					}
					pill.style.left = (Math.max(2, Math.min(px, viewport().w - aw - 4)) - fixedOff.x) + "px";
					pill.style.top = (Math.max(2, Math.min(py, viewport().h - ah - 4)) - fixedOff.y) + "px";
				} else {
					setPos(pill, viewport().w - 130, viewport().h - 44);
				}
			}

			// ==== Editor & annotation lifecycle ====
			function closeEditor(){ editor.style.display = "none"; editingId = null; pending = null; }
			function closeDetail(){ detail.style.display = "none"; }

			function openEditor(annId, anchorRect){
				var ann = null;
				if (annId !== null){ ann = anns.filter(function(a){ return a.id === annId; })[0]; if (!ann) return; pending = ann; }
				editingId = ann ? ann.id : null;
				edQuote.textContent = ann ? ann.text : ((pending && pending.text) || "");
				edTa.value = ann ? (ann.comment || "") : "";
				edSave.className = edTa.value.trim() === "" ? "ic-btn primary muted" : "ic-btn primary";
				editor.style.display = "block";
				try { edTa.focus(); } catch(e){}
				// Anchor to the rect of the element the user clicked (add button / badge / detail row),
				// captured by the caller BEFORE any hiding; a degenerate (hidden/detached) rect falls back
				// to the selected text's rect.
				var rect = null;
				if (anchorRect && (anchorRect.width > 0 || anchorRect.height > 0)){ rect = anchorRect; }
				else { var lr = rectsOf(pending); rect = lr.length ? lr[lr.length-1] : null; }
				placeEditor(rect);
			}

			function positionEditor(){
				if (editor.style.display === "none") return;
				var rect = null;
				var ann = editingId !== null ? anns.filter(function(a){ return a.id === editingId; })[0] : null;
				if (ann && ann._badge){ rect = ann._badge.getBoundingClientRect(); }
				else { var src = ann || pending; if (src){ var lr = rectsOf(src); rect = lr.length ? lr[lr.length-1] : null; } }
				if (!rect) return;
				placeEditor(rect);
			}

			function deleteAnn(id){
				anns = anns.filter(function(a){ return a.id !== id; });
				closeEditor(); closeDetail(); save(anns); drawAll();
			}
			function clearAll(){
				// An empty save is a no-op now (that is what keeps one window from wiping another), so
				// clearing has to use the explicit host op instead.
				anns = []; try { localStorage.setItem(skey(), "[]"); } catch(e){} clearHost(); closeEditor(); closeDetail(); redraw();
			}
			// clear in-memory + localStorage + host entry; the summary is already in the outgoing draft
			function clearLocalOnly(){
				anns = [];
				try { localStorage.setItem(skey(), JSON.stringify(anns)); } catch(e){}
				clearHost();
				closeEditor(); closeDetail(); redraw();
			}

			// selection affordance: insert into the content (relative) like the annotation
			// ==== Affordance positioning ====
			function annotContainer(node){
				var scroll = document.querySelector("[data-conversation-scroll]");
				var anchor = node && (node.nodeType === 1 ? node : node.parentElement);
				var target = anchor;
				while (target && target !== scroll && target !== document.body){
					var tag = (target.tagName || "").toLowerCase();
					var disp = "";
					try { disp = window.getComputedStyle(target).display; } catch(e){}
					if (["div","p","ol","ul","li","section","article","blockquote"].indexOf(tag) >= 0 || disp === "block" || disp === "flow-root") break;
					target = target.parentElement;
				}
				if (!target || target === document.body) target = scroll || target || document.body;
				try { if (window.getComputedStyle(target).position === "static") target.style.position = "relative"; } catch(e){}
				return target;
			}

			var headerBottomCache = -1;
			function probeHeaderBottom(){
				if (headerBottomCache !== -1) return headerBottomCache;
				var max = 0;
				var els = document.querySelectorAll("div,header,nav,section,aside");
				for (var i = 0; i < els.length; i++){
					var cs = null;
					try { cs = window.getComputedStyle(els[i]); } catch(e){ continue; }
					if (cs.position === "fixed" || cs.position === "sticky"){
						var rr = els[i].getBoundingClientRect();
						if (rr.top <= 1 && rr.height > 0 && rr.height < window.innerHeight * 0.5){
							max = Math.max(max, rr.bottom);
						}
					}
				}
				headerBottomCache = max > 0 ? max : 56;
				return headerBottomCache;
			}
			function floatOverlapsChrome(el){
				var r = el.getBoundingClientRect();
				var seat = document.querySelector("[data-composer-seat]") || document.querySelector("[data-composer-card]") || document.querySelector("[data-conversation-composer-overlay]");
				if (seat){
					var b = seat.getBoundingClientRect();
					if (b.width > 0 && b.height > 0 && r.bottom > b.top && r.top < b.bottom && r.right > b.left && r.left < b.right) return true;
				}
				var hb = probeHeaderBottom();
				if (hb > 0 && r.top < hb && r.bottom > 0) return true;
				if (r.bottom < 1) return true;
				return false;
			}
			function syncFloatVis(el){ if (el && el.style) el.style.visibility = floatOverlapsChrome(el) ? "hidden" : "visible"; }
			function syncAllFloatVis(){ document.querySelectorAll(".ic-badge,.ic-afford").forEach(function(el){ syncFloatVis(el); }); }
			// Editor placement. The badges follow the text and may hide while scrolled under the chrome,
			// but hiding the EDITOR looks like the click did nothing (a selection sitting low next to the
			// composer used to be swallowed that way). Keep it inside the viewport and above the composer
			// band instead, and always visible.
			function chromeBand(){
				var top = probeHeaderBottom() + 6;
				var bottom = viewport().h - 8;
				var seat = document.querySelector("[data-composer-seat]") || document.querySelector("[data-composer-card]") || document.querySelector("[data-conversation-composer-overlay]");
				if (seat){
					var b = seat.getBoundingClientRect();
					if (b.height > 0 && b.top > 0) bottom = Math.min(bottom, b.top - 8);
				}
				return { top: Math.max(2, top), bottom: bottom };
			}
			function placeEditor(rect){
				var w = editor.offsetWidth, h = editor.offsetHeight;
				var vw = viewport().w, vh = viewport().h;
				var x = rect ? (rect.right + 14) : 12;
				if (rect && x + w > vw - 4) x = rect.left - w - 14;
				if (x < 2) x = 2;
				var y = rect ? rect.top : 12;
				var band = chromeBand();
				if (band.bottom - band.top >= h + 8){          // room between the header and the composer
					if (y + h > band.bottom) y = band.bottom - h;
					if (y < band.top) y = band.top;
				}
				y = Math.max(2, Math.min(y, Math.max(2, vh - h - 4)));
				editor.style.visibility = "visible";
				setPos(editor, x, y);
			}
			function repositionFloats(){
				anns.forEach(function(a){
					if (!a._badge) return;
					var rects = annRects(a);
					if (!rects.length) return;
					var last = rects[rects.length - 1];
					a._badge.style.left = (last.right - 6 - fixedOff.x) + "px";
					a._badge.style.top = (last.top - 24 - fixedOff.y) + "px";
					syncFloatVis(a._badge);
				});
				positionAffordance();
				positionEditor();
			}
			function positionAffordance(){
				if (!pending || !affordVisible) return;
				var rects = rectsOf(pending);
				if (!rects.length){ hideAfford(); return; }
				root.appendChild(afford);
				afford.style.display = "flex";
				syncFloatVis(afford);
				var first = rects[0];
				// viewport coordinates on the fixed overlay root (never clipped)
				afford.style.left = (first.left + 2 - fixedOff.x) + "px";
				afford.style.top = (first.top - 36 - fixedOff.y) + "px";
			}
			// ==== Interaction wiring ====
			// Every document/window level listener is kept in a named variable so dispose() can remove
			// all of them: a leaked listener survives an HMR reload as a zombie instance that keeps
			// reacting to clicks and can inject the same summary twice.
			var onDocScrollFloat = function(){ if (window.requestAnimationFrame) requestAnimationFrame(repositionFloats); else repositionFloats(); };
			document.addEventListener("scroll", onDocScrollFloat, { capture: true, passive: true });
			var onDocMouseupSelect = function(e){
				if (e.target && root.contains(e.target)) return;
				var sel = window.getSelection();
				if (!sel || sel.isCollapsed || !sel.rangeCount){ hideAfford(); return; }
				var r = sel.getRangeAt(0);
				if (editableTarget(r.startContainer) || editableTarget(r.endContainer)){ hideAfford(); return; }
				if (!inConversation(r.startContainer) || !inConversation(r.endContainer)){ hideAfford(); return; }
				if (r.toString().trim() === ""){ hideAfford(); return; }
				pending = rangeInfo(r);
				affordVisible = true;
				positionAffordance();
				if (typeof requestAnimationFrame === "function") requestAnimationFrame(positionAffordance);
			};
			document.addEventListener("mouseup", onDocMouseupSelect, true);

			afford.addEventListener("mousedown", function(e){
				if (e && e.preventDefault) e.preventDefault();
				var t = pending && pending.text;
				var existing = t ? anns.filter(function(a){ return a.text === t; })[0] : null;
				var ar = afford.getBoundingClientRect();
				hideAfford();
				try { openEditor(existing ? existing.id : null, ar); }
				catch(err){ try { if (window.console && console.warn) console.warn("[inline-comments] openEditor failed:", err); } catch(e){} }
			});
			edTa.addEventListener("input", function(){ edSave.className = edTa.value.trim() === "" ? "ic-btn primary muted" : "ic-btn primary"; edTa.style.height = "auto"; edTa.style.height = Math.min(edTa.scrollHeight, 160) + "px"; edTa.style.overflowY = edTa.scrollHeight > 160 ? "auto" : "hidden"; });
			edTa.addEventListener("compositionend", function(){ edSave.className = edTa.value.trim() === "" ? "ic-btn primary muted" : "ic-btn primary"; });
			// Editor keyboard: plain Enter saves (the default), Shift+Enter inserts a newline.
			// Skip IME composition (Enter confirms the candidate, not the annotation).
			edTa.addEventListener("keydown", function(e){
				if (e.key !== "Enter" || e.shiftKey) return;
				if (e.isComposing || (e.nativeEvent && e.nativeEvent.isComposing) || e.keyCode === 229) return;
				e.preventDefault();
				trySave();
			});
			edTrash.addEventListener("mousedown", function(){ if (editingId !== null) deleteAnn(editingId); else closeEditor(); });
			edTrash.addEventListener("click", function(){ if (editingId !== null) deleteAnn(editingId); else closeEditor(); });
			// Cancel discards this edit; a second-time edit keeps the original comment.
			edCancel.addEventListener("mousedown", function(e){ if (e && e.preventDefault) e.preventDefault(); closeEditor(); });
			edCancel.addEventListener("click", function(e){ if (e && e.preventDefault) e.preventDefault(); closeEditor(); });
			// After saving, hand focus to the composer so the user can just press Enter to send.
			function focusComposer(){
				try {
					var ta = findComposerInput();
					if (ta){ try { ta.focus(); } catch(e){} }
					// re-focus after a tick in case the setDraft state change re-rendered the composer
					setTimeout(function(){ try { var t2 = findComposerInput(); if (t2) t2.focus(); } catch(e){} }, 0);
				} catch(e){}
			}
			function doSave(draft){
				if (!draft) return;
				if (editingId === null){
					if (!pending) return;
					var around = contextAround(makeRange(pending), 24);
					var ann = { id: newId(), start: pending.start, so: pending.so, end: pending.end, eo: pending.eo, text: pending.text, comment: draft, t: Date.now(), pre: around.pre, post: around.post };
					anns.push(ann);
				} else {
					var a = anns.filter(function(x){ return x.id === editingId; })[0];
					if (a) { a.comment = draft; a.t = Date.now(); }
				}
				closeEditor(); save(anns); drawAll(); focusComposer();
			}
			function trySave(){
				var draft = (edTa.value || "").trim();
				if (!draft) return;
				// an edit that changed nothing simply closes
				if (editingId !== null){
					var cur = anns.filter(function(x){ return x.id === editingId; })[0];
					if (cur && cur.comment === draft){ closeEditor(); return; }
				}
				doSave(draft);
			}
			edSave.addEventListener("mousedown", trySave);
			edSave.addEventListener("click", trySave);

			// delegated clicks
			// ==== Delegated UI events ====
			root.addEventListener("click", function(e){
				var b = e.target.closest(".ic-badge");
				if (b){ openEditor(Number(b.dataset.id), b.getBoundingClientRect()); return; }
				var px = e.target.closest(".ic-pill .x");
				if (px){ clearAll(); return; }
				var del = e.target.closest(".ic-detail .del");
				if (del){ deleteAnn(Number(del.dataset.id)); return; }
				var row = e.target.closest(".ic-detail .row");
				if (row){ openEditor(Number(row.dataset.id), row.getBoundingClientRect()); closeDetail(); return; }

			});

			// outside click closes editor/detail
			var onDocMousedownOutside = function(e){
				if (e.target && e.target.closest && e.target.closest(".ic-badge")) return;
				if (editor.style.display !== "none" && !editor.contains(e.target) && !root.contains(e.target)){
					var draft = (edTa.value || "").trim();
					if (draft) trySave(); else closeEditor();
				}
				if (detail.style.display !== "none" && !detail.contains(e.target) && !root.contains(e.target)) closeDetail();
			};
			document.addEventListener("mousedown", onDocMousedownOutside, true);

			// pill hover -> detail
			var detailHideTimer = null;
			pill.addEventListener("mouseenter", function(){
				if (detailHideTimer){ clearTimeout(detailHideTimer); detailHideTimer = null; }
				if (!anns.length) return;
				var dhead = document.createElement("div");
				dhead.className = "dhead";
				dhead.textContent = t("detailHead", { n: anns.length });
				detail.textContent = "";
				detail.appendChild(dhead);
				anns.forEach(function(a, i){
					var row = document.createElement("div"); row.className="row"; row.dataset.id=String(a.id);
					var meta = document.createElement("span"); meta.className="meta";
					var qt = document.createElement("div"); qt.className="qt"; qt.textContent = t("detailQt", { i: i + 1, text: a.text });
					var cm = document.createElement("div"); cm.className="cm";
					cm.textContent = a.comment ? t("detailCm", { comment: a.comment }) : t("noComment");
					meta.appendChild(qt);
					if (a._anchored === false){
						var miss = document.createElement("span"); miss.className = "miss"; miss.textContent = t("missTag");
						meta.appendChild(miss);
					}
					meta.appendChild(cm);
					var del = document.createElement("span"); del.className="del"; del.textContent=t("delete"); del.dataset.id=String(a.id);
					del.addEventListener("mousedown", function(e){ if (e && e.preventDefault) e.preventDefault(); deleteAnn(Number(del.dataset.id)); });
					row.appendChild(meta); row.appendChild(del);
					detail.appendChild(row);
				});
				var pr = pill.getBoundingClientRect();
				detail.style.display = "block";
				var dw = detail.offsetWidth, dh = detail.offsetHeight;
				var x = pr.left;
				if (x + dw > viewport().w) x = Math.max(0, viewport().w - dw - 4);
				var y = pr.top - dh - 6;
				if (y < 2) y = pr.bottom + 6;
				setPos(detail, x, y);
			});
			// close detail when the pointer leaves the pill/detail (short grace period)
			pill.addEventListener("mouseleave", function(){
				detailHideTimer = setTimeout(closeDetail, 400);
			});
			detail.addEventListener("mouseenter", function(){
				if (detailHideTimer){ clearTimeout(detailHideTimer); detailHideTimer = null; }
			});
			detail.addEventListener("mouseleave", function(){
				detailHideTimer = setTimeout(closeDetail, 400);
			});

			// scroll / resize -> recompute fixed coords
			// One capture-phase scroll listener on window is enough: scroll events do not bubble, but
			// the capture phase reaches every scrolling element, so the old document listener was a
			// duplicate of every event.
			window.addEventListener("resize", drawAll);              // rare: redraw synchronously
			window.addEventListener("scroll", scheduleDraw, true);   // high frequency: one redraw per frame
			var vv = window.visualViewport || null;
			if (vv){ vv.addEventListener("scroll", scheduleDraw); vv.addEventListener("resize", drawAll); }

			// ==== Re-attach on content change ====
			// plugin-owned elements (badge/highlight/afford/pill/editor/detail) — skip in the observer
			function isOwnNode(n){
				if (!n || n.nodeType !== 1) return false;
				if (/\bic-/.test(String(n.className || ""))) return true;
				if (n.closest && n.closest(".ic-root")) return true;
				return false;
			}
			// rAF-throttled re-render: re-attach annotations when messages stream or (re)load after refresh.
			// Clearing on send is handled by injectBeforeSend (Enter / send button), NOT here — otherwise a
			// refresh would re-render the existing user messages and falsely clear the just-restored annotations.
			var redrawQueued = false;
			function scheduleRedraw(){
				if (redrawQueued) return;
				redrawQueued = true;
				if (typeof requestAnimationFrame === "function"){
					requestAnimationFrame(function(){ redrawQueued = false; redraw(); });
				} else {
					setTimeout(function(){ redrawQueued = false; redraw(); }, 0);
				}
			}
			var sendMo = null;
			var scrollTarget = document.querySelector("[data-conversation-scroll]") || document.body;
			if (typeof MutationObserver === "function"){
				sendMo = new MutationObserver(function(muts){
					var contentChanged = false;
					for (var i=0;i<muts.length;i++){
						for (var j=0;j<muts[i].addedNodes.length;j++){
							var n = muts[i].addedNodes[j];
							if (n.nodeType !== 1) continue;
							if (!isOwnNode(n)) contentChanged = true;
						}
					}
					if (contentChanged) scheduleRedraw();
				});
				sendMo.observe(scrollTarget, { childList: true, subtree: true });
			}
			// Send-gesture interception (Enter path). DSH submits from the composer's own key handler,
			// so the summary has to be in the draft before that runs: this listener sits on the capture
			// phase above the editor, and setDraft writes the editor synchronously (discrete update).
			function onComposerSubmit(e){
				var t = e.target; if (!t) return;
				if (e.key !== "Enter" || e.shiftKey) return;
				if (e.isComposing || (e.nativeEvent && e.nativeEvent.isComposing) || e.keyCode === 229) return;
				if (e.repeat) return;
				if (!anns.length) return;
				// never intercept the annotation editor's own textarea
				if (t.closest && t.closest(".ic-root")) return;
				var input = findComposerInput();
				if (!input) return;
				if (t !== input && !(input.contains && input.contains(t))) return;
				injectBeforeSend();
			}
			document.addEventListener("keydown", onComposerSubmit, true);
			// Send-button click: with pending annotations we take the gesture over — write the summary
			// into the draft, then submit ourselves. Handing it back to the composer loses the click:
			// the draft write re-renders the composer while the click is still propagating, so the
			// button's own handler never runs (symptom: "点发送按钮要点两次"; Enter is unaffected because
			// the editor submits from its own key handler in the same task).
			var onDocClickSend = function(e){
				try {
					var btn = e.target && e.target.closest ? e.target.closest("button") : null;
					if (!btn) return;
					var name = ((btn.getAttribute("aria-label") || "") + " " + (btn.textContent || "")).toLowerCase();
					if (name.indexOf("发送") < 0 && name.indexOf("send") < 0) return;
					if (!anns.length) return;
					var shell = getShell();
					// Busy-state variants (排队/插话/queue/steer) keep the composer's own submit semantics.
					var composerOwnsIt = !shell || typeof shell.submit !== "function" || /排队|插话|queue|steer/.test(name);
					var before = currentDraft(shell);
					injectBeforeSend();
					if (composerOwnsIt || currentDraft(shell) === before) return; // nothing injected: let the composer send
					// Submit ourselves, then swallow the click so the composer cannot double-send. If the
					// shell throws we let the click through and the composer sends the injected draft.
					try { shell.submit("queue"); } catch(err){ return; }
					if (e.preventDefault) e.preventDefault();
					if (e.stopPropagation) e.stopPropagation();
				} catch(err){}
			};
			document.addEventListener("click", onDocClickSend, true);
			// Backstop: if the draft marker gets wiped while annotations persist (e.g. the user selects-all
			// and deletes), no redraw is scheduled — re-assert it on the same tick as the session poll.
			var pullTick = 0;
			var sessionTimer = setInterval(function(){ syncSession(); pushDraft(); if ((pullTick = (pullTick + 1) % 6) === 0) refreshFromHost(); }, 800);
			drawAll();
			refreshFromHost();
			// Report a missing composer/session bridge once at startup: a silently dead send path is the
			// hardest failure to diagnose from the UI ("annotations can be added but never sent").
			probe();

			// re-apply locale-dependent copy on language switch
			function applyStrings(){
				setAffordLabel();
				edTa.placeholder = t("placeholder");
				edTrash.title = t("trash");
				edSave.textContent = t("save");
				updatePill();
				closeDetail();
			}
			var offLocaleChange = null;
			if (ctx.on){ try { offLocaleChange = ctx.on("locale/change", applyStrings); } catch(e){ offLocaleChange = null; } }

			// ==== Dispose ====
			// Remove every document/window listener this instance registered: a leaked one survives an
			// HMR reload as a zombie that still reacts to clicks and can inject a summary twice.
			return function(){
				clearInterval(sessionTimer);
				document.removeEventListener("keydown", onComposerSubmit, true);
				document.removeEventListener("click", onDocClickSend, true);
				document.removeEventListener("mouseup", onDocMouseupSelect, true);
				document.removeEventListener("mousedown", onDocMousedownOutside, true);
				document.removeEventListener("scroll", onDocScrollFloat, true);
				if (typeof offLocaleChange === "function"){ try { offLocaleChange(); } catch(e){} }
				if (sendMo) sendMo.disconnect();
				style.remove(); root.remove();
				if (localeDispose) localeDispose();
				window.removeEventListener("resize", drawAll);
				window.removeEventListener("scroll", scheduleDraw, true);
				if (vv){ vv.removeEventListener("scroll", scheduleDraw); vv.removeEventListener("resize", drawAll); }
			};
		}

		exports.inject = inject;
		exports.apply = apply;
		return module.exports;
	}
});
