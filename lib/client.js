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
				afford: "添加注释", placeholder: "添加可选评论…", trash: "删除注释",
				save: "保存", pill: "{n} 条注",
				detailHead: "{n} 条注释 · 详情", detailQt: "{i}。 所选文本：{text}",
				detailCm: "用户评论：{comment}", noComment: "(无评论)", delete: "删除",
				origLabel: "原文", commentLabel: "批注"
			},
			en: {
				afford: "Add comment", placeholder: "Add optional comment…", trash: "Delete comment",
				save: "Save", pill: "{n} notes",
				detailHead: "{n} comments · details", detailQt: "{i}. Selected: {text}",
				detailCm: "Comment: {comment}", noComment: "(none)", delete: "Delete",
				origLabel: "Original", commentLabel: "Comment"
			}
		};

		var CSS = ".ic-root{position:fixed;inset:0;pointer-events:none;z-index:2147483000;}"
			+ ".ic-hl{position:absolute;background:color-mix(in srgb,var(--dsw-alias-state-business-primary,#3b6fff) 16%,transparent);border-radius:3px;pointer-events:none;}"
			+ ".ic-badge{position:absolute;pointer-events:auto;min-width:18px;height:18px;padding:0 5px;border-radius:9px;background:var(--dsw-alias-state-business-primary,#3b6fff);color:var(--dsw-alias-label-primary-foreground,#fff);font:700 11px/18px -apple-system,system-ui,sans-serif;display:grid;place-items:center;cursor:pointer;box-shadow:0 1px 3px rgba(0,0,0,.22);}"
			+ ".ic-afford{position:absolute;pointer-events:auto;display:flex;align-items:center;gap:5px;background:var(--dsw-alias-bg-layer-3,#fff);color:var(--dsw-alias-state-business-primary,#3b6fff);border:1px solid var(--dsw-alias-border-l2,#e2e5ec);border-radius:18px;padding:5px 11px;font:600 12px -apple-system,system-ui,sans-serif;cursor:pointer;box-shadow:var(--dsw-shadow-lv2,0 3px 10px rgba(0,0,0,.14));white-space:nowrap;}"
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
			+ ".ic-pill{position:absolute;z-index:32;display:inline-flex;align-items:center;gap:7px;border:1px solid var(--dsw-alias-border-l2,#e2e5ec);border-radius:20px;padding:5px 11px;font:12px -apple-system,system-ui,sans-serif;color:var(--dsw-alias-label-primary,#111);background:var(--dsw-alias-bg-layer-3,#fff);cursor:pointer;box-shadow:var(--dsw-shadow-lv2,0 2px 8px rgba(0,0,0,.08));pointer-events:auto;}"
			+ ".ic-pill .dot{width:13px;height:13px;border-radius:50%;background:var(--dsw-alias-state-business-primary,#3b6fff);color:var(--dsw-alias-label-primary-foreground,#fff);font:700 9px/13px sans-serif;display:grid;place-items:center;}"
			+ ".ic-pill .x{color:var(--dsw-alias-label-tertiary,#8a9096);cursor:pointer;font-weight:700;padding:0 6px;font-size:13px;}";

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
			var sessionId = function(){ try { var c = ctx.sessions?.list?.getSnapshot?.()?.current; return (typeof c === "string" && c) ? c : null; } catch(e){ return null; } };
			function getShell(){
				try {
					var hub = ctx.conversation && ctx.conversation.input;
					var sid = sessionId();
					if (!hub || !sid) return null;
					return hub.shell ? hub.shell(sid) : null;
				} catch(e){ return null; }
			}
			// Trick: keep the draft non-empty with an invisible char so the send button lights up,
			// while the visible draft stays empty. The annotation summary is appended to the draft at send time (injectBeforeSend).
			function pushDraft(){
				try {
					var shell = getShell();
					if (!shell || !shell.setDraft) return;
					var cur = (shell.state && shell.state.getSnapshot) ? (shell.state.getSnapshot().draft || "") : "";
					if (anns.length){
						// Trick: keep the draft non-empty with an invisible char so the send button lights up,
						// while the visible draft stays empty. The annotation summary is appended to the draft at send time (injectBeforeSend).
						if (!cur.trim()){
							shell.setDraft("\u200b");
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
					if (!shell || !shell.setDraft) return;
					var summary = anns.map(function(a, i){ return "[" + (i + 1) + "] " + t("origLabel") + "：" + a.text + "\n    " + t("commentLabel") + "：" + (a.comment || t("noComment")); }).join("\n");
					var cur = (shell.state && shell.state.getSnapshot) ? (shell.state.getSnapshot().draft || "") : "";
					cur = cur.replace(/\u200b/g, "");
					shell.setDraft((cur.trim() ? cur + "\n" : "") + summary);
					clearLocalOnly();
				} catch(e){}
			}
			// ==== Persistence ====
			var skey = function(){ return NS + (sessionId() || "default"); };
			var load = function(){ try { var v = JSON.parse(localStorage.getItem(skey()) || "[]"); if(!Array.isArray(v)) return []; v.forEach(function(a){ if(!a.comment && a.comments && a.comments.length) a.comment = a.comments[a.comments.length-1].text; }); return v; } catch(e){ return []; } };
			var save = function(a){ var clean = a.map(function(x){ return { id: x.id, so: x.so, eo: x.eo, text: x.text, comment: x.comment }; }); try { localStorage.setItem(skey(), JSON.stringify(clean)); } catch(e){} saveToHost(clean); pushDraft(); };
			// ==== Cross-refresh persistence (host JSON file) ====
			// The controlled browser resets localStorage on refresh, so the durable store lives on the
			// host side (a single JSON file keyed by session id, served over a loopback-only HTTP route).
			// localStorage stays as a fast same-page mirror; every mutation is mirrored to the host, and the
			// host entry is cleared after send. All host traffic is best-effort: if fetch is unavailable
			// (e.g. jsdom tests) the feature silently degrades to localStorage-only.
			var HOST_ROUTE = "/_dsh/inline-comments/storage";
			var storeVersion = 0;
			function hasFetch(){ return typeof fetch === "function"; }
			function hostRequest(op, sid, annotations){
				if (!hasFetch()) return Promise.resolve(null);
				var body = { op: op, sessionId: sid || null };
				if (annotations !== undefined) body.annotations = annotations;
				return fetch(HOST_ROUTE, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })
					.then(function(res){ return res.json(); })
					.catch(function(){ return null; });
			}
			function saveToHost(list){
				if (!hasFetch()) return;
				storeVersion += 1;
				hostRequest("save", sessionId(), list);
			}
			function clearHost(){
				if (!hasFetch()) return;
				storeVersion += 1;
				hostRequest("clear", sessionId());
			}
			function refreshFromHost(){
				if (!hasFetch()) return;
				var sid = sessionId();
				if (!sid) return;
				var local = null;
				try { local = JSON.parse(localStorage.getItem(skey()) || "[]"); } catch(e){}
				if (Array.isArray(local) && local.length > 0) return;
				var reqVersion = storeVersion;
				hostRequest("load", sid).then(function(data){
					if (!data || !data.ok) return;
					if (reqVersion !== storeVersion) return;
					var list = Array.isArray(data.annotations) ? data.annotations : [];
					if (!list.length) return;
					list.forEach(function(a){ if(!a.comment && a.comments && a.comments.length) a.comment = a.comments[a.comments.length-1].text; });
					anns = list;
					nextId = anns.reduce(function(m,a){ return Math.max(m, a.id||0); },0) + 1;
					try { localStorage.setItem(skey(), JSON.stringify(anns.map(function(x){ return { id: x.id, so: x.so, eo: x.eo, text: x.text, comment: x.comment }; }))); } catch(e){}
					redraw();
				});
			}

			var anns = load();
			var nextId = anns.reduce(function(m,a){ return Math.max(m, a.id||0); },0) + 1;
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

			var afford = document.createElement("div");
			afford.className = "ic-afford";
			afford.innerHTML = "<span class=\"plus\">＋</span>" + t("afford");
			afford.style.display = "none";

			// editor
			var editor = mk("div","ic-editor","");
			editor.style.display = "none";
			var edQuote = document.createElement("div"); edQuote.className = "quote";
			var edTa = document.createElement("textarea"); edTa.placeholder = t("placeholder");
			var efoot = document.createElement("div"); efoot.className = "ic-efoot";
			var edTrash = document.createElement("button"); edTrash.className="ic-iconbtn"; edTrash.title=t("trash");
			edTrash.innerHTML = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>';
			var sp = document.createElement("span"); sp.className="sp";

			var edSave = document.createElement("button"); edSave.className="ic-btn primary muted"; edSave.textContent=t("save");
			efoot.appendChild(edTrash); efoot.appendChild(sp); efoot.appendChild(edSave);
			editor.appendChild(edQuote); editor.appendChild(edTa); editor.appendChild(efoot);

			var detail = mk("div","ic-detail",""); detail.style.display="none";
			var pill = mk("div","ic-pill",""); pill.style.display="none";
			var pillDot = document.createElement("span"); pillDot.className="dot"; pillDot.textContent="0";
			var pillTxt = document.createElement("span"); pillTxt.textContent=t("pill", { n: 0 });
			var pillX = document.createElement("span"); pillX.className="x"; pillX.textContent="×";
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
			function locateText(target){
				if (!target || !target.length) return null;
				var texts = [], nodes = [], walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT), node;
				while ((node = walker.nextNode())){
					var v = node.nodeValue; if (!v) continue;
					var p = node.parentNode;
					if (p && p.closest && p.closest(".ic-root")) continue;
					texts.push(v); nodes.push(node);
				}
				var buf = texts.join("");
				var idx = buf.indexOf(target);
				if (idx < 0) return null;
				var startNode=null, startOff=0, endNode=null, endOff=0, pos=0;
				for (var i=0;i<nodes.length;i++){
					var len = texts[i].length, nodeStart = pos, nodeEnd = pos + len;
					if (startNode === null && idx >= nodeStart && idx < nodeEnd){ startNode = nodes[i]; startOff = idx - nodeStart; }
					if (endNode === null){ var endIdx = idx + target.length; if (endIdx > nodeStart && endIdx <= nodeEnd){ endNode = nodes[i]; endOff = endIdx - nodeStart; } }
					if (startNode && endNode) break;
					pos = nodeEnd;
				}
				if (!startNode || !endNode) return null;
				var r = document.createRange(); r.setStart(startNode, startOff); r.setEnd(endNode, endOff); return r;
			}
			// Resolve a live Range for an annotation. The stored Range nodes survive only within
			// the current page; after a localStorage round-trip (refresh) they serialize to {} and
			// are unusable, so we re-locate the selected text instead.
			function annRange(ann){
				if (ann.start && ann.end && ann.start.nodeType && ann.end.nodeType){
					try { return makeRange(ann); } catch(e){}
				}
				return locateText(ann.text);
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
				var first = rects[0];
				var b = document.createElement("span");
				b.className = "ic-badge"; b.textContent = String(seq); b.dataset.id = String(ann.id);
				b.style.position = "absolute";
				b.style.left = (first.right - base.left - 6) + "px";
				b.style.top = (first.top - base.top - 8) + "px";
				b.addEventListener("mousedown", function(e){ if (e && e.preventDefault) e.preventDefault(); openEditor(Number(b.dataset.id), b.getBoundingClientRect()); });
				target.appendChild(b); ann._badge = b;
			}

			function redraw(){
				document.querySelectorAll(".ic-hl").forEach(function(m){ if(m.parentNode) m.parentNode.removeChild(m); });
				document.querySelectorAll(".ic-badge").forEach(function(b){ if(b.parentNode) b.parentNode.removeChild(b); });
				anns.forEach(function(a, i){ drawAnn(a, i + 1); });
				updatePill();
			}
			var lastSid = sessionId();
			function syncSession(){
				var sid = sessionId();
				if (sid !== lastSid){
					lastSid = sid;
					anns = load();
					nextId = anns.reduce(function(m,a){ return Math.max(m, a.id||0); },0) + 1;
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
			function updatePill(){
				if (!anns.length){ pill.style.display = "none"; return; }
				pill.style.display = "inline-flex";
				pillDot.textContent = String(anns.length);
				pillTxt.textContent = t("pill", { n: anns.length });
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
				edQuote.textContent = (ann ? ann.text : pending.text);
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
				var x = rect ? (rect.right + 14) : 12;
				if (x + editor.offsetWidth > viewport().w) x = rect ? (rect.left - editor.offsetWidth - 14) : 12;
				if (x < 2) x = 2;
				var y = rect ? rect.top : 12;
				setPos(editor, x, y);
			}

			function deleteAnn(id){
				anns = anns.filter(function(a){ return a.id !== id; });
				closeEditor(); closeDetail(); save(anns); drawAll();
			}
			function clearAll(){
				anns = []; save(anns); closeEditor(); closeDetail(); redraw();
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
			function positionAffordance(){
				if (!pending || !affordVisible) return;
				var rects = rectsOf(pending);
				if (!rects.length){ hideAfford(); return; }
				var target = annotContainer(pending.start);
				target.appendChild(afford);
				afford.style.display = "flex";
				// use the button's REAL containing block (nearest positioned ancestor) as the coordinate base,
				// so a parent/child positioned or transformed container can't skew the position.
				var cb = afford.offsetParent || target;
				var base = cb.getBoundingClientRect();
				var first = rects[0];
				// place the button one line (≈22px) above the selection start
				afford.style.left = (first.left + 2 - base.left) + "px";
				afford.style.top = (first.top - 36 - base.top) + "px";
			}
			// ==== Interaction wiring ====
			document.addEventListener("mouseup", function(e){
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
			}, true);

			afford.addEventListener("mousedown", function(e){
				if (e && e.preventDefault) e.preventDefault();
				var t = pending && pending.text;
				var existing = t ? anns.filter(function(a){ return a.text === t; })[0] : null;
				var ar = afford.getBoundingClientRect();
				hideAfford();
				openEditor(existing ? existing.id : null, ar);
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
			// After saving, hand focus to the composer so the user can just press Enter to send.
			function focusComposer(){
				try {
					var ta = findComposerTa();
					if (ta){ try { ta.focus(); } catch(e){} }
					// re-focus after a tick in case the setDraft state change re-rendered the composer
					setTimeout(function(){ try { var t2 = findComposerTa(); if (t2) t2.focus(); } catch(e){} }, 0);
				} catch(e){}
			}
			function doSave(draft){
				if (!draft) return;
				if (editingId === null){
					if (!pending) return;
					var ann = { id: nextId++, start: pending.start, so: pending.so, end: pending.end, eo: pending.eo, text: pending.text, comment: draft };
					anns.push(ann);
				} else {
					var a = anns.filter(function(x){ return x.id === editingId; })[0];
					if (a) a.comment = draft;
				}
				closeEditor(); save(anns); drawAll(); focusComposer();
			}
			function trySave(){
				var draft = (edTa.value || "").trim();
				if (draft) doSave(draft);
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
			document.addEventListener("mousedown", function(e){
				if (e.target && e.target.closest && e.target.closest(".ic-badge")) return;
				if (editor.style.display !== "none" && !editor.contains(e.target) && !root.contains(e.target)) closeEditor();
				if (detail.style.display !== "none" && !detail.contains(e.target) && !root.contains(e.target)) closeDetail();
			}, true);

			// pill hover -> detail
			pill.addEventListener("mouseenter", function(){
				if (!anns.length) return;
				detail.innerHTML = '<div class="dhead">' + t("detailHead", { n: anns.length }) + '</div>';
				anns.forEach(function(a, i){
					var row = document.createElement("div"); row.className="row"; row.dataset.id=String(a.id);
					var meta = document.createElement("span"); meta.className="meta";
					var qt = document.createElement("div"); qt.className="qt"; qt.textContent = t("detailQt", { i: i + 1, text: a.text });
					var cm = document.createElement("div"); cm.className="cm";
					cm.textContent = a.comment ? t("detailCm", { comment: a.comment }) : t("noComment");
					meta.appendChild(qt); meta.appendChild(cm);
					var del = document.createElement("span"); del.className="del"; del.textContent=t("delete"); del.dataset.id=String(a.id);
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
			// detail stays open once shown; close on click-outside (mousedown) or the ×.

			// scroll / resize -> recompute fixed coords
			window.addEventListener("resize", drawAll);
			window.addEventListener("scroll", drawAll, true);
			document.addEventListener("scroll", drawAll, true);
			if (window.visualViewport){ window.visualViewport.addEventListener("scroll", drawAll); window.visualViewport.addEventListener("resize", drawAll); }

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
			function onComposerSubmit(e){
				var t = e.target; if (!t) return;
				if ((t.tagName || "").toLowerCase() !== "textarea") return;
				if (t.closest && t.closest(".ic-root")) return;
				if (t !== findComposerTa()) return;
				if (e.key !== "Enter" || e.shiftKey) return;
				if (e.isComposing || (e.nativeEvent && e.nativeEvent.isComposing) || e.keyCode === 229) return;
				if (e.repeat) return;
				injectBeforeSend();
			}
			document.addEventListener("keydown", onComposerSubmit, true);
			// send-button click: inject before the click submits
			document.addEventListener("mousedown", function(e){
				try {
					var btn = e.target && e.target.closest ? e.target.closest("button") : null;
					if (!btn) return;
					var name = ((btn.getAttribute("aria-label") || "") + " " + (btn.textContent || "")).toLowerCase();
					if (name.indexOf("发送") >= 0 || name.indexOf("send") >= 0){
						injectBeforeSend();
					}
				} catch(e){}
			}, true);
			var sessionTimer = setInterval(syncSession, 800);
			drawAll();
			refreshFromHost();

			// re-apply locale-dependent copy on language switch
			function applyStrings(){
				afford.innerHTML = "<span class=\"plus\">＋</span>" + t("afford");
				edTa.placeholder = t("placeholder");
				edTrash.title = t("trash");
				edSave.textContent = t("save");
				updatePill();
				closeDetail();
			}
			if (ctx.on) ctx.on("locale/change", applyStrings);

			// ==== Dispose ====
			return function(){
				clearInterval(sessionTimer);
				document.removeEventListener("keydown", onComposerSubmit, true);
				if (sendMo) sendMo.disconnect();
				style.remove(); root.remove();
				if (localeDispose) localeDispose();
				window.removeEventListener("resize", drawAll);
				window.removeEventListener("scroll", drawAll, true);
				document.removeEventListener("scroll", drawAll, true);
			};
		}

		exports.inject = inject;
		exports.apply = apply;
		return module.exports;
	}
});
