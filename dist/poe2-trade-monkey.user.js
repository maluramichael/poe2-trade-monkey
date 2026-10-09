// ==UserScript==
// @name            PoE2 Trade Monkey
// @name:de         PoE2 Trade Monkey
// @namespace       https://github.com/maluramichael/poe2-trade-monkey
// @version         0.3.0
// @description     Userscript that enhances the Path of Exile 2 trade site: bookmarks, history, pins, layout and result tools.
// @description:de  Erweitert die Trade-Seite von Path of Exile 2: Lesezeichen für jede Liga, Verlauf, Pins, Schnellfilter, Zwei-Spalten-Layout und Werkzeuge für die Ergebnisse.
// @author          Michael Malura
// @license         MIT
// @homepageURL     https://github.com/maluramichael/poe2-trade-monkey
// @supportURL      https://github.com/maluramichael/poe2-trade-monkey/issues
// @icon            https://raw.githubusercontent.com/maluramichael/poe2-trade-monkey/master/assets/icon.png
// @compatible      firefox Violentmonkey, Tampermonkey
// @compatible      chrome Tampermonkey, Violentmonkey (enable "Allow User Scripts")
// @match           https://*.pathofexile.com/trade2*
// @run-at          document-start
// @grant           GM.getValue
// @grant           GM.setValue
// @grant           GM.deleteValue
// @grant           GM.xmlHttpRequest
// @grant           GM.setClipboard
// @grant           GM_addValueChangeListener
// @grant           GM_removeValueChangeListener
// @connect         poe.ninja
// @updateURL       https://raw.githubusercontent.com/maluramichael/poe2-trade-monkey/master/dist/poe2-trade-monkey.meta.js
// @downloadURL     https://raw.githubusercontent.com/maluramichael/poe2-trade-monkey/master/dist/poe2-trade-monkey.user.js
// ==/UserScript==
// Bundled library: Preact 11.0.1, https://github.com/preactjs/preact, MIT License, (c) Jason Miller
// Source of this script: https://github.com/maluramichael/poe2-trade-monkey
function __ptmPageScript() {
"use strict";
(() => {
  // src/site/bridge/protocol.ts
  var PAGE_TO_CONTENT = "ptm:page";
  var CONTENT_TO_PAGE = "ptm:content";
  var UNKNOWN_MUTATION = "unknown-mutation";

  // src/site/page/commands.ts
  function handleCommand(app, command) {
    const { requestId } = command;
    try {
      switch (command.kind) {
        case "getState":
          return { kind: "reply", requestId, ok: true, value: JSON.parse(JSON.stringify(app.$store.state.persistent)) };
        case "commit": {
          const known = app.$store._mutations;
          if (known && !(command.mutation in known)) {
            return { kind: "reply", requestId, ok: false, error: `${UNKNOWN_MUTATION}: ${command.mutation}` };
          }
          app.$store.commit(command.mutation, command.payload);
          return { kind: "reply", requestId, ok: true, value: null };
        }
      }
    } catch (error) {
      return { kind: "reply", requestId, ok: false, error: String(error) };
    }
  }

  // src/site/page/network.ts
  var SEARCH_URL = /\/api\/trade2\/(search|exchange)\/(?:(poe2|xbox|sony)\/)?([^/?#]+)\/?(?:[?#]|$)/;
  var FETCH_URL = /\/api\/trade2\/fetch\//;
  function parseSearchUrl(url) {
    const match = SEARCH_URL.exec(url);
    if (!match) return null;
    return {
      type: match[1],
      realm: match[2] ?? "poe2",
      league: decodeURIComponent(match[3])
    };
  }
  function isFetchUrl(url) {
    return FETCH_URL.test(url);
  }
  function retryAfterMs(header) {
    const seconds = header === null || header.trim() === "" ? NaN : Number(header);
    if (!Number.isFinite(seconds)) return 6e4;
    return Math.min(6e5, Math.max(1e3, seconds * 1e3));
  }
  function installNetworkHooks(win, callbacks) {
    hookXhr(win, callbacks);
    hookFetch(win, callbacks);
  }
  function handleSearch(url, body, responseText, callbacks) {
    const target = parseSearchUrl(url);
    if (!target || typeof body !== "string") return;
    try {
      const response = JSON.parse(responseText);
      if (!response || typeof response.id !== "string") return;
      callbacks.onSearch({ ...target, request: JSON.parse(body), response });
    } catch {
    }
  }
  function handleListings(json, callbacks) {
    const results = json?.result;
    if (Array.isArray(results)) callbacks.onListings(results.filter(Boolean));
  }
  function hookXhr(win, callbacks) {
    const proto = win.XMLHttpRequest.prototype;
    const originalOpen = proto.open;
    const originalSend = proto.send;
    const urls = /* @__PURE__ */ new WeakMap();
    proto.open = function(...args) {
      urls.set(this, String(args[1]));
      return originalOpen.apply(this, args);
    };
    proto.send = function(body) {
      const url = urls.get(this) ?? "";
      if (parseSearchUrl(url) || isFetchUrl(url)) {
        this.addEventListener("load", () => {
          if (this.status === 429) callbacks.onRateLimited(retryAfterMs(this.getResponseHeader("Retry-After")));
        });
      }
      if (parseSearchUrl(url)) {
        this.addEventListener("load", () => {
          if (this.status === 200) handleSearch(url, body, this.responseText, callbacks);
        });
      } else if (isFetchUrl(url)) {
        this.addEventListener("load", () => {
          if (this.status !== 200) return;
          try {
            handleListings(JSON.parse(this.responseText), callbacks);
          } catch {
          }
        });
      }
      return originalSend.call(this, body);
    };
  }
  function hookFetch(win, callbacks) {
    const originalFetch = win.fetch;
    win.fetch = async function(input, init) {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      let requestBody = Promise.resolve(init?.body);
      if (init?.body === void 0 && typeof input === "object" && "clone" in input && parseSearchUrl(url)) {
        try {
          requestBody = input.clone().text().catch(() => void 0);
        } catch {
          requestBody = Promise.resolve(void 0);
        }
      }
      const response = await originalFetch.call(win, input, init);
      if (response.status === 429 && (isFetchUrl(url) || parseSearchUrl(url))) {
        callbacks.onRateLimited(retryAfterMs(response.headers.get("Retry-After")));
      }
      if (response.ok && (isFetchUrl(url) || parseSearchUrl(url))) {
        Promise.all([response.clone().text(), requestBody]).then(([text, body]) => {
          if (isFetchUrl(url)) handleListings(JSON.parse(text), callbacks);
          else handleSearch(url, body, text, callbacks);
        }).catch(() => {
        });
      }
      return response;
    };
  }

  // src/site/page/vue.ts
  function findTradeApp(win) {
    const candidate = win.app ?? win.document.querySelector("#trade")?.__vue__;
    return candidate?.$store ? candidate : null;
  }
  function waitForTradeApp(win, timeoutMs = 3e4) {
    return new Promise((resolve, reject) => {
      const started = Date.now();
      const tick = () => {
        const app = findTradeApp(win);
        if (app) return resolve(app);
        if (Date.now() - started > timeoutMs) return reject(new Error("trade app not found"));
        win.setTimeout(tick, 100);
      };
      tick();
    });
  }

  // src/site/page/index.ts
  function post(message) {
    window.dispatchEvent(new CustomEvent(PAGE_TO_CONTENT, { detail: JSON.stringify(message) }));
  }
  if (!window.__ptmPageBridge) {
    window.__ptmPageBridge = true;
    installNetworkHooks(window, {
      onSearch: (captured) => post({ kind: "search", captured }),
      onListings: (results) => post({ kind: "listings", results }),
      onRateLimited: (retryAfterMs2) => post({ kind: "rateLimited", retryAfterMs: retryAfterMs2 })
    });
    waitForTradeApp(window).then(
      (app) => {
        window.addEventListener(CONTENT_TO_PAGE, (event) => {
          const detail = event.detail;
          if (typeof detail !== "string") return;
          let command;
          try {
            command = JSON.parse(detail);
          } catch {
            return;
          }
          post(handleCommand(app, command));
        });
        app.$store.subscribe((mutation) => post({ kind: "mutation", type: mutation.type }));
        post({ kind: "ready" });
      },
      () => {
      }
    );
  }
})();
}

"use strict";
(() => {
  // node_modules/preact/dist/preact.mjs
  var n;
  var t;
  var i;
  var r;
  var u;
  var f;
  var o;
  var e;
  var l;
  var c;
  var a;
  var s;
  var h = {};
  var p = [];
  var v = /^m(i|n|o|s|text|space)$/;
  var y = Array.isArray;
  var d = p.slice;
  var w = Object.assign;
  function _(n2) {
    n2 && n2.parentNode && n2.remove();
  }
  function g(n2, t20, i3) {
    var r3, u4, f3, o4 = {}, e3 = arguments.length;
    for (f3 in t20) "key" == f3 ? r3 = t20[f3] : "ref" == f3 && "function" != typeof n2 ? u4 = t20[f3] : o4[f3] = t20[f3];
    return e3 > 2 && (o4.children = e3 > 3 ? d.call(arguments, 2) : i3), b(n2, o4, r3, u4, null);
  }
  function b(i3, r3, u4, f3, o4) {
    var e3 = { type: i3, props: r3, key: u4, ref: f3, __k: null, __: null, __b: 0, __e: null, __c: null, constructor: void 0, __v: o4 || ++t, __i: -1, __u: 0 };
    return !o4 && n.vnode && n.vnode(e3), e3;
  }
  function M(n2) {
    return n2.children;
  }
  function $(n2, t20) {
    this.props = n2, this.context = t20, this.__g = 0;
  }
  function x(n2, t20) {
    if (null == t20) return n2.__ ? x(n2.__, n2.__i + 1) : null;
    for (var i3; t20 < n2.__k.length; t20++) if ((i3 = n2.__k[t20]) && i3.__e) return i3.__e;
    return "function" != typeof n2.type || n2.props.__P ? null : x(n2);
  }
  function S(n2) {
    if ((n2 = n2.__) && n2.__c && !n2.props.__P) return n2.__e = null, n2.__k.some(function(t20) {
      return t20 && (n2.__e = t20.__e);
    }), S(n2);
  }
  function C(t20) {
    (8 & t20.__g || !(t20.__g |= 8) || !r.push(t20) || f++) && u == n.debounceRendering || ((u = n.debounceRendering) || queueMicrotask)(j);
  }
  function j() {
    var t20, i3, u4, e3, l3, c3, a3, s3, h3;
    try {
      for (i3 = 1; r.length; ) r.length > i3 && r.sort(o), t20 = r.shift(), i3 = r.length, 8 & t20.__g && (e3 = void 0, l3 = void 0, c3 = (l3 = (u4 = t20).__v).__e, a3 = [], s3 = [], (h3 = u4.__P) && ((e3 = w({ constructor: void 0 }, l3)).__v = l3.__v + 1, n.vnode && n.vnode(e3), N(h3, e3, l3, u4.__n, h3.namespaceURI, 32 & l3.__u ? [c3] : null, a3, c3 || x(l3), 32 & l3.__u, s3), e3.__v = l3.__v, e3.__.__k[e3.__i] = e3, z(a3, e3, s3), l3.__ = l3.__e = null, e3.__e != c3 && S(e3)));
    } finally {
      r.length = f = 0;
    }
  }
  function L(n2, t20, i3, r3, u4, f3, o4, e3, l3, c3, a3) {
    var s3, v3, y3, d3, w3, _3, g3 = r3.__k || p, k2 = t20.length;
    for (l3 = H(i3, t20, g3, l3, k2), s3 = 0; s3 < k2; s3++) null != (y3 = i3.__k[s3]) && (v3 = ~y3.__i && g3[y3.__i] || h, y3.__i = s3, _3 = N(n2, y3, v3, u4, f3, o4, e3, l3, c3, a3), d3 = y3.__e, (v3.ref != y3.ref || 8 & v3.__u) && (v3.ref && D(v3.ref, null, y3, v3), y3.ref && a3.push(y3.ref, y3.__c || d3, y3)), w3 = w3 || d3, 4 & y3.__u ? (l3 = I(y3, l3, n2, !v3.__v), v3.__e && (v3.__e = null)) : "function" == typeof y3.type && void 0 !== _3 ? l3 = _3 : d3 && (l3 = d3.nextSibling), y3.__u &= -7);
    return i3.__e = w3, l3;
  }
  function H(n2, t20, i3, r3, u4) {
    var f3, o4, e3, l3, c3, a3, s3, h3, p3, v3, d3 = i3.length, w3 = d3, _3 = 0, g3 = false, k2 = n2.__k = Array(u4);
    for (f3 = 0; f3 < u4; f3++) null != (o4 = t20[f3]) && "boolean" != typeof o4 && "function" != typeof o4 ? ("object" != typeof o4 || o4.constructor == String ? o4 = k2[f3] = b(null, o4) : y(o4) ? o4 = k2[f3] = b(M, { children: o4 }) : void 0 === o4.constructor && o4.__b ? o4 = k2[f3] = b(o4.type, o4.props, o4.key, o4.ref, o4.__v) : k2[f3] = o4, l3 = f3 + _3, o4.__ = n2, o4.__b = n2.__b + 1, e3 = null, ~(c3 = o4.__i = O(o4, i3, l3, w3)) && (w3--, (e3 = i3[c3]) && (e3.__u |= 2)), e3 && e3.__v ? (o4.__u |= 2, c3 == l3 - 1 ? _3-- : c3 == l3 + 1 ? _3++ : c3 != l3 && (c3 > l3 ? _3-- : _3++, g3 = true)) : (~c3 || (u4 > d3 ? _3-- : u4 < d3 && _3++), "function" != typeof o4.type && (o4.__u |= 4))) : k2[f3] = null;
    if (g3) {
      for (a3 = [], s3 = [], f3 = 0; f3 < u4; f3++) if ((o4 = k2[f3]) && 2 & o4.__u) {
        for (h3 = 0, p3 = a3.length; h3 < p3; ) a3[v3 = h3 + p3 >> 1] < o4.__i ? h3 = v3 + 1 : p3 = v3;
        a3[h3] = o4.__i, s3[f3] = h3 + 1;
      }
      for (_3 = a3.length; f3--; ) s3[f3] && (s3[f3] == _3 ? _3-- : k2[f3].__u |= 4);
    }
    if (w3) for (f3 = 0; f3 < d3; f3++) !(e3 = i3[f3]) || 2 & e3.__u || (e3.__e == r3 && (r3 = x(e3)), E(e3, e3));
    return r3;
  }
  function I(n2, t20, i3, r3) {
    var u4, f3, o4;
    if ("function" == typeof n2.type) {
      if (n2.props.__P) return t20;
      if (u4 = n2.__k) for (f3 = 0; f3 < u4.length; f3++) u4[f3] && (u4[f3].__ = n2, t20 = I(u4[f3], t20, i3, false));
      return t20;
    }
    for (t20 && !t20.parentNode && (t20 = x(n2)) && !t20.parentNode && (t20 = null), o4 = t20; o4 && 8 == o4.nodeType; ) o4 = o4.nextSibling;
    for (n2.__e != o4 && (!r3 && i3.moveBefore && n2.__e.parentNode ? i3.moveBefore(n2.__e, t20) : i3.insertBefore(n2.__e, t20 || null)), t20 = n2.__e; (t20 = t20 && t20.nextSibling) && 8 == t20.nodeType; ) ;
    return t20;
  }
  function O(n2, t20, i3, r3) {
    var u4, f3, o4, e3 = n2.key, l3 = n2.type, c3 = t20[i3], a3 = c3 && !(2 & c3.__u);
    if (null === c3 && null == e3 || a3 && e3 == c3.key && l3 == c3.type) return i3;
    if (r3 > (a3 ? 1 : 0)) {
      for (u4 = i3 - 1, f3 = i3 + 1; u4 >= 0 || f3 < t20.length; ) if ((c3 = t20[o4 = u4 >= 0 ? u4-- : f3++]) && !(2 & c3.__u) && e3 == c3.key && l3 == c3.type) return o4;
    }
    return -1;
  }
  function P(n2, t20, i3) {
    null == i3 && (i3 = ""), "-" == t20[0] ? n2.setProperty(t20, i3) : n2[t20] = i3;
  }
  function T(n2, t20, i3, r3, u4) {
    var f3, o4;
    n: if ("style" == t20) if ("string" == typeof i3) n2.style.cssText = i3;
    else {
      if ("string" == typeof r3 && (n2.style.cssText = r3 = ""), r3) for (t20 in r3) i3 && t20 in i3 || P(n2.style, t20, "");
      if (i3) for (t20 in i3) r3 && i3[t20] == r3[t20] || P(n2.style, t20, i3[t20]);
    }
    else if ("o" == t20[0] && "n" == t20[1]) (n2.__e || (n2.__e = {}))[t20] = i3, i3 && r3 || (o4 = a[t20] || (a[t20] = q(t20)), (n2.__a || (n2.__a = {}))[t20] = c, f3 = t20 != (t20 = t20.replace(l, "$1")), (t20 = t20.slice(2))[0] < "a" && (t20 = t20.toLowerCase()), i3 ? n2.addEventListener(t20, o4, f3) : n2.removeEventListener(t20, o4, f3));
    else {
      if ("http://www.w3.org/2000/svg" == u4) t20 = t20.replace(/xlink(H|:h)/, "h").replace(/sName$/, "s");
      else if ("width" != t20 && "height" != t20 && "href" != t20 && "list" != t20 && "form" != t20 && "tabIndex" != t20 && "download" != t20 && "rowSpan" != t20 && "colSpan" != t20 && "role" != t20 && "popover" != t20 && t20 in n2) try {
        n2[t20] = null == i3 ? "" : i3;
        break n;
      } catch (n3) {
      }
      "function" == typeof i3 || (null == i3 || false === i3 && "-" != t20[4] ? n2.removeAttribute(t20) : n2.setAttribute(t20, "popover" == t20 && 1 == i3 ? "" : i3));
    }
  }
  function q(t20) {
    return function(i3) {
      if (this.__e) {
        var r3 = this.__e[t20];
        if (null == i3[e]) i3[e] = c++;
        else if (i3[e] < this.__a[t20]) return;
        return r3(n.event ? n.event(i3) : i3);
      }
    };
  }
  function N(t20, i3, r3, u4, f3, o4, e3, l3, c3, a3) {
    var s3, h3, v3, d3, g3, k2, b3, m2, S2, C3, j2, H2, I2, A2, O2, P2, T3, q2, N2, z3, D3 = i3.type;
    if (void 0 !== i3.constructor) return null;
    if (128 & r3.__u && (c3 = 32 & r3.__u, s3 = r3.__c.__z)) {
      if (i3.__u |= c3, h3 = o4 = [], 8 == s3.nodeType) for (v3 = 1, d3 = s3.nextSibling; d3; d3 = d3.nextSibling) {
        if (8 == d3.nodeType) {
          if (d3.data.startsWith("$s")) v3++;
          else if (d3.data.startsWith("/$s") && !--v3) break;
        }
        o4.push(d3);
      }
      else o4.push(s3);
      l3 = o4[0];
    }
    (s3 = n.__b) && s3(i3);
    n: if ("function" == typeof D3) {
      g3 = e3.length;
      try {
        if (C3 = i3.props, j2 = (s3 = D3.prototype) && s3.render, H2 = (s3 = D3.contextType) && u4[s3.__c], I2 = s3 ? H2 ? H2.props.value : s3.__ : u4, r3.__c ? 2 & (k2 = i3.__c = r3.__c).__g && (k2.__g |= 1) : (j2 ? i3.__c = k2 = new D3(C3, I2) : (i3.__c = k2 = new $(C3, I2), k2.constructor = D3, k2.render = F), H2 && H2.sub(k2), k2.state || (k2.state = {}), k2.__n = u4, k2.__g |= 8, k2.__h = [], k2.__k = []), j2 && (k2.__s || (k2.__s = k2.state), D3.getDerivedStateFromProps && (k2.__s == k2.state && (k2.__s = w({}, k2.__s)), w(k2.__s, D3.getDerivedStateFromProps(C3, k2.__s)))), b3 = k2.props, m2 = k2.state, k2.__v = i3, r3.__c) {
          if (j2 && !D3.getDerivedStateFromProps && C3 !== b3 && k2.componentWillReceiveProps && k2.componentWillReceiveProps(C3, I2), i3.__v == r3.__v && !(8 & k2.__g) || !(4 & k2.__g) && k2.shouldComponentUpdate && false === k2.shouldComponentUpdate(C3, k2.__s, I2)) {
            i3.__v != r3.__v && (k2.props = C3, k2.state = k2.__s, k2.__g &= -9), i3.__e = r3.__e, i3.__k = r3.__k, i3.__k.some(function(n2) {
              n2 && (n2.__ = i3);
            }), p.push.apply(k2.__h, k2.__k), k2.__k = [], k2.__h.length && e3.push(k2), l3 = x(r3);
            break n;
          }
          k2.componentWillUpdate && k2.componentWillUpdate(C3, k2.__s, I2), j2 && k2.componentDidUpdate && k2.__h.push(function() {
            k2.componentDidUpdate(b3, m2, S2);
          });
        } else j2 && !D3.getDerivedStateFromProps && k2.componentWillMount && k2.componentWillMount(), j2 && k2.componentDidMount && k2.__h.push(k2.componentDidMount);
        if (k2.context = I2, k2.props = C3, k2.__P = t20, k2.__g &= -5, A2 = n.__r, O2 = 0, j2) k2.state = k2.__s, k2.__g &= -9, A2 && A2(i3), s3 = k2.render(k2.props, k2.state, k2.context), p.push.apply(k2.__h, k2.__k), k2.__k = [];
        else do {
          k2.__g &= -9, A2 && A2(i3), s3 = k2.render(k2.props, k2.state, k2.context), k2.state = k2.__s;
        } while (8 & k2.__g && ++O2 < 25);
        k2.state = k2.__s, k2.getChildContext && (u4 = w({}, u4, k2.getChildContext())), j2 && r3.__c && k2.getSnapshotBeforeUpdate && (S2 = k2.getSnapshotBeforeUpdate(b3, m2)), P2 = s3 && s3.type === M && null == s3.key ? s3.props.children : s3, C3.__P && (s3 = l3, f3 = (t20 = C3.__P).namespaceURI, c3 = o4 = null, r3.props && r3.props.__P != t20 && (r3.__k.some(function(n2) {
          n2 && E(n2, n2);
        }), r3.__k = null), l3 = r3.__k ? x(r3, 0) : null), l3 = L(t20, y(P2) ? P2 : [P2], i3, r3, u4, f3, o4, e3, l3, c3, a3), C3.__P && (i3.__e = null, l3 = s3), i3.__u &= -161, 128 & r3.__u && (k2.__z = null), h3 && h3.some(_), k2.__h.length && e3.push(k2), 1 & k2.__g && (k2.__g &= -4);
      } catch (t21) {
        if (e3.length = g3, i3.__v = null, c3 || o4) if (t21.then) {
          if (T3 = 0, i3.__u |= c3 ? 160 : 128, o4) {
            for (~(N2 = o4.indexOf(l3 || void 0)) || (N2 = o4.length); (z3 = o4[N2 - 1]) && 8 == z3.nodeType; ) N2--;
            for (; N2 < o4.length; N2++) if (z3 = o4[N2]) {
              if (o4[N2] = null, 8 == z3.nodeType) {
                if (z3.data.startsWith("$s")) T3++ || (q2 = z3);
                else if (T3 && z3.data.startsWith("/$s") && !--T3) {
                  l3 = z3;
                  break;
                }
              } else if (!T3) break;
            }
          }
          if (!q2) {
            for (; l3 && 8 == l3.nodeType && l3.nextSibling; ) l3 = l3.nextSibling;
            q2 = l3;
          }
          i3.__c.__z || (i3.__c.__z = q2), i3.__e = l3;
        } else o4 && o4.some(_);
        else i3.__e = r3.__e;
        i3.__k || (i3.__k = r3.__k || []), t21.then || V(i3), n.__e(t21, i3, r3);
      }
    } else l3 = i3.__e = B(r3.__e, i3, r3, u4, f3, o4, e3, c3, a3, t20);
    return (s3 = n.diffed) && s3(i3), 128 & i3.__u ? void 0 : l3;
  }
  function V(n2) {
    n2 && (n2.__c && (n2.__c.__g |= 4), n2.__k && n2.__k.some(V));
  }
  function z(t20, i3, r3) {
    for (var u4 = 0; u4 < r3.length; ) D(r3[u4++], r3[u4++], r3[u4++]);
    n.__c && n.__c(i3, t20), t20.some(function(i4) {
      try {
        t20 = i4.__h, i4.__h = [], t20.some(function(n2) {
          n2.call(i4);
        });
      } catch (t21) {
        n.__e(t21, i4.__v);
      }
    });
  }
  function B(t20, i3, r3, u4, f3, o4, e3, l3, c3, a3) {
    var s3, p3, w3, g3, k2, b3, m2, M2, $2, S2 = r3.props || h, C3 = i3.props, j2 = i3.type;
    if ("svg" == j2 ? f3 = "http://www.w3.org/2000/svg" : "math" == j2 ? f3 = "http://www.w3.org/1998/Math/MathML" : f3 || (f3 = "http://www.w3.org/1999/xhtml"), o4) {
      for (s3 = 0; s3 < o4.length; s3++) if ((k2 = o4[s3]) && (j2 ? k2.localName == j2 : 3 == k2.nodeType)) {
        t20 = k2, o4[s3] = null;
        break;
      }
    }
    if (!t20) {
      if (M2 = a3.ownerDocument || document, !j2) return M2.createTextNode(C3);
      t20 = M2.createElementNS(f3, j2, C3.is && C3), l3 && (n.__m && n.__m(i3, o4), l3 = false), o4 = null;
    }
    if (j2) {
      if (a3 = "template" == j2 ? t20.content : t20, o4 = "textarea" == j2 && null != C3.defaultValue ? null : o4 && d.call(a3.childNodes), !l3 && o4) for (S2 = {}, s3 = 0; s3 < t20.attributes.length; s3++) S2[(k2 = t20.attributes[s3]).name] = k2.value;
      for (s3 in S2) k2 = S2[s3], "dangerouslySetInnerHTML" == s3 ? w3 = k2 : "children" == s3 || s3 in C3 || "value" == s3 && "defaultValue" in C3 || "checked" == s3 && "defaultChecked" in C3 || T(t20, s3, null, k2, f3);
      for (s3 in $2 = 1 & r3.__u, C3) k2 = C3[s3], "children" == s3 ? g3 = k2 : "dangerouslySetInnerHTML" == s3 ? p3 = k2 : "value" == s3 ? b3 = k2 : "checked" == s3 ? m2 = k2 : l3 && "function" != typeof k2 || !(S2[s3] !== k2 || $2 && null != k2) || T(t20, s3, k2, S2[s3], f3);
      p3 ? (l3 || w3 && (p3.__html == w3.__html || p3.__html == t20.innerHTML) || (t20.innerHTML = p3.__html), i3.__k = []) : (w3 && (t20.textContent = ""), ("foreignObject" == j2 || "http://www.w3.org/1998/Math/MathML" == f3 && v.test(j2)) && (f3 = "http://www.w3.org/1999/xhtml"), L(a3, y(g3) ? g3 : [g3], i3, r3, u4, f3, o4, e3, o4 ? o4[0] : r3.__k && x(r3, 0), l3, c3), o4 && o4.some(_)), l3 && "textarea" != j2 || (s3 = "value", "progress" == j2 && null == b3 ? t20.removeAttribute(s3) : null == b3 || b3 === t20[s3] && ("progress" != j2 || b3) || T(t20, s3, b3, S2[s3], f3), s3 = "checked", null != m2 && m2 != t20[s3] && T(t20, s3, m2, S2[s3], f3));
    } else S2 === C3 || l3 && t20.data == C3 || (t20.data = C3);
    return t20;
  }
  function D(t20, i3, r3, u4) {
    try {
      "function" == typeof t20 ? i3 ? i3.__x = t20(i3) || 1 : u4 && (u4 = u4.__c || u4.__e) && (i3 = u4.__x) && (u4.__x = null, "function" == typeof i3 ? i3() : t20(null)) : t20.current = i3;
    } catch (t21) {
      n.__e(t21, r3);
    }
  }
  function E(t20, i3, r3) {
    var u4, f3;
    if (n.unmount && n.unmount(t20), !(u4 = t20.ref) || u4.current && u4.current != t20.__e || D(u4, null, i3, t20), u4 = t20.__c) {
      if (u4.componentWillUnmount) try {
        u4.componentWillUnmount();
      } catch (t21) {
        n.__e(t21, i3);
      }
      u4.__P = u4.__n = null;
    }
    if (u4 = t20.__k) for (f3 = 0; f3 < u4.length; f3++) u4[f3] && E(u4[f3], i3, "function" != typeof t20.type || r3 && !t20.props.__P);
    (u4 = t20.__e) && (r3 || _(u4), u4.__e && (u4.__e = null)), t20.__e = t20.__c = t20.__ = null;
  }
  function F(n2, t20, i3) {
    return this.constructor(n2, i3);
  }
  function G(t20, i3) {
    var r3, u4, f3, o4;
    n.__ && n.__(t20, i3), 9 == i3.nodeType && (i3 = i3.documentElement), u4 = (r3 = t20 && 32 & t20.__u) ? null : i3.__k, i3.__k = b(M, { children: [t20] }), f3 = [], o4 = [], N(i3, i3.__k, u4 || h, h, i3.namespaceURI, u4 ? null : i3.firstChild ? d.call(i3.childNodes) : null, f3, u4 ? u4.__e : i3.firstChild, r3, o4), z(f3, i3.__k, o4), i3.__k.props.children = null;
  }
  function K(n2) {
    function t20(n3) {
      var i3, r3;
      return this.getChildContext || (i3 = /* @__PURE__ */ new Set(), (r3 = {})[t20.__c] = this, this.getChildContext = function() {
        return r3;
      }, this.shouldComponentUpdate = function(n4) {
        this.props.value != n4.value && i3.forEach(function(n5) {
          n5.__g |= 4, C(n5);
        });
      }, this.sub = function(n4) {
        i3.add(n4);
        var t21 = n4.componentWillUnmount;
        n4.componentWillUnmount = function() {
          i3.delete(n4), t21 && t21.call(n4);
        };
      }), n3.children;
    }
    return t20.__c = "__cC" + s++, t20.__ = n2, t20.Provider = (t20.Consumer = function(n3, t21) {
      return n3.children(t21);
    }).contextType = t20, t20;
  }
  n = { __e: function(n2, t20, i3, r3) {
    for (var u4, o4, e3; t20 = t20.__; ) if ((u4 = t20.__c) && !(1 & u4.__g)) {
      u4.__g |= 4;
      try {
        if ((o4 = u4.constructor) && o4.getDerivedStateFromError && (u4.setState(o4.getDerivedStateFromError(n2)), e3 = 8 & u4.__g), u4.componentDidCatch && (u4.componentDidCatch(n2, r3 || {}), e3 = 8 & u4.__g), e3) return void (u4.__g |= 2);
      } catch (t21) {
        n2 = t21, e3 = 0;
      }
    }
    throw f = 0, n2;
  } }, t = 0, i = function(n2) {
    return null != n2 && void 0 === n2.constructor;
  }, $.prototype.setState = function(n2, t20) {
    var i3 = this.__s;
    i3 && i3 != this.state || (i3 = this.__s = w({}, this.state)), "function" == typeof n2 && (n2 = n2(w({}, i3), this.props)), n2 && (w(i3, n2), this.__v && (t20 && this.__k.push(t20), C(this)));
  }, $.prototype.forceUpdate = function(n2) {
    this.__v && (this.__g |= 4, n2 && this.__h.push(n2), C(this));
  }, $.prototype.render = M, r = [], f = 0, o = function(n2, t20) {
    return n2.__v.__b - t20.__v.__b;
  }, e = /* @__PURE__ */ Symbol(), l = /(PointerCapture)$|Capture$/i, c = 0, a = {}, s = 0;

  // node_modules/preact/hooks/dist/hooks.mjs
  var t2;
  var r2;
  var u2;
  var i2;
  var o2 = Object.is;
  var f2 = 0;
  var c2 = [];
  var e2 = [];
  var a2 = n;
  var v2 = a2.__b;
  var l2 = a2.__r;
  var m = a2.diffed;
  var s2 = a2.__c;
  var h2 = a2.unmount;
  var p2 = a2.__;
  function y2(n2, t20) {
    a2.__h && a2.__h(r2, n2, f2 || t20), f2 = 0;
    var u4 = r2.__H || (r2.__H = { __: [], __h: [] });
    return n2 >= u4.__.length && u4.__.push({}), u4.__[n2];
  }
  function d2(n2) {
    return f2 = 1, _2(G2, n2);
  }
  function _2(n2, u4, i3) {
    var f3 = y2(t2++, 2);
    if (f3.t = n2, !f3.__c && (f3.__ = [i3 ? i3(u4) : G2(void 0, u4), function(n3) {
      var t20 = f3.__N ? f3.__N[0] : f3.__[0], r3 = f3.t(t20, n3);
      o2(t20, r3) || (f3.__N = [r3, f3.__[1]], f3.__c.setState({}));
    }], f3.__c = r2, !r2.__f)) {
      r2.__f = true;
      var c3 = r2.shouldComponentUpdate;
      r2.shouldComponentUpdate = function(n3, t20, r3) {
        var u5 = this.__H;
        if (!u5) return true;
        var i4 = false, f4 = this.props != n3;
        if (u5.__.some(function(n4) {
          n4.__N && (i4 = true, o2(n4.__[0], n4.__N[0]) || (f4 = true));
        }), c3) {
          var e3 = c3.call(this, n3, t20, r3);
          return i4 ? e3 || f4 : e3;
        }
        return !i4 || f4;
      };
    }
    return f3.__;
  }
  function A(n2, u4) {
    var i3 = y2(t2++, 3);
    !a2.__s && E2(i3.__H, u4) && (i3.__P = true, i3.__ = n2, i3.u = u4, r2.__H.__h.push(i3));
  }
  function T2(n2) {
    return f2 = 5, b2(function() {
      return { current: n2 };
    }, []);
  }
  function b2(n2, r3) {
    var u4 = y2(t2++, 7);
    return E2(u4.__H, r3) && (u4.__ = n2(), u4.__H = r3), u4.__;
  }
  function w2(n2) {
    var u4 = r2.context[n2.__c], i3 = y2(t2++, 9);
    return i3.c = n2, u4 ? (null == i3.__ && (i3.__ = true, u4.sub(r2)), u4.props.value) : n2.__;
  }
  function g2() {
    var n2;
    do {
      for (; n2 = e2.shift(); ) try {
        C2(n2);
      } catch (t21) {
        a2.__e(t21, { __: (n2 = n2.__P) && n2.__v });
      }
      for (; n2 = c2.shift(); ) {
        var t20 = n2.__H;
        if (n2.__P && t20) try {
          t20.__h.some(C2), t20.__h.some(D2), t20.__h = [];
        } catch (r3) {
          t20.__h = [], a2.__e(r3, n2.__v);
        }
      }
    } while (e2.length);
  }
  a2.__b = function(n2) {
    r2 = null, v2 && v2(n2);
  }, a2.__ = function(n2, t20) {
    n2 && t20.__k && t20.__k.__m && (n2.__m = t20.__k.__m), p2 && p2(n2, t20);
  }, a2.__r = function(n2) {
    l2 && l2(n2), t2 = 0;
    var i3 = (r2 = n2.__c).__H;
    i3 && (u2 == r2 ? r2.__h = [] : (i3.__h.some(C2), i3.__h.some(D2), t2 = 0), i3.__h = [], i3.__.some(function(n3) {
      n3.__N && (n3.__ = n3.__N), n3.u = n3.__N = void 0;
    })), u2 = r2;
  }, a2.diffed = function(n2) {
    m && m(n2);
    var t20 = n2.__c;
    t20 && t20.__H && (t20.__H.__h.length && B2(c2.push(t20)), t20.__H.__.some(function(n3) {
      n3.u && (n3.__H = n3.u);
    })), u2 = r2 = null;
  }, a2.__c = function(n2, t20) {
    t20.some(function(n3) {
      try {
        n3.__h.some(C2), n3.__h = n3.__h.filter(function(n4) {
          return !n4.__ || D2(n4);
        });
      } catch (r3) {
        t20.some(function(n4) {
          n4.__h && (n4.__h = []);
        }), t20 = [], a2.__e(r3, n3.__v);
      }
    }), s2 && s2(n2, t20);
  }, a2.unmount = function(n2) {
    h2 && h2(n2);
    var t20, r3, u4 = n2.__c;
    u4 && u4.__H && (u4.__H.__.some(function(u5) {
      try {
        if (u5.__P && u5.__c) {
          if (void 0 === r3) {
            for (r3 = n2.__; r3 && (!r3.__c || !r3.__c.__P); ) r3 = r3.__;
            r3 = r3 && r3.__c;
          }
          u5.__P = r3, B2(e2.push(u5));
        } else C2(u5);
      } catch (n3) {
        t20 = n3;
      }
    }), u4.__H = void 0, t20 && a2.__e(t20, u4.__v));
  };
  var k = "function" == typeof requestAnimationFrame;
  function z2(n2) {
    var t20, r3 = function() {
      clearTimeout(u4), k && cancelAnimationFrame(t20), setTimeout(n2);
    }, u4 = setTimeout(r3, 35);
    k && (t20 = requestAnimationFrame(r3));
  }
  function B2(n2) {
    1 != n2 && i2 == a2.requestAnimationFrame || ((i2 = a2.requestAnimationFrame) || z2)(g2);
  }
  function C2(n2) {
    var t20 = r2, u4 = n2.__c;
    "function" == typeof u4 && (n2.__c = void 0, u4()), r2 = t20;
  }
  function D2(n2) {
    var t20 = r2;
    n2.__c = n2.__(), r2 = t20;
  }
  function E2(n2, t20) {
    return !n2 || n2.length != t20.length || t20.some(function(t21, r3) {
      return !o2(t21, n2[r3]);
    });
  }
  function G2(n2, t20) {
    return "function" == typeof t20 ? t20(n2) : t20;
  }

  // src/core/store.ts
  var Store = class {
    #value;
    #listeners = /* @__PURE__ */ new Set();
    constructor(initial) {
      this.#value = initial;
    }
    get() {
      return this.#value;
    }
    set(next) {
      if (Object.is(next, this.#value)) return;
      const previous = this.#value;
      this.#value = next;
      for (const listener of [...this.#listeners]) listener(next, previous);
    }
    update(fn) {
      this.set(fn(this.#value));
    }
    subscribe(listener) {
      this.#listeners.add(listener);
      return () => this.#listeners.delete(listener);
    }
  };
  function useStore(store, select) {
    const pick = (value2) => select ? select(value2) : value2;
    const [slice, setSlice] = d2(() => pick(store.get()));
    A(() => {
      setSlice(() => pick(store.get()));
      return store.subscribe((value2) => setSlice(() => pick(value2)));
    }, [store]);
    return slice;
  }

  // src/site/searchId.ts
  function isEncodedSearchId(id) {
    return id.startsWith("H4sI");
  }
  var MAX_DECODED_BYTES = 256 * 1024;
  async function decodeSearchId(id) {
    if (!isEncodedSearchId(id)) return null;
    try {
      const base64 = id.replace(/-/g, "+").replace(/_/g, "/");
      const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
      const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
      const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let text2 = "";
      let size = 0;
      for (; ; ) {
        const { done, value: value2 } = await reader.read();
        if (done) break;
        size += value2.byteLength;
        if (size > MAX_DECODED_BYTES) {
          void reader.cancel().catch(() => {
          });
          return null;
        }
        text2 += decoder.decode(value2, { stream: true });
      }
      return JSON.parse(text2 + decoder.decode());
    } catch {
      return null;
    }
  }

  // src/app/currentSearch.ts
  function trackCurrentSearch(location2, bridge2) {
    const current = new Store(null);
    let lastCaptured = null;
    let generation = 0;
    const refresh = async (next) => {
      const run = ++generation;
      if (!next?.id) return current.set(null);
      const id = next.id;
      if (lastCaptured?.id === id) {
        return current.set({ location: { ...next, id }, payload: lastCaptured.payload, total: lastCaptured.total });
      }
      current.set({ location: { ...next, id }, payload: null, total: null });
      const decoded = await decodeSearchId(id);
      if (run !== generation || !decoded) return;
      current.set({ location: { ...next, id }, payload: { query: decoded }, total: null });
    };
    bridge2.events.on("search", (captured) => {
      lastCaptured = { id: captured.response.id, payload: captured.request, total: captured.response.total };
      void refresh(location2.get());
    });
    location2.subscribe((next) => void refresh(next));
    void refresh(location2.get());
    return current;
  }

  // src/core/log.ts
  var PREFIX = "[ptm]";
  var log = {
    debug: (...args) => console.debug(PREFIX, ...args),
    info: (...args) => console.info(PREFIX, ...args),
    warn: (...args) => console.warn(PREFIX, ...args),
    error: (...args) => console.error(PREFIX, ...args)
  };

  // src/core/storage.ts
  var PREFIX2 = "ptm:";
  var GmStorage = class {
    /** Last raw string this tab read or wrote per key, to detect changes from other tabs. */
    #known = /* @__PURE__ */ new Map();
    async get(key) {
      return parse(key, await this.getRaw(key));
    }
    async getRaw(key) {
      const raw = await GM.getValue(PREFIX2 + key, void 0);
      this.#known.set(key, raw);
      return raw;
    }
    async set(key, value2) {
      const raw = JSON.stringify(value2);
      this.#known.set(key, raw);
      await GM.setValue(PREFIX2 + key, raw);
    }
    async delete(key) {
      this.#known.set(key, void 0);
      await GM.deleteValue(PREFIX2 + key);
    }
    onRemoteChange(key, callback) {
      if (typeof GM_addValueChangeListener !== "function") {
        const check = async () => {
          if (document.visibilityState !== "visible") return;
          const raw = await GM.getValue(PREFIX2 + key, void 0);
          if (raw === this.#known.get(key)) return;
          this.#known.set(key, raw);
          callback(parse(key, raw));
        };
        const onEvent = () => void check().catch((error) => log.error(`re-reading "${key}" failed`, error));
        window.addEventListener("focus", onEvent);
        document.addEventListener("visibilitychange", onEvent);
        return () => {
          window.removeEventListener("focus", onEvent);
          document.removeEventListener("visibilitychange", onEvent);
        };
      }
      const id = GM_addValueChangeListener(PREFIX2 + key, (_name, _old, value2, remote) => {
        if (remote) callback(parse(key, value2));
      });
      return () => GM_removeValueChangeListener(id);
    }
  };
  function parse(key, raw) {
    if (raw === void 0 || raw === null) return void 0;
    try {
      return JSON.parse(raw);
    } catch (error) {
      log.error(`stored value "${key}" is not valid JSON, ignoring it`, error);
      return void 0;
    }
  }
  async function persistedStore(storage, key, options) {
    const decode = (envelope) => {
      if (!envelope || typeof envelope !== "object" || !("data" in envelope)) return { ok: false };
      const { schema, data } = envelope;
      if (schema === options.schema) return { ok: true, value: data };
      if (!(schema < options.schema) || !options.migrate) return { ok: false };
      try {
        return { ok: true, value: options.migrate(data, schema) };
      } catch (error) {
        log.error(`migration of "${key}" from schema ${schema} failed`, error);
        return { ok: false };
      }
    };
    let initial = options.defaultValue;
    const raw = await storage.getRaw(key);
    if (raw !== void 0 && raw !== null) {
      let reason;
      try {
        const result = decode(JSON.parse(raw));
        if (result.ok) initial = result.value;
        else reason = "unknown schema or shape";
      } catch {
        reason = "invalid JSON";
      }
      if (reason) {
        log.error(`stored value "${key}" could not be loaded (${reason}), backed up to "${key}:backup"`);
        await storage.set(`${key}:backup`, raw).catch((error) => {
          log.error(`backing up "${key}" failed`, error);
        });
      }
    }
    const store = new Store(initial);
    let applyingRemote = false;
    store.subscribe((value2) => {
      if (applyingRemote) return;
      storage.set(key, { schema: options.schema, data: value2 }).catch((error) => {
        log.error(`saving "${key}" failed`, error);
      });
    });
    storage.onRemoteChange(key, (envelope) => {
      const result = decode(envelope);
      if (!result.ok) {
        log.warn(`ignoring remote change of "${key}" with unknown schema or shape`);
        return;
      }
      applyingRemote = true;
      try {
        store.set(result.value);
      } finally {
        applyingRemote = false;
      }
    });
    return store;
  }

  // src/app/settings.ts
  var DEFAULT_SETTINGS = {
    features: {},
    sidebarCollapsed: false,
    activeTab: null,
    language: "auto"
  };
  function loadSettings(storage) {
    return persistedStore(storage, "settings", {
      schema: 1,
      defaultValue: DEFAULT_SETTINGS
    });
  }
  function isFeatureEnabled(settings, id, defaultEnabled) {
    return settings.features[id] ?? defaultEnabled;
  }

  // src/app/featureHost.ts
  var FeatureHost = class {
    constructor(features2, ctx) {
      this.features = features2;
      this.ctx = ctx;
    }
    features;
    ctx;
    running = new Store([]);
    #instances = /* @__PURE__ */ new Map();
    #starting = /* @__PURE__ */ new Set();
    #stopped = false;
    /** Starts the enabled `early` features before the page's Vue app is ready. No settings subscription. */
    startEarly() {
      for (const feature of this.features) {
        if (feature.early && this.#wanted(feature) && !this.#instances.has(feature.id) && !this.#starting.has(feature.id)) {
          void this.#startFeature(feature);
        }
      }
    }
    start() {
      const sync = () => {
        for (const feature of this.features) {
          const enabled = this.#wanted(feature);
          const running = this.#instances.has(feature.id) || this.#starting.has(feature.id);
          if (enabled && !running) void this.#startFeature(feature);
          if (!enabled && running) this.#stopFeature(feature);
        }
      };
      sync();
      const off = this.ctx.settings.subscribe(sync);
      return () => {
        off();
        for (const feature of this.features) this.#stopFeature(feature);
      };
    }
    /** Stops every feature for good, e.g. when the trade app never becomes ready. */
    stop() {
      this.#stopped = true;
      for (const feature of this.features) this.#stopFeature(feature);
    }
    /**
     * Stops and starts every running feature again, e.g. after a language switch: features that
     * render into the trade page resolve their texts when they start.
     */
    async restart() {
      const running = this.features.filter((feature) => this.#instances.has(feature.id));
      for (const feature of running) this.#stopFeature(feature);
      await Promise.all(running.map((feature) => this.#startFeature(feature)));
    }
    async #startFeature(feature) {
      this.#starting.add(feature.id);
      let style;
      try {
        if (feature.css) {
          style = this.ctx.doc.createElement("style");
          style.dataset.ptmFeature = feature.id;
          style.textContent = feature.css;
          this.ctx.doc.head.append(style);
        }
        const instance = await feature.start(this.ctx);
        if (this.#stopped || !this.#wanted(feature)) {
          try {
            instance?.dispose?.();
          } finally {
            style?.remove();
          }
          return;
        }
        this.#instances.set(feature.id, { instance, style });
        this.#publish();
      } catch (error) {
        style?.remove();
        log.error(`feature "${feature.id}" failed to start`, error);
      } finally {
        this.#starting.delete(feature.id);
      }
    }
    #wanted(feature) {
      return !feature.toggleable || isFeatureEnabled(this.ctx.settings.get(), feature.id, feature.defaultEnabled);
    }
    #stopFeature(feature) {
      const entry = this.#instances.get(feature.id);
      if (!entry) return;
      this.#instances.delete(feature.id);
      try {
        entry.instance?.dispose?.();
      } catch (error) {
        log.error(`feature "${feature.id}" failed to stop`, error);
      }
      entry.style?.remove();
      this.#publish();
    }
    #publish() {
      this.running.set(
        this.features.filter((feature) => this.#instances.has(feature.id)).map((feature) => ({ feature, Panel: this.#instances.get(feature.id)?.instance?.Panel }))
      );
    }
  };

  // src/app/leagues.ts
  var LeagueService = class {
    /** League of the trade page the user is on. Remembered when visiting history or settings. */
    current;
    constructor(location2) {
      this.current = new Store(location2.get()?.league ?? null);
      location2.subscribe((next) => {
        if (next) this.current.set(next.league);
      });
    }
  };

  // src/app/toaster.ts
  var DURATIONS = { success: 4500, warning: 8e3, error: void 0 };
  function createToaster() {
    const toasts = new Store([]);
    let nextId = 1;
    const dismiss = (id) => toasts.update((list) => list.filter((toast2) => toast2.id !== id));
    const toast = ((message, kind = "success") => {
      if (toasts.get().some((entry) => entry.kind === kind && entry.message === message)) return;
      const id = nextId++;
      toasts.update((list) => [...list, { id, kind, message }]);
      const duration = DURATIONS[kind];
      if (duration !== void 0) setTimeout(() => dismiss(id), duration);
    });
    toast.toasts = toasts;
    toast.dismiss = dismiss;
    return toast;
  }

  // src/core/i18n.ts
  var currentLocale = "en";
  function setLocale(locale) {
    currentLocale = locale;
  }
  function getLocale() {
    return currentLocale;
  }
  function detectLocale(hostname) {
    return hostname.startsWith("de.") ? "de" : "en";
  }
  function createTranslator(messages) {
    return (key, params) => {
      const template = messages[currentLocale][key] ?? messages.en[key] ?? key;
      if (!params) return template;
      return template.replace(
        /\{(\w+)\}/g,
        (match, name) => name in params ? String(params[name]) : match
      );
    };
  }

  // node_modules/preact/jsx-runtime/dist/jsxRuntime.mjs
  var o3 = 0;
  function u3(t20, e3, n2, f3, u4, i3) {
    e3 || (e3 = {});
    var a3, c3, l3 = e3;
    if ("ref" in l3 && "function" != typeof t20) for (c3 in l3 = {}, e3) "ref" == c3 ? a3 = e3[c3] : l3[c3] = e3[c3];
    var p3 = { type: t20, props: l3, key: n2, ref: a3, __k: null, __: null, __b: 0, __e: null, __c: null, constructor: void 0, __v: --o3, __i: -1, __u: 0 };
    return (u4 || i3) && (p3.__source = u4, p3.__self = i3), n.vnode && n.vnode(p3), p3;
  }

  // src/ui/icons.tsx
  function icon(paths) {
    return ({ size = 14, ...props }) => /* @__PURE__ */ u3(
      "svg",
      {
        class: "ptm-icon",
        width: size,
        height: size,
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        "stroke-width": "2.2",
        "stroke-linecap": "round",
        "stroke-linejoin": "round",
        "aria-hidden": "true",
        ...props,
        children: paths
      }
    );
  }
  var IconChevronDown = icon(/* @__PURE__ */ u3("path", { d: "m6 9 6 6 6-6" }));
  var IconChevronLeft = icon(/* @__PURE__ */ u3("path", { d: "m15 18-6-6 6-6" }));
  var IconChevronRight = icon(/* @__PURE__ */ u3("path", { d: "m9 18 6-6-6-6" }));
  var IconClose = icon(/* @__PURE__ */ u3("path", { d: "M18 6 6 18M6 6l12 12" }));
  var IconPlus = icon(/* @__PURE__ */ u3("path", { d: "M12 5v14M5 12h14" }));
  var IconMinus = icon(/* @__PURE__ */ u3("path", { d: "M5 12h14" }));
  var IconCheck = icon(/* @__PURE__ */ u3("path", { d: "M20 6 9 17l-5-5" }));
  var IconEllipsis = icon(
    /* @__PURE__ */ u3(M, { children: [
      /* @__PURE__ */ u3("circle", { cx: "5", cy: "12", r: "1.2" }),
      /* @__PURE__ */ u3("circle", { cx: "12", cy: "12", r: "1.2" }),
      /* @__PURE__ */ u3("circle", { cx: "19", cy: "12", r: "1.2" })
    ] })
  );
  var IconGrip = icon(
    /* @__PURE__ */ u3(M, { children: [6, 12, 18].map((cy) => [9, 15].map((cx) => /* @__PURE__ */ u3("circle", { cx, cy, r: "1.5", fill: "currentColor", stroke: "none" }, `${cx}-${cy}`))) })
  );
  var IconFolder = icon(/* @__PURE__ */ u3("path", { d: "M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.7-.9l-.8-1.2A2 2 0 0 0 7.9 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" }));
  var IconFolderPlus = icon(
    /* @__PURE__ */ u3(M, { children: [
      /* @__PURE__ */ u3("path", { d: "M12 10v6M9 13h6" }),
      /* @__PURE__ */ u3("path", { d: "M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.7-.9l-.8-1.2A2 2 0 0 0 7.9 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" })
    ] })
  );
  var IconHistory = icon(
    /* @__PURE__ */ u3(M, { children: [
      /* @__PURE__ */ u3("path", { d: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" }),
      /* @__PURE__ */ u3("path", { d: "M3 3v5h5M12 7v5l4 2" })
    ] })
  );
  var IconPin = icon(/* @__PURE__ */ u3("path", { d: "M12 17v5M9 10.8a2 2 0 0 1-1.1 1.8l-1.8.9A2 2 0 0 0 5 15.2V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.8a2 2 0 0 0-1.1-1.8l-1.8-.9a2 2 0 0 1-1.1-1.8V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" }));
  var IconSettings = icon(
    /* @__PURE__ */ u3(M, { children: [
      /* @__PURE__ */ u3("path", { d: "M12.2 2h-.4a2 2 0 0 0-2 2v.2a2 2 0 0 1-1 1.7l-.4.3a2 2 0 0 1-2 0l-.2-.1a2 2 0 0 0-2.7.7l-.2.4a2 2 0 0 0 .7 2.7l.2.1a2 2 0 0 1 1 1.7v.5a2 2 0 0 1-1 1.7l-.2.1a2 2 0 0 0-.7 2.7l.2.4a2 2 0 0 0 2.7.7l.2-.1a2 2 0 0 1 2 0l.4.3a2 2 0 0 1 1 1.7v.2a2 2 0 0 0 2 2h.4a2 2 0 0 0 2-2v-.2a2 2 0 0 1 1-1.7l.4-.3a2 2 0 0 1 2 0l.2.1a2 2 0 0 0 2.7-.7l.2-.4a2 2 0 0 0-.7-2.7l-.2-.1a2 2 0 0 1-1-1.7v-.5a2 2 0 0 1 1-1.7l.2-.1a2 2 0 0 0 .7-2.7l-.2-.4a2 2 0 0 0-2.7-.7l-.2.1a2 2 0 0 1-2 0l-.4-.3a2 2 0 0 1-1-1.7V4a2 2 0 0 0-2-2z" }),
      /* @__PURE__ */ u3("circle", { cx: "12", cy: "12", r: "3" })
    ] })
  );
  var IconTrash = icon(/* @__PURE__ */ u3("path", { d: "M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" }));
  var IconEdit = icon(/* @__PURE__ */ u3("path", { d: "M12 20h9M16.4 3.6a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4Z" }));
  var IconCopy = icon(
    /* @__PURE__ */ u3(M, { children: [
      /* @__PURE__ */ u3("rect", { x: "9", y: "9", width: "13", height: "13", rx: "2" }),
      /* @__PURE__ */ u3("path", { d: "M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" })
    ] })
  );
  var IconBolt = icon(/* @__PURE__ */ u3("path", { d: "M13 2 3 14h9l-1 8 10-12h-9l1-8z" }));
  var IconArchive = icon(
    /* @__PURE__ */ u3(M, { children: [
      /* @__PURE__ */ u3("rect", { x: "2", y: "3", width: "20", height: "5", rx: "1" }),
      /* @__PURE__ */ u3("path", { d: "M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8M10 12h4" })
    ] })
  );
  var IconUndo = icon(/* @__PURE__ */ u3("path", { d: "M3 7v6h6M21 17a9 9 0 0 0-15-6.7L3 13" }));
  var IconDownload = icon(/* @__PURE__ */ u3("path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" }));
  var IconUpload = icon(/* @__PURE__ */ u3("path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" }));
  var IconStar = icon(/* @__PURE__ */ u3("path", { d: "m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z" }));
  var IconCompress = icon(/* @__PURE__ */ u3("path", { d: "M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7" }));
  var IconSave = icon(
    /* @__PURE__ */ u3(M, { children: [
      /* @__PURE__ */ u3("path", { d: "M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" }),
      /* @__PURE__ */ u3("path", { d: "M17 21v-8H7v8M7 3v5h8" })
    ] })
  );
  var IconLink = icon(/* @__PURE__ */ u3("path", { d: "M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" }));
  var IconWarning = icon(/* @__PURE__ */ u3("path", { d: "m21.7 18-8-14a2 2 0 0 0-3.4 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3ZM12 9v4M12 17h.01" }));

  // src/features/bookmarks/feature.css
  var feature_default = ".ptm-bm {\n  display: flex;\n  flex-direction: column;\n  gap: 8px;\n}\n\n.ptm-bm .ptm-toolbar {\n  margin-bottom: 0;\n}\n\n.ptm-bm-folders,\n.ptm-bm-trades {\n  margin: 0;\n  padding: 0;\n  list-style: none;\n}\n\n.ptm-bm-folders {\n  display: grid;\n  gap: 6px;\n}\n\n/* Folder */\n\n.ptm-bm-folder {\n  border: 1px solid var(--ptm-blue-border);\n  background: var(--ptm-surface);\n}\n\n.ptm-bm-folder__header {\n  display: flex;\n  align-items: center;\n  gap: 4px;\n  padding-right: 4px;\n  background: var(--ptm-blue);\n  transition: background-color 0.2s;\n}\n\n.ptm-bm-folder__header:hover {\n  background: var(--ptm-blue-hover);\n}\n\n.ptm-bm-folder__toggle {\n  flex: 1;\n  min-width: 0;\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  min-height: 36px;\n  padding: 4px 6px 4px 8px;\n  border: 0;\n  background: none;\n  font-family: var(--ptm-font-title) !important;\n  font-size: 15px;\n  text-align: left;\n  cursor: pointer;\n}\n\n.ptm-bm-folder__icon {\n  flex: none;\n  width: 26px;\n  height: 26px;\n  object-fit: contain;\n}\n\n.ptm-bm-folder__title {\n  flex: 1;\n  min-width: 0;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n\n.ptm-bm-chevron {\n  display: inline-flex;\n  transition: transform 0.2s;\n}\n\n.ptm-bm-chevron--open {\n  transform: rotate(180deg);\n}\n\n.ptm-bm-folder__divider {\n  flex: none;\n  width: 1px;\n  height: 15px;\n  background: var(--ptm-blue-border);\n}\n\n.ptm-bm-folder__body {\n  display: grid;\n  gap: 6px;\n  padding-bottom: 6px;\n}\n\n.ptm-bm-folder__empty {\n  margin: 0;\n  padding: 6px 7px 0;\n  font-size: 11px;\n  color: var(--ptm-muted);\n}\n\n.ptm-bm-save {\n  display: block;\n  padding: 0 6px;\n}\n\n/* Trades */\n\n.ptm-bm-trade {\n  display: flex;\n  align-items: center;\n  gap: 4px;\n  padding: 6px 4px 6px 7px;\n  border-bottom: 1px solid var(--ptm-blue-line);\n}\n\n.ptm-bm-trade:hover,\n.ptm-bm-trade:focus-within {\n  background: linear-gradient(to right, rgba(138, 86, 9, 0.4), transparent);\n}\n\n.ptm-bm-trade__check {\n  display: inline-flex;\n  color: var(--ptm-green-border);\n}\n\n.ptm-bm-trade__title {\n  flex: 1;\n  min-width: 0;\n  overflow: hidden;\n  font-family: var(--ptm-font-title);\n  font-size: 14px;\n  color: var(--ptm-text);\n  text-decoration: none;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n\n.ptm-bm-trade__title:hover {\n  color: var(--ptm-beige);\n}\n\n.ptm-bm-trade--current {\n  box-shadow: inset 3px 0 0 var(--ptm-gold-border);\n}\n\n.ptm-bm-trade--current .ptm-bm-trade__title {\n  color: var(--ptm-beige);\n}\n\n.ptm-bm-trade--completed .ptm-bm-trade__title {\n  opacity: 0.5;\n}\n\n.ptm-bm-badge {\n  flex: none;\n  padding: 1px 5px;\n  border: 1px solid var(--ptm-yellow-border);\n  background: var(--ptm-yellow);\n  font-size: 11px;\n  color: var(--ptm-text);\n  white-space: nowrap;\n}\n\n.ptm-bm-handle {\n  cursor: grab;\n  touch-action: none;\n}\n\n.ptm-bm-dragging {\n  opacity: 0.4;\n}\n\nhtml.ptm-bm-sorting,\nhtml.ptm-bm-sorting * {\n  cursor: grabbing !important;\n  user-select: none !important;\n}\n\n.ptm-bm-drop-line {\n  position: fixed;\n  z-index: 1300;\n  height: 2px;\n  background: var(--ptm-gold-border);\n  box-shadow: 0 0 4px var(--ptm-gold-border);\n  pointer-events: none;\n}\n\n/* Actions and backup (layout comes from .ptm-actions and .ptm-btn-group in core.css) */\n\n.ptm-bm-backup {\n  padding-top: 10px;\n  border-top: 1px solid var(--ptm-blue-line);\n}\n\n/* Modals */\n\n.ptm-bm-form {\n  display: grid;\n  gap: 14px;\n}\n\n.ptm-bm-preview {\n  margin: 0;\n  font-family: var(--ptm-font-title);\n  font-size: 15px;\n  color: var(--ptm-beige);\n}\n\n.ptm-bm-icons {\n  display: grid;\n  gap: 10px;\n}\n\n.ptm-bm-icons__grid {\n  display: grid;\n  gap: 6px;\n}\n\n.ptm-bm-icons__grid--currency {\n  grid-template-columns: repeat(auto-fill, 50px);\n}\n\n.ptm-bm-icons__grid--ascendancy {\n  grid-template-columns: repeat(auto-fill, 75px);\n}\n\n.ptm-bm-icons__cell {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  padding: 4px;\n  border: 1px solid transparent;\n  background: rgba(255, 255, 255, 0.04);\n  cursor: pointer;\n  transition: background-color 0.2s, border-color 0.2s;\n}\n\n.ptm-bm-icons__grid--currency .ptm-bm-icons__cell {\n  width: 50px;\n  height: 50px;\n}\n\n.ptm-bm-icons__grid--ascendancy .ptm-bm-icons__cell {\n  width: 75px;\n  height: 75px;\n}\n\n.ptm-bm-icons__cell img {\n  max-width: 100%;\n  max-height: 100%;\n  object-fit: contain;\n}\n\n.ptm-bm-icons__cell:hover {\n  background: rgba(138, 86, 9, 0.25);\n}\n\n.ptm-bm-icons__cell[aria-pressed='true'] {\n  border-color: var(--ptm-gold-border);\n  background: rgba(138, 86, 9, 0.5);\n}\n";

  // src/features/bookmarks/messages.ts
  var t3 = createTranslator({
    de: {
      label: "Lesezeichen",
      description: "Suchen in Ordnern speichern, in jeder League wieder öffnen.",
      collapseFolders: "Ordner einklappen",
      showArchive: "Archiv anzeigen",
      hideArchive: "Zurück zu aktiven Ordnern",
      empty: "Lege einen Ordner an und speichere darin deine Suchen. Sie funktionieren in jeder neuen League. Von Better Trading? Lade dein Backup über „Backup laden“.",
      emptyArchive: "Keine archivierten Ordner.",
      emptyFolder: "Noch keine Suchen in diesem Ordner.",
      folderMenu: "Ordner-Aktionen",
      tradeMenu: "Aktionen für die Suche",
      dragFolder: "Ordner verschieben (Pfeiltasten oder ziehen)",
      dragTrade: "Suche verschieben (Pfeiltasten oder ziehen)",
      expand: "Ordner aufklappen",
      collapse: "Ordner zuklappen",
      archived: "Archiviert",
      edit: "Bearbeiten",
      archive: "Archivieren",
      restore: "Wiederherstellen",
      delete: "Löschen",
      share: "Teilen",
      deleteFolderTitle: "Ordner löschen",
      deleteFolderMessage: "Ordner „{title}“ mit {n} Suchen endgültig löschen?",
      deleteTradeTitle: "Suche löschen",
      deleteTradeMessage: "Suche „{title}“ löschen?",
      shareTitle: "Ordner teilen",
      shareHint: "Mit diesem Code kann jemand den Ordner importieren, auch in Better Trading.",
      copy: "Kopieren",
      copied: "In die Zwischenablage kopiert.",
      copyFailed: "Kopieren hat nicht geklappt.",
      completed: "Erledigt",
      otherLeague: "andere League",
      savedIn: "Gespeichert in {league}",
      copyUrl: "URL kopieren",
      live: "Live-Suche",
      overwrite: "Mit aktueller Suche überschreiben",
      overwritten: "„{title}“ zeigt jetzt auf die aktuelle Suche.",
      markCompleted: "Als erledigt markieren",
      markOpen: "Als offen markieren",
      rename: "Umbenennen",
      renameTitle: "Suche umbenennen",
      check: "In aktueller League prüfen",
      checkOk: "Alle Stats gibt es in {league}.",
      checkUnknown: "{n} Stats gibt es nicht mehr: {ids}",
      checkNoQuery: "Für diese Suche ist keine Abfrage gespeichert.",
      checkFailed: "Die Stat-Liste konnte nicht geladen werden.",
      saveCurrent: "Aktuelle Suche speichern",
      saveCurrentDisabled: "Öffne zuerst eine Suche.",
      saveTitle: "Suche speichern",
      saved: "Suche gespeichert.",
      title: "Titel",
      icon: "Icon",
      save: "Speichern",
      newFolder: "Neuer Ordner",
      editFolder: "Ordner bearbeiten",
      importFolder: "Ordner importieren",
      importCode: "Ordner-Code",
      importHint: "Code aus PoE2 Trade Monkey oder Better Trading einfügen.",
      importPreview: "{title} ({n} Suchen)",
      import: "Importieren",
      imported: "Ordner „{title}“ importiert.",
      backup: "Backup",
      saveBackup: "Backup speichern",
      loadBackup: "Backup laden",
      backupTooLarge: "Die Datei ist zu groß für ein Backup (max. 5 MB).",
      backupFailed: "Das Backup konnte nicht gelesen werden.",
      backupMerged: "{folders} Ordner und {trades} Suchen neu, {skipped} übersprungen. Vorhandenes bleibt, nichts wird doppelt angelegt.",
      alreadySaved: "In diesem Ordner gespeichert",
      alreadySavedHint: "Die aktuelle Suche liegt schon in diesem Ordner. Zum Aktualisieren im Menü der Suche „Mit aktueller Suche überschreiben“ wählen."
    },
    en: {
      label: "Bookmarks",
      description: "Save searches in folders and reopen them in any league.",
      collapseFolders: "Collapse folders",
      showArchive: "Show archive",
      hideArchive: "Back to active folders",
      empty: 'Create a folder and save your searches in it. They work in every new league. Coming from Better Trading? Use "Load backup".',
      emptyArchive: "No archived folders.",
      emptyFolder: "No searches in this folder yet.",
      folderMenu: "Folder actions",
      tradeMenu: "Search actions",
      dragFolder: "Move folder (arrow keys or drag)",
      dragTrade: "Move search (arrow keys or drag)",
      expand: "Expand folder",
      collapse: "Collapse folder",
      archived: "Archived",
      edit: "Edit",
      archive: "Archive",
      restore: "Restore",
      delete: "Delete",
      share: "Export",
      deleteFolderTitle: "Delete folder",
      deleteFolderMessage: 'Delete folder "{title}" with {n} searches for good?',
      deleteTradeTitle: "Delete search",
      deleteTradeMessage: 'Delete search "{title}"?',
      shareTitle: "Export folder",
      shareHint: "Anyone can import the folder with this code, Better Trading too.",
      copy: "Copy",
      copied: "Copied to the clipboard.",
      copyFailed: "Copying failed.",
      completed: "Completed",
      otherLeague: "other league",
      savedIn: "Saved in {league}",
      copyUrl: "Copy URL",
      live: "Live search",
      overwrite: "Overwrite with current search",
      overwritten: '"{title}" now points to the current search.',
      markCompleted: "Mark as completed",
      markOpen: "Mark as open",
      rename: "Rename",
      renameTitle: "Rename search",
      check: "Check in current league",
      checkOk: "All stats exist in {league}.",
      checkUnknown: "{n} stats no longer exist: {ids}",
      checkNoQuery: "No query is stored for this search.",
      checkFailed: "Could not load the stat list.",
      saveCurrent: "Save current search",
      saveCurrentDisabled: "Open a search first.",
      saveTitle: "Save search",
      saved: "Search saved.",
      title: "Title",
      icon: "Icon",
      save: "Save",
      newFolder: "New folder",
      editFolder: "Edit folder",
      importFolder: "Import folder",
      importCode: "Folder code",
      importHint: "Paste a code from PoE2 Trade Monkey or Better Trading.",
      importPreview: "{title} ({n} searches)",
      import: "Import",
      imported: 'Imported folder "{title}".',
      backup: "Backup",
      saveBackup: "Save backup",
      loadBackup: "Load backup",
      backupTooLarge: "The file is too large for a backup (max 5 MB).",
      backupFailed: "Could not read the backup.",
      backupMerged: "{folders} folders and {trades} searches added, {skipped} skipped. Existing ones stay, nothing is duplicated.",
      alreadySaved: "Saved in this folder",
      alreadySavedHint: 'The current search is already in this folder. To update it, use "Overwrite with current search" in its menu.'
    }
  });

  // src/site/searchTitle.ts
  function suggestTitle(source, filterOptions) {
    const name = text(source.name);
    const type = text(source.type);
    if (name && type) return `${name} ${type}`;
    if (name || type) return name || type;
    if (source.term) return source.term;
    const category = optionText(source, "type_filters", "category", filterOptions);
    const rarity = optionText(source, "type_filters", "rarity", filterOptions);
    if (category && rarity) return `${category} (${rarity})`;
    return category ?? rarity ?? "";
  }
  function text(value2) {
    if (!value2) return null;
    return typeof value2 === "string" ? value2 : value2.option || null;
  }
  function optionText(source, group, filter, filterOptions) {
    const selected = source.filters?.[group]?.filters?.[filter];
    const id = selected?.option;
    if (!id) return null;
    return filterOptions?.get(`${group}.${filter}`)?.find((option) => option.id === id)?.text ?? humanize(id);
  }
  function humanize(id) {
    const last = id.split(".").pop() ?? id;
    return last.charAt(0).toUpperCase() + last.slice(1);
  }

  // src/app/searchName.ts
  async function resolveSearchTitle(ctx, search) {
    const named = ctx.searchNames.get()[search.location.id];
    if (named) return named;
    const query = search.payload?.query;
    if (!query) return "";
    try {
      return suggestTitle(query, await ctx.data.filterOptions());
    } catch {
      return suggestTitle(query);
    }
  }

  // src/ui/components/Button.tsx
  function Button({ variant = "blue", icon: icon2, block, active, size = "md", children, class: className, type = "button", ...rest }) {
    const classes = [
      "ptm-btn",
      `ptm-btn--${variant}`,
      size === "sm" && "ptm-btn--sm",
      block && "ptm-btn--block",
      active && "ptm-btn--active",
      className
    ].filter(Boolean).join(" ");
    return /* @__PURE__ */ u3("button", { type, class: classes, "aria-pressed": active === void 0 ? void 0 : active, ...rest, children: [
      icon2,
      children !== void 0 && /* @__PURE__ */ u3("span", { children })
    ] });
  }
  function IconButton({ label, children, class: className, ...rest }) {
    return /* @__PURE__ */ u3("button", { type: "button", class: ["ptm-icon-btn", className].filter(Boolean).join(" "), title: label, "aria-label": label, ...rest, children });
  }
  function ButtonGroup({ children, block, label, class: className }) {
    return /* @__PURE__ */ u3("div", { role: "group", "aria-label": label, class: ["ptm-btn-group", block && "ptm-btn-group--block", className].filter(Boolean).join(" "), children });
  }

  // src/site/bridge/protocol.ts
  var PAGE_TO_CONTENT = "ptm:page";
  var CONTENT_TO_PAGE = "ptm:content";
  var UNKNOWN_MUTATION = "unknown-mutation";

  // src/ui/messages.ts
  var t4 = createTranslator({
    de: {
      appName: "PoE2 Trade Monkey",
      collapse: "Seitenleiste einklappen",
      expand: "Seitenleiste öffnen",
      settings: "Einstellungen",
      cancel: "Abbrechen",
      save: "Speichern",
      close: "Schließen",
      language: "Sprache",
      languageAuto: "Wie die Trade-Seite",
      features: "Funktionen",
      version: "Version {version}",
      disclaimer: "Dieses Projekt steht in keiner Verbindung zu Grinding Gear Games und wird nicht von ihnen unterstützt.",
      noTabs: "Alle Seitenleisten-Funktionen sind ausgeschaltet. Schalte sie in den Einstellungen ein.",
      sourceCode: "Quellcode auf GitHub",
      siteChanged: "Die Trade-Seite hat sich geändert, diese Aktion klappt gerade nicht. Ein Update von Trade Monkey behebt das meist.",
      actionFailed: "Das hat nicht geklappt. Details stehen in der Browser-Konsole."
    },
    en: {
      appName: "PoE2 Trade Monkey",
      collapse: "Collapse sidebar",
      expand: "Open sidebar",
      settings: "Settings",
      cancel: "Cancel",
      save: "Save",
      close: "Close",
      language: "Language",
      languageAuto: "Same as the trade site",
      features: "Features",
      version: "Version {version}",
      disclaimer: "This product isn't affiliated with or endorsed by Grinding Gear Games in any way.",
      noTabs: "All sidebar features are switched off. Turn them on in the settings.",
      sourceCode: "Source code on GitHub",
      siteChanged: "The trade site has changed, this action does not work right now. A Trade Monkey update usually fixes it.",
      actionFailed: "That did not work. Details are in the browser console."
    }
  });
  function errorText(error) {
    return String(error instanceof Error ? error.message : error).startsWith(UNKNOWN_MUTATION) ? t4("siteChanged") : t4("actionFailed");
  }

  // src/ui/components/focus.ts
  var FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  function focusables(root) {
    return [...root.querySelectorAll(FOCUSABLE)];
  }

  // src/ui/components/Logo.tsx
  function Logo({ size = 30 }) {
    return /* @__PURE__ */ u3("svg", { class: "ptm-logo", width: size, height: size, viewBox: "0 0 32 32", "aria-hidden": "true", children: [
      /* @__PURE__ */ u3("circle", { cx: "16", cy: "16", r: "15", fill: "#5a3806", stroke: "#c59a50", "stroke-width": "2" }),
      /* @__PURE__ */ u3("circle", { cx: "16", cy: "16", r: "11", fill: "none", stroke: "#8a5609", "stroke-width": "1.5" }),
      /* @__PURE__ */ u3("text", { x: "16", y: "20.5", "text-anchor": "middle", "font-family": "FontinSmallCaps, serif", "font-size": "12", fill: "#f3d278", children: "TM" })
    ] });
  }

  // src/ui/components/Modal.tsx
  var stack = [];
  function Modal({ title, onClose, children, footer, width = 650 }) {
    const dialog = T2(null);
    const token = T2({});
    const close = T2(onClose);
    close.current = onClose;
    A(() => {
      const previous = document.activeElement;
      const el = dialog.current;
      const body = el.querySelector(".ptm-modal__body");
      const foot = el.querySelector(".ptm-modal__footer");
      const start6 = el.querySelector("[data-autofocus]") ?? (body && focusables(body)[0]) ?? (foot && focusables(foot)[0]) ?? el;
      start6.focus();
      stack.push(token.current);
      const onKey = (event) => {
        if (event.key !== "Escape" || stack[stack.length - 1] !== token.current) return;
        event.stopPropagation();
        close.current();
      };
      document.addEventListener("keydown", onKey);
      return () => {
        document.removeEventListener("keydown", onKey);
        stack.splice(stack.indexOf(token.current), 1);
        if (previous?.isConnected) previous.focus();
      };
    }, []);
    const trapTab = (event) => {
      if (event.key !== "Tab") return;
      const items = focusables(dialog.current);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey ? document.activeElement === first || document.activeElement === dialog.current : document.activeElement === last) {
        event.preventDefault();
        (event.shiftKey ? last : first)?.focus();
      }
    };
    return /* @__PURE__ */ u3("div", { class: "ptm-modal-overlay", onMouseDown: (event) => event.target === event.currentTarget && onClose(), children: /* @__PURE__ */ u3(
      "div",
      {
        ref: dialog,
        class: "ptm-modal",
        role: "dialog",
        "aria-modal": "true",
        "aria-label": title,
        tabIndex: -1,
        onKeyDown: trapTab,
        style: { width: `min(${width}px, 92vw)` },
        children: [
          /* @__PURE__ */ u3("header", { class: "ptm-modal__header", children: [
            /* @__PURE__ */ u3(Logo, { size: 26 }),
            /* @__PURE__ */ u3("h2", { class: "ptm-modal__title", children: title }),
            /* @__PURE__ */ u3(IconButton, { label: t4("close"), onClick: onClose, children: /* @__PURE__ */ u3(IconClose, {}) })
          ] }),
          /* @__PURE__ */ u3("div", { class: "ptm-modal__body", children }),
          footer && /* @__PURE__ */ u3("footer", { class: "ptm-modal__footer", children: footer })
        ]
      }
    ) });
  }

  // src/ui/components/ConfirmDialog.tsx
  function ConfirmDialog({ title, message, confirmLabel, onConfirm, onCancel }) {
    return /* @__PURE__ */ u3(
      Modal,
      {
        title,
        onClose: onCancel,
        width: 420,
        footer: /* @__PURE__ */ u3(M, { children: [
          /* @__PURE__ */ u3(Button, { variant: "plain", onClick: onCancel, children: t4("cancel") }),
          /* @__PURE__ */ u3(Button, { variant: "red", onClick: onConfirm, children: confirmLabel })
        ] }),
        children: /* @__PURE__ */ u3("p", { class: "ptm-text", children: message })
      }
    );
  }

  // src/ui/components/Menu.tsx
  function Menu({ items, label }) {
    const [open, setOpen] = d2(false);
    const root = T2(null);
    const trigger = T2(null);
    const list = T2(null);
    A(() => {
      if (!open) return;
      list.current?.querySelector(".ptm-menu__item")?.focus();
      const close = (event) => {
        if (!root.current?.contains(event.target)) setOpen(false);
      };
      document.addEventListener("mousedown", close);
      return () => document.removeEventListener("mousedown", close);
    }, [open]);
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        setOpen(false);
        trigger.current?.focus();
        return;
      }
      const entries = [...list.current.querySelectorAll(".ptm-menu__item")];
      const index = entries.indexOf(document.activeElement);
      const next = { ArrowDown: index + 1, ArrowUp: index - 1, Home: 0, End: entries.length - 1 }[event.key];
      if (next === void 0 || !entries.length) return;
      event.preventDefault();
      entries[(next + entries.length) % entries.length]?.focus();
    };
    return /* @__PURE__ */ u3(
      "div",
      {
        class: "ptm-menu",
        ref: root,
        onFocusOut: (event) => {
          if (open && !root.current?.contains(event.relatedTarget)) setOpen(false);
        },
        children: [
          /* @__PURE__ */ u3(
            "button",
            {
              ref: trigger,
              type: "button",
              class: "ptm-icon-btn",
              title: label,
              "aria-label": label,
              "aria-expanded": open,
              onClick: (event) => {
                event.preventDefault();
                event.stopPropagation();
                setOpen(!open);
              },
              children: /* @__PURE__ */ u3(IconEllipsis, { size: 16 })
            }
          ),
          open && /* @__PURE__ */ u3("ul", { class: "ptm-menu__list", ref: list, onKeyDown, children: items.filter((item) => !item.hidden).map((item) => /* @__PURE__ */ u3("li", { children: /* @__PURE__ */ u3(
            "button",
            {
              type: "button",
              class: item.danger ? "ptm-menu__item ptm-menu__item--danger" : "ptm-menu__item",
              onClick: (event) => {
                event.stopPropagation();
                setOpen(false);
                item.onSelect();
              },
              children: [
                item.icon,
                /* @__PURE__ */ u3("span", { children: item.label })
              ]
            }
          ) }, item.label)) })
        ]
      }
    );
  }

  // src/site/tradeLocation.ts
  var DEFAULT_REALM = "poe2";
  var REALMS = /* @__PURE__ */ new Set(["poe2", "xbox", "sony"]);
  function isRealm(value2) {
    return REALMS.has(value2);
  }
  var TYPES = /* @__PURE__ */ new Set(["search", "exchange"]);
  function parseTradeLocation(url) {
    const { pathname } = typeof url === "string" ? new URL(url, "https://www.pathofexile.com") : url;
    const parts = pathname.split("/").filter(Boolean);
    if (parts[0] !== "trade2" || !parts[1] || !TYPES.has(parts[1])) return null;
    const type = parts[1];
    let rest = parts.slice(2);
    let realm = DEFAULT_REALM;
    if (rest[0] && REALMS.has(rest[0])) {
      realm = rest[0];
      rest = rest.slice(1);
    }
    const [rawLeague, id, suffix] = rest;
    if (!rawLeague) return null;
    return {
      type,
      realm,
      league: safeDecode(rawLeague),
      id: id ?? null,
      live: suffix === "live"
    };
  }
  function buildTradePath(location2) {
    const segments = ["trade2", location2.type, encodeURIComponent(location2.realm), encodeURIComponent(location2.league)];
    if (location2.id) {
      segments.push(encodeURIComponent(location2.id));
      if (location2.live && location2.type === "search") segments.push("live");
    }
    return "/" + segments.join("/");
  }
  function safeDecode(segment) {
    try {
      return decodeURIComponent(segment);
    } catch {
      return segment;
    }
  }

  // src/features/bookmarks/icons.ts
  var FOLDER_ICONS = {
    currency: [
      "alchemy",
      "annul",
      "artificer",
      "augment",
      "chance",
      "chaos",
      "divine",
      "essence",
      "exalt",
      "gemcutter",
      "glassblower",
      "mirror",
      "regal",
      "rune",
      "transmute",
      "vaal",
      "waystone",
      "wisdom"
    ],
    ascendancy: [
      "titan",
      "warbringer",
      "smith-of-kitava",
      "infernalist",
      "blood-mage",
      "lich",
      "deadeye",
      "pathfinder",
      "chronomancer",
      "stormweaver",
      "witch-hunter",
      "gemling-legionnaire",
      "tactician",
      "invoker",
      "acolyte-of-chayula",
      "ritualist",
      "amazon"
    ]
  };
  var ALL_FOLDER_ICONS = [...FOLDER_ICONS.currency, ...FOLDER_ICONS.ascendancy];
  function isFolderIcon(id) {
    return typeof id === "string" && ALL_FOLDER_ICONS.includes(id);
  }
  function folderIconUrl(id) {
    return `https://raw.githubusercontent.com/maluramichael/poe2-trade-monkey/master/assets/folder-icons/${id}.png`;
  }

  // src/features/bookmarks/codec.ts
  var t5 = createTranslator({
    de: {
      "invalid-code": "Der Ordner-Code ist ungültig.",
      poe1: "Der Ordner stammt aus Path of Exile 1 und lässt sich hier nicht verwenden.",
      "invalid-backup": "Die Backup-Datei hat ein unbekanntes Format."
    },
    en: {
      "invalid-code": "The folder code is invalid.",
      poe1: "This folder is from Path of Exile 1 and cannot be used here.",
      "invalid-backup": "The backup file has an unknown format."
    }
  });
  var BookmarkImportError = class extends Error {
    constructor(reason) {
      super(t5(reason));
      this.reason = reason;
      this.name = "BookmarkImportError";
    }
    reason;
  };
  var BT_ICON_PREFIX = "poe2-";
  var BT_SECTION_DELIMITER = "\n--------------------\n";
  var TYPES2 = /* @__PURE__ */ new Set(["search", "exchange"]);
  var SEARCH_ID = /^[A-Za-z0-9_-]{1,4096}$/;
  var MAX_BACKUP_BYTES = 5 * 1024 * 1024;
  function encodeFolderCode(folder) {
    const payload = {
      icn: folder.icon ? BT_ICON_PREFIX + folder.icon : null,
      tit: folder.title,
      ver: "2",
      trs: folder.trades.map((trade) => ({ tit: trade.title, loc: `2:${trade.type}:${trade.searchId}` }))
    };
    return "3:" + toBase64(JSON.stringify(payload));
  }
  function decodeFolderCode(code, now = (/* @__PURE__ */ new Date()).toISOString()) {
    const trimmed = code.trim();
    const version = trimmed.startsWith("3:") ? 3 : trimmed.startsWith("2:") ? 2 : 1;
    let raw;
    try {
      raw = JSON.parse(version === 1 ? atob(trimmed) : fromBase64(trimmed.slice(2)));
    } catch {
      throw new BookmarkImportError("invalid-code");
    }
    if (!isBtFolder(raw)) throw new BookmarkImportError("invalid-code");
    const trades = raw.trs.map((trade) => {
      const parts = trade.loc.split(":");
      if (version === 3) parts.shift();
      const [type, ...slug] = parts;
      const searchId = slug.join(":");
      if (!type || !TYPES2.has(type) || !SEARCH_ID.test(searchId)) throw new BookmarkImportError("invalid-code");
      return { title: trade.tit, type, searchId };
    });
    const siteVersion = version === 3 ? raw.ver : trades.every((trade) => isEncodedSearchId(trade.searchId)) ? "2" : "1";
    if (siteVersion === "1") throw new BookmarkImportError("poe1");
    if (siteVersion !== "2") throw new BookmarkImportError("invalid-code");
    const icon2 = raw.icn?.startsWith(BT_ICON_PREFIX) ? raw.icn.slice(BT_ICON_PREFIX.length) : null;
    return {
      title: raw.tit,
      icon: isFolderIcon(icon2) ? icon2 : null,
      archivedAt: null,
      trades: trades.map(
        (trade) => ({ ...trade, realm: DEFAULT_REALM, savedLeague: "", payload: null, completedAt: null, createdAt: now, updatedAt: now })
      )
    };
  }
  function decodeBtBackup(text2, now = (/* @__PURE__ */ new Date()).toISOString()) {
    const [active = "", archived = ""] = text2.replace(/\r\n/g, "\n").split(BT_SECTION_DELIMITER);
    const result = { folders: [], skipped: 0 };
    let poe1 = 0;
    const read = (section, archivedAt) => {
      for (const line of section.split("\n").filter((l3) => l3.trim())) {
        try {
          result.folders.push({ ...decodeFolderCode(line, now), archivedAt });
        } catch (error) {
          result.skipped++;
          if (error.reason === "poe1") poe1++;
        }
      }
    };
    read(active, null);
    read(archived, now);
    if (!result.folders.length) throw new BookmarkImportError(poe1 && poe1 === result.skipped ? "poe1" : "invalid-backup");
    return result;
  }
  var APP = "poe2-trade-monkey";
  function encodeBackup(data, now = (/* @__PURE__ */ new Date()).toISOString()) {
    return JSON.stringify({ app: APP, format: 1, exportedAt: now, folders: data.folders }, null, 2);
  }
  function decodeBackupFile(text2, now = (/* @__PURE__ */ new Date()).toISOString()) {
    if (!text2.trim().startsWith("{")) return decodeBtBackup(text2, now);
    let raw;
    try {
      raw = JSON.parse(text2);
    } catch {
      throw new BookmarkImportError("invalid-backup");
    }
    const backup = raw;
    if (backup.app !== APP || backup.format !== 1 || !Array.isArray(backup.folders) || !backup.folders.every(isFolder)) {
      throw new BookmarkImportError("invalid-backup");
    }
    const folders = backup.folders.map(({ id: _id, trades, ...folder }) => ({
      ...folder,
      icon: isFolderIcon(folder.icon) ? folder.icon : null,
      trades: trades.map(({ id: _tradeId, ...trade }) => trade)
    }));
    return { folders, skipped: 0 };
  }
  function isBtFolder(value2) {
    const v3 = value2;
    return typeof v3 === "object" && v3 !== null && typeof v3.tit === "string" && Array.isArray(v3.trs) && v3.trs.every((trade) => typeof trade?.tit === "string" && typeof trade.loc === "string");
  }
  var isString = (v3) => typeof v3 === "string";
  var isNullableString = (v3) => v3 === null || isString(v3);
  function isFolder(value2) {
    const f3 = value2;
    return typeof f3 === "object" && f3 !== null && isString(f3.title) && isNullableString(f3.icon) && isNullableString(f3.archivedAt) && Array.isArray(f3.trades) && f3.trades.every(isTrade);
  }
  function isTrade(value2) {
    const t20 = value2;
    return typeof t20 === "object" && t20 !== null && isString(t20.title) && TYPES2.has(t20.type) && isString(t20.realm) && isRealm(t20.realm) && isString(t20.searchId) && SEARCH_ID.test(t20.searchId) && isString(t20.savedLeague) && (t20.payload === null || typeof t20.payload === "object" && typeof t20.payload.query === "object") && isNullableString(t20.completedAt) && isString(t20.createdAt) && isString(t20.updatedAt);
  }
  function toBase64(text2) {
    let binary = "";
    for (const byte of new TextEncoder().encode(text2)) binary += String.fromCharCode(byte);
    return btoa(binary);
  }
  function fromBase64(base64) {
    const normal = base64.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(normal.padEnd(Math.ceil(normal.length / 4) * 4, "="));
    return new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)));
  }

  // src/ui/components/Form.tsx
  function Field({ label, children, hint }) {
    return /* @__PURE__ */ u3("label", { class: "ptm-field", children: [
      /* @__PURE__ */ u3("span", { class: "ptm-field__label", children: label }),
      children,
      hint && /* @__PURE__ */ u3("span", { class: "ptm-field__hint", children: hint })
    ] });
  }
  function TextInput(props) {
    const { onValue, class: className, ...rest } = props;
    return /* @__PURE__ */ u3(
      "input",
      {
        type: "text",
        class: ["ptm-input", className].filter(Boolean).join(" "),
        onInput: (event) => onValue(event.currentTarget.value),
        ...rest
      }
    );
  }
  function TextArea(props) {
    const { onValue, class: className, ...rest } = props;
    return /* @__PURE__ */ u3(
      "textarea",
      {
        class: ["ptm-input", "ptm-textarea", className].filter(Boolean).join(" "),
        onInput: (event) => onValue(event.currentTarget.value),
        ...rest
      }
    );
  }
  function Checkbox({ checked, onChange, label, description }) {
    return /* @__PURE__ */ u3("label", { class: "ptm-checkbox", children: [
      /* @__PURE__ */ u3("input", { type: "checkbox", checked, onChange: (event) => onChange(event.currentTarget.checked) }),
      /* @__PURE__ */ u3("span", { class: "ptm-checkbox__box", "aria-hidden": "true" }),
      /* @__PURE__ */ u3("span", { class: "ptm-checkbox__text", children: [
        /* @__PURE__ */ u3("span", { class: "ptm-checkbox__label", children: label }),
        description && /* @__PURE__ */ u3("span", { class: "ptm-checkbox__description", children: description })
      ] })
    ] });
  }
  function Alert({ kind, children }) {
    return /* @__PURE__ */ u3("div", { class: `ptm-alert ptm-alert--${kind}`, children });
  }

  // src/features/bookmarks/modals.tsx
  function FormModal({ title, submitLabel, canSubmit, onSubmit, onClose, children }) {
    const formId = b2(() => `ptm-bm-form-${Math.random().toString(36).slice(2)}`, []);
    const form = T2(null);
    A(() => form.current?.querySelector("input, textarea")?.focus(), []);
    return /* @__PURE__ */ u3(
      Modal,
      {
        title,
        onClose,
        footer: /* @__PURE__ */ u3(Button, { variant: "gold", type: "submit", form: formId, disabled: !canSubmit, children: submitLabel }),
        children: /* @__PURE__ */ u3(
          "form",
          {
            id: formId,
            ref: form,
            class: "ptm-bm-form",
            onSubmit: (event) => {
              event.preventDefault();
              if (canSubmit) onSubmit();
            },
            children
          }
        )
      }
    );
  }
  function TitleModal({ title, initial = "", suggest, onSave, onClose }) {
    const [value2, setValue] = d2(initial);
    const touched = T2(false);
    A(() => {
      void suggest?.().then((suggested) => {
        if (!touched.current && suggested) setValue(suggested);
      });
    }, []);
    return /* @__PURE__ */ u3(FormModal, { title, submitLabel: t3("save"), canSubmit: value2.trim() !== "", onSubmit: () => onSave(value2.trim()), onClose, children: /* @__PURE__ */ u3(Field, { label: t3("title"), children: /* @__PURE__ */ u3(
      TextInput,
      {
        value: value2,
        onValue: (next) => {
          touched.current = true;
          setValue(next);
        }
      }
    ) }) });
  }
  var iconName = (id) => id.split("-").map((word) => word[0].toUpperCase() + word.slice(1)).join(" ");
  function IconPicker({ value: value2, onChange }) {
    return /* @__PURE__ */ u3("div", { class: "ptm-bm-icons", children: ["currency", "ascendancy"].map((group) => /* @__PURE__ */ u3("div", { class: `ptm-bm-icons__grid ptm-bm-icons__grid--${group}`, children: FOLDER_ICONS[group].map((id) => /* @__PURE__ */ u3(
      "button",
      {
        type: "button",
        class: "ptm-bm-icons__cell",
        title: iconName(id),
        "aria-label": iconName(id),
        "aria-pressed": value2 === id,
        onClick: () => onChange(value2 === id ? null : id),
        children: /* @__PURE__ */ u3("img", { src: folderIconUrl(id), alt: "", loading: "lazy" })
      },
      id
    )) }, group)) });
  }
  function FolderModal({ initial, onSave, onClose }) {
    const [title, setTitle] = d2(initial?.title ?? "");
    const [icon2, setIcon] = d2(initial?.icon ?? null);
    return /* @__PURE__ */ u3(
      FormModal,
      {
        title: initial ? t3("editFolder") : t3("newFolder"),
        submitLabel: t3("save"),
        canSubmit: title.trim() !== "",
        onSubmit: () => onSave({ title: title.trim(), icon: icon2 }),
        onClose,
        children: [
          /* @__PURE__ */ u3(Field, { label: t3("title"), children: /* @__PURE__ */ u3(TextInput, { value: title, onValue: setTitle, "aria-required": "true" }) }),
          /* @__PURE__ */ u3("div", { class: "ptm-field", children: [
            /* @__PURE__ */ u3("span", { class: "ptm-field__label", children: t3("icon") }),
            /* @__PURE__ */ u3(IconPicker, { value: icon2, onChange: setIcon })
          ] })
        ]
      }
    );
  }
  function ImportModal({ onImport, onClose }) {
    const [code, setCode] = d2("");
    const result = b2(() => {
      if (!code.trim()) return null;
      try {
        return { folder: decodeFolderCode(code) };
      } catch (error) {
        return { error: error instanceof BookmarkImportError ? error.message : String(error) };
      }
    }, [code]);
    const folder = result && "folder" in result ? result.folder : null;
    return /* @__PURE__ */ u3(FormModal, { title: t3("importFolder"), submitLabel: t3("import"), canSubmit: !!folder, onSubmit: () => onImport(folder), onClose, children: [
      /* @__PURE__ */ u3(Field, { label: t3("importCode"), hint: t3("importHint"), children: /* @__PURE__ */ u3(TextArea, { value: code, onValue: setCode, spellcheck: false }) }),
      folder && /* @__PURE__ */ u3("p", { class: "ptm-bm-preview", children: t3("importPreview", { title: folder.title, n: folder.trades.length }) }),
      result && "error" in result && /* @__PURE__ */ u3(Alert, { kind: "error", children: result.error })
    ] });
  }
  function ShareModal({ code, onCopy, onClose }) {
    return /* @__PURE__ */ u3(
      Modal,
      {
        title: t3("shareTitle"),
        onClose,
        footer: /* @__PURE__ */ u3(Button, { variant: "gold", icon: /* @__PURE__ */ u3(IconCopy, {}), onClick: onCopy, children: t3("copy") }),
        children: /* @__PURE__ */ u3(Field, { label: t3("importCode"), hint: t3("shareHint"), children: /* @__PURE__ */ u3("textarea", { class: "ptm-input ptm-textarea", value: code, readOnly: true, onFocus: (event) => event.currentTarget.select() }) })
      }
    );
  }

  // src/features/bookmarks/sortable.ts
  function insertionIndex(rects, y3) {
    return rects.filter((rect) => (rect.top + rect.bottom) / 2 < y3).length;
  }
  function finalIndex(from, insertion) {
    return from >= 0 && insertion > from ? insertion - 1 : insertion;
  }
  function moveItem(items, from, to) {
    const next = [...items];
    const [item] = next.splice(from, 1);
    if (item !== void 0) next.splice(Math.max(0, Math.min(to, next.length)), 0, item);
    return next;
  }
  var DRAG_THRESHOLD = 4;
  var EDGE = 40;
  var SCROLL_STEP = 12;
  var listsOf = (doc, kind) => [...doc.querySelectorAll(`[data-sort-list="${kind}"]`)];
  var itemsOf = (list, kind) => [...list.querySelectorAll(`[data-sort-kind="${kind}"][data-sort-item]`)];
  function startPointerDrag(event, { kind, scroller, onDrop }) {
    if (event.button !== 0) return;
    const handle = event.currentTarget;
    const doc = handle.ownerDocument;
    const win = doc.defaultView;
    const item = handle.closest("[data-sort-item]");
    if (!item) return;
    event.preventDefault();
    handle.focus();
    const startY = event.clientY;
    let lastX = event.clientX;
    let lastY = event.clientY;
    let dragging = false;
    let target = null;
    const line = doc.createElement("div");
    line.className = "ptm-bm-drop-line";
    const locate = () => {
      const list = listsOf(doc, kind).find((candidate) => {
        const rect = candidate.getBoundingClientRect();
        return lastY >= rect.top && lastY <= rect.bottom && lastX >= rect.left && lastX <= rect.right;
      });
      if (!list) {
        target = null;
        line.remove();
        return;
      }
      const items = itemsOf(list, kind);
      const rects = items.map((el) => el.getBoundingClientRect());
      const index = insertionIndex(rects, lastY);
      const listRect = list.getBoundingClientRect();
      const y3 = rects[index]?.top ?? rects[rects.length - 1]?.bottom ?? listRect.bottom;
      target = { listId: list.dataset.sortListId ?? "", index };
      Object.assign(line.style, { top: `${y3 - 1}px`, left: `${listRect.left}px`, width: `${listRect.width}px` });
      if (!line.isConnected) doc.body.append(line);
    };
    const autoScroll = win.setInterval(() => {
      if (!dragging || !scroller) return;
      const rect = scroller.getBoundingClientRect();
      const delta = lastY < rect.top + EDGE ? -SCROLL_STEP : lastY > rect.bottom - EDGE ? SCROLL_STEP : 0;
      if (delta) {
        scroller.scrollTop += delta;
        locate();
      }
    }, 16);
    const onMove = (move) => {
      lastX = move.clientX;
      lastY = move.clientY;
      if (!dragging && Math.abs(lastY - startY) < DRAG_THRESHOLD) return;
      if (!dragging) {
        dragging = true;
        item.classList.add("ptm-bm-dragging");
        doc.documentElement.classList.add("ptm-bm-sorting");
      }
      locate();
    };
    const finish = (drop) => {
      win.clearInterval(autoScroll);
      win.removeEventListener("pointermove", onMove);
      win.removeEventListener("pointerup", onUp);
      win.removeEventListener("pointercancel", onCancel);
      doc.removeEventListener("keydown", onKey, true);
      line.remove();
      item.classList.remove("ptm-bm-dragging");
      doc.documentElement.classList.remove("ptm-bm-sorting");
      if (drop && dragging && target) onDrop(target);
    };
    const onUp = () => finish(true);
    const onCancel = () => finish(false);
    const onKey = (key) => {
      if (key.key !== "Escape") return;
      key.preventDefault();
      key.stopPropagation();
      finish(false);
    };
    win.addEventListener("pointermove", onMove);
    win.addEventListener("pointerup", onUp);
    win.addEventListener("pointercancel", onCancel);
    doc.addEventListener("keydown", onKey, true);
  }
  function handleSortKey(event, ids, id, apply) {
    const step = event.key === "ArrowUp" ? -1 : event.key === "ArrowDown" ? 1 : 0;
    const from = ids.indexOf(id);
    if (!step || from < 0) return false;
    event.preventDefault();
    const to = from + step;
    if (to < 0 || to >= ids.length) return true;
    apply(moveItem(ids, from, to));
    const doc = event.currentTarget.ownerDocument;
    setTimeout(() => doc.querySelector(`[data-sort-handle="${CSS.escape(id)}"]`)?.focus());
    return true;
  }

  // src/features/bookmarks/urls.ts
  function tradePath(trade, league, { live = false } = {}) {
    return buildTradePath({ type: trade.type, realm: trade.realm, league, id: trade.searchId, live });
  }
  function isFromOtherLeague(trade, league) {
    return trade.savedLeague !== "" && trade.savedLeague !== league;
  }

  // src/features/bookmarks/validate.ts
  function findUnknownStats(payload, stats) {
    const ids = (payload?.query.stats ?? []).flatMap((group) => group.filters.map((filter) => filter.id));
    return [...new Set(ids.filter((id) => id && !stats.has(id)))];
  }

  // src/features/bookmarks/Panel.tsx
  var pad = (n2) => String(n2).padStart(2, "0");
  function backupFileName(date = /* @__PURE__ */ new Date()) {
    return `poe2-trade-monkey-backup-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}.json`;
  }
  async function copyText(win, text2) {
    try {
      if (typeof GM !== "undefined" && typeof GM.setClipboard === "function") {
        await GM.setClipboard(text2);
        return true;
      }
    } catch {
    }
    try {
      await win.navigator.clipboard.writeText(text2);
      return true;
    } catch {
      return false;
    }
  }
  function bookmarksPanel(ctx, service, expanded) {
    const copy = async (text2) => {
      if (await copyText(ctx.win, text2)) ctx.toast(t3("copied"));
      else ctx.toast(t3("copyFailed"), "error");
    };
    const toggleExpanded = (id) => expanded.update((ids) => ids.includes(id) ? ids.filter((x2) => x2 !== id) : [...ids, id]);
    const leagueFor = (trade, current) => current ?? (trade.savedLeague || "Standard");
    const checkTrade = async (trade, league) => {
      try {
        const decoded = trade.payload ? null : await decodeSearchId(trade.searchId);
        const payload = trade.payload ?? (decoded ? { query: decoded } : null);
        if (!payload) return ctx.toast(t3("checkNoQuery"), "warning");
        const unknown = findUnknownStats(payload, await ctx.data.stats());
        if (unknown.length === 0) ctx.toast(t3("checkOk", { league }));
        else ctx.toast(t3("checkUnknown", { n: unknown.length, ids: unknown.join(", ") }), "warning");
      } catch {
        ctx.toast(t3("checkFailed"), "error");
      }
    };
    const dropTrade = (tradeId, fromFolderId, { listId, index }) => {
      const folders = service.data.get().folders;
      const source = folders.find((f3) => f3.id === fromFolderId);
      const target = folders.find((f3) => f3.id === listId);
      if (!source || !target || target.archivedAt) return;
      if (target === source) {
        const ids = source.trades.map((trade) => trade.id);
        const from = ids.indexOf(tradeId);
        service.reorderTrades(source.id, moveItem(ids, from, finalIndex(from, index)));
      } else {
        service.moveTrade(tradeId, target.id, expanded.get().includes(target.id) ? index : target.trades.length);
      }
    };
    const scrollerOf = (el) => el.closest(".ptm-sidebar__panel") ?? el.closest(".ptm-bm");
    function TradeRow({ trade, folder, league, current, setDialog }) {
      const tradeLeague = leagueFor(trade, league);
      const href = tradePath(trade, tradeLeague);
      const isCurrent = current?.location.id === trade.searchId;
      const classes = ["ptm-bm-trade", trade.completedAt && "ptm-bm-trade--completed", isCurrent && "ptm-bm-trade--current"];
      return /* @__PURE__ */ u3("li", { class: classes.filter(Boolean).join(" "), "data-sort-kind": "trades", "data-sort-item": trade.id, children: [
        trade.completedAt && /* @__PURE__ */ u3("span", { class: "ptm-bm-trade__check", role: "img", title: t3("completed"), "aria-label": t3("completed"), children: /* @__PURE__ */ u3(IconCheck, {}) }),
        /* @__PURE__ */ u3("a", { class: "ptm-bm-trade__title", href, title: trade.title, "aria-current": isCurrent ? "page" : void 0, children: trade.title }),
        isFromOtherLeague(trade, tradeLeague) && /* @__PURE__ */ u3("span", { class: "ptm-bm-badge", title: t3("savedIn", { league: trade.savedLeague }), children: t3("otherLeague") }),
        /* @__PURE__ */ u3(
          Menu,
          {
            label: t3("tradeMenu"),
            items: [
              { label: t3("copyUrl"), icon: /* @__PURE__ */ u3(IconLink, {}), onSelect: () => void copy(ctx.win.location.origin + href) },
              {
                label: t3("live"),
                icon: /* @__PURE__ */ u3(IconBolt, {}),
                hidden: trade.type !== "search",
                onSelect: () => ctx.win.location.assign(tradePath(trade, tradeLeague, { live: true }))
              },
              {
                label: t3("overwrite"),
                icon: /* @__PURE__ */ u3(IconSave, {}),
                hidden: !current,
                onSelect: () => {
                  const search = ctx.currentSearch.get();
                  if (!search) return;
                  service.overwriteTrade(trade.id, search);
                  ctx.toast(t3("overwritten", { title: trade.title }));
                }
              },
              {
                label: trade.completedAt ? t3("markOpen") : t3("markCompleted"),
                icon: /* @__PURE__ */ u3(IconCheck, {}),
                onSelect: () => service.toggleCompleted(trade.id)
              },
              { label: t3("rename"), icon: /* @__PURE__ */ u3(IconEdit, {}), onSelect: () => setDialog({ kind: "rename", trade }) },
              { label: t3("check"), icon: /* @__PURE__ */ u3(IconWarning, {}), onSelect: () => void checkTrade(trade, tradeLeague) },
              { label: t3("delete"), icon: /* @__PURE__ */ u3(IconTrash, {}), danger: true, onSelect: () => setDialog({ kind: "deleteTrade", trade }) }
            ]
          }
        ),
        /* @__PURE__ */ u3(
          "button",
          {
            type: "button",
            class: "ptm-icon-btn ptm-bm-handle",
            "data-sort-handle": trade.id,
            title: t3("dragTrade"),
            "aria-label": t3("dragTrade"),
            onPointerDown: (event) => startPointerDrag(event, {
              kind: "trades",
              scroller: scrollerOf(event.currentTarget),
              onDrop: (target) => dropTrade(trade.id, folder.id, target)
            }),
            onKeyDown: (event) => handleSortKey(event, folder.trades.map((x2) => x2.id), trade.id, (ids) => service.reorderTrades(folder.id, ids)),
            children: /* @__PURE__ */ u3(IconGrip, {})
          }
        )
      ] });
    }
    function FolderItem({ folder, open, visibleIds, league, current, setDialog }) {
      const archived = !!folder.archivedAt;
      const alreadySaved = !!current && folder.trades.some((trade) => trade.searchId === current.location.id);
      return /* @__PURE__ */ u3(
        "li",
        {
          class: "ptm-bm-folder",
          "data-sort-kind": "folders",
          "data-sort-item": folder.id,
          "data-sort-list": archived ? void 0 : "trades",
          "data-sort-list-id": folder.id,
          children: [
            /* @__PURE__ */ u3("div", { class: "ptm-bm-folder__header", children: [
              /* @__PURE__ */ u3(
                "button",
                {
                  type: "button",
                  class: "ptm-bm-folder__toggle",
                  "aria-expanded": archived ? void 0 : open,
                  title: archived ? folder.title : open ? t3("collapse") : t3("expand"),
                  onClick: () => !archived && toggleExpanded(folder.id),
                  children: [
                    folder.icon && /* @__PURE__ */ u3("img", { class: "ptm-bm-folder__icon", src: folderIconUrl(folder.icon), alt: "" }),
                    /* @__PURE__ */ u3("span", { class: "ptm-bm-folder__title", children: folder.title }),
                    archived ? /* @__PURE__ */ u3("span", { class: "ptm-bm-badge", children: t3("archived") }) : /* @__PURE__ */ u3("span", { class: open ? "ptm-bm-chevron ptm-bm-chevron--open" : "ptm-bm-chevron", children: /* @__PURE__ */ u3(IconChevronDown, { size: 16 }) })
                  ]
                }
              ),
              /* @__PURE__ */ u3("span", { class: "ptm-bm-folder__divider", "aria-hidden": "true" }),
              /* @__PURE__ */ u3(
                Menu,
                {
                  label: t3("folderMenu"),
                  items: [
                    { label: t3("edit"), icon: /* @__PURE__ */ u3(IconEdit, {}), onSelect: () => setDialog({ kind: "editFolder", folder }) },
                    { label: t3("archive"), icon: /* @__PURE__ */ u3(IconArchive, {}), hidden: archived, onSelect: () => service.archiveFolder(folder.id) },
                    { label: t3("restore"), icon: /* @__PURE__ */ u3(IconUndo, {}), hidden: !archived, onSelect: () => service.restoreFolder(folder.id) },
                    { label: t3("share"), icon: /* @__PURE__ */ u3(IconUpload, {}), onSelect: () => setDialog({ kind: "share", folder }) },
                    {
                      label: t3("delete"),
                      icon: /* @__PURE__ */ u3(IconTrash, {}),
                      danger: true,
                      onSelect: () => folder.trades.length ? setDialog({ kind: "deleteFolder", folder }) : service.deleteFolder(folder.id)
                    }
                  ]
                }
              ),
              /* @__PURE__ */ u3(
                "button",
                {
                  type: "button",
                  class: "ptm-icon-btn ptm-bm-handle",
                  "data-sort-handle": folder.id,
                  title: t3("dragFolder"),
                  "aria-label": t3("dragFolder"),
                  onPointerDown: (event) => startPointerDrag(event, {
                    kind: "folders",
                    scroller: scrollerOf(event.currentTarget),
                    onDrop: ({ index }) => {
                      const from = visibleIds.indexOf(folder.id);
                      service.reorderFolders(moveItem(visibleIds, from, finalIndex(from, index)));
                    }
                  }),
                  onKeyDown: (event) => handleSortKey(event, visibleIds, folder.id, (ids) => service.reorderFolders(ids)),
                  children: /* @__PURE__ */ u3(IconGrip, {})
                }
              )
            ] }),
            open && !archived && /* @__PURE__ */ u3("div", { class: "ptm-bm-folder__body", children: [
              folder.trades.length > 0 ? /* @__PURE__ */ u3("ul", { class: "ptm-bm-trades", children: folder.trades.map((trade) => /* @__PURE__ */ u3(TradeRow, { trade, folder, league, current, setDialog }, trade.id)) }) : /* @__PURE__ */ u3("p", { class: "ptm-bm-folder__empty", children: t3("emptyFolder") }),
              /* @__PURE__ */ u3("span", { class: "ptm-bm-save", title: !current ? t3("saveCurrentDisabled") : alreadySaved ? t3("alreadySavedHint") : void 0, children: /* @__PURE__ */ u3(
                Button,
                {
                  variant: "gold",
                  block: true,
                  icon: alreadySaved ? /* @__PURE__ */ u3(IconCheck, {}) : /* @__PURE__ */ u3(IconSave, {}),
                  disabled: !current || alreadySaved,
                  onClick: () => setDialog({ kind: "save", folderId: folder.id }),
                  children: alreadySaved ? t3("alreadySaved") : t3("saveCurrent")
                }
              ) })
            ] })
          ]
        }
      );
    }
    return function BookmarksPanel() {
      const { folders } = useStore(service.data);
      const openIds = useStore(expanded);
      const league = useStore(ctx.leagues.current);
      const current = useStore(ctx.currentSearch);
      const [archiveMode, setArchiveMode] = d2(false);
      const [dialog, setDialog] = d2(null);
      const fileInput = T2(null);
      const close = () => setDialog(null);
      const archivedCount = folders.filter((f3) => f3.archivedAt).length;
      const showingArchive = archiveMode && archivedCount > 0;
      A(() => {
        if (archivedCount === 0) setArchiveMode(false);
      }, [archivedCount]);
      const visible = folders.filter((f3) => !!f3.archivedAt === showingArchive);
      const visibleIds = visible.map((f3) => f3.id);
      const saveBackup = () => {
        const url = URL.createObjectURL(new Blob([encodeBackup(service.data.get())], { type: "application/json" }));
        const link = ctx.doc.createElement("a");
        link.href = url;
        link.download = backupFileName();
        ctx.doc.body.append(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1e3);
      };
      const loadBackup = async (file) => {
        if (file.size > MAX_BACKUP_BYTES) return ctx.toast(t3("backupTooLarge"), "error");
        try {
          const { folders: imported, skipped } = decodeBackupFile(await file.text());
          const { folders: added, trades } = service.mergeFolders(imported);
          ctx.toast(t3("backupMerged", { folders: added, trades, skipped }), skipped > 0 ? "warning" : "success");
        } catch (error) {
          if (error instanceof BookmarkImportError) return ctx.toast(error.message, "error");
          log.error("backup import failed", error);
          ctx.toast(t3("backupFailed"), "error");
        }
      };
      return /* @__PURE__ */ u3("div", { class: "ptm-bm", children: [
        (!showingArchive && visible.length > 0 || archivedCount > 0) && /* @__PURE__ */ u3("div", { class: "ptm-toolbar", children: /* @__PURE__ */ u3(ButtonGroup, { children: [
          !showingArchive && visible.length > 0 && /* @__PURE__ */ u3(Button, { variant: "gold", size: "sm", icon: /* @__PURE__ */ u3(IconCompress, {}), onClick: () => expanded.set([]), children: t3("collapseFolders") }),
          archivedCount > 0 && /* @__PURE__ */ u3(
            Button,
            {
              variant: "gold",
              size: "sm",
              active: showingArchive,
              icon: showingArchive ? /* @__PURE__ */ u3(IconUndo, {}) : /* @__PURE__ */ u3(IconArchive, {}),
              onClick: () => setArchiveMode(!showingArchive),
              children: showingArchive ? t3("hideArchive") : t3("showArchive")
            }
          )
        ] }) }),
        visible.length > 0 ? /* @__PURE__ */ u3("ul", { class: "ptm-bm-folders", "data-sort-list": "folders", "data-sort-list-id": "folders", children: visible.map((folder) => /* @__PURE__ */ u3(
          FolderItem,
          {
            folder,
            open: openIds.includes(folder.id),
            visibleIds,
            league,
            current,
            setDialog
          },
          folder.id
        )) }) : /* @__PURE__ */ u3("p", { class: "ptm-empty", children: showingArchive ? t3("emptyArchive") : t3("empty") }),
        /* @__PURE__ */ u3("section", { class: "ptm-actions ptm-bm-backup", "aria-label": t3("backup"), children: [
          !showingArchive && /* @__PURE__ */ u3(ButtonGroup, { block: true, children: [
            /* @__PURE__ */ u3(Button, { icon: /* @__PURE__ */ u3(IconFolderPlus, {}), onClick: () => setDialog({ kind: "newFolder" }), children: t3("newFolder") }),
            /* @__PURE__ */ u3(Button, { icon: /* @__PURE__ */ u3(IconPlus, {}), onClick: () => setDialog({ kind: "import" }), children: t3("importFolder") })
          ] }),
          /* @__PURE__ */ u3(ButtonGroup, { block: true, label: t3("backup"), children: [
            /* @__PURE__ */ u3(Button, { variant: "plain", icon: /* @__PURE__ */ u3(IconDownload, {}), onClick: saveBackup, children: t3("saveBackup") }),
            /* @__PURE__ */ u3(Button, { variant: "plain", icon: /* @__PURE__ */ u3(IconUpload, {}), onClick: () => fileInput.current?.click(), children: t3("loadBackup") })
          ] }),
          /* @__PURE__ */ u3(
            "input",
            {
              ref: fileInput,
              type: "file",
              accept: ".json,.txt",
              hidden: true,
              onChange: (event) => {
                const file = event.currentTarget.files?.[0];
                event.currentTarget.value = "";
                if (file) void loadBackup(file);
              }
            }
          )
        ] }),
        dialog?.kind === "newFolder" && /* @__PURE__ */ u3(
          FolderModal,
          {
            onClose: close,
            onSave: ({ title, icon: icon2 }) => {
              const id = service.addFolder(title, icon2);
              expanded.update((ids) => [...ids, id]);
              close();
            }
          }
        ),
        dialog?.kind === "editFolder" && /* @__PURE__ */ u3(
          FolderModal,
          {
            initial: dialog.folder,
            onClose: close,
            onSave: (changes) => {
              service.updateFolder(dialog.folder.id, changes);
              close();
            }
          }
        ),
        dialog?.kind === "deleteFolder" && /* @__PURE__ */ u3(
          ConfirmDialog,
          {
            title: t3("deleteFolderTitle"),
            message: t3("deleteFolderMessage", { title: dialog.folder.title, n: dialog.folder.trades.length }),
            confirmLabel: t3("delete"),
            onCancel: close,
            onConfirm: () => {
              service.deleteFolder(dialog.folder.id);
              close();
            }
          }
        ),
        dialog?.kind === "share" && /* @__PURE__ */ u3(ShareModal, { code: encodeFolderCode(dialog.folder), onCopy: () => void copy(encodeFolderCode(dialog.folder)), onClose: close }),
        dialog?.kind === "import" && /* @__PURE__ */ u3(
          ImportModal,
          {
            onClose: close,
            onImport: (folder) => {
              service.importFolders([folder], { archived: false });
              ctx.toast(t3("imported", { title: folder.title }));
              close();
            }
          }
        ),
        dialog?.kind === "save" && /* @__PURE__ */ u3(
          TitleModal,
          {
            title: t3("saveTitle"),
            suggest: async () => {
              const search = ctx.currentSearch.get();
              return search ? resolveSearchTitle(ctx, search) : "";
            },
            onClose: close,
            onSave: (title) => {
              const search = ctx.currentSearch.get();
              if (search) {
                service.addTrade(dialog.folderId, title, search);
                ctx.toast(t3("saved"));
              }
              close();
            }
          }
        ),
        dialog?.kind === "rename" && /* @__PURE__ */ u3(
          TitleModal,
          {
            title: t3("renameTitle"),
            initial: dialog.trade.title,
            onClose: close,
            onSave: (title) => {
              service.updateTradeTitle(dialog.trade.id, title);
              close();
            }
          }
        ),
        dialog?.kind === "deleteTrade" && /* @__PURE__ */ u3(
          ConfirmDialog,
          {
            title: t3("deleteTradeTitle"),
            message: t3("deleteTradeMessage", { title: dialog.trade.title }),
            confirmLabel: t3("delete"),
            onCancel: close,
            onConfirm: () => {
              service.deleteTrade(dialog.trade.id);
              close();
            }
          }
        )
      ] });
    };
  }

  // src/features/bookmarks/model.ts
  var newId = () => crypto.randomUUID();

  // src/features/bookmarks/service.ts
  var STORAGE_KEY = "bookmarks:data";
  async function createBookmarksService(ctx) {
    const data = await persistedStore(ctx.storage, STORAGE_KEY, { defaultValue: { folders: [] }, schema: 1 });
    return new BookmarksService(data, ctx.searchNames);
  }
  var BookmarksService = class {
    constructor(data, searchNames, now = () => (/* @__PURE__ */ new Date()).toISOString()) {
      this.data = data;
      this.now = now;
      const sync = () => searchNames.set(namesOf(this.data.get()));
      this.#unsubscribe = this.data.subscribe(sync);
      sync();
    }
    data;
    now;
    #unsubscribe;
    dispose() {
      this.#unsubscribe();
    }
    addFolder(title, icon2) {
      const id = newId();
      this.#setFolders((folders) => [...folders, { id, title, icon: icon2, archivedAt: null, trades: [] }]);
      return id;
    }
    updateFolder(id, changes) {
      this.#mapFolder(id, (folder) => ({ ...folder, ...changes }));
    }
    archiveFolder(id) {
      this.#mapFolder(id, (folder) => ({ ...folder, archivedAt: this.now() }));
    }
    /** Like Better Trading, a restored folder goes to the end of the list. */
    restoreFolder(id) {
      this.#setFolders((folders) => {
        const folder = folders.find((f3) => f3.id === id);
        return folder ? [...folders.filter((f3) => f3 !== folder), { ...folder, archivedAt: null }] : folders;
      });
    }
    deleteFolder(id) {
      this.#setFolders((folders) => folders.filter((f3) => f3.id !== id));
    }
    /** `orderedIds` may be a subset (e.g. only active folders); the others keep their slots. */
    reorderFolders(orderedIds) {
      this.#setFolders((folders) => reorder(folders, orderedIds));
    }
    addTrade(folderId, title, current) {
      const id = newId();
      const now = this.now();
      const trade = { id, title, ...fromSearch(current), completedAt: null, createdAt: now, updatedAt: now };
      this.#mapFolder(folderId, (folder) => ({ ...folder, trades: [...folder.trades, trade] }));
      return id;
    }
    updateTradeTitle(tradeId, title) {
      this.#mapTrade(tradeId, (trade) => ({ ...trade, title, updatedAt: this.now() }));
    }
    /** "Save active search": keeps title and state, replaces the search. */
    overwriteTrade(tradeId, current) {
      this.#mapTrade(tradeId, (trade) => ({ ...trade, ...fromSearch(current), updatedAt: this.now() }));
    }
    toggleCompleted(tradeId) {
      this.#mapTrade(tradeId, (trade) => ({ ...trade, completedAt: trade.completedAt ? null : this.now() }));
    }
    deleteTrade(tradeId) {
      this.#setFolders(
        (folders) => folders.map((f3) => f3.trades.some((t20) => t20.id === tradeId) ? { ...f3, trades: f3.trades.filter((t20) => t20.id !== tradeId) } : f3)
      );
    }
    /** `toIndex` counts in the target list after the trade was taken out. */
    moveTrade(tradeId, toFolderId, toIndex) {
      const trade = this.#findTrade(tradeId)?.trade;
      if (!trade || !this.data.get().folders.some((f3) => f3.id === toFolderId)) return;
      this.deleteTrade(tradeId);
      this.#mapFolder(toFolderId, (folder) => {
        const trades = [...folder.trades];
        trades.splice(Math.max(0, toIndex), 0, trade);
        return { ...folder, trades };
      });
    }
    reorderTrades(folderId, orderedIds) {
      this.#mapFolder(folderId, (folder) => ({ ...folder, trades: reorder(folder.trades, orderedIds) }));
    }
    /**
     * Appends imported folders with fresh ids. `archived` overrides the archive state of every
     * folder; without it the folders keep their own `archivedAt`. Returns the number added.
     */
    importFolders(folders, { archived } = {}) {
      const now = this.now();
      const added = folders.map((folder) => ({
        ...folder,
        id: newId(),
        archivedAt: archived === void 0 ? folder.archivedAt : archived ? now : null,
        trades: folder.trades.map((trade) => ({ ...trade, id: newId() }))
      }));
      this.#setFolders((existing) => [...existing, ...added]);
      return added.length;
    }
    /**
     * Backup import that never duplicates: a folder with the same trimmed title and archive state
     * only gains the trades whose search id it lacks, others are appended with fresh ids.
     */
    mergeFolders(folders) {
      const counts = { folders: 0, trades: 0 };
      this.#setFolders((existing) => {
        const result = [...existing];
        for (const folder of folders) {
          const index = result.findIndex((f3) => f3.title.trim() === folder.title.trim() && !f3.archivedAt === !folder.archivedAt);
          const target = result[index];
          if (!target) {
            result.push({ ...folder, id: newId(), trades: folder.trades.map((trade) => ({ ...trade, id: newId() })) });
            counts.folders++;
            counts.trades += folder.trades.length;
            continue;
          }
          const known = new Set(target.trades.map((t20) => t20.searchId));
          const added = folder.trades.filter((t20) => !known.has(t20.searchId) && known.add(t20.searchId)).map((t20) => ({ ...t20, id: newId() }));
          if (added.length) result[index] = { ...target, trades: [...target.trades, ...added] };
          counts.trades += added.length;
        }
        return result;
      });
      return counts;
    }
    /** The bookmark for a search id, preferring active folders over archived ones. */
    findTradeBySearchId(searchId) {
      const matches = this.data.get().folders.flatMap(
        (folder) => folder.trades.filter((t20) => t20.searchId === searchId).map((trade) => ({ folder, trade }))
      );
      return matches.find((m2) => !m2.folder.archivedAt) ?? matches[0] ?? null;
    }
    #findTrade(tradeId) {
      for (const folder of this.data.get().folders) {
        const trade = folder.trades.find((t20) => t20.id === tradeId);
        if (trade) return { folder, trade };
      }
      return null;
    }
    #setFolders(fn) {
      this.data.update((data) => ({ ...data, folders: fn(data.folders) }));
    }
    #mapFolder(id, fn) {
      this.#setFolders((folders) => folders.map((f3) => f3.id === id ? fn(f3) : f3));
    }
    #mapTrade(tradeId, fn) {
      const folderId = this.#findTrade(tradeId)?.folder.id;
      if (!folderId) return;
      this.#mapFolder(folderId, (folder) => ({ ...folder, trades: folder.trades.map((t20) => t20.id === tradeId ? fn(t20) : t20) }));
    }
  };
  function fromSearch({ location: location2, payload }) {
    return { type: location2.type, realm: location2.realm, searchId: location2.id, savedLeague: location2.league, payload };
  }
  function reorder(items, orderedIds) {
    const byId = new Map(items.map((item) => [item.id, item]));
    const ordered = [...new Set(orderedIds)].flatMap((id) => byId.get(id) ?? []);
    const moving = new Set(ordered);
    let next = 0;
    return items.map((item) => moving.has(item) ? ordered[next++] : item);
  }
  function namesOf(data) {
    const names = {};
    for (const folder of data.folders) {
      if (folder.archivedAt) continue;
      for (const trade of folder.trades) names[trade.searchId] ??= trade.title;
    }
    return names;
  }

  // src/features/bookmarks/index.tsx
  var EXPANDED_KEY = "bookmarks:expanded";
  var bookmarksFeature = {
    id: "bookmarks",
    label: () => t3("label"),
    description: () => t3("description"),
    toggleable: true,
    defaultEnabled: true,
    css: feature_default,
    sidebarTab: { label: () => t3("label"), icon: IconFolder, order: 1 },
    async start(ctx) {
      const service = await createBookmarksService(ctx);
      const expanded = await persistedStore(ctx.storage, EXPANDED_KEY, { defaultValue: [], schema: 1 });
      return { dispose: () => service.dispose(), Panel: bookmarksPanel(ctx, service, expanded) };
    }
  };

  // src/features/history/feature.css
  var feature_default2 = ".ptm-history {\n  display: flex;\n  flex-direction: column;\n  gap: 8px;\n}\n\n.ptm-history__list {\n  margin: 0;\n  padding: 0;\n  list-style: none;\n  background: var(--ptm-surface);\n  border: 1px solid var(--ptm-blue-border);\n}\n\n.ptm-history__item {\n  padding: 6px 7px;\n  border-top: 1px solid var(--ptm-blue-line);\n}\n\n.ptm-history__item:first-child {\n  border-top: 0;\n}\n\n.ptm-history__item:hover {\n  background: linear-gradient(to right, rgba(138, 86, 9, 0.4), transparent);\n}\n\n.ptm-history__title {\n  display: block;\n  overflow: hidden;\n  font-family: var(--ptm-font-title);\n  font-size: 14px;\n  color: var(--ptm-text);\n  text-decoration: none;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n\n.ptm-history__title:hover {\n  color: var(--ptm-beige);\n  text-decoration: underline;\n}\n\n.ptm-history__other {\n  font-size: 11px;\n  color: var(--ptm-beige);\n}\n";

  // src/features/history/Panel.tsx
  var t6 = createTranslator({
    de: {
      search: "Suche",
      exchange: "Große Mengen",
      openIn: "in {league} öffnen",
      clear: "Verlauf leeren",
      clearMessage: "Alle {n} Einträge aus dem Verlauf löschen?",
      clearConfirm: "Leeren",
      empty: "Noch keine Suchen. Jede Suche, die du öffnest, landet hier."
    },
    en: {
      search: "Search",
      exchange: "Bulk exchange",
      openIn: "open in {league}",
      clear: "Clear history",
      clearMessage: "Delete all {n} entries from the history?",
      clearConfirm: "Clear",
      empty: "No searches yet. Every search you open shows up here."
    }
  });
  var UNITS = [
    ["year", 31536e3],
    ["month", 2592e3],
    ["week", 604800],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60]
  ];
  function relativeTime(iso, now = Date.now()) {
    const seconds = (Date.parse(iso) - now) / 1e3;
    const format = new Intl.RelativeTimeFormat(getLocale(), { numeric: "auto" });
    for (const [unit, size] of UNITS) {
      if (Math.abs(seconds) >= size) return format.format(Math.trunc(seconds / size), unit);
    }
    return format.format(0, "second");
  }
  function historyPanel(entries, ctx) {
    return function HistoryPanel() {
      const list = useStore(entries);
      const names = useStore(ctx.searchNames);
      const current = useStore(ctx.leagues.current);
      const [confirming, setConfirming] = d2(false);
      const [, setTick] = d2(0);
      A(() => {
        const timer = setInterval(() => setTick((n2) => n2 + 1), 6e4);
        return () => clearInterval(timer);
      }, []);
      if (list.length === 0) return /* @__PURE__ */ u3("p", { class: "ptm-empty", children: t6("empty") });
      return /* @__PURE__ */ u3("div", { class: "ptm-history", children: [
        /* @__PURE__ */ u3("div", { class: "ptm-toolbar", children: /* @__PURE__ */ u3(Button, { variant: "plain", size: "sm", icon: /* @__PURE__ */ u3(IconTrash, {}), onClick: () => setConfirming(true), children: t6("clear") }) }),
        /* @__PURE__ */ u3("ul", { class: "ptm-history__list", children: list.map((entry) => {
          const href = (league) => buildTradePath({ type: entry.type, realm: entry.realm, league, id: entry.searchId, live: entry.live });
          return /* @__PURE__ */ u3("li", { class: "ptm-history__item", children: [
            /* @__PURE__ */ u3("a", { class: "ptm-history__title", href: href(entry.league), children: [
              entry.live && "⚡ ",
              names[entry.searchId] || entry.title
            ] }),
            /* @__PURE__ */ u3("p", { class: "ptm-meta", children: [
              t6(entry.type),
              " · ",
              entry.league,
              " ·",
              " ",
              /* @__PURE__ */ u3("time", { dateTime: entry.createdAt, title: new Date(entry.createdAt).toLocaleString(getLocale()), children: relativeTime(entry.createdAt) })
            ] }),
            current && current !== entry.league && /* @__PURE__ */ u3("a", { class: "ptm-history__other", href: href(current), children: t6("openIn", { league: current }) })
          ] }, entry.id);
        }) }),
        confirming && /* @__PURE__ */ u3(
          ConfirmDialog,
          {
            title: t6("clear"),
            message: t6("clearMessage", { n: list.length }),
            confirmLabel: t6("clearConfirm"),
            onCancel: () => setConfirming(false),
            onConfirm: () => {
              setConfirming(false);
              entries.set([]);
            }
          }
        )
      ] });
    };
  }

  // src/features/history/index.ts
  var t7 = createTranslator({
    de: { label: "Verlauf", description: "Liste der letzten Suchen.", unnamed: "Unbenannte Suche" },
    en: { label: "History", description: "List of your recent searches.", unnamed: "Unnamed search" }
  });
  var STORAGE_KEY2 = "history:entries";
  var MAX_ENTRIES = 50;
  var historyFeature = {
    id: "history",
    label: () => t7("label"),
    description: () => t7("description"),
    toggleable: true,
    defaultEnabled: true,
    css: feature_default2,
    sidebarTab: { label: () => t7("label"), icon: IconHistory, order: 2 },
    async start(ctx) {
      const entries = await persistedStore(ctx.storage, STORAGE_KEY2, { defaultValue: [], schema: 1 });
      const record = async (search) => {
        const { location: location2, payload } = search;
        const title = await resolveSearchTitle(ctx, search) || t7("unnamed");
        const [newest, ...rest] = entries.get();
        if (newest && newest.searchId === location2.id && newest.league === location2.league) {
          if (!newest.payload && payload) entries.set([{ ...newest, title, payload }, ...rest]);
          return;
        }
        const entry = {
          id: crypto.randomUUID(),
          title,
          createdAt: (/* @__PURE__ */ new Date()).toISOString(),
          type: location2.type,
          realm: location2.realm,
          league: location2.league,
          searchId: location2.id,
          live: location2.live,
          payload
        };
        entries.set([entry, ...entries.get()].slice(0, MAX_ENTRIES));
      };
      let queue = Promise.resolve();
      const onSearch = (search) => {
        if (!search) return;
        queue = queue.then(() => record(search)).catch((error) => log.error("recording history failed", error));
      };
      onSearch(ctx.currentSearch.get());
      const off = ctx.currentSearch.subscribe(onSearch);
      return { dispose: off, Panel: historyPanel(entries, ctx) };
    }
  };

  // src/site/selectors.ts
  var sel = {
    tradeRoot: "#trade",
    topColumn: "#trade > .top",
    portal: "#vue3-portal",
    toggleFiltersButton: "#trade .controls .toggle-search-btn",
    filtersHidden: "#trade .search-advanced-hidden",
    navigation: "#trade > .navigation",
    searchPanel: "#trade .search-panel",
    itemSearchInput: "#trade .search-bar .search-left .multiselect__input",
    searchButton: "#trade .controls .search-btn",
    clearButton: "#trade .controls .clear-btn",
    liveSearchButton: "#trade .controls .livesearch-btn",
    controls: "#trade .controls",
    advancedPane: "#trade .search-advanced-pane",
    propertyPane: "#trade .search-advanced-pane.blue",
    statPane: "#trade .search-advanced-pane.brown",
    filterGroup: ".filter-group",
    results: "#vue3-portal .results",
    resultTotal: "#vue3-portal .results .row-total",
    resultRow: "#vue3-portal .resultset > .row[data-id]",
    loadMoreButton: "#vue3-portal .results .load-more-btn",
    topButton: "#trade .top-btn",
    /** Inside a result row. */
    row: {
      itemPopup: ".middle .item-popup",
      itemHeaderLines: ".item-popup__header-line",
      mod: ".item-mod",
      explicitMod: ".item-mod--explicit",
      implicitMod: ".item-mod--implicit",
      /** Stat text span carrying `data-field="stat.<type>.stat_<n>"`. */
      modStat: '.item-mod > [data-field^="stat."]',
      price: ".right .details .price",
      priceField: '[data-field="price"]',
      priceCurrencyImage: '[data-field="price"] .currency-image img',
      sellerLink: ".right .details .profile-link a",
      characterName: ".right .details .character-name a",
      status: ".right .details .status",
      buttons: ".right .details .btns",
      listedAgo: '.right .details [data-field="indexed"] small'
    }
  };

  // src/features/pins/feature.css
  var feature_default3 = '.ptm-pinned {\n  box-shadow: inset 0 0 10px 2px var(--ptm-blue-border);\n}\n\n.ptm-pin-glow {\n  animation: ptm-pin-glow 1s ease;\n}\n\n@keyframes ptm-pin-glow {\n  0%, 50%, 100% { box-shadow: inset 0 0 10px 2px var(--ptm-blue-border); }\n  25%, 75% { box-shadow: inset 0 0 20px 10px var(--ptm-blue-border); }\n}\n\n/* Same width for "Pin" and "Unpin", so the button bar does not jump. */\n.ptm-pin-btn {\n  min-width: 60px;\n}\n\n.ptm-pins {\n  display: grid;\n  gap: 10px;\n}\n\n.ptm-pin {\n  min-width: 0;\n  border: 1px solid var(--ptm-blue-line);\n  background: #000;\n}\n\n/* The site sizes item cards for the result list; in the 380px sidebar they must shrink. */\n.ptm-pin__item {\n  display: flex;\n  justify-content: center;\n  overflow: hidden;\n}\n\n.ptm-pin__item .item-popup {\n  width: 100%;\n  min-width: 0;\n  max-width: 100%;\n  margin: 0;\n}\n\n.ptm-pin__price {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  gap: 3px;\n  padding: 5px 10px 0;\n  color: var(--ptm-muted);\n}\n\n.ptm-pin__price img {\n  height: 25px;\n}\n\n/* Keep the currency name: without it a missing image leaves only the trade id ("exalted"). */\n.ptm-pin__price br,\n.ptm-pin__price .price-label {\n  display: none;\n}\n\n.ptm-pin__seller {\n  padding: 4px 10px 0;\n  text-align: center;\n}\n\n.ptm-pin__actions {\n  padding: 8px 10px 10px;\n}\n';

  // src/features/pins/index.tsx
  var t8 = createTranslator({
    de: {
      label: "Angepinnte Items",
      tab: "Pins",
      description: "Ergebnisse anpinnen und vergleichen.",
      pin: "Anpinnen",
      unpin: "Lösen",
      scroll: "Zum Ergebnis",
      openSearch: "Suche öffnen",
      openSearchTitle: "Öffnet die Suche, in der du das Item gepinnt hast ({league})",
      remove: "Entfernen",
      clear: "Alle entfernen",
      clearMessage: "Alle {n} Pins entfernen?",
      clearConfirm: "Entfernen",
      full: "Maximal {n} Pins. Der nächste ersetzt den ältesten.",
      seller: "Verkäufer: {seller}",
      empty: "Noch nichts angepinnt. Klick bei einem Ergebnis auf „Anpinnen“, um es hier zu sammeln. Pins bleiben erhalten, auch bei neuen Suchen und nach dem Neuladen."
    },
    en: {
      label: "Pinned items",
      tab: "Pins",
      description: "Pin results to compare them.",
      pin: "Pin",
      unpin: "Unpin",
      scroll: "Scroll to result",
      openSearch: "Open search",
      openSearchTitle: "Opens the search you pinned this item from ({league})",
      remove: "Unpin",
      clear: "Clear pins",
      clearMessage: "Remove all {n} pins?",
      clearConfirm: "Remove",
      full: "Up to {n} pins. The next one replaces the oldest.",
      seller: "Seller: {seller}",
      empty: 'Nothing pinned yet. Click "Pin" on a result to collect it here. Pins stay across new searches and page reloads.'
    }
  });
  var MAX_PINS = 100;
  var BUTTON_CLASS = "ptm-pin-btn";
  var PINNED_CLASS = "ptm-pinned";
  var GLOW_CLASS = "ptm-pin-glow";
  var GLOW_MS = 1e3;
  async function start(ctx) {
    const { doc } = ctx;
    const pins = await persistedStore(ctx.storage, "pins:items", { schema: 1, defaultValue: [] });
    const rowsVersion = new Store(0);
    const timers = /* @__PURE__ */ new Set();
    const rowElements = () => [...doc.querySelectorAll(sel.resultRow)];
    const findRow = (id) => rowElements().find((element) => element.dataset.id === id);
    const isPinned = (id) => pins.get().some((pin) => pin.id === id);
    const sync = (element) => {
      const pinned = isPinned(element.dataset.id ?? "");
      element.classList.toggle(PINNED_CLASS, pinned);
      const button = element.querySelector(`.${BUTTON_CLASS}`);
      if (!button) return;
      button.textContent = pinned ? t8("unpin") : t8("pin");
      button.setAttribute("aria-pressed", String(pinned));
    };
    const snapshot = (element, id) => {
      const popup = element.querySelector(sel.row.itemPopup)?.cloneNode(true);
      popup?.querySelectorAll("button").forEach((button) => button.remove());
      const listing = ctx.results.getListing(id)?.listing;
      return {
        id,
        html: popup?.outerHTML ?? "",
        priceHtml: element.querySelector(sel.row.price)?.innerHTML ?? "",
        seller: listing?.account.name ?? element.querySelector(sel.row.sellerLink)?.textContent ?? "",
        indexed: listing?.indexed ?? "",
        pinnedAt: Date.now(),
        search: searchOf(ctx.currentSearch.get()?.location ?? null)
      };
    };
    const toggle = (element) => {
      const id = element.dataset.id ?? "";
      if (isPinned(id)) {
        pins.update((list) => list.filter((pin) => pin.id !== id));
        return;
      }
      pins.update((list) => [...list, snapshot(element, id)].slice(-MAX_PINS));
      ctx.settings.update((settings) => ({ ...settings, activeTab: "pins" }));
    };
    const decorate = (row) => {
      rowsVersion.update((n2) => n2 + 1);
      const bar = row.element.querySelector(sel.row.buttons);
      if (!bar) return;
      bar.querySelector(`.${BUTTON_CLASS}`)?.remove();
      const button = doc.createElement("button");
      button.type = "button";
      button.className = `btn btn-default ${BUTTON_CLASS}`;
      button.addEventListener("click", () => toggle(row.element));
      bar.append(button);
      sync(row.element);
    };
    const scrollTo = (id) => {
      const element = findRow(id);
      if (!element) return;
      element.scrollIntoView({ block: "center" });
      element.classList.remove(GLOW_CLASS);
      void element.offsetWidth;
      element.classList.add(GLOW_CLASS);
      const timer = setTimeout(() => {
        timers.delete(timer);
        element.classList.remove(GLOW_CLASS);
      }, GLOW_MS);
      timers.add(timer);
    };
    const unsubscribe = pins.subscribe(() => rowElements().forEach(sync));
    const offDecorate = ctx.results.decorate("pins", decorate);
    const offClear = ctx.results.onClear(() => rowsVersion.update((n2) => n2 + 1));
    function Panel() {
      const list = useStore(pins);
      useStore(rowsVersion);
      const [confirming, setConfirming] = d2(false);
      if (list.length === 0) return /* @__PURE__ */ u3("p", { class: "ptm-empty", children: t8("empty") });
      return /* @__PURE__ */ u3("div", { class: "ptm-pins", children: [
        /* @__PURE__ */ u3("div", { class: "ptm-toolbar", children: [
          /* @__PURE__ */ u3(Button, { variant: "plain", size: "sm", icon: /* @__PURE__ */ u3(IconTrash, {}), onClick: () => setConfirming(true), children: t8("clear") }),
          list.length >= MAX_PINS && /* @__PURE__ */ u3("p", { class: "ptm-meta", children: t8("full", { n: MAX_PINS }) })
        ] }),
        list.map((pin) => /* @__PURE__ */ u3("article", { class: "ptm-pin", children: [
          /* @__PURE__ */ u3("div", { class: "ptm-pin__item", dangerouslySetInnerHTML: { __html: pin.html } }),
          /* @__PURE__ */ u3("div", { class: "ptm-pin__price", dangerouslySetInnerHTML: { __html: pin.priceHtml } }),
          /* @__PURE__ */ u3("p", { class: "ptm-meta ptm-pin__seller", children: [
            t8("seller", { seller: pin.seller }),
            pin.indexed && ` · ${new Date(pin.indexed).toLocaleString(getLocale())}`
          ] }),
          /* @__PURE__ */ u3("div", { class: "ptm-pin__actions", children: /* @__PURE__ */ u3(ButtonGroup, { block: true, children: [
            findRow(pin.id) || !pin.search ? /* @__PURE__ */ u3(Button, { size: "sm", disabled: !findRow(pin.id), onClick: () => scrollTo(pin.id), children: t8("scroll") }) : /* @__PURE__ */ u3(
              "a",
              {
                class: "ptm-btn ptm-btn--blue ptm-btn--sm",
                href: buildTradePath({ ...pin.search, live: false }),
                title: t8("openSearchTitle", { league: pin.search.league }),
                children: /* @__PURE__ */ u3("span", { children: t8("openSearch") })
              }
            ),
            /* @__PURE__ */ u3(Button, { variant: "plain", size: "sm", onClick: () => pins.update((all) => all.filter((p3) => p3.id !== pin.id)), children: t8("remove") })
          ] }) })
        ] }, pin.id)),
        confirming && /* @__PURE__ */ u3(
          ConfirmDialog,
          {
            title: t8("clear"),
            message: t8("clearMessage", { n: list.length }),
            confirmLabel: t8("clearConfirm"),
            onCancel: () => setConfirming(false),
            onConfirm: () => {
              setConfirming(false);
              pins.set([]);
            }
          }
        )
      ] });
    }
    return {
      Panel,
      dispose() {
        unsubscribe();
        offDecorate();
        offClear();
        timers.forEach(clearTimeout);
        doc.querySelectorAll(`.${BUTTON_CLASS}`).forEach((button) => button.remove());
        doc.querySelectorAll(`.${PINNED_CLASS}, .${GLOW_CLASS}`).forEach((element) => element.classList.remove(PINNED_CLASS, GLOW_CLASS));
      }
    };
  }
  function searchOf(location2) {
    if (!location2?.id) return null;
    return { type: location2.type, realm: location2.realm, league: location2.league, id: location2.id };
  }
  var pinsFeature = {
    id: "pins",
    label: () => t8("label"),
    description: () => t8("description"),
    toggleable: true,
    defaultEnabled: true,
    css: feature_default3,
    sidebarTab: { label: () => t8("tab"), icon: IconPin, order: 3 },
    start
  };

  // src/features/tab-title/index.ts
  var t9 = createTranslator({
    de: { label: "Tab-Titel", description: "Zeigt den Namen der Suche im Browser-Tab." },
    en: { label: "Tab title", description: "Shows the search name in the browser tab." }
  });
  var UNREAD = /^\(\d+\) /;
  var THROTTLE_MS = 100;
  var tabTitleFeature = {
    id: "tab-title",
    label: () => t9("label"),
    description: () => t9("description"),
    toggleable: true,
    defaultEnabled: true,
    start(ctx) {
      const { doc, win } = ctx;
      const unread = () => UNREAD.exec(doc.title)?.[0] ?? "";
      const base = doc.title.replace(UNREAD, "");
      let segment = null;
      const desired = () => unread() + (segment ?? "") + base;
      const apply = () => {
        if (doc.title !== desired()) doc.title = desired();
      };
      let generation = 0;
      const update = async () => {
        const run = ++generation;
        const search = ctx.currentSearch.get();
        if (!search) {
          segment = null;
          return apply();
        }
        const name = await resolveSearchTitle(ctx, search);
        if (run !== generation) return;
        segment = (search.location.live ? "⚡ " : "") + (name ? `${name} - ` : "");
        apply();
      };
      let last = 0;
      let timer;
      const observer = new MutationObserver(() => {
        if (segment === null || timer !== void 0 || doc.title === desired()) return;
        const wait = last + THROTTLE_MS - Date.now();
        const run = () => {
          timer = void 0;
          last = Date.now();
          apply();
        };
        if (wait <= 0) run();
        else timer = win.setTimeout(run, wait);
      });
      observer.observe(doc.head, { childList: true, characterData: true, subtree: true });
      const offs = [ctx.currentSearch.subscribe(() => void update()), ctx.searchNames.subscribe(() => void update())];
      void update();
      return {
        dispose() {
          generation++;
          observer.disconnect();
          win.clearTimeout(timer);
          for (const off of offs) off();
          segment = null;
          apply();
        }
      };
    }
  };

  // src/features/highlight-mods/feature.css
  var feature_default4 = ".ptm-mod-highlight {\n  background: rgba(138, 86, 9, 0.25);\n}\n";

  // src/features/highlight-mods/index.ts
  var t10 = createTranslator({
    de: { label: "Gesuchte Mods hervorheben", description: "Markiert Mods in Ergebnissen, nach denen du filterst." },
    en: { label: "Highlight searched mods", description: "Marks mods in results that match your stat filters." }
  });
  var HIGHLIGHT = "ptm-mod-highlight";
  function activeStatIds(search) {
    const ids = /* @__PURE__ */ new Set();
    for (const group of search?.payload?.query.stats ?? []) {
      if (group.disabled || group.type === "not") continue;
      for (const filter of group.filters) if (!filter.disabled) ids.add(filter.id);
    }
    return ids;
  }
  var highlightModsFeature = {
    id: "highlight-mods",
    label: () => t10("label"),
    description: () => t10("description"),
    toggleable: true,
    defaultEnabled: true,
    css: feature_default4,
    start(ctx) {
      let unregister = () => {
      };
      let appliedKey = null;
      const clear = () => {
        unregister();
        for (const mod of ctx.doc.querySelectorAll(`.${HIGHLIGHT}`)) mod.classList.remove(HIGHLIGHT);
      };
      const apply = (search) => {
        const ids = activeStatIds(search);
        const key = [...ids].sort().join(",");
        if (key === appliedKey) return;
        appliedKey = key;
        clear();
        unregister = ctx.results.decorate("highlight-mods", (row) => {
          for (const stat of row.element.querySelectorAll(sel.row.modStat)) {
            const id = stat.dataset.field.slice("stat.".length);
            if (ids.has(id)) stat.closest(sel.row.mod)?.classList.add(HIGHLIGHT);
          }
        });
      };
      const unsubscribe = ctx.currentSearch.subscribe(apply);
      apply(ctx.currentSearch.get());
      return {
        dispose() {
          unsubscribe();
          clear();
        }
      };
    }
  };

  // src/features/regroup-similar/feature.css
  var feature_default5 = ".ptm-regroup-hidden {\n  display: none !important;\n}\n\n.ptm-regroup-shown {\n  background: rgba(16, 16, 16, 0.8) !important;\n}\n\n.ptm-regroup-btn {\n  margin-left: 5px;\n}\n";

  // src/features/regroup-similar/index.ts
  var t11 = createTranslator({
    de: {
      label: "Gleiche Angebote zusammenfassen",
      description: "Fasst identische Items (gleiche Mods) vom selben Verkäufer zum selben Preis zusammen.",
      similar: "{n} ähnliche"
    },
    en: {
      label: "Group identical listings",
      description: "Collapses identical items (same mods) from the same seller at the same price.",
      similar: "{n} similar"
    }
  });
  var KEY_ATTR = "data-ptm-group";
  var HIDDEN = "ptm-regroup-hidden";
  var SHOWN = "ptm-regroup-shown";
  var BUTTON = "ptm-regroup-btn";
  function groupKey({ element, data }) {
    const seller = data?.listing.account.name ?? element.querySelector(sel.row.sellerLink)?.getAttribute("href") ?? "";
    if (!data) {
      const header = [...element.querySelectorAll(sel.row.itemHeaderLines)].map((line) => line.textContent).join("|");
      return [seller, header, element.querySelector(sel.row.priceField)?.textContent ?? ""].join("|");
    }
    const { item, listing } = data;
    const mods = [item.implicitMods, item.explicitMods, item.runeMods].map((list) => list?.map((mod) => typeof mod === "string" ? mod : mod.description).join("\n") ?? "");
    return [seller, item.name, item.typeLine, item.ilvl ?? "", ...mods, listing.price?.amount ?? "", listing.price?.currency ?? ""].join("|");
  }
  function followers(head) {
    const key = head.getAttribute(KEY_ATTR);
    const rows = [];
    for (let next = head.nextElementSibling; next instanceof HTMLElement && next.getAttribute(KEY_ATTR) === key; next = next.nextElementSibling) {
      rows.push(next);
    }
    return rows;
  }
  function toggleButton(head) {
    const existing = head.querySelector(`.${BUTTON}`);
    if (existing) return existing;
    const button = head.ownerDocument.createElement("button");
    button.type = "button";
    button.className = `btn btn-default ${BUTTON}`;
    button.dataset.count = "0";
    button.setAttribute("aria-expanded", "false");
    button.addEventListener("click", () => {
      const expanded = button.getAttribute("aria-expanded") !== "true";
      button.setAttribute("aria-expanded", String(expanded));
      for (const row of followers(head)) {
        row.classList.toggle(HIDDEN, !expanded);
        row.classList.toggle(SHOWN, expanded);
      }
    });
    head.querySelector(sel.row.buttons)?.append(button);
    return button;
  }
  var regroupSimilarFeature = {
    id: "regroup-similar",
    label: () => t11("label"),
    description: () => t11("description"),
    toggleable: true,
    defaultEnabled: true,
    css: feature_default5,
    start(ctx) {
      const unregister = ctx.results.decorate("regroup-similar", (row) => {
        const key = groupKey(row);
        row.element.setAttribute(KEY_ATTR, key);
        let head = row.element;
        while (head.previousElementSibling instanceof HTMLElement && head.previousElementSibling.getAttribute(KEY_ATTR) === key) {
          head = head.previousElementSibling;
        }
        if (head === row.element) return;
        const button = toggleButton(head);
        const count = Number(button.dataset.count) + 1;
        button.dataset.count = String(count);
        button.textContent = t11("similar", { n: count });
        row.element.classList.add(button.getAttribute("aria-expanded") === "true" ? SHOWN : HIDDEN);
      });
      return {
        dispose() {
          unregister();
          for (const button of ctx.doc.querySelectorAll(`.${BUTTON}`)) button.remove();
          for (const row of ctx.doc.querySelectorAll(`[${KEY_ATTR}]`)) {
            row.removeAttribute(KEY_ATTR);
            row.classList.remove(HIDDEN, SHOWN);
          }
        }
      };
    }
  };

  // src/features/price-equivalent/feature.css
  var feature_default6 = ".ptm-price-equivalent {\n  display: flex;\n  flex-wrap: wrap;\n  justify-content: center;\n  gap: 0 8px;\n  margin-top: 4px;\n  padding-top: 4px;\n  border-top: 1px solid rgba(163, 141, 109, 0.25);\n  font-family: var(--ptm-font-title);\n  font-size: 13px;\n  color: var(--ptm-muted);\n}\n\n.ptm-price-equivalent__part {\n  display: inline-flex;\n  align-items: center;\n  gap: 3px;\n}\n\n/* The site sizes every image in the price box; keep ours square. */\n.ptm-price-equivalent .ptm-price-equivalent__icon {\n  width: 18px !important;\n  height: 18px !important;\n  min-width: 18px;\n  max-width: none !important;\n  margin: 0 !important;\n  object-fit: contain;\n  vertical-align: middle;\n}\n";

  // src/features/price-equivalent/format.ts
  var MIN_DIVINE = 0.1;
  function formatAmount(value2, locale = getLocale()) {
    const digits = value2 >= 100 ? 0 : value2 >= 10 ? 1 : 2;
    return new Intl.NumberFormat(locale, { maximumFractionDigits: digits }).format(value2);
  }
  function equivalents(price, rates, locale = getLocale()) {
    const unit = rates.get(price.currency);
    if (unit === void 0) return [];
    const divine = price.amount * unit;
    const result = [];
    if (price.currency !== "divine" && divine >= MIN_DIVINE) result.push({ currency: "divine", text: formatAmount(divine, locale) });
    const exalted = rates.get("exalted");
    if (price.currency !== "exalted" && exalted) result.push({ currency: "exalted", text: formatAmount(divine / exalted, locale) });
    return result;
  }

  // src/features/price-equivalent/rates.ts
  var NINJA_URL = "https://poe.ninja/poe2/api/economy/exchange/current/overview";
  var TTL_MS = 60 * 60 * 1e3;
  function parseRates(json) {
    const lines = json?.lines;
    const rates = /* @__PURE__ */ new Map();
    if (!Array.isArray(lines)) return rates;
    const valid = lines.filter(
      (line) => typeof line?.id === "string" && typeof line.primaryValue === "number" && line.primaryValue > 0
    );
    const divine = valid.find((line) => line.id === "divine")?.primaryValue;
    if (!divine) return rates;
    for (const line of valid) rates.set(line.id, line.primaryValue / divine);
    return rates;
  }
  var RateSource = class {
    constructor(storage, http = gmGetJson) {
      this.storage = storage;
      this.http = http;
    }
    storage;
    http;
    #inFlight = /* @__PURE__ */ new Map();
    get(league) {
      let pending = this.#inFlight.get(league);
      if (!pending) {
        pending = this.#load(league).finally(() => this.#inFlight.delete(league));
        this.#inFlight.set(league, pending);
      }
      return pending;
    }
    async #load(league) {
      const key = `price-equivalent:rates:${league}`;
      const cached = await this.storage.get(key);
      if (cached && Date.now() - cached.at < TTL_MS) return new Map(Object.entries(cached.values));
      try {
        const rates = parseRates(await this.http(`${NINJA_URL}?league=${encodeURIComponent(league)}&type=Currency`));
        if (rates.size === 0) log.info(`poe.ninja has no currency rates for "${league}"`);
        else await this.storage.set(key, { at: Date.now(), values: Object.fromEntries(rates) });
        return rates;
      } catch (error) {
        log.warn(`loading poe.ninja rates for "${league}" failed${cached ? ", using expired rates" : ""}`, error);
        return cached ? new Map(Object.entries(cached.values)) : /* @__PURE__ */ new Map();
      }
    }
  };
  function gmGetJson(url) {
    return new Promise((resolve, reject) => {
      const result = GM.xmlHttpRequest({
        method: "GET",
        url,
        timeout: 8e3,
        onload: (response) => {
          if (response.status < 200 || response.status >= 300) return reject(new Error(`${url}: ${response.status}`));
          try {
            resolve(JSON.parse(response.responseText ?? ""));
          } catch (error) {
            reject(error);
          }
        },
        onerror: () => reject(new Error(`${url}: network error`)),
        ontimeout: () => reject(new Error(`${url}: timeout`))
      });
      Promise.resolve(result).catch(reject);
    });
  }

  // src/features/price-equivalent/index.ts
  var t12 = createTranslator({
    de: {
      label: "Preis-Umrechnung",
      description: "Rechnet Preise über poe.ninja in Divine und Exalted um.",
      source: "Umgerechnet mit Kursen von poe.ninja"
    },
    en: {
      label: "Price equivalent",
      description: "Converts prices to Divine and Exalted via poe.ninja.",
      source: "Converted with poe.ninja rates"
    }
  });
  var LINE_CLASS = "ptm-price-equivalent";
  var priceEquivalentFeature = {
    id: "price-equivalent",
    label: () => t12("label"),
    description: () => t12("description"),
    toggleable: true,
    defaultEnabled: true,
    css: feature_default6,
    start(ctx) {
      const source = new RateSource(ctx.storage);
      let undecorate = () => {
      };
      let generation = 0;
      const clear = () => {
        undecorate();
        undecorate = () => {
        };
        for (const line of ctx.doc.querySelectorAll(`.${LINE_CLASS}`)) line.remove();
      };
      let lastKey;
      const load = async () => {
        const realm = ctx.location.get()?.realm ?? "poe2";
        const league = ctx.leagues.current.get();
        const key = `${realm}|${league}`;
        if (key === lastKey) return;
        lastKey = key;
        const current = ++generation;
        clear();
        if (!league || realm !== "poe2") return;
        const [rates, currencies] = await Promise.all([
          source.get(league),
          ctx.data.currencies().catch(() => /* @__PURE__ */ new Map())
        ]);
        if (current !== generation || rates.size === 0) return;
        undecorate = ctx.results.decorate("price-equivalent", (row) => render(ctx.doc, row, rates, currencies));
      };
      void load();
      const offLeague = ctx.leagues.current.subscribe(() => void load());
      const offLocation = ctx.location.subscribe(() => void load());
      return {
        dispose() {
          offLeague();
          offLocation();
          generation++;
          clear();
        }
      };
    }
  };
  function render(doc, row, rates, currencies) {
    const target = row.element.querySelector(sel.row.price);
    target?.querySelector(`.${LINE_CLASS}`)?.remove();
    const price = row.data?.listing.price;
    if (!target || !price) return;
    const parts = equivalents(price, rates);
    if (parts.length === 0) return;
    const line = doc.createElement("div");
    line.className = LINE_CLASS;
    line.title = t12("source");
    for (const part of parts) {
      const span = doc.createElement("span");
      span.className = `${LINE_CLASS}__part`;
      span.append(`≈ ${part.text}`);
      const currency = currencies.get(part.currency);
      if (currency?.image) {
        const img = doc.createElement("img");
        img.className = `${LINE_CLASS}__icon`;
        img.src = currency.image;
        img.alt = img.title = currency.text;
        span.append(img);
      } else {
        span.append(` ${currency?.text ?? part.currency}`);
      }
      line.append(span);
    }
    (target.querySelector(sel.row.priceField) ?? target).append(line);
  }

  // src/features/mod-actions/feature.css
  var feature_default7 = ".item-mod:has(> .ptm-mod-action) {\n  position: relative;\n}\n\n/* Sits just outside the left edge of the item card, so the site's tier labels stay readable. */\n.ptm-mod-action {\n  position: absolute;\n  top: 50%;\n  left: -41px;\n  z-index: 1;\n  width: 20px;\n  height: 20px;\n  margin-top: -10px;\n  padding: 0;\n  border: 1px solid var(--ptm-blue-border);\n  background: var(--ptm-blue);\n  color: var(--ptm-text);\n  font: 13px/18px var(--ptm-font-title);\n  text-align: center;\n  cursor: pointer;\n  opacity: 0;\n  transition: opacity 0.2s, background 0.2s;\n}\n\n.ptm-mod-action--exclude {\n  left: -22px;\n  border-color: var(--ptm-red-border);\n  background: var(--ptm-red);\n}\n\n.item-mod:hover > .ptm-mod-action,\n.ptm-mod-action:focus-visible {\n  opacity: 1;\n}\n\n.ptm-mod-action--add:hover {\n  background: var(--ptm-blue-hover);\n}\n\n.ptm-mod-action--exclude:hover {\n  background: var(--ptm-red-hover);\n}\n\n.ptm-mod-flash-ok {\n  animation: ptm-mod-flash-ok 0.9s ease;\n}\n\n.ptm-mod-flash-fail {\n  animation: ptm-mod-flash-fail 0.9s ease;\n}\n\n@keyframes ptm-mod-flash-ok {\n  0%, 60% { background: var(--ptm-green); }\n  100% { background: transparent; }\n}\n\n@keyframes ptm-mod-flash-fail {\n  0%, 60% { background: var(--ptm-red-border); }\n  100% { background: transparent; }\n}\n\n@media (hover: none) {\n  .ptm-mod-action {\n    opacity: 0.6;\n  }\n}\n";

  // src/features/mod-actions/index.ts
  var t13 = createTranslator({
    de: {
      label: "Mods als Filter übernehmen",
      description: "Plus und Minus an jeder Mod im Ergebnis fügen sie als Filter hinzu oder schließen sie aus.",
      addTitle: "Als Filter hinzufügen",
      addHint: "Als Filter hinzufügen (Shift: ohne Mindestwert)",
      excludeTitle: "Ausschließen",
      added: "Filter hinzugefügt: {text}",
      excluded: "Ausgeschlossen: {text}",
      duplicate: "Schon im Filter: {text}"
    },
    en: {
      label: "Mod filter buttons",
      description: "Plus and minus on each result mod add it as a filter or exclude it.",
      addTitle: "Add as filter",
      addHint: "Add as filter (Shift: without minimum)",
      excludeTitle: "Exclude",
      added: "Filter added: {text}",
      excluded: "Excluded: {text}",
      duplicate: "Already in filter: {text}"
    }
  });
  var ACTION = "ptm-mod-action";
  var FLASH_OK = "ptm-mod-flash-ok";
  var FLASH_FAIL = "ptm-mod-flash-fail";
  var NUM = String.raw`[-−]?\d+(?:\.\d+)?`;
  var VALUE_RE = new RegExp(`(${NUM})(?:\\s+to\\s+(${NUM}))?`);
  var toNumber = (raw) => Number.parseFloat(raw.replace("−", "-"));
  function parseModValue(text2) {
    const match = VALUE_RE.exec(text2);
    if (!match) return void 0;
    const first = toNumber(match[1]);
    return match[2] === void 0 ? first : Math.floor((first + toNumber(match[2])) / 2);
  }
  async function applyModAction(ctx, action) {
    const type = action.kind === "add" ? "and" : "not";
    try {
      const stats = (await ctx.bridge.getState()).stats ?? [];
      let group = stats.findIndex((g3) => g3.type === type && !g3.disabled);
      if (group >= 0 && stats[group].filters.some((f3) => f3.id === action.id)) {
        ctx.toast(t13("duplicate", { text: action.text }), "warning");
        return true;
      }
      if (group < 0) {
        await ctx.bridge.commit("pushStatGroup", { type, filters: [] });
        group = stats.length;
      }
      const value2 = { id: action.id };
      const min = action.kind === "add" && action.withValue ? parseModValue(action.text) : void 0;
      if (min !== void 0) value2.value = { min };
      await ctx.bridge.commit("setStatFilter", { group, value: value2 });
      ctx.toast(t13(action.kind === "add" ? "added" : "excluded", { text: action.text }));
      return true;
    } catch (error) {
      log.error("mod-actions: commit failed", error);
      ctx.toast(errorText(error), "error");
      return false;
    }
  }
  var modActionsFeature = {
    id: "mod-actions",
    label: () => t13("label"),
    description: () => t13("description"),
    toggleable: true,
    defaultEnabled: true,
    css: feature_default7,
    start(ctx) {
      let queue = Promise.resolve();
      const timers = /* @__PURE__ */ new Set();
      const flash = (line, ok) => {
        const cls = ok ? FLASH_OK : FLASH_FAIL;
        line.classList.remove(FLASH_OK, FLASH_FAIL);
        line.classList.add(cls);
        const timer = setTimeout(() => {
          timers.delete(timer);
          line.classList.remove(cls);
        }, 900);
        timers.add(timer);
      };
      const button = (line, stat, kind) => {
        const el = ctx.doc.createElement("button");
        el.type = "button";
        el.className = `${ACTION} ${ACTION}--${kind}`;
        el.textContent = kind === "add" ? "+" : "−";
        el.title = t13(kind === "add" ? "addHint" : "excludeTitle");
        el.setAttribute("aria-label", `${t13(kind === "add" ? "addTitle" : "excludeTitle")}: ${(stat.textContent ?? "").trim()}`);
        el.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          const action = {
            id: stat.dataset.field.slice("stat.".length),
            text: (stat.textContent ?? "").trim(),
            kind,
            withValue: !event.shiftKey
          };
          queue = queue.then(async () => flash(line, await applyModAction(ctx, action)));
        });
        return el;
      };
      const unregister = ctx.results.decorate("mod-actions", (row) => {
        for (const stat of row.element.querySelectorAll(sel.row.modStat)) {
          const line = stat.parentElement;
          if (line.querySelector(`.${ACTION}`)) continue;
          line.append(button(line, stat, "add"), button(line, stat, "exclude"));
        }
      });
      return {
        dispose() {
          unregister();
          for (const timer of timers) clearTimeout(timer);
          for (const el of ctx.doc.querySelectorAll(`.${ACTION}`)) el.remove();
          for (const el of ctx.doc.querySelectorAll(`.${FLASH_OK}, .${FLASH_FAIL}`)) el.classList.remove(FLASH_OK, FLASH_FAIL);
        }
      };
    }
  };

  // src/features/auto-load-more/index.ts
  var t14 = createTranslator({
    de: {
      label: "Automatisch nachladen",
      description: "Lädt beim Scrollen ans Ende weitere Ergebnisse.",
      paused: "Die Trade-Seite bremst gerade. Automatisches Nachladen pausiert {s} s."
    },
    en: {
      label: "Auto load more",
      description: "Loads more results when you scroll to the end.",
      paused: "The trade site is rate limiting. Auto load paused for {s} s."
    }
  });
  var THROTTLE_MS2 = 750;
  function autoLoadMore(ctx, Observer = IntersectionObserver) {
    let watched = null;
    let inView = false;
    let lastClick = -Infinity;
    let retry;
    let pausedUntil = 0;
    const { doc } = ctx;
    const tryLoad = () => {
      clearTimeout(retry);
      const button = watched;
      if (!inView || !button?.isConnected || button.disabled) return;
      const wait = Math.max(lastClick + THROTTLE_MS2, pausedUntil) - Date.now();
      if (wait > 0) {
        retry = setTimeout(tryLoad, wait);
        return;
      }
      lastClick = Date.now();
      button.click();
    };
    let io = null;
    let root = null;
    const observe = (button, nextRoot) => {
      io?.disconnect();
      root = nextRoot;
      io = new Observer(
        (entries) => {
          const entry = entries.find((e3) => e3.target === watched);
          if (!entry) return;
          inView = entry.isIntersecting;
          tryLoad();
        },
        { root, rootMargin: "480px" }
      );
      if (button) io.observe(button);
    };
    const offRateLimited = ctx.bridge.events.on("rateLimited", (retryAfterMs) => {
      const until = Date.now() + retryAfterMs;
      if (Date.now() >= pausedUntil) ctx.toast(t14("paused", { s: Math.ceil(retryAfterMs / 1e3) }), "warning");
      pausedUntil = Math.max(pausedUntil, until);
      tryLoad();
    });
    let layoutClass = null;
    const attach = () => {
      const button = doc.querySelector(sel.loadMoreButton);
      const htmlClass = doc.documentElement.className;
      if (button === watched && io && htmlClass === layoutClass) return;
      layoutClass = htmlClass;
      const nextRoot = button ? scrollParent(button) : null;
      if (button === watched && nextRoot === root && io) return;
      watched = button;
      inView = false;
      observe(button, nextRoot);
    };
    const mutations = new MutationObserver(attach);
    mutations.observe(doc.body, { childList: true, subtree: true });
    mutations.observe(doc.documentElement, { attributes: true, attributeFilter: ["class"] });
    attach();
    return {
      dispose() {
        clearTimeout(retry);
        offRateLimited();
        mutations.disconnect();
        io?.disconnect();
      }
    };
  }
  function scrollParent(element) {
    for (let node = element.parentElement; node && node !== element.ownerDocument.body; node = node.parentElement) {
      const { overflowY } = getComputedStyle(node);
      if (overflowY === "auto" || overflowY === "scroll") return node;
    }
    return null;
  }
  var autoLoadMoreFeature = {
    id: "auto-load-more",
    label: () => t14("label"),
    description: () => t14("description"),
    toggleable: true,
    defaultEnabled: false,
    start: (ctx) => autoLoadMore(ctx)
  };

  // src/features/layout/feature.css
  var feature_default8 = `/*
 * Layout feature. Everything is scoped under html.ptm-layout (set while the feature runs).
 * html.ptm-layout-split is set by JS when there is room for two columns (see index.ts).
 * --ptm-layout-top is the document offset of the columns, measured by JS.
 */

/* Always: full width, no background art, smaller header. */
html.ptm-layout body {
  background: #0e1115;
}

html.ptm-layout #trade {
  max-width: 1920px;
}

/* Live tuning: header height comes from the logo, the status bar is absolute. */
html.ptm-layout .logo a {
  max-width: 110px;
}

/* Two columns: navigation on top, filters left, results right. */
html.ptm-layout.ptm-layout-split #trade {
  display: grid;
  /* Results need 740px: icon 120 + item card (min-width 400 in the site CSS) + price 200 + scrollbar. */
  grid-template-columns: minmax(440px, 1fr) minmax(740px, 1fr);
  column-gap: 8px;
  margin-bottom: 0;
}

html.ptm-layout.ptm-layout-split #trade > .navigation {
  grid-column: 1 / -1;
  grid-row: 1;
}

html.ptm-layout.ptm-layout-split #trade > .top,
html.ptm-layout.ptm-layout-split #trade > #vue3-portal {
  grid-row: 2;
  /* Leaves room for the site footer (GGG copyright and legal links) below the columns. */
  height: calc(100vh - var(--ptm-layout-top, 0px) - 48px);
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
}

html.ptm-layout.ptm-layout-split #trade > .top {
  grid-column: 1;
}

/* The filter column narrows with the window and the results' needs: size its content by the
 * column, not the viewport. */
html.ptm-layout.ptm-layout-split #trade > .top {
  container: ptm-filters / inline-size;
}

/* Narrow column: one filter per row, and the site's fixed 271px selects leave their labels room
 * (otherwise "Item Category" is cut to "Item Cat"). Stat filter rows are left alone. */
@container ptm-filters (max-width: 640px) {
  html.ptm-layout.ptm-layout-split #trade .filter-group-body > .filter:not(.full-span) {
    width: 100%;
  }

  /* 100% in the table row: the label keeps its text width, the select takes the rest and still
   * ends at the row edge, where the site positions its dropdown arrow. */
  html.ptm-layout.ptm-layout-split #trade .filter-property .filter-select {
    width: 100% !important;
  }
}

/* Vue sets display: contents inline on the portal; it must be a real box to be the right column. */
html.ptm-layout.ptm-layout-split #trade > #vue3-portal {
  display: block !important;
  grid-column: 2;
}

/*
 * The site splits a result row 25/50/25 %, which squeezes the item card below its 400px minimum in
 * a half-width column, so the price overlapped it. Fixed side columns leave the card the rest.
 */
html.ptm-layout.ptm-layout-split #vue3-portal .resultset > .row > .left {
  width: 120px;
}

html.ptm-layout.ptm-layout-split #vue3-portal .resultset > .row > .middle {
  width: calc(100% - 320px);
}

html.ptm-layout.ptm-layout-split #vue3-portal .resultset > .row > .right {
  width: 200px;
}

/* Clearfix divs would take grid cells. */
html.ptm-layout.ptm-layout-split #trade > .clear {
  display: none;
}

/* Left column: one filter pane per row, item search above league and status. */
html.ptm-layout.ptm-layout-split #trade .top .search-bar .search-left,
html.ptm-layout.ptm-layout-split #trade .top .search-bar .search-right,
html.ptm-layout.ptm-layout-split #trade .top .search-bar .search-advanced-pane {
  width: 100%;
}

/*
 * The control bar (quick filters + Search / Clear / Live) stays at the bottom of the screen while
 * the filters scroll: in the left column in two-column mode, in the window otherwise.
 */
html.ptm-layout #trade .top .controls {
  position: sticky;
  bottom: 0;
  z-index: 3;
  background: #000;
  border-top: 1px solid #5a3806;
  box-shadow: 0 -6px 12px rgba(0, 0, 0, 0.6);
}

html.ptm-layout.ptm-layout-split #trade .top .controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  padding: 0 6px 8px;
}

html.ptm-layout.ptm-layout-split #trade .top .controls > .ptm-qf {
  flex: 1 0 100%;
}

/* Live search and Clear keep their label width, Search takes the rest. */
html.ptm-layout.ptm-layout-split #trade .top .controls > .controls-left,
html.ptm-layout.ptm-layout-split #trade .top .controls > .controls-right {
  width: auto;
  flex: 0 0 auto;
  padding: 0;
}

html.ptm-layout.ptm-layout-split #trade .top .controls > .controls-center {
  width: auto;
  flex: 1 1 0;
  padding: 0;
}

html.ptm-layout.ptm-layout-split #trade .top .controls > .clear {
  display: none;
}

html.ptm-layout.ptm-layout-split #trade .top .controls .livesearch-btn {
  white-space: nowrap;
}

html.ptm-layout.ptm-layout-split #trade .top .controls .search-btn {
  width: 100%;
  min-width: 0;
}

html.ptm-layout.ptm-layout-split #trade .top .controls .controls-right {
  display: flex;
  justify-content: flex-end;
  gap: 4px;
}

html.ptm-layout.ptm-layout-split #trade .top .controls .clear-btn,
html.ptm-layout.ptm-layout-split #trade .top .controls .toggle-search-btn {
  min-width: 0;
}

/* The window does not scroll in split mode, so JS shows "Back to top" for the results column. */
html.ptm-layout.ptm-layout-split #trade > .top-btn {
  display: none !important;
}

html.ptm-layout.ptm-layout-split.ptm-layout-scrolled #trade > .top-btn {
  display: block !important;
  opacity: 1 !important;
}

/* Keep "Back to top" clear of our sidebar. */
html.ptm-layout.ptm-sidebar-open #trade > .top-btn {
  right: calc(var(--ptm-sidebar-width, 400px) + 20px);
}

/*
 * In two columns the filters always stay open: the site collapses them after every search, which
 * makes no sense when they have their own column. Its show/hide toggle is hidden for that reason.
 */
html.ptm-layout.ptm-layout-split #trade .search-advanced.search-advanced-hidden,
html.ptm-layout.ptm-layout-split #trade .search-advanced.search-advanced-hidden .search-advanced-items {
  height: auto !important;
  overflow: visible !important;
}

html.ptm-layout.ptm-layout-split #trade .controls .toggle-search-btn {
  display: none;
}

/*
 * Row actions (Travel to Hideout / Direct Whisper, Ignore Player, Pin, "N similar") as one vertical
 * button group: same width, shared borders, no loose buttons. Status and IGN stay above as text.
 */
html.ptm-layout #vue3-portal .resultset > .row .details .btns {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0;
}

html.ptm-layout #vue3-portal .resultset > .row .details .btns > .btn-group,
html.ptm-layout #vue3-portal .resultset > .row .details .btns > span:has(> .btn) {
  display: block;
  float: none;
  margin: 0;
}

html.ptm-layout #vue3-portal .resultset > .row .details .btns .btn {
  display: block;
  float: none;
  width: 100%;
  min-height: 26px;
  margin: 0 0 -1px !important;
  padding: 4px 8px;
  border-radius: 0;
  font-size: 13px;
  line-height: 16px;
  text-align: center;
}

html.ptm-layout #vue3-portal .resultset > .row .details .btns > .status,
html.ptm-layout #vue3-portal .resultset > .row .details .btns > .character-name {
  margin-bottom: 4px;
  text-align: center;
}
`;

  // src/features/layout/index.ts
  var t15 = createTranslator({
    de: { label: "Zwei-Spalten-Layout", description: "Filter links, Ergebnisse rechts, volle Breite." },
    en: { label: "Two-column layout", description: "Filters on the left, results on the right, full width." }
  });
  var SPLIT_MIN_WIDTH = 1188;
  var SCROLLED_MIN = 88;
  var PORTAL = sel.portal;
  var TOP_COLUMN = sel.topColumn;
  function layout(ctx, Observer = ResizeObserver) {
    const { doc, location: location2 } = ctx;
    const root = doc.documentElement;
    const container = doc.querySelector(sel.tradeRoot)?.parentElement ?? doc.body;
    root.classList.add("ptm-layout");
    const update = () => {
      const split = location2.get() !== null && container.clientWidth >= SPLIT_MIN_WIDTH;
      root.classList.toggle("ptm-layout-split", split);
      if (!split) return;
      const column = doc.querySelector(TOP_COLUMN);
      if (column) {
        const top = `${Math.round(column.getBoundingClientRect().top + (doc.defaultView?.scrollY ?? 0))}px`;
        if (root.style.getPropertyValue("--ptm-layout-top") !== top) root.style.setProperty("--ptm-layout-top", top);
      }
    };
    const portal = () => doc.querySelector(PORTAL);
    const onScroll = (event) => {
      if (event.target !== portal()) return;
      root.classList.toggle("ptm-layout-scrolled", event.target.scrollTop > SCROLLED_MIN);
    };
    const onClick = (event) => {
      if (!root.classList.contains("ptm-layout-split")) return;
      if (!event.target?.closest?.(sel.topButton)) return;
      portal()?.scrollTo({ top: 0, behavior: "smooth" });
    };
    const observer = new Observer(update);
    observer.observe(container);
    const offLocation = location2.subscribe(update);
    doc.addEventListener("scroll", onScroll, { capture: true, passive: true });
    doc.addEventListener("click", onClick, true);
    update();
    return {
      dispose() {
        observer.disconnect();
        offLocation();
        doc.removeEventListener("scroll", onScroll, { capture: true });
        doc.removeEventListener("click", onClick, true);
        root.classList.remove("ptm-layout", "ptm-layout-split", "ptm-layout-scrolled");
        root.style.removeProperty("--ptm-layout-top");
        if (!root.getAttribute("style")) root.removeAttribute("style");
      }
    };
  }
  var layoutFeature = {
    id: "layout",
    label: () => t15("label"),
    description: () => t15("description"),
    toggleable: true,
    defaultEnabled: true,
    early: true,
    css: feature_default8,
    start: (ctx) => layout(ctx)
  };

  // src/features/quick-filters/feature.css
  var feature_default9 = `/* Two rows of button groups at the top of the site's control bar; buttons come from the UI kit. */
.ptm-qf {
  width: 100%;
}

.ptm-qf__strip {
  display: grid;
  gap: 5px;
  padding: 6px 0;
}

.ptm-qf__row {
  display: flex;
  gap: 5px;
}

.ptm-qf__anchor {
  position: relative;
  display: flex;
}

.ptm-qf__anchor > .ptm-btn {
  width: 100%;
}

.ptm-qf__btn {
  position: relative;
  overflow: hidden;
}

/* "No": red border and a red diagonal strike. */
.ptm-qf__btn--no {
  border-color: var(--ptm-red-border);
  color: var(--ptm-beige);
}

.ptm-qf__btn--no::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(to top right, transparent calc(50% - 1px), #d02020 calc(50% - 1px), #d02020 calc(50% + 1px), transparent calc(50% + 1px));
  pointer-events: none;
}

.ptm-qf__clear {
  flex: none;
  width: 30px;
  padding: 0;
}

.ptm-qf__badge {
  padding: 1px 4px;
  background: rgba(0, 0, 0, 0.45);
  font-family: var(--ptm-font-body);
  font-size: 11px;
  color: var(--ptm-text);
}

.ptm-qf__btn[data-rarity='normal'],
.ptm-qf__option[data-rarity='normal'] { color: #c8c8c8; }
.ptm-qf__btn[data-rarity='magic'],
.ptm-qf__option[data-rarity='magic'] { color: #8888ff; }
.ptm-qf__btn[data-rarity='rare'],
.ptm-qf__option[data-rarity='rare'] { color: #ffff77; }
.ptm-qf__btn[data-rarity^='unique'],
.ptm-qf__option[data-rarity^='unique'] { color: #af6025; }

/* Opens upwards: the search bar below may be sticky at the bottom of the screen. */
.ptm-qf__pop {
  position: absolute;
  bottom: calc(100% + 4px);
  left: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 5px;
  background: var(--ptm-surface);
  border: 1px solid var(--ptm-gold-border);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.6);
}

.ptm-qf__pop--list {
  flex-direction: column;
  align-items: stretch;
  gap: 0;
  min-width: 160px;
}

.ptm-qf__input {
  width: 64px;
  height: 26px;
  padding: 0 6px;
  border: 0;
  background: var(--ptm-input);
  color: var(--ptm-text);
  font-family: var(--ptm-font-body);
  font-size: 13px;
}

.ptm-qf__quick,
.ptm-qf__option {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 26px;
  min-width: 28px;
  padding: 0 6px;
  border: 1px solid var(--ptm-blue-border);
  background: var(--ptm-blue);
  color: var(--ptm-text);
  font-family: var(--ptm-font-body);
  font-size: 12px;
  cursor: pointer;
}

.ptm-qf__option {
  justify-content: flex-start;
  border: 0;
  background: transparent;
  font-family: var(--ptm-font-title);
  font-size: 13px;
  text-align: left;
}

.ptm-qf__quick:hover,
.ptm-qf__option:hover,
.ptm-qf__option[aria-checked='true'] {
  background: rgba(138, 86, 9, 0.4);
}

/* Narrow filter column (container from the layout feature): chips wrap instead of being cut. */
@container ptm-filters (max-width: 640px) {
  .ptm-qf .ptm-btn-group {
    flex-wrap: wrap;
  }

  .ptm-qf .ptm-btn-group > * {
    flex: 1 0 auto;
  }
}
`;

  // src/features/quick-filters/model.ts
  var TOGGLES = ["corrupted", "fractured_item", "desecrated", "mirrored", "sanctified", "identified"];
  var NUMBERS = [
    { key: "ilvl", group: "type_filters", id: "ilvl", bound: "min", quick: [65, 75, 80, 82] },
    { key: "quality", group: "type_filters", id: "quality", bound: "min", quick: [10, 15, 20] },
    { key: "lvl", group: "req_filters", id: "lvl", bound: "max", quick: [30, 45, 60, 70] },
    { key: "rune_sockets", group: "equipment_filters", id: "rune_sockets", bound: "min", quick: [1, 2, 3] }
  ];
  var MISC = "misc_filters";
  var TYPE = "type_filters";
  function value(filters, group, id) {
    return filters[group]?.filters?.[id] ?? {};
  }
  function toView(filters) {
    const toggles = {};
    for (const id of TOGGLES) {
      const option = value(filters, MISC, id).option;
      toggles[id] = option === "true" ? "yes" : option === "false" ? "no" : "any";
    }
    const numbers = {};
    for (const control of NUMBERS) {
      const n2 = value(filters, control.group, control.id)[control.bound];
      numbers[control.key] = typeof n2 === "number" ? n2 : void 0;
    }
    const rarity = value(filters, TYPE, "rarity").option;
    return { toggles, numbers, rarity: typeof rarity === "string" ? rarity : null };
  }
  var nextTri = (tri) => tri === "any" ? "yes" : tri === "yes" ? "no" : "any";
  function setFilter(filters, group, index, next) {
    const empty = Object.keys(next).length === 0;
    const commits = [];
    if (!empty && filters[group]?.disabled !== false) {
      commits.push({ mutation: "setFilterGroupDisabled", payload: { type: "filters", group, disable: false } });
    }
    commits.push({ mutation: "setPropertyFilter", payload: { group, index, value: next } });
    return commits;
  }
  function toggleCommits(filters, id, tri) {
    return setFilter(filters, MISC, id, tri === "any" ? {} : { option: tri === "yes" ? "true" : "false" });
  }
  function numberCommits(filters, control, n2) {
    const { [control.bound]: _3, ...rest } = value(filters, control.group, control.id);
    return setFilter(filters, control.group, control.id, n2 === void 0 ? rest : { ...rest, [control.bound]: n2 });
  }
  function rarityCommits(filters, option) {
    return setFilter(filters, TYPE, "rarity", option === null ? {} : { option });
  }
  function clearCommits(filters) {
    const view = toView(filters);
    return [
      ...TOGGLES.filter((id) => view.toggles[id] !== "any").flatMap((id) => toggleCommits(filters, id, "any")),
      ...NUMBERS.filter((c3) => view.numbers[c3.key] !== void 0).flatMap((c3) => numberCommits(filters, c3, void 0)),
      ...view.rarity !== null ? rarityCommits(filters, null) : []
    ];
  }
  var isEmpty = (view) => TOGGLES.every((id) => view.toggles[id] === "any") && NUMBERS.every((c3) => view.numbers[c3.key] === void 0) && view.rarity === null;

  // src/features/quick-filters/index.tsx
  var t16 = createTranslator({
    de: {
      label: "Schnellfilter",
      description: "Leiste mit häufigen Filtern wie Verderbt oder Gegenstandsstufe.",
      corrupted: "Verderbt",
      fractured_item: "Brüchig",
      desecrated: "Entweiht",
      mirrored: "Gespiegelt",
      sanctified: "Geheiligt",
      identified: "Identifiziert",
      ilvl: "Gegenstandsstufe",
      quality: "Qualität",
      lvl: "Max. Stufe",
      rune_sockets: "Fassungen",
      rarity: "Seltenheit",
      any: "beliebig",
      yes: "ja",
      no: "nein",
      triTitle: "{name}: {state}. Klick wechselt zwischen beliebig, ja und nein.",
      numberTitle: "{name}: Eingabe mit Enter übernehmen, Esc schließt.",
      reset: "Zurücksetzen",
      clear: "Leeren",
      clearTitle: "Alle Schnellfilter zurücksetzen",
      rarityAny: "Beliebig",
      rarityNormal: "Normal",
      rarityMagic: "Magisch",
      rarityRare: "Selten",
      rarityUnique: "Einzigartig",
      rarityFoil: "Einzigartig (Folie)",
      rarityNonUnique: "Nicht einzigartig"
    },
    en: {
      label: "Quick filters",
      description: "Bar with common filters like corrupted or item level.",
      corrupted: "Corrupted",
      fractured_item: "Fractured",
      desecrated: "Desecrated",
      mirrored: "Mirrored",
      sanctified: "Sanctified",
      identified: "Identified",
      ilvl: "Item level",
      quality: "Quality",
      lvl: "Max level",
      rune_sockets: "Sockets",
      rarity: "Rarity",
      any: "any",
      yes: "yes",
      no: "no",
      triTitle: "{name}: {state}. Click cycles any, yes and no.",
      numberTitle: "{name}: press Enter to apply, Esc closes.",
      reset: "Reset",
      clear: "Clear",
      clearTitle: "Reset all quick filters",
      rarityAny: "Any",
      rarityNormal: "Normal",
      rarityMagic: "Magic",
      rarityRare: "Rare",
      rarityUnique: "Unique",
      rarityFoil: "Unique (Foil)",
      rarityNonUnique: "Any Non-Unique"
    }
  });
  var fallbackRarities = () => [
    { id: null, text: t16("rarityAny") },
    { id: "normal", text: t16("rarityNormal") },
    { id: "magic", text: t16("rarityMagic") },
    { id: "rare", text: t16("rarityRare") },
    { id: "unique", text: t16("rarityUnique") },
    { id: "uniquefoil", text: t16("rarityFoil") },
    { id: "nonunique", text: t16("rarityNonUnique") }
  ];
  function NumberPopover({ control, current, apply }) {
    const input = T2(null);
    A(() => input.current?.focus(), []);
    return /* @__PURE__ */ u3("div", { class: "ptm-qf__pop", role: "dialog", "aria-label": t16(control.key), children: [
      /* @__PURE__ */ u3(
        "input",
        {
          ref: input,
          type: "number",
          min: 0,
          class: "ptm-qf__input",
          value: current ?? "",
          placeholder: control.bound,
          onKeyDown: (event) => {
            if (event.key !== "Enter") return;
            const raw = event.currentTarget.value.trim();
            apply(raw === "" ? void 0 : Number(raw));
          }
        }
      ),
      control.quick.map((n2) => /* @__PURE__ */ u3("button", { type: "button", class: "ptm-qf__quick", onClick: () => apply(n2), children: n2 }, n2)),
      /* @__PURE__ */ u3("button", { type: "button", class: "ptm-qf__quick", title: t16("reset"), "aria-label": t16("reset"), onClick: () => apply(void 0), children: /* @__PURE__ */ u3(IconClose, { size: 12 }) })
    ] });
  }
  function Strip({ state, rarities, apply }) {
    const current = useStore(state);
    const options = useStore(rarities);
    const [open, setOpen] = d2(null);
    const root = T2(null);
    A(() => {
      if (!open) return;
      const close = (event) => {
        if (event instanceof KeyboardEvent ? event.key === "Escape" : !root.current?.contains(event.target)) setOpen(null);
      };
      document.addEventListener("mousedown", close);
      document.addEventListener("keydown", close);
      return () => {
        document.removeEventListener("mousedown", close);
        document.removeEventListener("keydown", close);
      };
    }, [open]);
    if (current?.tab === "exchange") return null;
    const filters = current?.filters ?? {};
    const view = toView(filters);
    const run = (commits) => {
      setOpen(null);
      apply(commits);
    };
    const toggleOpen = (key) => setOpen(open === key ? null : key);
    const rarity = options.find((option) => option.id === view.rarity);
    return /* @__PURE__ */ u3("div", { class: "ptm-qf__strip", ref: root, children: [
      /* @__PURE__ */ u3(ButtonGroup, { block: true, label: t16("label"), children: TOGGLES.map((id) => {
        const tri = view.toggles[id];
        return /* @__PURE__ */ u3(
          "button",
          {
            type: "button",
            class: `ptm-btn ptm-btn--blue ptm-btn--sm ptm-qf__btn ptm-qf__btn--${tri}${tri === "yes" ? " ptm-btn--active" : ""}`,
            "data-filter": id,
            "data-state": tri,
            title: t16("triTitle", { name: t16(id), state: t16(tri) }),
            "aria-label": t16("triTitle", { name: t16(id), state: t16(tri) }),
            onClick: () => run(toggleCommits(filters, id, nextTri(tri))),
            children: /* @__PURE__ */ u3("span", { children: t16(id) })
          },
          id
        );
      }) }),
      /* @__PURE__ */ u3("div", { class: "ptm-qf__row", children: [
        /* @__PURE__ */ u3(ButtonGroup, { block: true, children: [
          NUMBERS.map((control) => {
            const n2 = view.numbers[control.key];
            const name = t16(control.key);
            return /* @__PURE__ */ u3("div", { class: "ptm-qf__anchor", children: [
              /* @__PURE__ */ u3(
                "button",
                {
                  type: "button",
                  class: `ptm-btn ptm-btn--blue ptm-btn--sm ptm-qf__btn${n2 !== void 0 ? " ptm-btn--active" : ""}`,
                  "data-filter": control.key,
                  title: t16("numberTitle", { name }),
                  "aria-expanded": open === control.key,
                  onClick: () => toggleOpen(control.key),
                  children: [
                    /* @__PURE__ */ u3("span", { children: name }),
                    n2 !== void 0 && /* @__PURE__ */ u3("span", { class: "ptm-qf__badge", children: `${control.bound === "min" ? "≥" : "≤"}${n2}` })
                  ]
                }
              ),
              open === control.key && /* @__PURE__ */ u3(
                NumberPopover,
                {
                  control,
                  current: n2,
                  apply: (value2) => run(numberCommits(filters, control, value2 !== void 0 && Number.isFinite(value2) ? value2 : void 0))
                }
              )
            ] }, control.key);
          }),
          /* @__PURE__ */ u3("div", { class: "ptm-qf__anchor", children: [
            /* @__PURE__ */ u3(
              "button",
              {
                type: "button",
                class: `ptm-btn ptm-btn--blue ptm-btn--sm ptm-qf__btn${view.rarity !== null ? " ptm-btn--active" : ""}`,
                "data-filter": "rarity",
                "data-rarity": view.rarity ?? void 0,
                "aria-expanded": open === "rarity",
                onClick: () => toggleOpen("rarity"),
                children: [
                  /* @__PURE__ */ u3("span", { children: view.rarity !== null ? rarity?.text ?? view.rarity : t16("rarity") }),
                  /* @__PURE__ */ u3(IconChevronDown, { size: 11 })
                ]
              }
            ),
            open === "rarity" && /* @__PURE__ */ u3("div", { class: "ptm-qf__pop ptm-qf__pop--list", children: options.map((option) => /* @__PURE__ */ u3(
              "button",
              {
                type: "button",
                "aria-pressed": option.id === view.rarity,
                class: "ptm-qf__option",
                "data-rarity": option.id ?? void 0,
                onClick: () => run(rarityCommits(filters, option.id)),
                children: option.text
              },
              option.id ?? "any"
            )) })
          ] })
        ] }),
        /* @__PURE__ */ u3(
          "button",
          {
            type: "button",
            class: "ptm-btn ptm-btn--red ptm-btn--sm ptm-qf__clear",
            title: t16("clearTitle"),
            "aria-label": t16("clearTitle"),
            disabled: isEmpty(view),
            onClick: () => run(clearCommits(filters)),
            children: /* @__PURE__ */ u3(IconClose, { size: 12 })
          }
        )
      ] })
    ] });
  }
  var DEBOUNCE_MS = 100;
  function start2(ctx) {
    const { doc, bridge: bridge2 } = ctx;
    const state = new Store(null);
    const rarities = new Store(fallbackRarities());
    let disposed = false;
    let timer;
    const refresh = async () => {
      try {
        const next = await bridge2.getState();
        if (!disposed) state.set(next);
      } catch (error) {
        log.warn("quick filters: reading the form failed", error);
      }
    };
    const apply = async (commits) => {
      try {
        for (const commit of commits) await bridge2.commit(commit.mutation, commit.payload);
      } catch (error) {
        log.error("quick filters: commit failed", error);
        ctx.toast(errorText(error), "error");
      }
      await refresh();
    };
    const offMutation = bridge2.events.on("mutation", () => {
      clearTimeout(timer);
      timer = setTimeout(refresh, DEBOUNCE_MS);
    });
    ctx.data.filterOptions().then((map) => {
      const options = map.get("type_filters.rarity");
      if (options?.length && !disposed) rarities.set(options);
    }).catch(() => {
    });
    const host = doc.createElement("div");
    host.className = "ptm-qf";
    const place = () => {
      const controls = doc.querySelector(sel.controls);
      if (controls && controls.firstElementChild !== host) controls.prepend(host);
    };
    const observer = new MutationObserver(place);
    observer.observe(doc.body, { childList: true, subtree: true });
    place();
    G(/* @__PURE__ */ u3(Strip, { state, rarities, apply }), host);
    void refresh();
    return {
      dispose() {
        disposed = true;
        clearTimeout(timer);
        offMutation();
        observer.disconnect();
        G(null, host);
        host.remove();
      }
    };
  }
  var quickFiltersFeature = {
    id: "quick-filters",
    label: () => t16("label"),
    description: () => t16("description"),
    toggleable: true,
    defaultEnabled: true,
    css: feature_default9,
    start: start2
  };

  // src/features/stat-favorites/feature.css
  var feature_default10 = "/* Favorites float to the top via `order`; vue-multiselect sets display: inline-block inline. */\n.ptm-stat-fav-list {\n  display: flex !important;\n  flex-direction: column;\n}\n\n.ptm-stat-fav-list > li.ptm-stat-fav {\n  order: -1;\n}\n\n.ptm-stat-fav-list.ptm-stat-has-fav::before {\n  content: attr(data-ptm-fav-label);\n  order: -2;\n  padding: 4px 12px;\n  font: 13px var(--ptm-font-title);\n  color: var(--ptm-muted);\n}\n\n/* Separator after the favorites block, before the first group header. */\n.ptm-stat-fav-list.ptm-stat-has-fav::after {\n  content: '';\n  order: -1;\n  border-bottom: 1px solid var(--ptm-gold-border);\n}\n\n.multiselect__option:has(> .ptm-stat-star) {\n  position: relative;\n  padding-right: 32px;\n}\n\n.ptm-stat-star {\n  position: absolute;\n  top: 50%;\n  right: 4px;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  width: 24px;\n  height: 24px;\n  margin-top: -12px;\n  padding: 0;\n  border: 0;\n  background: none;\n  color: var(--ptm-muted);\n  cursor: pointer;\n  opacity: 0.45;\n  transition: opacity 0.2s, color 0.2s;\n}\n\n.multiselect__option:hover > .ptm-stat-star,\n.ptm-stat-star[aria-pressed='true'] {\n  opacity: 1;\n}\n\n.ptm-stat-star:hover {\n  color: var(--ptm-beige);\n}\n\n.ptm-stat-star[aria-pressed='true'] {\n  color: var(--ptm-gold-border);\n  filter: brightness(1.6);\n}\n\n.ptm-stat-star[aria-pressed='true'] svg {\n  fill: currentColor;\n}\n\n@media (hover: none) {\n  .ptm-stat-star {\n    opacity: 0.6;\n  }\n}\n";

  // src/features/stat-favorites/index.ts
  var t17 = createTranslator({
    de: {
      label: "Stat-Favoriten",
      description: "Stern an Stat-Filtern, Favoriten stehen oben.",
      add: "Zu Favoriten hinzufügen",
      remove: "Aus Favoriten entfernen",
      favorites: "Favoriten"
    },
    en: {
      label: "Stat favorites",
      description: "Star stat filters to keep them at the top.",
      add: "Add to favorites",
      remove: "Remove from favorites",
      favorites: "Favorites"
    }
  });
  var DROPDOWN = `${sel.statPane} .filter-select-mutate`;
  var STAR = "ptm-stat-star";
  var FAV = "ptm-stat-fav";
  var LIST = "ptm-stat-fav-list";
  var HAS_FAV = "ptm-stat-has-fav";
  function optionKey(option) {
    const typeClass = [...option.querySelector(":scope > .mutate-type")?.classList ?? []].find(
      (c3) => c3.startsWith("mutate-type-")
    );
    const text2 = option.querySelector(":scope > div")?.textContent?.replace(/\s+/g, " ").trim();
    return typeClass && text2 ? `${typeClass.slice("mutate-type-".length)}::${text2}` : null;
  }
  var asElement = (node) => node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
  async function start3(ctx) {
    const { doc, win } = ctx;
    const favorites = await persistedStore(ctx.storage, "stat-favorites:keys", {
      defaultValue: [],
      schema: 1
    });
    const toggle = (key) => favorites.update((keys) => keys.includes(key) ? keys.filter((k2) => k2 !== key) : [...keys, key]);
    const swallow = (event) => {
      event.preventDefault();
      event.stopPropagation();
    };
    const createStar = () => {
      const star = doc.createElement("button");
      star.type = "button";
      star.tabIndex = -1;
      star.className = STAR;
      G(g(IconStar, { size: 16 }), star);
      star.addEventListener("pointerdown", swallow, true);
      star.addEventListener("mousedown", swallow, true);
      star.addEventListener(
        "click",
        (event) => {
          swallow(event);
          const key = star.parentElement && optionKey(star.parentElement);
          if (key) toggle(key);
        },
        true
      );
      return star;
    };
    const decorate = () => {
      const keys = new Set(favorites.get());
      for (const list of doc.querySelectorAll(`${DROPDOWN} .multiselect__content`)) {
        let hasFav = false;
        for (const option of list.querySelectorAll(":scope > li > .multiselect__option")) {
          const key = optionKey(option);
          let star = option.querySelector(`:scope > .${STAR}`);
          const fav = key !== null && keys.has(key);
          option.parentElement.classList.toggle(FAV, fav);
          if (!key) {
            star?.remove();
            continue;
          }
          star ??= option.appendChild(createStar());
          star.setAttribute("aria-pressed", String(fav));
          star.setAttribute("aria-label", fav ? t17("remove") : t17("add"));
          star.title = star.getAttribute("aria-label");
          hasFav ||= fav;
        }
        list.classList.add(LIST);
        list.classList.toggle(HAS_FAV, hasFav);
        list.dataset.ptmFavLabel = t17("favorites");
      }
    };
    let frame = 0;
    const schedule = () => {
      frame ||= win.requestAnimationFrame(() => {
        frame = 0;
        decorate();
      });
    };
    const observer = new MutationObserver((records) => {
      const relevant = records.some(
        (record) => asElement(record.target)?.closest(sel.statPane) || [...record.addedNodes].some((node) => node.querySelector?.(DROPDOWN))
      );
      if (relevant) schedule();
    });
    observer.observe(doc.body, { childList: true, subtree: true, characterData: true });
    const unsubscribe = favorites.subscribe(decorate);
    decorate();
    return {
      dispose() {
        observer.disconnect();
        unsubscribe();
        if (frame) win.cancelAnimationFrame(frame);
        doc.querySelectorAll(`.${STAR}`).forEach((star) => star.remove());
        doc.querySelectorAll(`.${FAV}`).forEach((li) => li.classList.remove(FAV));
        doc.querySelectorAll(`.${LIST}`).forEach((list) => {
          list.classList.remove(LIST, HAS_FAV);
          delete list.dataset.ptmFavLabel;
        });
      }
    };
  }
  var statFavoritesFeature = {
    id: "stat-favorites",
    label: () => t17("label"),
    description: () => t17("description"),
    toggleable: true,
    defaultEnabled: true,
    css: feature_default10,
    start: start3
  };

  // src/features/search-clear/feature.css
  var feature_default11 = ".search-left:has(> .ptm-search-clear) {\n  position: relative;\n}\n\n.search-left:has(> .ptm-search-clear:not([hidden])) .multiselect__tags {\n  padding-right: 68px;\n}\n\n/* Left of the multiselect caret (40px wide). */\n.ptm-search-clear {\n  position: absolute;\n  top: 50%;\n  right: 40px;\n  z-index: 51;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  width: 24px;\n  height: 24px;\n  margin-top: -12px;\n  padding: 0;\n  border: 0;\n  background: none;\n  color: var(--ptm-muted);\n  cursor: pointer;\n  transition: color 0.2s;\n}\n\n.ptm-search-clear[hidden] {\n  display: none;\n}\n\n.ptm-search-clear:hover,\n.ptm-search-clear:focus-visible {\n  color: var(--ptm-beige);\n}\n";

  // src/features/search-clear/index.ts
  var t18 = createTranslator({
    de: { label: "Suchfeld leeren", description: "Löschen-Knopf im Item-Suchfeld.", clear: "Item-Suche leeren" },
    en: { label: "Clear item search", description: "Clear button in the item search field.", clear: "Clear item search" }
  });
  var BUTTON2 = "ptm-search-clear";
  var CONTAINER = "#trade .search-bar .search-left";
  async function start4(ctx) {
    const { doc, bridge: bridge2 } = ctx;
    let hasItem = false;
    let stateRequest = 0;
    const input = () => doc.querySelector(sel.itemSearchInput);
    const button = doc.createElement("button");
    button.type = "button";
    button.className = BUTTON2;
    button.hidden = true;
    button.setAttribute("aria-label", t18("clear"));
    button.title = t18("clear");
    G(g(IconClose, { size: 14 }), button);
    const update = () => {
      button.hidden = !hasItem && !input()?.value;
    };
    const refresh = async () => {
      const request = ++stateRequest;
      try {
        const state = await bridge2.getState();
        if (request !== stateRequest) return;
        hasItem = state.name != null || state.type != null || state.term != null;
        update();
      } catch (error) {
        log.error("search-clear: reading the item failed", error);
      }
    };
    button.addEventListener("click", () => {
      bridge2.commit("setItem", {}).catch((error) => {
        log.error("search-clear: setItem failed", error);
        ctx.toast(errorText(error), "error");
      });
      const field = input();
      if (field) {
        field.value = "";
        field.dispatchEvent(new Event("input", { bubbles: true }));
      }
      hasItem = false;
      stateRequest++;
      update();
    });
    const ensure = () => {
      const container = doc.querySelector(CONTAINER);
      if (container && button.parentElement !== container) container.append(button);
    };
    const onInput = (event) => {
      if (event.target.matches?.(sel.itemSearchInput)) update();
    };
    doc.addEventListener("input", onInput, true);
    doc.addEventListener("focusout", onInput, true);
    const observer = new MutationObserver(ensure);
    observer.observe(doc.body, { childList: true, subtree: true });
    const off = bridge2.events.on("mutation", () => void refresh());
    ensure();
    void refresh();
    return {
      dispose() {
        observer.disconnect();
        off();
        doc.removeEventListener("input", onInput, true);
        doc.removeEventListener("focusout", onInput, true);
        button.remove();
      }
    };
  }
  var searchClearFeature = {
    id: "search-clear",
    label: () => t18("label"),
    description: () => t18("description"),
    toggleable: true,
    defaultEnabled: true,
    css: feature_default11,
    start: start4
  };

  // src/features/fuzzy-search/index.ts
  var t19 = createTranslator({
    de: {
      label: "Immer unscharf suchen",
      description: "Setzt automatisch ~ vor die Eingabe in den Suchfeldern, damit die Seite unscharf sucht."
    },
    en: {
      label: "Always fuzzy search",
      description: "Adds ~ in front of what you type in search fields so the site matches fuzzily."
    }
  });
  var ACTIVE = "multiselect--active";
  function start5({ doc }) {
    const handled = /* @__PURE__ */ new WeakSet();
    const observer = new MutationObserver((records) => {
      for (const { target } of records) {
        const select = target;
        if (!select.classList.contains("multiselect") || !select.closest(sel.tradeRoot)) continue;
        if (!select.classList.contains(ACTIVE)) {
          handled.delete(select);
          continue;
        }
        if (handled.has(select)) continue;
        const input = select.querySelector(".multiselect__input");
        if (!input) continue;
        handled.add(select);
        if (input.value.startsWith("~")) continue;
        input.value = `~${input.value}`;
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.setSelectionRange(1, input.value.length);
      }
    });
    observer.observe(doc.body, { attributes: true, attributeFilter: ["class"], subtree: true });
    return { dispose: () => observer.disconnect() };
  }
  var fuzzySearchFeature = {
    id: "fuzzy-search",
    label: () => t19("label"),
    description: () => t19("description"),
    toggleable: true,
    defaultEnabled: true,
    start: start5
  };

  // src/features/index.ts
  var features = [
    bookmarksFeature,
    historyFeature,
    pinsFeature,
    tabTitleFeature,
    highlightModsFeature,
    regroupSimilarFeature,
    priceEquivalentFeature,
    modActionsFeature,
    autoLoadMoreFeature,
    layoutFeature,
    quickFiltersFeature,
    statFavoritesFeature,
    searchClearFeature,
    fuzzySearchFeature
  ];

  // src/core/events.ts
  var EventBus = class {
    #handlers = /* @__PURE__ */ new Map();
    on(name, handler) {
      let set = this.#handlers.get(name);
      if (!set) this.#handlers.set(name, set = /* @__PURE__ */ new Set());
      set.add(handler);
      return () => set.delete(handler);
    }
    emit(name, payload) {
      for (const handler of [...this.#handlers.get(name) ?? []]) {
        try {
          handler(payload);
        } catch (error) {
          console.error(`[ptm] handler for "${String(name)}" failed`, error);
        }
      }
    }
  };

  // src/site/bridge/client.ts
  var PageBridge = class {
    constructor(win = window) {
      this.win = win;
      win.addEventListener(PAGE_TO_CONTENT, (event) => {
        const detail = event.detail;
        if (typeof detail !== "string") return;
        let message;
        try {
          message = JSON.parse(detail);
        } catch {
          return;
        }
        if (message && typeof message === "object" && typeof message.kind === "string") {
          this.#receive(message);
        }
      });
    }
    win;
    events = new EventBus();
    // Random start so two script instances (two userscript managers) do not take each other's replies.
    #nextRequestId = Math.floor(Math.random() * 1e9);
    #ready = false;
    #pending = /* @__PURE__ */ new Map();
    get isReady() {
      return this.#ready;
    }
    /** Resolves when the site's Vue app is available. */
    whenReady() {
      if (this.#ready) return Promise.resolve();
      return new Promise((resolve) => {
        const off = this.events.on("ready", () => {
          off();
          resolve();
        });
      });
    }
    getState() {
      return this.send({ kind: "getState" });
    }
    /** Commits a Vuex mutation, e.g. `commit('setStatFilter', { group: 0, value })`. */
    commit(mutation, payload) {
      return this.send({ kind: "commit", mutation, payload });
    }
    send(command, timeoutMs = 5e3) {
      const requestId = this.#nextRequestId++;
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          this.#pending.delete(requestId);
          reject(new Error(`page bridge: "${command.kind}" timed out`));
        }, timeoutMs);
        this.#pending.set(requestId, {
          resolve: (value2) => {
            clearTimeout(timer);
            resolve(value2);
          },
          reject: (error) => {
            clearTimeout(timer);
            reject(error);
          }
        });
        this.win.dispatchEvent(
          new CustomEvent(CONTENT_TO_PAGE, { detail: JSON.stringify({ ...command, requestId }) })
        );
      });
    }
    #receive(message) {
      switch (message.kind) {
        case "ready":
          this.#ready = true;
          this.events.emit("ready", void 0);
          break;
        case "search":
          this.events.emit("search", message.captured);
          break;
        case "listings":
          this.events.emit("listings", message.results);
          break;
        case "mutation":
          this.events.emit("mutation", message.type);
          break;
        case "rateLimited":
          this.events.emit("rateLimited", message.retryAfterMs);
          break;
        case "reply": {
          const pending = this.#pending.get(message.requestId);
          if (!pending) return;
          this.#pending.delete(message.requestId);
          if (message.ok) pending.resolve(message.value);
          else pending.reject(new Error(message.error));
          break;
        }
      }
    }
  };
  function injectPageScript(code, doc = document) {
    const inject = (parent2) => {
      const script = doc.createElement("script");
      script.textContent = code;
      parent2.append(script);
      script.remove();
    };
    const parent = doc.head ?? doc.documentElement;
    if (parent) return inject(parent);
    const observer = new MutationObserver(() => {
      if (!doc.documentElement) return;
      observer.disconnect();
      inject(doc.documentElement);
    });
    observer.observe(doc, { childList: true });
  }

  // src/site/location.ts
  function trackLocation(win = window, intervalMs = 400) {
    const href = new Store(win.location.href);
    const location2 = new Store(parseTradeLocation(win.location.href));
    const check = () => {
      if (win.location.href === href.get()) return;
      href.set(win.location.href);
      const next = parseTradeLocation(win.location.href);
      if (!sameLocation(next, location2.get())) location2.set(next);
    };
    const timer = win.setInterval(check, intervalMs);
    win.addEventListener("popstate", check);
    return {
      location: location2,
      href,
      stop: () => {
        win.clearInterval(timer);
        win.removeEventListener("popstate", check);
      }
    };
  }
  function sameLocation(a3, b3) {
    return JSON.stringify(a3) === JSON.stringify(b3);
  }

  // src/site/results.ts
  var MAX_CACHED_LISTINGS = 2e3;
  var DATA_WAIT_MS = 1500;
  var ResultsObserver = class {
    constructor(bridge2, doc = document, dataWaitMs = DATA_WAIT_MS) {
      this.doc = doc;
      this.dataWaitMs = dataWaitMs;
      bridge2.events.on("listings", (results) => {
        for (const result of results) this.#listings.set(result.id, result);
        this.#trimCache();
        this.#schedule();
      });
    }
    doc;
    dataWaitMs;
    #listings = /* @__PURE__ */ new Map();
    #decorators = /* @__PURE__ */ new Map();
    #clearHandlers = /* @__PURE__ */ new Set();
    #observer = null;
    #scheduled = false;
    #hadRows = false;
    #firstSeen = /* @__PURE__ */ new WeakMap();
    #retryTimer = null;
    start() {
      if (this.#observer) return;
      this.#observer = new MutationObserver(() => this.#schedule());
      this.#observer.observe(this.doc.body, { childList: true, subtree: true });
      this.#schedule();
    }
    stop() {
      this.#observer?.disconnect();
      this.#observer = null;
      if (this.#retryTimer) clearTimeout(this.#retryTimer);
      this.#retryTimer = null;
    }
    /** Registers a decorator. Returns a function that unregisters it. */
    decorate(key, decorator) {
      this.#decorators.set(key, decorator);
      this.#schedule();
      return () => {
        this.#decorators.delete(key);
        for (const element of this.doc.querySelectorAll(sel.resultRow)) {
          element.removeAttribute(markerFor(key));
        }
      };
    }
    /** Called when the result list is emptied (new search, clear). */
    onClear(handler) {
      this.#clearHandlers.add(handler);
      return () => this.#clearHandlers.delete(handler);
    }
    getListing(id) {
      return this.#listings.get(id);
    }
    rows() {
      return [...this.doc.querySelectorAll(sel.resultRow)].map((element) => this.#toRow(element));
    }
    /** Runs all decorators now. Exposed for tests; normally batched per animation frame. */
    flush() {
      this.#scheduled = false;
      const elements = [...this.doc.querySelectorAll(sel.resultRow)];
      if (elements.length === 0) {
        if (this.#hadRows) for (const handler of this.#clearHandlers) handler();
        this.#hadRows = false;
        return;
      }
      this.#hadRows = true;
      const now = Date.now();
      for (const element of elements) {
        if (!this.#listings.has(element.dataset.id ?? "")) {
          const seen = this.#firstSeen.get(element) ?? now;
          this.#firstSeen.set(element, seen);
          if (now - seen < this.dataWaitMs) {
            this.#retryLater(this.dataWaitMs - (now - seen));
            continue;
          }
        }
        for (const [key, decorator] of this.#decorators) {
          const marker = markerFor(key);
          if (element.hasAttribute(marker)) continue;
          element.setAttribute(marker, "");
          try {
            decorator(this.#toRow(element));
          } catch (error) {
            console.error(`[ptm] decorator "${key}" failed`, error);
          }
        }
      }
    }
    #retryLater(ms) {
      if (this.#retryTimer) return;
      this.#retryTimer = setTimeout(() => {
        this.#retryTimer = null;
        this.#schedule();
      }, ms);
    }
    #toRow(element) {
      const id = element.dataset.id ?? "";
      return { element, id, data: this.#listings.get(id) };
    }
    #schedule() {
      if (this.#scheduled) return;
      this.#scheduled = true;
      requestAnimationFrame(() => this.flush());
    }
    #trimCache() {
      const overflow = this.#listings.size - MAX_CACHED_LISTINGS;
      if (overflow <= 0) return;
      const keys = this.#listings.keys();
      for (let i3 = 0; i3 < overflow; i3++) this.#listings.delete(keys.next().value);
    }
  };
  function markerFor(key) {
    return `data-ptm-${key}`;
  }

  // src/site/tradeData.ts
  var TradeData = class {
    constructor(fetchJson = defaultFetchJson, imageOrigin = "https://web.poecdn.com") {
      this.fetchJson = fetchJson;
      this.imageOrigin = imageOrigin;
    }
    fetchJson;
    imageOrigin;
    #stats;
    #currencies;
    #filterOptions;
    /** All searchable stats by id, e.g. "explicit.stat_3299347043" → "# to maximum Life". */
    stats() {
      this.#stats ??= this.fetchJson("/api/trade2/data/stats").then((json) => {
        const map = /* @__PURE__ */ new Map();
        for (const group of json.result) {
          for (const entry of group.entries) map.set(entry.id, entry);
        }
        return map;
      }).catch((error) => {
        this.#stats = void 0;
        throw error;
      });
      return this.#stats;
    }
    /** Currencies and other static items by trade id, e.g. "divine", "exalted". */
    currencies() {
      this.#currencies ??= this.fetchJson("/api/trade2/data/static").then((json) => {
        const map = /* @__PURE__ */ new Map();
        for (const group of json.result) {
          for (const entry of group.entries) {
            map.set(entry.id, {
              id: entry.id,
              text: entry.text,
              image: entry.image ? new URL(entry.image, this.imageOrigin).href : null
            });
          }
        }
        return map;
      }).catch((error) => {
        this.#currencies = void 0;
        throw error;
      });
      return this.#currencies;
    }
    /** Options of select filters keyed by "<group>.<filter>", e.g. "type_filters.category". */
    filterOptions() {
      this.#filterOptions ??= this.fetchJson("/api/trade2/data/filters").then((json) => {
        const map = /* @__PURE__ */ new Map();
        for (const group of json.result) {
          for (const filter of group.filters) {
            if (filter.option) map.set(`${group.id}.${filter.id}`, filter.option.options);
          }
        }
        return map;
      }).catch((error) => {
        this.#filterOptions = void 0;
        throw error;
      });
      return this.#filterOptions;
    }
  };
  async function defaultFetchJson(path) {
    const response = await fetch(path, { credentials: "same-origin" });
    if (!response.ok) throw new Error(`${path}: ${response.status}`);
    return response.json();
  }

  // src/app/context.ts
  var AppContextValue = K(null);
  function useApp() {
    const ctx = w2(AppContextValue);
    if (!ctx) throw new Error("useApp() used outside of <AppContextValue.Provider>");
    return ctx;
  }

  // src/ui/SettingsModal.tsx
  function SettingsModal({ features: features2, onClose }) {
    const { settings } = useApp();
    const current = useStore(settings);
    const setFeature = (id, enabled) => settings.update((value2) => ({ ...value2, features: { ...value2.features, [id]: enabled } }));
    return /* @__PURE__ */ u3(Modal, { title: t4("settings"), onClose, children: [
      /* @__PURE__ */ u3(Field, { label: t4("language"), children: /* @__PURE__ */ u3(
        "select",
        {
          class: "ptm-input",
          value: current.language,
          onChange: (event) => {
            const language = event.currentTarget.value;
            settings.update((value2) => ({ ...value2, language }));
          },
          children: [
            /* @__PURE__ */ u3("option", { value: "auto", children: t4("languageAuto") }),
            /* @__PURE__ */ u3("option", { value: "de", children: "Deutsch" }),
            /* @__PURE__ */ u3("option", { value: "en", children: "English" })
          ]
        }
      ) }),
      /* @__PURE__ */ u3("h3", { class: "ptm-section-title", children: t4("features") }),
      /* @__PURE__ */ u3("div", { class: "ptm-settings-grid", children: features2.filter((feature) => feature.toggleable).map((feature) => /* @__PURE__ */ u3(
        Checkbox,
        {
          checked: isFeatureEnabled(current, feature.id, feature.defaultEnabled),
          onChange: (enabled) => setFeature(feature.id, enabled),
          label: feature.label(),
          description: feature.description()
        },
        feature.id
      )) }),
      /* @__PURE__ */ u3("p", { class: "ptm-meta", children: [
        t4("version", { version: "0.3.0" }),
        " ·",
        " ",
        /* @__PURE__ */ u3("a", { href: "https://github.com/maluramichael/poe2-trade-monkey", target: "_blank", rel: "noreferrer", children: t4("sourceCode") })
      ] }),
      /* @__PURE__ */ u3("p", { class: "ptm-meta", children: t4("disclaimer") })
    ] });
  }

  // src/ui/Sidebar.tsx
  function Sidebar({ host }) {
    const { settings } = useApp();
    const { sidebarCollapsed, activeTab } = useStore(settings);
    const running = useStore(host.running);
    const [settingsOpen, setSettingsOpen] = d2(false);
    const tabs = running.filter((entry) => entry.feature.sidebarTab && entry.Panel).sort((a3, b3) => a3.feature.sidebarTab.order - b3.feature.sidebarTab.order);
    const active = tabs.find((entry) => entry.feature.id === activeTab) ?? tabs[0];
    const expandRef = T2(null);
    const headerRef = T2(null);
    const tablistRef = T2(null);
    const focusAfterToggle = T2(false);
    const setCollapsed = (collapsed) => {
      focusAfterToggle.current = true;
      settings.update((value2) => ({ ...value2, sidebarCollapsed: collapsed }));
    };
    A(() => {
      if (!focusAfterToggle.current) return;
      focusAfterToggle.current = false;
      (sidebarCollapsed ? expandRef.current : headerRef.current?.querySelector("button"))?.focus();
    }, [sidebarCollapsed]);
    const selectTab = (id) => settings.update((value2) => ({ ...value2, activeTab: id }));
    const onTabKeyDown = (event, index) => {
      const last = tabs.length - 1;
      const next = { ArrowRight: index === last ? 0 : index + 1, ArrowLeft: index === 0 ? last : index - 1, Home: 0, End: last }[event.key];
      if (next === void 0) return;
      event.preventDefault();
      const id = tabs[next].feature.id;
      selectTab(id);
      tablistRef.current?.querySelector(`#ptm-tab-${id}`)?.focus();
    };
    return /* @__PURE__ */ u3(M, { children: [
      sidebarCollapsed && /* @__PURE__ */ u3("button", { ref: expandRef, type: "button", class: "ptm-expand-tab", title: t4("expand"), "aria-label": t4("expand"), onClick: () => setCollapsed(false), children: [
        /* @__PURE__ */ u3(IconChevronLeft, { size: 16 }),
        /* @__PURE__ */ u3(Logo, { size: 24 })
      ] }),
      /* @__PURE__ */ u3("aside", { class: "ptm-sidebar", "aria-label": t4("appName"), ...sidebarCollapsed ? { inert: true } : {}, children: [
        /* @__PURE__ */ u3("header", { ref: headerRef, class: "ptm-sidebar__header", children: [
          /* @__PURE__ */ u3(IconButton, { label: t4("collapse"), onClick: () => setCollapsed(true), children: /* @__PURE__ */ u3(IconChevronRight, { size: 18 }) }),
          /* @__PURE__ */ u3("div", { class: "ptm-sidebar__brand", children: [
            /* @__PURE__ */ u3(Logo, {}),
            /* @__PURE__ */ u3("span", { children: t4("appName") })
          ] }),
          /* @__PURE__ */ u3(IconButton, { label: t4("settings"), onClick: () => setSettingsOpen(true), children: /* @__PURE__ */ u3(IconSettings, { size: 18 }) })
        ] }),
        tabs.length > 0 ? /* @__PURE__ */ u3(M, { children: [
          /* @__PURE__ */ u3("div", { ref: tablistRef, role: "tablist", class: "ptm-tabs", "aria-label": t4("appName"), children: tabs.map(({ feature }, index) => {
            const TabIcon = feature.sidebarTab.icon;
            const selected = feature.id === active?.feature.id;
            return /* @__PURE__ */ u3(
              "button",
              {
                type: "button",
                role: "tab",
                id: `ptm-tab-${feature.id}`,
                "aria-controls": "ptm-tabpanel",
                "aria-selected": selected,
                tabIndex: selected ? 0 : -1,
                class: selected ? "ptm-tab ptm-tab--active" : "ptm-tab",
                onClick: () => selectTab(feature.id),
                onKeyDown: (event) => onTabKeyDown(event, index),
                children: [
                  /* @__PURE__ */ u3(TabIcon, {}),
                  /* @__PURE__ */ u3("span", { children: feature.sidebarTab.label() })
                ]
              },
              feature.id
            );
          }) }),
          /* @__PURE__ */ u3("div", { class: "ptm-sidebar__panel", role: "tabpanel", id: "ptm-tabpanel", "aria-labelledby": active && `ptm-tab-${active.feature.id}`, children: active?.Panel && /* @__PURE__ */ u3(active.Panel, {}) })
        ] }) : /* @__PURE__ */ u3("p", { class: "ptm-empty", children: t4("noTabs") })
      ] }),
      settingsOpen && /* @__PURE__ */ u3(SettingsModal, { features: host.features, onClose: () => setSettingsOpen(false) })
    ] });
  }

  // src/ui/Toasts.tsx
  function Toasts() {
    const { toast } = useApp();
    const toasts = useStore(toast.toasts);
    const list = (entries) => entries.map((entry) => /* @__PURE__ */ u3(
      "button",
      {
        type: "button",
        class: `ptm-toast ptm-toast--${entry.kind}`,
        title: t4("close"),
        onClick: () => toast.dismiss(entry.id),
        children: entry.message
      },
      entry.id
    ));
    return /* @__PURE__ */ u3("div", { class: "ptm-toasts", children: [
      /* @__PURE__ */ u3("div", { role: "status", "aria-live": "polite", children: list(toasts.filter((entry) => entry.kind !== "error")) }),
      /* @__PURE__ */ u3("div", { role: "alert", children: list(toasts.filter((entry) => entry.kind === "error")) })
    ] });
  }

  // src/ui/App.tsx
  function App({ ctx, host }) {
    return /* @__PURE__ */ u3(AppContextValue.Provider, { value: ctx, children: [
      /* @__PURE__ */ u3(Sidebar, { host }),
      /* @__PURE__ */ u3(Toasts, {})
    ] });
  }

  // src/ui/core.css
  var core_default = "/* Shared UI shell. Tokens and components follow DESIGN.md. Components are scoped to #ptm-root. */\n\n/* Tokens live on :root so feature styles inside the trade page can use them too. */\n:root {\n  --ptm-sidebar-width: 400px;\n  --ptm-focus: #c59a50;\n  --ptm-bg: rgba(10, 10, 10, 0.88);\n  --ptm-surface: #161616;\n  --ptm-input: #1e2124;\n  --ptm-blue: #0f304d;\n  --ptm-blue-hover: #133d62;\n  --ptm-blue-border: #4c4c7d;\n  --ptm-blue-line: rgba(76, 76, 125, 0.4);\n  --ptm-gold: #5a3806;\n  --ptm-gold-hover: #724708;\n  --ptm-gold-border: #8a5609;\n  --ptm-red: #5a0a09;\n  --ptm-red-hover: #710d0b;\n  --ptm-red-border: #6d2725;\n  --ptm-green: #4b7e42;\n  --ptm-green-border: #5e9954;\n  --ptm-yellow: #666521;\n  --ptm-yellow-border: #7a7921;\n  --ptm-text: #ffffff;\n  --ptm-beige: #fff8e1;\n  --ptm-muted: #a38d6d;\n  --ptm-menu: #373737;\n  --ptm-menu-border: #7a7a7a;\n  --ptm-font-title: FontinSmallCaps, FontinSmallcaps, Verdana, Arial, sans-serif;\n  --ptm-font-body: Verdana, Arial, Helvetica, sans-serif;\n}\n\n#ptm-root {\n  font-family: var(--ptm-font-body);\n  font-size: 13px;\n  color: var(--ptm-text);\n  line-height: 1.35;\n}\n\n#ptm-root *,\n#ptm-root *::before,\n#ptm-root *::after {\n  box-sizing: border-box;\n}\n\n#ptm-root button {\n  font: inherit;\n  color: inherit;\n}\n\n/* Page gets pushed left instead of being covered (Better Trading overlays it since PoE2 0.5). */\nhtml.ptm-sidebar-open body {\n  padding-right: var(--ptm-sidebar-width, 400px);\n}\n\n/* Animate only after boot, so the first paint does not slide. */\nhtml.ptm-ready body {\n  transition: padding-right 0.2s;\n}\n\n/* Small windows: the sidebar covers the page instead of squeezing it. */\n@media (max-width: 999px) {\n  html.ptm-sidebar-open body {\n    padding-right: 0;\n  }\n\n  /* Covering the page, so the page must not show through. */\n  html .ptm-sidebar {\n    background: #0a0a0a;\n  }\n}\n\n.ptm-icon {\n  flex: none;\n  vertical-align: middle;\n}\n\n/* Sidebar */\n\n.ptm-sidebar {\n  position: fixed;\n  top: 0;\n  right: 0;\n  bottom: 0;\n  width: min(var(--ptm-sidebar-width), 100vw);\n  z-index: 1000;\n  display: flex;\n  flex-direction: column;\n  padding: 5px 10px;\n  background: var(--ptm-bg);\n  border-left: 1px solid #000;\n  transition: right 0.2s;\n}\n\nhtml:not(.ptm-sidebar-open) .ptm-sidebar {\n  right: calc(-1 * var(--ptm-sidebar-width) - 2px);\n}\n\n.ptm-sidebar__header {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  padding: 4px 0 8px;\n}\n\n.ptm-sidebar__brand {\n  flex: 1;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  gap: 8px;\n  font-family: var(--ptm-font-title);\n  font-size: 20px;\n  color: var(--ptm-beige);\n  white-space: nowrap;\n}\n\n.ptm-sidebar__brand .ptm-logo {\n  transition: transform 0.2s;\n}\n\n.ptm-sidebar__brand:hover .ptm-logo {\n  transform: rotate(5deg);\n}\n\n.ptm-sidebar__panel {\n  flex: 1;\n  overflow-x: hidden;\n  overflow-y: auto;\n  padding: 8px 0;\n  scrollbar-width: thin;\n}\n\n.ptm-expand-tab {\n  position: fixed;\n  top: 50px;\n  right: 0;\n  z-index: 1000;\n  display: flex;\n  align-items: center;\n  gap: 6px;\n  padding: 6px 8px 6px 10px;\n  border: 1px solid var(--ptm-blue-border);\n  border-right: 0;\n  background: var(--ptm-blue);\n  cursor: pointer;\n  transition: padding-left 0.2s, background-color 0.2s;\n}\n\n.ptm-expand-tab:hover {\n  padding-left: 15px;\n  background: var(--ptm-blue-hover);\n}\n\n/* Tabs */\n\n.ptm-tabs {\n  display: flex;\n}\n\n.ptm-tab {\n  flex: 1;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  gap: 5px;\n  padding: 6px 0;\n  border: 0;\n  border-bottom: 2px solid transparent;\n  background: none;\n  font-family: var(--ptm-font-title) !important;\n  font-size: 14px;\n  cursor: pointer;\n}\n\n.ptm-tab:hover {\n  background: rgba(90, 56, 6, 0.2);\n}\n\n.ptm-tab--active {\n  border-bottom-color: var(--ptm-gold-border);\n}\n\n/* Buttons: one height, one font, no wrapping. Variants only change colours. */\n\n.ptm-btn {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  gap: 6px;\n  height: 30px;\n  min-width: 0;\n  padding: 0 12px;\n  border: 1px solid;\n  border-radius: 0;\n  font-family: var(--ptm-font-title) !important;\n  font-size: 13px;\n  line-height: 1;\n  letter-spacing: 0.3px;\n  white-space: nowrap;\n  color: var(--ptm-text);\n  cursor: pointer;\n  transition: background-color 0.15s, border-color 0.15s, color 0.15s;\n  user-select: none;\n}\n\na.ptm-btn,\na.ptm-btn:hover {\n  text-decoration: none;\n}\n\n.ptm-btn > span {\n  overflow: hidden;\n  text-overflow: ellipsis;\n}\n\n:is(#ptm-root, .ptm-qf) :is(a, button, input, select, textarea, [tabindex]):focus-visible,\n:is(.ptm-mod-action, .ptm-stat-star, .ptm-search-clear, .ptm-pin-btn, .ptm-regroup-btn):focus-visible {\n  outline: 2px solid var(--ptm-focus, #c59a50);\n  outline-offset: 1px;\n}\n\n/* Joined buttons overlap their borders: lift the focused one so its ring stays visible. */\n.ptm-btn:focus-visible {\n  position: relative;\n  z-index: 1;\n}\n\n.ptm-btn:disabled {\n  opacity: 0.45;\n  cursor: default;\n}\n\n.ptm-btn--sm {\n  height: 26px;\n  padding: 0 9px;\n  font-size: 12px;\n  gap: 4px;\n}\n\n.ptm-btn--block {\n  display: flex;\n  width: 100%;\n}\n\n.ptm-btn--blue { background: var(--ptm-blue); border-color: var(--ptm-blue-border); }\n.ptm-btn--blue:hover:not(:disabled) { background: var(--ptm-blue-hover); }\n.ptm-btn--gold { background: var(--ptm-gold); border-color: var(--ptm-gold-border); }\n.ptm-btn--gold:hover:not(:disabled) { background: var(--ptm-gold-hover); }\n.ptm-btn--red { background: var(--ptm-red); border-color: var(--ptm-red-border); }\n.ptm-btn--red:hover:not(:disabled) { background: var(--ptm-red-hover); }\n.ptm-btn--plain { background: rgba(255, 255, 255, 0.03); border-color: #3a3a3a; color: var(--ptm-beige); }\n.ptm-btn--plain:hover:not(:disabled) { background: rgba(255, 255, 255, 0.08); border-color: var(--ptm-menu-border); }\n\n/* Pressed toggles look the same in every variant. */\n.ptm-btn.ptm-btn--active {\n  background: var(--ptm-gold);\n  border-color: #c59a50;\n  color: #f3d278;\n}\n\n/* Groups: buttons share borders, no gaps, outer group decides the width. */\n.ptm-btn-group {\n  display: inline-flex;\n  max-width: 100%;\n}\n\n.ptm-btn-group > * + * {\n  margin-left: -1px;\n}\n\n.ptm-btn-group > .ptm-btn:hover:not(:disabled) {\n  position: relative;\n  z-index: 1;\n}\n\n.ptm-btn-group--block {\n  display: flex;\n  width: 100%;\n}\n\n.ptm-btn-group--block > * {\n  flex: 1 1 0;\n  min-width: 0;\n}\n\n/* Stack of groups, e.g. a panel footer. */\n.ptm-actions {\n  display: grid;\n  gap: 6px;\n  margin-top: 10px;\n}\n\n/* The site's CSS shows hidden file inputs; keep [hidden] meaning hidden inside our UI. */\n#ptm-root [hidden] {\n  display: none !important;\n}\n\n.ptm-icon-btn {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  min-width: 24px;\n  height: 24px;\n  padding: 0 3px;\n  border: 0;\n  background: none;\n  color: rgba(255, 255, 255, 0.8);\n  cursor: pointer;\n}\n\n.ptm-icon-btn:hover {\n  color: #fff;\n}\n\n.ptm-toolbar {\n  display: flex;\n  flex-wrap: wrap;\n  justify-content: flex-end;\n  gap: 5px;\n  margin-bottom: 8px;\n}\n\n\n/* Menu */\n\n.ptm-menu {\n  position: relative;\n}\n\n.ptm-menu__list {\n  position: absolute;\n  top: 100%;\n  right: 0;\n  z-index: 10;\n  width: 200px;\n  margin: 2px 0 0;\n  padding: 0;\n  list-style: none;\n  background: var(--ptm-menu);\n  border: 1px solid var(--ptm-menu-border);\n  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.6);\n}\n\n.ptm-menu__item {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  width: 100%;\n  padding: 5px 8px;\n  border: 0;\n  background: none;\n  font-family: var(--ptm-font-body) !important;\n  font-size: 13px;\n  text-align: left;\n  cursor: pointer;\n}\n\n.ptm-menu__item:hover {\n  background: linear-gradient(90deg, var(--ptm-menu-border), transparent);\n}\n\n.ptm-menu__item--danger {\n  color: #ef7d7d !important;\n}\n\n/* Modal */\n\n.ptm-modal-overlay {\n  position: fixed;\n  inset: 0;\n  z-index: 1100;\n  display: flex;\n  align-items: flex-start;\n  justify-content: center;\n  padding-top: 8vh;\n  background: rgba(0, 0, 0, 0.6);\n  animation: ptm-fade-in 0.2s;\n}\n\n.ptm-modal {\n  max-height: 84vh;\n  display: flex;\n  flex-direction: column;\n  background: rgba(20, 20, 20, 0.95);\n  border: 1px solid var(--ptm-gold-border);\n  backdrop-filter: blur(2px);\n  animation: ptm-slide-in 0.2s;\n}\n\n.ptm-modal__header {\n  display: flex;\n  align-items: center;\n  gap: 10px;\n  padding: 10px 12px;\n  border-bottom: 1px solid var(--ptm-gold-border);\n}\n\n.ptm-modal__title {\n  flex: 1;\n  margin: 0;\n  font-family: var(--ptm-font-title);\n  font-size: 15px;\n  font-weight: normal;\n  text-transform: uppercase;\n  letter-spacing: 0.5px;\n  color: var(--ptm-beige);\n}\n\n.ptm-modal__body {\n  overflow-y: auto;\n  padding: 14px;\n  display: grid;\n  gap: 14px;\n}\n\n.ptm-modal__footer {\n  display: flex;\n  justify-content: flex-end;\n  gap: 5px;\n  padding: 10px 14px;\n  border-top: 1px solid rgba(138, 86, 9, 0.5);\n}\n\n/* Forms */\n\n.ptm-field {\n  display: grid;\n  gap: 6px;\n}\n\n.ptm-field__label {\n  font-family: var(--ptm-font-title);\n  font-size: 15px;\n  letter-spacing: 0.5px;\n  color: var(--ptm-beige);\n}\n\n.ptm-field__hint {\n  font-size: 11px;\n  color: rgba(255, 248, 225, 0.7);\n}\n\n.ptm-input {\n  width: 100%;\n  height: 30px;\n  padding: 0 8px;\n  border: 1px solid transparent;\n  background: var(--ptm-input);\n  color: var(--ptm-text);\n  font-family: var(--ptm-font-body);\n  font-size: 13px;\n}\n\n.ptm-input:focus {\n  outline: 2px solid var(--ptm-focus);\n  outline-offset: 0;\n  border-color: var(--ptm-gold-border);\n}\n\n.ptm-textarea {\n  height: 120px;\n  padding: 6px 8px;\n  resize: vertical;\n  font-family: Consolas, monospace;\n  font-size: 12px;\n}\n\n.ptm-checkbox {\n  display: flex;\n  align-items: flex-start;\n  gap: 8px;\n  cursor: pointer;\n}\n\n.ptm-checkbox input {\n  position: absolute;\n  opacity: 0;\n  pointer-events: none;\n}\n\n.ptm-checkbox__box {\n  flex: none;\n  position: relative;\n  width: 15px;\n  height: 15px;\n  margin-top: 1px;\n  border: 2px solid #8a6a3a;\n}\n\n.ptm-checkbox__box::after {\n  content: '';\n  position: absolute;\n  inset: 2px;\n  background: #fff;\n  transform: scale(0);\n  transition: transform 0.15s;\n}\n\n.ptm-checkbox input:checked + .ptm-checkbox__box::after {\n  transform: scale(1);\n}\n\n.ptm-checkbox input:focus-visible + .ptm-checkbox__box {\n  outline: 1px solid var(--ptm-gold-border);\n}\n\n.ptm-checkbox__text {\n  display: grid;\n  gap: 2px;\n}\n\n.ptm-checkbox__label {\n  font-family: var(--ptm-font-title);\n  font-size: 14px;\n  color: var(--ptm-beige);\n}\n\n.ptm-checkbox__description {\n  font-size: 11px;\n  color: var(--ptm-muted);\n}\n\n.ptm-settings-grid {\n  display: grid;\n  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));\n  gap: 12px 18px;\n}\n\n.ptm-section-title {\n  margin: 4px 0 0;\n  font-family: var(--ptm-font-title);\n  font-size: 15px;\n  font-weight: normal;\n  color: var(--ptm-beige);\n  border-bottom: 1px solid rgba(138, 86, 9, 0.5);\n  padding-bottom: 4px;\n}\n\n/* Text, alerts, toasts */\n\n.ptm-text {\n  margin: 0;\n}\n\n.ptm-meta {\n  margin: 0;\n  font-size: 11px;\n  color: var(--ptm-muted);\n}\n\n.ptm-meta a {\n  color: var(--ptm-beige);\n}\n\n.ptm-empty {\n  margin: 12px 0;\n  padding: 8px;\n  color: var(--ptm-muted);\n  text-align: center;\n}\n\n.ptm-alert {\n  display: flex;\n  align-items: center;\n  gap: 6px;\n  padding: 8px;\n  border: 1px solid;\n}\n\n.ptm-alert--warning { background: var(--ptm-yellow); border-color: var(--ptm-yellow-border); }\n.ptm-alert--error { background: var(--ptm-red); border-color: var(--ptm-red-border); }\n.ptm-alert--success { background: var(--ptm-green); border-color: var(--ptm-green-border); }\n\n.ptm-toasts {\n  position: fixed;\n  right: 30px;\n  bottom: 20px;\n  z-index: 1200;\n  display: grid;\n  gap: 6px;\n  justify-items: end;\n}\n\n.ptm-toasts > div {\n  display: grid;\n  gap: 6px;\n  justify-items: end;\n}\n\nhtml.ptm-sidebar-open .ptm-toasts {\n  right: calc(var(--ptm-sidebar-width) + 20px);\n}\n\n.ptm-toast {\n  max-width: 340px;\n  padding: 8px 12px;\n  border: 1px solid;\n  text-align: left;\n  cursor: pointer;\n  animation: ptm-slide-in 0.2s;\n}\n\n.ptm-toast--success { background: var(--ptm-green); border-color: var(--ptm-green-border); }\n.ptm-toast--warning { background: var(--ptm-yellow); border-color: var(--ptm-yellow-border); }\n.ptm-toast--error { background: var(--ptm-red); border-color: var(--ptm-red-border); }\n\n@keyframes ptm-fade-in {\n  from { opacity: 0; }\n}\n\n@keyframes ptm-slide-in {\n  from { opacity: 0; transform: translateY(10px); }\n}\n\n@media (prefers-reduced-motion: reduce) {\n  #ptm-root *,\n  .ptm-modal-overlay,\n  .ptm-modal,\n  .ptm-toast,\n  .ptm-pin-glow,\n  .ptm-mod-flash-ok,\n  .ptm-mod-flash-fail,\n  .ptm-mod-action,\n  .ptm-stat-star,\n  html.ptm-ready body {\n    animation: none !important;\n    transition: none !important;\n  }\n}\n";

  // src/main.tsx
  var bridge = new PageBridge(window);
  var firstCopy = claimPage();
  if (firstCopy) injectPageScript(`(${__ptmPageScript.toString()})();`);
  async function boot() {
    await domReady();
    if (!document.querySelector(sel.tradeRoot) && !await waitForApp()) return inactive();
    const storage = new GmStorage();
    const settings = await loadSettings(storage);
    const { location: location2 } = trackLocation(window);
    applyLanguage(settings.get());
    applySidebarState(settings.get());
    const coreStyle = addStyle(core_default, "core");
    const ctx = {
      win: window,
      doc: document,
      bridge,
      storage,
      settings,
      location: location2,
      currentSearch: trackCurrentSearch(location2, bridge),
      leagues: new LeagueService(location2),
      searchNames: new Store({}),
      results: new ResultsObserver(bridge, document),
      data: new TradeData(),
      toast: createToaster()
    };
    const host = new FeatureHost(features, ctx);
    host.startEarly();
    if (!await waitForApp()) {
      host.stop();
      document.documentElement.classList.remove("ptm-sidebar-open");
      coreStyle.remove();
      return inactive();
    }
    const root = document.createElement("div");
    root.id = "ptm-root";
    root.lang = getLocale();
    settings.subscribe((next, previous) => {
      applySidebarState(next);
      if (next.language !== previous.language) {
        applyLanguage(next);
        root.lang = getLocale();
      }
    });
    ctx.results.start();
    host.start();
    document.body.append(root);
    const renderApp = () => G(/* @__PURE__ */ u3(App, { ctx, host }), root);
    renderApp();
    settings.subscribe((next, previous) => {
      if (next.language === previous.language) return;
      renderApp();
      void host.restart();
    });
    document.documentElement.classList.add("ptm-ready");
    log.info(`v${"0.3.0"} ready with ${features.length} features`);
  }
  function waitForApp() {
    return Promise.race([bridge.whenReady().then(() => true), delay(3e4).then(() => false)]);
  }
  function inactive() {
    log.info("trade app not found on this page, staying inactive");
  }
  function claimPage() {
    const html = document.documentElement;
    if (!html) {
      if (window.__ptmLoaded) return false;
      window.__ptmLoaded = true;
      return true;
    }
    if (html.dataset.ptmLoaded) return false;
    html.dataset.ptmLoaded = "true";
    return true;
  }
  function applyLanguage(settings) {
    setLocale(settings.language === "auto" ? detectLocale(location.hostname) : settings.language);
  }
  function applySidebarState(settings) {
    document.documentElement.classList.toggle("ptm-sidebar-open", !settings.sidebarCollapsed);
  }
  function addStyle(css, name) {
    const style = document.createElement("style");
    style.dataset.ptm = name;
    style.textContent = css;
    document.head.append(style);
    return style;
  }
  function domReady() {
    if (document.readyState !== "loading") return Promise.resolve();
    return new Promise((resolve) => document.addEventListener("DOMContentLoaded", () => resolve(), { once: true }));
  }
  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  if (firstCopy) boot().catch((error) => log.error("startup failed", error));
})();
