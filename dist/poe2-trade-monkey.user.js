// ==UserScript==
// @name         PoE2 Trade Monkey
// @namespace    https://github.com/maluramichael/poe2-trade-monkey
// @version      0.1.0
// @description  Userscript that enhances the Path of Exile 2 trade site: bookmarks, history, pins, layout and result tools.
// @author       Michael Malura
// @license      MIT
// @homepageURL  https://github.com/maluramichael/poe2-trade-monkey
// @supportURL   https://github.com/maluramichael/poe2-trade-monkey/issues
// @icon         https://raw.githubusercontent.com/maluramichael/poe2-trade-monkey/master/assets/icon.png
// @match        https://*.pathofexile.com/trade2*
// @run-at       document-start
// @grant        GM.getValue
// @grant        GM.setValue
// @grant        GM.deleteValue
// @grant        GM.listValues
// @grant        GM.xmlHttpRequest
// @grant        GM.setClipboard
// @grant        GM_addValueChangeListener
// @grant        GM_removeValueChangeListener
// @grant        unsafeWindow
// @connect      poe.ninja
// @updateURL    https://raw.githubusercontent.com/maluramichael/poe2-trade-monkey/master/dist/poe2-trade-monkey.meta.js
// @downloadURL  https://raw.githubusercontent.com/maluramichael/poe2-trade-monkey/master/dist/poe2-trade-monkey.user.js
// ==/UserScript==

"use strict";
(() => {
  // node_modules/preact/dist/preact.module.js
  var n;
  var l;
  var u;
  var t;
  var i;
  var r;
  var o;
  var e;
  var f;
  var c;
  var a;
  var s;
  var h;
  var p;
  var v;
  var y;
  var d = {};
  var w = [];
  var _ = /acit|ex(?:s|g|n|p|$)|rph|grid|ows|mnc|ntw|ine[ch]|zoo|^ord|itera/i;
  var g = Array.isArray;
  function m(n2, l3) {
    for (var u4 in l3) n2[u4] = l3[u4];
    return n2;
  }
  function b(n2) {
    n2 && n2.parentNode && n2.parentNode.removeChild(n2);
  }
  function k(l3, u4, t18) {
    var i3, r3, o3, e3 = {};
    for (o3 in u4) "key" == o3 ? i3 = u4[o3] : "ref" == o3 ? r3 = u4[o3] : e3[o3] = u4[o3];
    if (arguments.length > 2 && (e3.children = arguments.length > 3 ? n.call(arguments, 2) : t18), "function" == typeof l3 && null != l3.defaultProps) for (o3 in l3.defaultProps) void 0 === e3[o3] && (e3[o3] = l3.defaultProps[o3]);
    return x(l3, e3, i3, r3, null);
  }
  function x(n2, t18, i3, r3, o3) {
    var e3 = { type: n2, props: t18, key: i3, ref: r3, __k: null, __: null, __b: 0, __e: null, __c: null, constructor: void 0, __v: null == o3 ? ++u : o3, __i: -1, __u: 0 };
    return null == o3 && null != l.vnode && l.vnode(e3), e3;
  }
  function S(n2) {
    return n2.children;
  }
  function C(n2, l3) {
    this.props = n2, this.context = l3;
  }
  function $(n2, l3) {
    if (null == l3) return n2.__ ? $(n2.__, n2.__i + 1) : null;
    for (var u4; l3 < n2.__k.length; l3++) if (null != (u4 = n2.__k[l3]) && null != u4.__e) return u4.__e;
    return "function" == typeof n2.type ? $(n2) : null;
  }
  function I(n2) {
    if (n2.__P && n2.__d) {
      var u4 = n2.__v, t18 = u4.__e, i3 = [], r3 = [], o3 = m({}, u4);
      o3.__v = u4.__v + 1, l.vnode && l.vnode(o3), q(n2.__P, o3, u4, n2.__n, n2.__P.namespaceURI, 32 & u4.__u ? [t18] : null, i3, null == t18 ? $(u4) : t18, !!(32 & u4.__u), r3), o3.__v = u4.__v, o3.__.__k[o3.__i] = o3, D(i3, o3, r3), u4.__e = u4.__ = null, o3.__e != t18 && P(o3);
    }
  }
  function P(n2) {
    if (null != (n2 = n2.__) && null != n2.__c) return n2.__e = n2.__c.base = null, n2.__k.some(function(l3) {
      if (null != l3 && null != l3.__e) return n2.__e = n2.__c.base = l3.__e;
    }), P(n2);
  }
  function A(n2) {
    (!n2.__d && (n2.__d = true) && i.push(n2) && !H.__r++ || r != l.debounceRendering) && ((r = l.debounceRendering) || o)(H);
  }
  function H() {
    try {
      for (var n2, l3 = 1; i.length; ) i.length > l3 && i.sort(e), n2 = i.shift(), l3 = i.length, I(n2);
    } finally {
      i.length = H.__r = 0;
    }
  }
  function L(n2, l3, u4, t18, i3, r3, o3, e3, f4, c3, a3) {
    var s3, h3, p3, v3, y3, _2, g2 = t18 && t18.__k || w, m3 = l3.length;
    for (f4 = T(u4, l3, g2, f4, m3), s3 = 0; s3 < m3; s3++) null != (p3 = u4.__k[s3]) && (h3 = -1 != p3.__i && g2[p3.__i] || d, p3.__i = s3, _2 = q(n2, p3, h3, i3, r3, o3, e3, f4, c3, a3), v3 = p3.__e, p3.ref && h3.ref != p3.ref && (h3.ref && J(h3.ref, null, p3), a3.push(p3.ref, p3.__c || v3, p3)), null == y3 && null != v3 && (y3 = v3), 4 & p3.__u ? (f4 = j(p3, f4, n2), h3.__e && (h3.__e = null)) : "function" == typeof p3.type && void 0 !== _2 ? f4 = _2 : v3 && (f4 = v3.nextSibling), p3.__u &= -7);
    return u4.__e = y3, f4;
  }
  function T(n2, l3, u4, t18, i3) {
    var r3, o3, e3, f4, c3, a3 = u4.length, s3 = a3, h3 = 0;
    for (n2.__k = new Array(i3), r3 = 0; r3 < i3; r3++) null != (o3 = l3[r3]) && "boolean" != typeof o3 && "function" != typeof o3 ? ("string" == typeof o3 || "number" == typeof o3 || "bigint" == typeof o3 || o3.constructor == String ? o3 = n2.__k[r3] = x(null, o3, null, null, null) : g(o3) ? o3 = n2.__k[r3] = x(S, { children: o3 }, null, null, null) : void 0 === o3.constructor && o3.__b > 0 ? o3 = n2.__k[r3] = x(o3.type, o3.props, o3.key, o3.ref ? o3.ref : null, o3.__v) : n2.__k[r3] = o3, f4 = r3 + h3, o3.__ = n2, o3.__b = n2.__b + 1, e3 = null, -1 != (c3 = o3.__i = O(o3, u4, f4, s3)) && (s3--, (e3 = u4[c3]) && (e3.__u |= 2)), null == e3 || null == e3.__v ? (-1 == c3 && (i3 > a3 ? h3-- : i3 < a3 && h3++), "function" != typeof o3.type && (o3.__u |= 4)) : c3 != f4 && (c3 == f4 - 1 ? h3-- : c3 == f4 + 1 ? h3++ : (c3 > f4 ? h3-- : h3++, o3.__u |= 4))) : n2.__k[r3] = null;
    if (s3) for (r3 = 0; r3 < a3; r3++) null != (e3 = u4[r3]) && 0 == (2 & e3.__u) && (e3.__e == t18 && (t18 = $(e3)), K(e3, e3));
    return t18;
  }
  function j(n2, l3, u4) {
    var t18, i3;
    if ("function" == typeof n2.type) {
      for (t18 = n2.__k, i3 = 0; t18 && i3 < t18.length; i3++) t18[i3] && (t18[i3].__ = n2, l3 = j(t18[i3], l3, u4));
      return l3;
    }
    n2.__e != l3 && (l3 && n2.type && !l3.parentNode && (l3 = $(n2)), l3 = u4.insertBefore(n2.__e, l3 || null));
    do {
      l3 = l3 && l3.nextSibling;
    } while (null != l3 && 8 == l3.nodeType);
    return l3;
  }
  function O(n2, l3, u4, t18) {
    var i3, r3, o3, e3 = n2.key, f4 = n2.type, c3 = l3[u4], a3 = null != c3 && 0 == (2 & c3.__u);
    if (null === c3 && null == e3 || a3 && e3 == c3.key && f4 == c3.type) return u4;
    if (t18 > (a3 ? 1 : 0)) {
      for (i3 = u4 - 1, r3 = u4 + 1; i3 >= 0 || r3 < l3.length; ) if (null != (c3 = l3[o3 = i3 >= 0 ? i3-- : r3++]) && 0 == (2 & c3.__u) && e3 == c3.key && f4 == c3.type) return o3;
    }
    return -1;
  }
  function z(n2, l3, u4) {
    "-" == l3[0] ? n2.setProperty(l3, null == u4 ? "" : u4) : n2[l3] = null == u4 ? "" : "number" != typeof u4 || _.test(l3) ? u4 : u4 + "px";
  }
  function N(n2, l3, u4, t18, i3) {
    var r3, o3;
    n: if ("style" == l3) if ("string" == typeof u4) n2.style.cssText = u4;
    else {
      if ("string" == typeof t18 && (n2.style.cssText = t18 = ""), t18) for (l3 in t18) u4 && l3 in u4 || z(n2.style, l3, "");
      if (u4) for (l3 in u4) t18 && u4[l3] == t18[l3] || z(n2.style, l3, u4[l3]);
    }
    else if ("o" == l3[0] && "n" == l3[1]) r3 = l3 != (l3 = l3.replace(s, "$1")), o3 = l3.toLowerCase(), l3 = o3 in n2 || "onFocusOut" == l3 || "onFocusIn" == l3 ? o3.slice(2) : l3.slice(2), n2.l || (n2.l = {}), n2.l[l3 + r3] = u4, u4 ? t18 ? u4[a] = t18[a] : (u4[a] = h, n2.addEventListener(l3, r3 ? v : p, r3)) : n2.removeEventListener(l3, r3 ? v : p, r3);
    else {
      if ("http://www.w3.org/2000/svg" == i3) l3 = l3.replace(/xlink(H|:h)/, "h").replace(/sName$/, "s");
      else if ("width" != l3 && "height" != l3 && "href" != l3 && "list" != l3 && "form" != l3 && "tabIndex" != l3 && "download" != l3 && "rowSpan" != l3 && "colSpan" != l3 && "role" != l3 && "popover" != l3 && l3 in n2) try {
        n2[l3] = null == u4 ? "" : u4;
        break n;
      } catch (n3) {
      }
      "function" == typeof u4 || (null == u4 || false === u4 && "-" != l3[4] ? n2.removeAttribute(l3) : n2.setAttribute(l3, "popover" == l3 && 1 == u4 ? "" : u4));
    }
  }
  function V(n2) {
    return function(u4) {
      if (this.l) {
        var t18 = this.l[u4.type + n2];
        if (null == u4[c]) u4[c] = h++;
        else if (u4[c] < t18[a]) return;
        return t18(l.event ? l.event(u4) : u4);
      }
    };
  }
  function q(n2, u4, t18, i3, r3, o3, e3, f4, c3, a3) {
    var s3, h3, p3, v3, y3, d3, _2, k3, x3, M, I2, P2, A2, H2, T2, j3, F = u4.type;
    if (void 0 !== u4.constructor) return null;
    128 & t18.__u && (c3 = !!(32 & t18.__u), o3 = [f4 = u4.__e = t18.__e]), (s3 = l.__b) && s3(u4);
    n: if ("function" == typeof F) {
      h3 = e3.length;
      try {
        if (x3 = u4.props, M = F.prototype && F.prototype.render, I2 = (s3 = F.contextType) && i3[s3.__c], P2 = s3 ? I2 ? I2.props.value : s3.__ : i3, t18.__c ? k3 = (p3 = u4.__c = t18.__c).__ = p3.__E : (M ? u4.__c = p3 = new F(x3, P2) : (u4.__c = p3 = new C(x3, P2), p3.constructor = F, p3.render = Q), I2 && I2.sub(p3), p3.state || (p3.state = {}), p3.__n = i3, v3 = p3.__d = true, p3.__h = [], p3._sb = []), M && null == p3.__s && (p3.__s = p3.state), M && null != F.getDerivedStateFromProps && (p3.__s == p3.state && (p3.__s = m({}, p3.__s)), m(p3.__s, F.getDerivedStateFromProps(x3, p3.__s))), y3 = p3.props, d3 = p3.state, p3.__v = u4, v3) M && null == F.getDerivedStateFromProps && null != p3.componentWillMount && p3.componentWillMount(), M && null != p3.componentDidMount && p3.__h.push(p3.componentDidMount);
        else {
          if (M && null == F.getDerivedStateFromProps && x3 !== y3 && null != p3.componentWillReceiveProps && p3.componentWillReceiveProps(x3, P2), u4.__v == t18.__v || !p3.__e && null != p3.shouldComponentUpdate && false === p3.shouldComponentUpdate(x3, p3.__s, P2)) {
            u4.__v != t18.__v && (p3.props = x3, p3.state = p3.__s, p3.__d = false), u4.__e = t18.__e, u4.__k = t18.__k, u4.__k.some(function(n3) {
              n3 && (n3.__ = u4);
            }), w.push.apply(p3.__h, p3._sb), p3._sb = [], p3.__h.length && e3.push(p3), f4 = $(t18);
            break n;
          }
          null != p3.componentWillUpdate && p3.componentWillUpdate(x3, p3.__s, P2), M && null != p3.componentDidUpdate && p3.__h.push(function() {
            p3.componentDidUpdate(y3, d3, _2);
          });
        }
        if (p3.context = P2, p3.props = x3, p3.__P = n2, p3.__e = false, A2 = l.__r, H2 = 0, M) p3.state = p3.__s, p3.__d = false, A2 && A2(u4), s3 = p3.render(p3.props, p3.state, p3.context), w.push.apply(p3.__h, p3._sb), p3._sb = [];
        else do {
          p3.__d = false, A2 && A2(u4), s3 = p3.render(p3.props, p3.state, p3.context), p3.state = p3.__s;
        } while (p3.__d && ++H2 < 25);
        p3.state = p3.__s, null != p3.getChildContext && (i3 = m(m({}, i3), p3.getChildContext())), M && !v3 && null != p3.getSnapshotBeforeUpdate && (_2 = p3.getSnapshotBeforeUpdate(y3, d3)), T2 = null != s3 && s3.type === S && null == s3.key ? E(s3.props.children) : s3, f4 = L(n2, g(T2) ? T2 : [T2], u4, t18, i3, r3, o3, e3, f4, c3, a3), p3.base = u4.__e, u4.__u &= -161, p3.__h.length && e3.push(p3), k3 && (p3.__E = p3.__ = null);
      } catch (n3) {
        if (e3.length = h3, u4.__v = null, c3 || null != o3) {
          if (n3.then) {
            for (u4.__u |= c3 ? 160 : 128; f4 && 8 == f4.nodeType && f4.nextSibling; ) f4 = f4.nextSibling;
            null != o3 && (o3[o3.indexOf(f4)] = null), u4.__e = f4;
          } else if (null != o3) for (j3 = o3.length; j3--; ) b(o3[j3]);
        } else u4.__e = t18.__e;
        null == u4.__k && (u4.__k = t18.__k || []), n3.then || B(u4), l.__e(n3, u4, t18);
      }
    } else null == o3 && u4.__v == t18.__v ? (u4.__k = t18.__k, u4.__e = t18.__e) : f4 = u4.__e = G(t18.__e, u4, t18, i3, r3, o3, e3, c3, a3);
    return (s3 = l.diffed) && s3(u4), 128 & u4.__u ? void 0 : f4;
  }
  function B(n2) {
    n2 && (n2.__c && (n2.__c.__e = true), n2.__k && n2.__k.some(B));
  }
  function D(n2, u4, t18) {
    for (var i3 = 0; i3 < t18.length; i3++) J(t18[i3], t18[++i3], t18[++i3]);
    l.__c && l.__c(u4, n2), n2.some(function(u5) {
      try {
        n2 = u5.__h, u5.__h = [], n2.some(function(n3) {
          n3.call(u5);
        });
      } catch (n3) {
        l.__e(n3, u5.__v);
      }
    });
  }
  function E(n2) {
    return "object" != typeof n2 || null == n2 || n2.__b > 0 ? n2 : g(n2) ? n2.map(E) : void 0 !== n2.constructor ? null : m({}, n2);
  }
  function G(u4, t18, i3, r3, o3, e3, f4, c3, a3) {
    var s3, h3, p3, v3, y3, w3, _2, m3 = i3.props || d, k3 = t18.props, x3 = t18.type;
    if ("svg" == x3 ? o3 = "http://www.w3.org/2000/svg" : "math" == x3 ? o3 = "http://www.w3.org/1998/Math/MathML" : o3 || (o3 = "http://www.w3.org/1999/xhtml"), null != e3) {
      for (s3 = 0; s3 < e3.length; s3++) if ((y3 = e3[s3]) && "setAttribute" in y3 == !!x3 && (x3 ? y3.localName == x3 : 3 == y3.nodeType)) {
        u4 = y3, e3[s3] = null;
        break;
      }
    }
    if (null == u4) {
      if (null == x3) return document.createTextNode(k3);
      u4 = document.createElementNS(o3, x3, k3.is && k3), c3 && (l.__m && l.__m(t18, e3), c3 = false), e3 = null;
    }
    if (null == x3) m3 === k3 || c3 && u4.data == k3 || (u4.data = k3);
    else {
      if (e3 = "textarea" == x3 && null != k3.defaultValue ? null : e3 && n.call(u4.childNodes), !c3 && null != e3) for (m3 = {}, s3 = 0; s3 < u4.attributes.length; s3++) m3[(y3 = u4.attributes[s3]).name] = y3.value;
      for (s3 in m3) y3 = m3[s3], "dangerouslySetInnerHTML" == s3 ? p3 = y3 : "children" == s3 || s3 in k3 || "value" == s3 && "defaultValue" in k3 || "checked" == s3 && "defaultChecked" in k3 || N(u4, s3, null, y3, o3);
      for (s3 in k3) y3 = k3[s3], "children" == s3 ? v3 = y3 : "dangerouslySetInnerHTML" == s3 ? h3 = y3 : "value" == s3 ? w3 = y3 : "checked" == s3 ? _2 = y3 : c3 && "function" != typeof y3 || m3[s3] === y3 || N(u4, s3, y3, m3[s3], o3);
      if (h3) c3 || p3 && (h3.__html == p3.__html || h3.__html == u4.innerHTML) || (u4.innerHTML = h3.__html), t18.__k = [];
      else if (p3 && (u4.innerHTML = ""), L("template" == t18.type ? u4.content : u4, g(v3) ? v3 : [v3], t18, i3, r3, "foreignObject" == x3 ? "http://www.w3.org/1999/xhtml" : o3, e3, f4, e3 ? e3[0] : i3.__k && $(i3, 0), c3, a3), null != e3) for (s3 = e3.length; s3--; ) b(e3[s3]);
      c3 && "textarea" != x3 || (s3 = "value", "progress" == x3 && null == w3 ? u4.removeAttribute("value") : null != w3 && (w3 !== u4[s3] || "progress" == x3 && !w3 || "option" == x3 && w3 != m3[s3]) && N(u4, s3, w3, m3[s3], o3), s3 = "checked", null != _2 && _2 != u4[s3] && N(u4, s3, _2, m3[s3], o3));
    }
    return u4;
  }
  function J(n2, u4, t18) {
    try {
      if ("function" == typeof n2) {
        var i3 = "function" == typeof n2.__u;
        i3 && n2.__u(), i3 && null == u4 || (n2.__u = n2(u4));
      } else n2.current = u4;
    } catch (n3) {
      l.__e(n3, t18);
    }
  }
  function K(n2, u4, t18) {
    var i3, r3;
    if (l.unmount && l.unmount(n2), (i3 = n2.ref) && (i3.current && i3.current != n2.__e || J(i3, null, u4)), null != (i3 = n2.__c)) {
      if (i3.componentWillUnmount) try {
        i3.componentWillUnmount();
      } catch (n3) {
        l.__e(n3, u4);
      }
      i3.base = i3.__P = i3.__n = null;
    }
    if (i3 = n2.__k) for (r3 = 0; r3 < i3.length; r3++) i3[r3] && K(i3[r3], u4, t18 || "function" != typeof n2.type);
    t18 || b(n2.__e), n2.__c = n2.__ = n2.__e = void 0;
  }
  function Q(n2, l3, u4) {
    return this.constructor(n2, u4);
  }
  function R(u4, t18, i3) {
    var r3, o3, e3, f4;
    t18 == document && (t18 = document.documentElement), l.__ && l.__(u4, t18), o3 = (r3 = "function" == typeof i3) ? null : i3 && i3.__k || t18.__k, e3 = [], f4 = [], q(t18, u4 = (!r3 && i3 || t18).__k = k(S, null, [u4]), o3 || d, d, t18.namespaceURI, !r3 && i3 ? [i3] : o3 ? null : t18.firstChild ? n.call(t18.childNodes) : null, e3, !r3 && i3 ? i3 : o3 ? o3.__e : t18.firstChild, r3, f4), D(e3, u4, f4), u4.props.children = null;
  }
  function X(n2) {
    function l3(n3) {
      var u4, t18;
      return this.getChildContext || (u4 = /* @__PURE__ */ new Set(), (t18 = {})[l3.__c] = this, this.getChildContext = function() {
        return t18;
      }, this.componentWillUnmount = function() {
        u4 = null;
      }, this.shouldComponentUpdate = function(n4) {
        this.props.value != n4.value && u4.forEach(function(n5) {
          n5.__e = true, A(n5);
        });
      }, this.sub = function(n4) {
        u4.add(n4);
        var l4 = n4.componentWillUnmount;
        n4.componentWillUnmount = function() {
          u4 && u4.delete(n4), l4 && l4.call(n4);
        };
      }), n3.children;
    }
    return l3.__c = "__cC" + y++, l3.__ = n2, l3.Provider = l3.__l = (l3.Consumer = function(n3, l4) {
      return n3.children(l4);
    }).contextType = l3, l3;
  }
  n = w.slice, l = { __e: function(n2, l3, u4, t18) {
    for (var i3, r3, o3; l3 = l3.__; ) if ((i3 = l3.__c) && !i3.__) try {
      if ((r3 = i3.constructor) && null != r3.getDerivedStateFromError && (i3.setState(r3.getDerivedStateFromError(n2)), o3 = i3.__d), null != i3.componentDidCatch && (i3.componentDidCatch(n2, t18 || {}), o3 = i3.__d), o3) return i3.__E = i3;
    } catch (l4) {
      n2 = l4;
    }
    throw n2;
  } }, u = 0, t = function(n2) {
    return null != n2 && void 0 === n2.constructor;
  }, C.prototype.setState = function(n2, l3) {
    var u4;
    u4 = null != this.__s && this.__s != this.state ? this.__s : this.__s = m({}, this.state), "function" == typeof n2 && (n2 = n2(m({}, u4), this.props)), n2 && m(u4, n2), null != n2 && this.__v && (l3 && this._sb.push(l3), A(this));
  }, C.prototype.forceUpdate = function(n2) {
    this.__v && (this.__e = true, n2 && this.__h.push(n2), A(this));
  }, C.prototype.render = S, i = [], o = "function" == typeof Promise ? Promise.prototype.then.bind(Promise.resolve()) : setTimeout, e = function(n2, l3) {
    return n2.__v.__b - l3.__v.__b;
  }, H.__r = 0, f = Math.random().toString(8), c = "__d" + f, a = "__a" + f, s = /(PointerCapture)$|Capture$/i, h = 0, p = V(false), v = V(true), y = 0;

  // node_modules/preact/hooks/dist/hooks.module.js
  var t2;
  var r2;
  var u2;
  var i2;
  var o2 = 0;
  var f2 = [];
  var c2 = l;
  var e2 = c2.__b;
  var a2 = c2.__r;
  var v2 = c2.diffed;
  var l2 = c2.__c;
  var m2 = c2.unmount;
  var p2 = c2.__;
  function s2(n2, t18) {
    c2.__h && c2.__h(r2, n2, o2 || t18), o2 = 0;
    var u4 = r2.__H || (r2.__H = { __: [], __h: [] });
    return n2 >= u4.__.length && u4.__.push({}), u4.__[n2];
  }
  function d2(n2) {
    return o2 = 1, y2(D2, n2);
  }
  function y2(n2, u4, i3) {
    var o3 = s2(t2++, 2);
    if (o3.t = n2, !o3.__c && (o3.__ = [i3 ? i3(u4) : D2(void 0, u4), function(n3) {
      var t18 = o3.__N ? o3.__N[0] : o3.__[0], r3 = o3.t(t18, n3);
      t18 !== r3 && (o3.__N = [r3, o3.__[1]], o3.__c.setState({}));
    }], o3.__c = r2, !r2.__f)) {
      var f4 = function(n3, t18, r3) {
        if (!o3.__c.__H) return true;
        var u5 = false, i4 = o3.__c.props !== n3;
        if (o3.__c.__H.__.some(function(n4) {
          if (n4.__N) {
            u5 = true;
            var t19 = n4.__[0];
            n4.__ = n4.__N, n4.__N = void 0, t19 !== n4.__[0] && (i4 = true);
          }
        }), c3) {
          var f5 = c3.call(this, n3, t18, r3);
          return u5 ? f5 || i4 : f5;
        }
        return !u5 || i4;
      };
      r2.__f = true;
      var c3 = r2.shouldComponentUpdate, e3 = r2.componentWillUpdate;
      r2.componentWillUpdate = function(n3, t18, r3) {
        if (this.__e) {
          var u5 = c3;
          c3 = void 0, f4(n3, t18, r3), c3 = u5;
        }
        e3 && e3.call(this, n3, t18, r3);
      }, r2.shouldComponentUpdate = f4;
    }
    return o3.__N || o3.__;
  }
  function h2(n2, u4) {
    var i3 = s2(t2++, 3);
    !c2.__s && C2(i3.__H, u4) && (i3.__ = n2, i3.u = u4, r2.__H.__h.push(i3));
  }
  function x2(n2) {
    var u4 = r2.context[n2.__c], i3 = s2(t2++, 9);
    return i3.c = n2, u4 ? (null == i3.__ && (i3.__ = true, u4.sub(r2)), u4.props.value) : n2.__;
  }
  function j2() {
    for (var n2; n2 = f2.shift(); ) {
      var t18 = n2.__H;
      if (n2.__P && t18) try {
        t18.__h.some(z2), t18.__h.some(B2), t18.__h = [];
      } catch (r3) {
        t18.__h = [], c2.__e(r3, n2.__v);
      }
    }
  }
  c2.__b = function(n2) {
    r2 = null, e2 && e2(n2);
  }, c2.__ = function(n2, t18) {
    n2 && t18.__k && t18.__k.__m && (n2.__m = t18.__k.__m), p2 && p2(n2, t18);
  }, c2.__r = function(n2) {
    a2 && a2(n2), t2 = 0;
    var i3 = (r2 = n2.__c).__H;
    i3 && (u2 === r2 ? (i3.__h = [], r2.__h = [], i3.__.some(function(n3) {
      n3.__N && (n3.__ = n3.__N), n3.u = n3.__N = void 0;
    })) : (i3.__h.some(z2), i3.__h.some(B2), i3.__h = [], t2 = 0)), u2 = r2;
  }, c2.diffed = function(n2) {
    v2 && v2(n2);
    var t18 = n2.__c;
    t18 && t18.__H && (t18.__H.__h.length && (1 !== f2.push(t18) && i2 === c2.requestAnimationFrame || ((i2 = c2.requestAnimationFrame) || w2)(j2)), t18.__H.__.some(function(n3) {
      n3.u && (n3.__H = n3.u, n3.u = void 0);
    })), u2 = r2 = null;
  }, c2.__c = function(n2, t18) {
    t18.some(function(n3) {
      try {
        n3.__h.some(z2), n3.__h = n3.__h.filter(function(n4) {
          return !n4.__ || B2(n4);
        });
      } catch (r3) {
        t18.some(function(n4) {
          n4.__h && (n4.__h = []);
        }), t18 = [], c2.__e(r3, n3.__v);
      }
    }), l2 && l2(n2, t18);
  }, c2.unmount = function(n2) {
    m2 && m2(n2);
    var t18, r3 = n2.__c;
    r3 && r3.__H && (r3.__H.__.some(function(n3) {
      try {
        z2(n3);
      } catch (n4) {
        t18 = n4;
      }
    }), r3.__H = void 0, t18 && c2.__e(t18, r3.__v));
  };
  var k2 = "function" == typeof requestAnimationFrame;
  function w2(n2) {
    var t18, r3 = function() {
      clearTimeout(u4), k2 && cancelAnimationFrame(t18), setTimeout(n2);
    }, u4 = setTimeout(r3, 35);
    k2 && (t18 = requestAnimationFrame(r3));
  }
  function z2(n2) {
    var t18 = r2, u4 = n2.__c;
    "function" == typeof u4 && (n2.__c = void 0, u4()), r2 = t18;
  }
  function B2(n2) {
    var t18 = r2;
    n2.__c = n2.__(), r2 = t18;
  }
  function C2(n2, t18) {
    return !n2 || n2.length !== t18.length || t18.some(function(t19, r3) {
      return t19 !== n2[r3];
    });
  }
  function D2(n2, t18) {
    return "function" == typeof t18 ? t18(n2) : t18;
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
    const pick = (value) => select ? select(value) : value;
    const [slice, setSlice] = d2(() => pick(store.get()));
    h2(() => {
      setSlice(() => pick(store.get()));
      return store.subscribe((value) => setSlice(() => pick(value)));
    }, [store]);
    return slice;
  }

  // src/site/searchId.ts
  function isEncodedSearchId(id) {
    return id.startsWith("H4sI");
  }
  async function decodeSearchId(id) {
    if (!isEncodedSearchId(id)) return null;
    try {
      const base64 = id.replace(/-/g, "+").replace(/_/g, "/");
      const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
      const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
      const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
      return JSON.parse(await new Response(stream).text());
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
    async get(key) {
      const raw = await GM.getValue(PREFIX2 + key, void 0);
      return parse(key, raw);
    }
    async set(key, value) {
      await GM.setValue(PREFIX2 + key, JSON.stringify(value));
    }
    async delete(key) {
      await GM.deleteValue(PREFIX2 + key);
    }
    onRemoteChange(key, callback) {
      if (typeof GM_addValueChangeListener !== "function") return () => {
      };
      const id = GM_addValueChangeListener(PREFIX2 + key, (_name, _old, value, remote) => {
        if (remote) callback(parse(key, value));
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
    const read = (envelope) => {
      if (!envelope || typeof envelope !== "object" || !("data" in envelope)) return options.defaultValue;
      if (envelope.schema === options.schema) return envelope.data;
      if (options.migrate) {
        try {
          return options.migrate(envelope.data, envelope.schema);
        } catch (error) {
          log.error(`migration of "${key}" from schema ${envelope.schema} failed`, error);
        }
      }
      return options.defaultValue;
    };
    const store = new Store(read(await storage.get(key)));
    let applyingRemote = false;
    store.subscribe((value) => {
      if (applyingRemote) return;
      storage.set(key, { schema: options.schema, data: value }).catch((error) => {
        log.error(`saving "${key}" failed`, error);
      });
    });
    storage.onRemoteChange(key, (envelope) => {
      applyingRemote = true;
      try {
        store.set(read(envelope));
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
    start() {
      const sync = () => {
        for (const feature of this.features) {
          const enabled = !feature.toggleable || isFeatureEnabled(this.ctx.settings.get(), feature.id, feature.defaultEnabled);
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
        this.#instances.set(feature.id, { instance, style });
        this.#publish();
      } catch (error) {
        style?.remove();
        log.error(`feature "${feature.id}" failed to start`, error);
      } finally {
        this.#starting.delete(feature.id);
      }
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
  var CACHE_KEY = "cache:leagues";
  var CACHE_TTL_MS = 6 * 60 * 60 * 1e3;
  var LeagueService = class {
    constructor(storage, location2, fetchJson = defaultFetchJson) {
      this.storage = storage;
      this.fetchJson = fetchJson;
      this.current = new Store(location2.get()?.league ?? null);
      location2.subscribe((next) => {
        if (next) this.current.set(next.league);
      });
    }
    storage;
    fetchJson;
    list = new Store([]);
    /** League of the trade page the user is on. Remembered when visiting history or settings. */
    current;
    async load() {
      const cached = await this.storage.get(CACHE_KEY);
      if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
        this.list.set(cached.leagues);
        return;
      }
      try {
        const json = await this.fetchJson("/api/trade2/data/leagues");
        const leagues = (json.result ?? []).filter((league) => league.realm === "poe2");
        this.list.set(leagues);
        await this.storage.set(CACHE_KEY, { at: Date.now(), leagues });
      } catch {
        if (cached) this.list.set(cached.leagues);
      }
    }
    /** True if the league is still listed (ended challenge leagues disappear from the list). */
    isActive(league) {
      const list = this.list.get();
      return list.length === 0 || list.some((entry) => entry.id === league);
    }
  };
  async function defaultFetchJson(url) {
    const response = await fetch(url, { credentials: "same-origin" });
    if (!response.ok) throw new Error(`${url}: ${response.status}`);
    return response.json();
  }

  // src/app/toaster.ts
  var DURATION_MS = 4500;
  function createToaster() {
    const toasts = new Store([]);
    let nextId = 1;
    const dismiss = (id) => toasts.update((list) => list.filter((toast2) => toast2.id !== id));
    const toast = ((message, kind = "success") => {
      const id = nextId++;
      toasts.update((list) => [...list, { id, kind, message }]);
      setTimeout(() => dismiss(id), DURATION_MS);
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

  // src/features/bookmarks/index.ts
  var t3 = createTranslator({
    de: { label: "Lesezeichen", description: "Suchen in Ordnern speichern, in jeder League wieder öffnen." },
    en: { label: "Bookmarks", description: "Save searches in folders and reopen them in any league." }
  });
  var bookmarksFeature = {
    id: "bookmarks",
    label: () => t3("label"),
    description: () => t3("description"),
    toggleable: true,
    defaultEnabled: true,
    start() {
    }
  };

  // node_modules/preact/jsx-runtime/dist/jsxRuntime.module.js
  var f3 = 0;
  function u3(e3, t18, n2, o3, i3, u4) {
    t18 || (t18 = {});
    var a3, c3, p3 = t18;
    if ("ref" in p3) for (c3 in p3 = {}, t18) "ref" == c3 ? a3 = t18[c3] : p3[c3] = t18[c3];
    var l3 = { type: e3, props: p3, key: n2, ref: a3, __k: null, __: null, __b: 0, __e: null, __c: null, constructor: void 0, __v: --f3, __i: -1, __u: 0, __source: i3, __self: u4 };
    if ("function" == typeof e3 && (a3 = e3.defaultProps)) for (c3 in a3) void 0 === p3[c3] && (p3[c3] = a3[c3]);
    return l.vnode && l.vnode(l3), l3;
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
    /* @__PURE__ */ u3(S, { children: [
      /* @__PURE__ */ u3("circle", { cx: "5", cy: "12", r: "1.2" }),
      /* @__PURE__ */ u3("circle", { cx: "12", cy: "12", r: "1.2" }),
      /* @__PURE__ */ u3("circle", { cx: "19", cy: "12", r: "1.2" })
    ] })
  );
  var IconGrip = icon(/* @__PURE__ */ u3("path", { d: "M8 9l4-4 4 4M8 15l4 4 4-4" }));
  var IconFolder = icon(/* @__PURE__ */ u3("path", { d: "M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.7-.9l-.8-1.2A2 2 0 0 0 7.9 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" }));
  var IconFolderPlus = icon(
    /* @__PURE__ */ u3(S, { children: [
      /* @__PURE__ */ u3("path", { d: "M12 10v6M9 13h6" }),
      /* @__PURE__ */ u3("path", { d: "M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.7-.9l-.8-1.2A2 2 0 0 0 7.9 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" })
    ] })
  );
  var IconHistory = icon(
    /* @__PURE__ */ u3(S, { children: [
      /* @__PURE__ */ u3("path", { d: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" }),
      /* @__PURE__ */ u3("path", { d: "M3 3v5h5M12 7v5l4 2" })
    ] })
  );
  var IconPin = icon(/* @__PURE__ */ u3("path", { d: "M12 17v5M9 10.8a2 2 0 0 1-1.1 1.8l-1.8.9A2 2 0 0 0 5 15.2V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.8a2 2 0 0 0-1.1-1.8l-1.8-.9a2 2 0 0 1-1.1-1.8V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" }));
  var IconSettings = icon(
    /* @__PURE__ */ u3(S, { children: [
      /* @__PURE__ */ u3("path", { d: "M12.2 2h-.4a2 2 0 0 0-2 2v.2a2 2 0 0 1-1 1.7l-.4.3a2 2 0 0 1-2 0l-.2-.1a2 2 0 0 0-2.7.7l-.2.4a2 2 0 0 0 .7 2.7l.2.1a2 2 0 0 1 1 1.7v.5a2 2 0 0 1-1 1.7l-.2.1a2 2 0 0 0-.7 2.7l.2.4a2 2 0 0 0 2.7.7l.2-.1a2 2 0 0 1 2 0l.4.3a2 2 0 0 1 1 1.7v.2a2 2 0 0 0 2 2h.4a2 2 0 0 0 2-2v-.2a2 2 0 0 1 1-1.7l.4-.3a2 2 0 0 1 2 0l.2.1a2 2 0 0 0 2.7-.7l.2-.4a2 2 0 0 0-.7-2.7l-.2-.1a2 2 0 0 1-1-1.7v-.5a2 2 0 0 1 1-1.7l.2-.1a2 2 0 0 0 .7-2.7l-.2-.4a2 2 0 0 0-2.7-.7l-.2.1a2 2 0 0 1-2 0l-.4-.3a2 2 0 0 1-1-1.7V4a2 2 0 0 0-2-2z" }),
      /* @__PURE__ */ u3("circle", { cx: "12", cy: "12", r: "3" })
    ] })
  );
  var IconTrash = icon(/* @__PURE__ */ u3("path", { d: "M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" }));
  var IconEdit = icon(/* @__PURE__ */ u3("path", { d: "M12 20h9M16.4 3.6a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4Z" }));
  var IconCopy = icon(
    /* @__PURE__ */ u3(S, { children: [
      /* @__PURE__ */ u3("rect", { x: "9", y: "9", width: "13", height: "13", rx: "2" }),
      /* @__PURE__ */ u3("path", { d: "M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" })
    ] })
  );
  var IconBolt = icon(/* @__PURE__ */ u3("path", { d: "M13 2 3 14h9l-1 8 10-12h-9l1-8z" }));
  var IconArchive = icon(
    /* @__PURE__ */ u3(S, { children: [
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
    /* @__PURE__ */ u3(S, { children: [
      /* @__PURE__ */ u3("path", { d: "M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" }),
      /* @__PURE__ */ u3("path", { d: "M17 21v-8H7v8M7 3v5h8" })
    ] })
  );
  var IconLink = icon(/* @__PURE__ */ u3("path", { d: "M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" }));
  var IconWarning = icon(/* @__PURE__ */ u3("path", { d: "m21.7 18-8-14a2 2 0 0 0-3.4 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3ZM12 9v4M12 17h.01" }));

  // src/features/history/feature.css
  var feature_default = ".ptm-history {\n  display: flex;\n  flex-direction: column;\n  gap: 8px;\n}\n\n.ptm-history__list {\n  margin: 0;\n  padding: 0;\n  list-style: none;\n  background: var(--ptm-surface);\n  border: 1px solid var(--ptm-blue-border);\n}\n\n.ptm-history__item {\n  padding: 6px 7px;\n  border-top: 1px solid var(--ptm-blue-line);\n}\n\n.ptm-history__item:first-child {\n  border-top: 0;\n}\n\n.ptm-history__item:hover {\n  background: linear-gradient(to right, rgba(138, 86, 9, 0.4), transparent);\n}\n\n.ptm-history__title {\n  display: block;\n  overflow: hidden;\n  font-family: var(--ptm-font-title);\n  font-size: 14px;\n  color: var(--ptm-text);\n  text-decoration: none;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n\n.ptm-history__title:hover {\n  color: var(--ptm-beige);\n  text-decoration: underline;\n}\n\n.ptm-history__other {\n  font-size: 11px;\n  color: var(--ptm-beige);\n}\n";

  // src/site/tradeLocation.ts
  var DEFAULT_REALM = "poe2";
  var REALMS = /* @__PURE__ */ new Set(["poe2", "xbox", "sony"]);
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
    const segments = ["trade2", location2.type, location2.realm, encodeURIComponent(location2.league)];
    if (location2.id) {
      segments.push(location2.id);
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

  // src/ui/components/Button.tsx
  function Button({ variant = "blue", icon: icon2, block, children, class: className, type = "button", ...rest }) {
    const classes = ["ptm-btn", `ptm-btn--${variant}`, block && "ptm-btn--block", className].filter(Boolean).join(" ");
    return /* @__PURE__ */ u3("button", { type, class: classes, ...rest, children: [
      icon2,
      children !== void 0 && /* @__PURE__ */ u3("span", { children })
    ] });
  }
  function IconButton({ label, children, class: className, ...rest }) {
    return /* @__PURE__ */ u3("button", { type: "button", class: ["ptm-icon-btn", className].filter(Boolean).join(" "), title: label, "aria-label": label, ...rest, children });
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
  function Modal({ title, onClose, children, footer, width = 650 }) {
    h2(() => {
      const onKey = (event) => {
        if (event.key === "Escape") onClose();
      };
      document.addEventListener("keydown", onKey);
      return () => document.removeEventListener("keydown", onKey);
    }, [onClose]);
    return /* @__PURE__ */ u3("div", { class: "ptm-modal-overlay", onMouseDown: (event) => event.target === event.currentTarget && onClose(), children: /* @__PURE__ */ u3("div", { class: "ptm-modal", role: "dialog", "aria-modal": "true", "aria-label": title, style: { width: `min(${width}px, 92vw)` }, children: [
      /* @__PURE__ */ u3("header", { class: "ptm-modal__header", children: [
        /* @__PURE__ */ u3(Logo, { size: 26 }),
        /* @__PURE__ */ u3("h2", { class: "ptm-modal__title", children: title }),
        /* @__PURE__ */ u3("button", { type: "button", class: "ptm-icon-btn", "aria-label": "Close", onClick: onClose, children: /* @__PURE__ */ u3(IconClose, {}) })
      ] }),
      /* @__PURE__ */ u3("div", { class: "ptm-modal__body", children }),
      footer && /* @__PURE__ */ u3("footer", { class: "ptm-modal__footer", children: footer })
    ] }) });
  }

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
      sourceCode: "Quellcode auf GitHub"
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
      sourceCode: "Source code on GitHub"
    }
  });

  // src/ui/components/ConfirmDialog.tsx
  function ConfirmDialog({ title, message, confirmLabel, onConfirm, onCancel }) {
    return /* @__PURE__ */ u3(
      Modal,
      {
        title,
        onClose: onCancel,
        width: 420,
        footer: /* @__PURE__ */ u3(S, { children: [
          /* @__PURE__ */ u3(Button, { variant: "plain", onClick: onCancel, children: t4("cancel") }),
          /* @__PURE__ */ u3(Button, { variant: "red", onClick: onConfirm, children: confirmLabel })
        ] }),
        children: /* @__PURE__ */ u3("p", { class: "ptm-text", children: message })
      }
    );
  }

  // src/features/history/Panel.tsx
  var t5 = createTranslator({
    de: {
      search: "Suche",
      exchange: "Tausch",
      openIn: "in {league} öffnen",
      clear: "Verlauf leeren",
      clearMessage: "Alle {n} Einträge aus dem Verlauf löschen?",
      clearConfirm: "Leeren",
      empty: "Noch keine Suchen. Jede Suche, die du öffnest, landet hier."
    },
    en: {
      search: "Search",
      exchange: "Exchange",
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
      if (list.length === 0) return /* @__PURE__ */ u3("p", { class: "ptm-empty", children: t5("empty") });
      return /* @__PURE__ */ u3("div", { class: "ptm-history", children: [
        /* @__PURE__ */ u3("ul", { class: "ptm-history__list", children: list.map((entry) => {
          const href = (league) => buildTradePath({ type: entry.type, realm: entry.realm, league, id: entry.searchId, live: entry.live });
          return /* @__PURE__ */ u3("li", { class: "ptm-history__item", children: [
            /* @__PURE__ */ u3("a", { class: "ptm-history__title", href: href(entry.league), children: [
              entry.live && "⚡ ",
              names[entry.searchId] || entry.title
            ] }),
            /* @__PURE__ */ u3("p", { class: "ptm-meta", children: [
              t5(entry.type),
              " · ",
              entry.league,
              " ·",
              " ",
              /* @__PURE__ */ u3("time", { dateTime: entry.createdAt, title: new Date(entry.createdAt).toLocaleString(getLocale()), children: relativeTime(entry.createdAt) })
            ] }),
            current && current !== entry.league && /* @__PURE__ */ u3("a", { class: "ptm-history__other", href: href(current), children: t5("openIn", { league: current }) })
          ] }, entry.id);
        }) }),
        /* @__PURE__ */ u3(Button, { variant: "gold", block: true, icon: /* @__PURE__ */ u3(IconTrash, {}), onClick: () => setConfirming(true), children: t5("clear") }),
        confirming && /* @__PURE__ */ u3(
          ConfirmDialog,
          {
            title: t5("clear"),
            message: t5("clearMessage", { n: list.length }),
            confirmLabel: t5("clearConfirm"),
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
  function text(value) {
    if (!value) return null;
    return typeof value === "string" ? value : value.option || null;
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

  // src/features/history/index.ts
  var t6 = createTranslator({
    de: { label: "Verlauf", description: "Liste der letzten Suchen.", unnamed: "Unbenannte Suche" },
    en: { label: "History", description: "List of your recent searches.", unnamed: "Unnamed search" }
  });
  var STORAGE_KEY = "history:entries";
  var MAX_ENTRIES = 50;
  var historyFeature = {
    id: "history",
    label: () => t6("label"),
    description: () => t6("description"),
    toggleable: true,
    defaultEnabled: true,
    css: feature_default,
    sidebarTab: { label: () => t6("label"), icon: IconHistory, order: 2 },
    async start(ctx) {
      const entries = await persistedStore(ctx.storage, STORAGE_KEY, { defaultValue: [], schema: 1 });
      const record = async (search) => {
        const { location: location2, payload } = search;
        const title = await resolveSearchTitle(ctx, search) || t6("unnamed");
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
  var feature_default2 = '.ptm-pinned {\n  box-shadow: inset 0 0 10px 2px var(--ptm-blue-border);\n}\n\n.ptm-pin-glow {\n  animation: ptm-pin-glow 1s ease;\n}\n\n@keyframes ptm-pin-glow {\n  0%, 50%, 100% { box-shadow: inset 0 0 10px 2px var(--ptm-blue-border); }\n  25%, 75% { box-shadow: inset 0 0 20px 10px var(--ptm-blue-border); }\n}\n\n/* Same width for "Pin" and "Unpin", so the button bar does not jump. */\n.ptm-pin-btn {\n  min-width: 60px;\n}\n\n.ptm-pins {\n  display: grid;\n  gap: 10px;\n}\n\n.ptm-pin {\n  border: 1px solid var(--ptm-blue-line);\n  background: #000;\n}\n\n.ptm-pin__item {\n  display: flex;\n  justify-content: center;\n}\n\n.ptm-pin__item .item-popup {\n  margin: 0;\n}\n\n.ptm-pin__price {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  gap: 3px;\n  padding: 5px 10px 0;\n  color: var(--ptm-muted);\n}\n\n.ptm-pin__price img {\n  height: 25px;\n}\n\n.ptm-pin__price br,\n.ptm-pin__price .price-label,\n.ptm-pin__price .currency-text span {\n  display: none;\n}\n\n.ptm-pin__seller {\n  padding: 4px 10px 0;\n  text-align: center;\n}\n\n.ptm-pin__actions {\n  display: flex;\n  gap: 5px;\n  padding: 8px 10px 10px;\n}\n\n.ptm-pin__actions .ptm-btn {\n  flex: 1 1 auto;\n  margin-left: 0;\n}\n';

  // src/features/pins/index.tsx
  var t7 = createTranslator({
    de: {
      label: "Angepinnte Items",
      tab: "Pins",
      description: "Ergebnisse anpinnen und vergleichen.",
      pin: "Anpinnen",
      unpin: "Lösen",
      scroll: "Zum Ergebnis",
      remove: "Entfernen",
      clear: "Alle entfernen",
      seller: "Verkäufer: {seller}",
      empty: "Noch nichts angepinnt. Klick bei einem Ergebnis auf „Anpinnen“, um es hier zu sammeln. Pins bleiben bis zum Neuladen der Seite erhalten, auch bei neuen Suchen."
    },
    en: {
      label: "Pinned items",
      tab: "Pins",
      description: "Pin results to compare them.",
      pin: "Pin",
      unpin: "Unpin",
      scroll: "Scroll to result",
      remove: "Unpin",
      clear: "Clear pins",
      seller: "Seller: {seller}",
      empty: 'Nothing pinned yet. Click "Pin" on a result to collect it here. Pins stay until you reload the page, even across new searches.'
    }
  });
  var BUTTON_CLASS = "ptm-pin-btn";
  var PINNED_CLASS = "ptm-pinned";
  var GLOW_CLASS = "ptm-pin-glow";
  var GLOW_MS = 1e3;
  function start(ctx) {
    const { doc } = ctx;
    const pins = new Store([]);
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
      button.textContent = pinned ? t7("unpin") : t7("pin");
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
        pinnedAt: Date.now()
      };
    };
    const toggle = (element) => {
      const id = element.dataset.id ?? "";
      if (isPinned(id)) {
        pins.update((list) => list.filter((pin) => pin.id !== id));
        return;
      }
      pins.update((list) => [...list, snapshot(element, id)]);
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
      if (list.length === 0) return /* @__PURE__ */ u3("p", { class: "ptm-empty", children: t7("empty") });
      return /* @__PURE__ */ u3("div", { class: "ptm-pins", children: [
        /* @__PURE__ */ u3("div", { class: "ptm-toolbar", children: /* @__PURE__ */ u3(Button, { variant: "gold", icon: /* @__PURE__ */ u3(IconTrash, {}), onClick: () => pins.set([]), children: t7("clear") }) }),
        list.map((pin) => /* @__PURE__ */ u3("article", { class: "ptm-pin", children: [
          /* @__PURE__ */ u3("div", { class: "ptm-pin__item", dangerouslySetInnerHTML: { __html: pin.html } }),
          /* @__PURE__ */ u3("div", { class: "ptm-pin__price", dangerouslySetInnerHTML: { __html: pin.priceHtml } }),
          /* @__PURE__ */ u3("p", { class: "ptm-meta ptm-pin__seller", children: [
            t7("seller", { seller: pin.seller }),
            pin.indexed && ` · ${new Date(pin.indexed).toLocaleString()}`
          ] }),
          /* @__PURE__ */ u3("div", { class: "ptm-pin__actions", children: [
            /* @__PURE__ */ u3("button", { type: "button", class: "ptm-btn ptm-btn--blue", disabled: !findRow(pin.id), onClick: () => scrollTo(pin.id), children: /* @__PURE__ */ u3("span", { children: t7("scroll") }) }),
            /* @__PURE__ */ u3(Button, { variant: "plain", onClick: () => pins.update((all) => all.filter((p3) => p3.id !== pin.id)), children: t7("remove") })
          ] })
        ] }, pin.id))
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
  var pinsFeature = {
    id: "pins",
    label: () => t7("label"),
    description: () => t7("description"),
    toggleable: true,
    defaultEnabled: true,
    css: feature_default2,
    sidebarTab: { label: () => t7("tab"), icon: IconPin, order: 3 },
    start
  };

  // src/features/tab-title/index.ts
  var t8 = createTranslator({
    de: { label: "Tab-Titel", description: "Zeigt den Namen der Suche im Browser-Tab." },
    en: { label: "Tab title", description: "Shows the search name in the browser tab." }
  });
  var UNREAD = /^\(\d+\) /;
  var THROTTLE_MS = 100;
  var tabTitleFeature = {
    id: "tab-title",
    label: () => t8("label"),
    description: () => t8("description"),
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
  var feature_default3 = ".ptm-mod-highlight {\n  background: rgba(138, 86, 9, 0.25);\n}\n";

  // src/features/highlight-mods/index.ts
  var t9 = createTranslator({
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
    label: () => t9("label"),
    description: () => t9("description"),
    toggleable: true,
    defaultEnabled: true,
    css: feature_default3,
    start(ctx) {
      let unregister = () => {
      };
      const clear = () => {
        unregister();
        for (const mod of ctx.doc.querySelectorAll(`.${HIGHLIGHT}`)) mod.classList.remove(HIGHLIGHT);
      };
      const apply = (search) => {
        clear();
        const ids = activeStatIds(search);
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
  var feature_default4 = ".ptm-regroup-hidden {\n  display: none !important;\n}\n\n.ptm-regroup-shown {\n  background: rgba(16, 16, 16, 0.8) !important;\n}\n\n.ptm-regroup-btn {\n  margin-left: 5px;\n}\n";

  // src/features/regroup-similar/index.ts
  var t10 = createTranslator({
    de: {
      label: "Gleiche Angebote zusammenfassen",
      description: "Fasst gleiche Items vom selben Verkäufer zum selben Preis zusammen.",
      similar: "{n} ähnliche"
    },
    en: {
      label: "Group identical listings",
      description: "Collapses identical items from the same seller at the same price.",
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
    return [seller, item.name, item.typeLine, listing.price?.amount ?? "", listing.price?.currency ?? ""].join("|");
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
    label: () => t10("label"),
    description: () => t10("description"),
    toggleable: true,
    defaultEnabled: true,
    css: feature_default4,
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
        button.textContent = t10("similar", { n: count });
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
  var feature_default5 = ".ptm-price-equivalent {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 0 8px;\n  font-family: var(--ptm-font-title);\n  font-size: 13px;\n  color: var(--ptm-muted);\n}\n\n.ptm-price-equivalent__part {\n  display: inline-flex;\n  align-items: center;\n  gap: 3px;\n}\n\n.ptm-price-equivalent__icon {\n  width: 16px;\n  height: 16px;\n}\n";

  // src/features/price-equivalent/format.ts
  var MIN_DIVINE = 0.1;
  function formatAmount(value, locale = getLocale()) {
    const digits = value >= 100 ? 0 : value >= 10 ? 1 : 2;
    return new Intl.NumberFormat(locale, { maximumFractionDigits: digits }).format(value);
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
        await this.storage.set(key, { at: Date.now(), values: Object.fromEntries(rates) });
        return rates;
      } catch (error) {
        log.warn(`loading poe.ninja rates for "${league}" failed`, error);
        return /* @__PURE__ */ new Map();
      }
    }
  };
  function gmGetJson(url) {
    return new Promise((resolve, reject) => {
      const result = GM.xmlHttpRequest({
        method: "GET",
        url,
        timeout: 15e3,
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
  var t11 = createTranslator({
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
    label: () => t11("label"),
    description: () => t11("description"),
    toggleable: true,
    defaultEnabled: true,
    css: feature_default5,
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
      const load = async (league) => {
        const current = ++generation;
        clear();
        if (!league) return;
        const [rates, currencies] = await Promise.all([
          source.get(league),
          ctx.data.currencies().catch(() => /* @__PURE__ */ new Map())
        ]);
        if (current !== generation || rates.size === 0) return;
        undecorate = ctx.results.decorate("price-equivalent", (row) => render(ctx.doc, row, rates, currencies));
      };
      void load(ctx.leagues.current.get());
      const off = ctx.leagues.current.subscribe((league) => void load(league));
      return {
        dispose() {
          off();
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
    line.title = t11("source");
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
    target.append(line);
  }

  // src/features/mod-actions/index.ts
  var t12 = createTranslator({
    de: { label: "Mods als Filter übernehmen", description: "Plus und Minus an jeder Mod im Ergebnis fügen sie als Filter hinzu oder schließen sie aus." },
    en: { label: "Mod filter buttons", description: "Plus and minus on each result mod add it as a filter or exclude it." }
  });
  var modActionsFeature = {
    id: "mod-actions",
    label: () => t12("label"),
    description: () => t12("description"),
    toggleable: true,
    defaultEnabled: true,
    start() {
    }
  };

  // src/features/auto-load-more/index.ts
  var t13 = createTranslator({
    de: { label: "Automatisch nachladen", description: "Lädt beim Scrollen ans Ende weitere Ergebnisse." },
    en: { label: "Auto load more", description: "Loads more results when you scroll to the end." }
  });
  var THROTTLE_MS2 = 750;
  function autoLoadMore({ doc }, Observer = IntersectionObserver) {
    let watched = null;
    let inView = false;
    let lastClick = -Infinity;
    let retry;
    const tryLoad = () => {
      clearTimeout(retry);
      const button = watched;
      if (!inView || !button?.isConnected || button.disabled) return;
      const wait = lastClick + THROTTLE_MS2 - Date.now();
      if (wait > 0) {
        retry = setTimeout(tryLoad, wait);
        return;
      }
      lastClick = Date.now();
      button.click();
    };
    const io = new Observer(
      (entries) => {
        const entry = entries.find((e3) => e3.target === watched);
        if (!entry) return;
        inView = entry.isIntersecting;
        tryLoad();
      },
      { rootMargin: "480px" }
    );
    const attach = () => {
      const button = doc.querySelector(sel.loadMoreButton);
      if (button === watched) return;
      if (watched) io.unobserve(watched);
      watched = button;
      inView = false;
      if (button) io.observe(button);
    };
    const mutations = new MutationObserver(attach);
    mutations.observe(doc.body, { childList: true, subtree: true });
    attach();
    return {
      dispose() {
        clearTimeout(retry);
        mutations.disconnect();
        io.disconnect();
      }
    };
  }
  var autoLoadMoreFeature = {
    id: "auto-load-more",
    label: () => t13("label"),
    description: () => t13("description"),
    toggleable: true,
    defaultEnabled: false,
    start: (ctx) => autoLoadMore(ctx)
  };

  // src/features/layout/index.ts
  var t14 = createTranslator({
    de: { label: "Zwei-Spalten-Layout", description: "Filter links, Ergebnisse rechts, volle Breite." },
    en: { label: "Two-column layout", description: "Filters on the left, results on the right, full width." }
  });
  var layoutFeature = {
    id: "layout",
    label: () => t14("label"),
    description: () => t14("description"),
    toggleable: true,
    defaultEnabled: true,
    start() {
    }
  };

  // src/features/quick-filters/index.ts
  var t15 = createTranslator({
    de: { label: "Schnellfilter", description: "Leiste mit häufigen Filtern wie Corrupted oder Item-Level." },
    en: { label: "Quick filters", description: "Bar with common filters like corrupted or item level." }
  });
  var quickFiltersFeature = {
    id: "quick-filters",
    label: () => t15("label"),
    description: () => t15("description"),
    toggleable: true,
    defaultEnabled: true,
    start() {
    }
  };

  // src/features/stat-favorites/index.ts
  var t16 = createTranslator({
    de: { label: "Stat-Favoriten", description: "Stern an Stat-Filtern, Favoriten stehen oben." },
    en: { label: "Stat favorites", description: "Star stat filters to keep them at the top." }
  });
  var statFavoritesFeature = {
    id: "stat-favorites",
    label: () => t16("label"),
    description: () => t16("description"),
    toggleable: true,
    defaultEnabled: true,
    start() {
    }
  };

  // src/features/search-clear/index.ts
  var t17 = createTranslator({
    de: { label: "Suchfeld leeren", description: "Löschen-Knopf im Item-Suchfeld." },
    en: { label: "Clear item search", description: "Clear button in the item search field." }
  });
  var searchClearFeature = {
    id: "search-clear",
    label: () => t17("label"),
    description: () => t17("description"),
    toggleable: true,
    defaultEnabled: true,
    start() {
    }
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
    searchClearFeature
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

  // src/site/bridge/protocol.ts
  var PAGE_TO_CONTENT = "ptm:page";
  var CONTENT_TO_PAGE = "ptm:content";

  // src/site/bridge/client.ts
  var PageBridge = class {
    constructor(win = window) {
      this.win = win;
      win.addEventListener(PAGE_TO_CONTENT, (event) => {
        const detail = event.detail;
        if (typeof detail === "string") this.#receive(JSON.parse(detail));
      });
    }
    win;
    events = new EventBus();
    #nextRequestId = 1;
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
    /** Commits a Vuex mutation, e.g. `commit('persistent/setStatFilter', { group: 0, value })`. */
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
          resolve: (value) => {
            clearTimeout(timer);
            resolve(value);
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
  function sameLocation(a3, b2) {
    return JSON.stringify(a3) === JSON.stringify(b2);
  }

  // src/site/results.ts
  var MAX_CACHED_LISTINGS = 2e3;
  var ResultsObserver = class {
    constructor(bridge2, doc = document) {
      this.doc = doc;
      bridge2.events.on("listings", (results) => {
        for (const result of results) this.#listings.set(result.id, result);
        this.#trimCache();
        this.#schedule();
      });
    }
    doc;
    #listings = /* @__PURE__ */ new Map();
    #decorators = /* @__PURE__ */ new Map();
    #clearHandlers = /* @__PURE__ */ new Set();
    #observer = null;
    #scheduled = false;
    #hadRows = false;
    start() {
      if (this.#observer) return;
      this.#observer = new MutationObserver(() => this.#schedule());
      this.#observer.observe(this.doc.body, { childList: true, subtree: true });
      this.#schedule();
    }
    stop() {
      this.#observer?.disconnect();
      this.#observer = null;
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
      for (const element of elements) {
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
    constructor(fetchJson = defaultFetchJson2, imageOrigin = "https://web.poecdn.com") {
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
      });
      return this.#filterOptions;
    }
  };
  async function defaultFetchJson2(path) {
    const response = await fetch(path, { credentials: "same-origin" });
    if (!response.ok) throw new Error(`${path}: ${response.status}`);
    return response.json();
  }

  // src/app/context.ts
  var AppContextValue = X(null);
  function useApp() {
    const ctx = x2(AppContextValue);
    if (!ctx) throw new Error("useApp() used outside of <AppContextValue.Provider>");
    return ctx;
  }

  // src/ui/components/Form.tsx
  function Field({ label, children, hint }) {
    return /* @__PURE__ */ u3("label", { class: "ptm-field", children: [
      /* @__PURE__ */ u3("span", { class: "ptm-field__label", children: label }),
      children,
      hint && /* @__PURE__ */ u3("span", { class: "ptm-field__hint", children: hint })
    ] });
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

  // src/ui/SettingsModal.tsx
  function SettingsModal({ features: features2, onClose }) {
    const { settings } = useApp();
    const current = useStore(settings);
    const setFeature = (id, enabled) => settings.update((value) => ({ ...value, features: { ...value.features, [id]: enabled } }));
    return /* @__PURE__ */ u3(Modal, { title: t4("settings"), onClose, children: [
      /* @__PURE__ */ u3(Field, { label: t4("language"), children: /* @__PURE__ */ u3(
        "select",
        {
          class: "ptm-input",
          value: current.language,
          onChange: (event) => {
            const language = event.currentTarget.value;
            settings.update((value) => ({ ...value, language }));
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
        t4("version", { version: "0.1.0" }),
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
    const tabs = running.filter((entry) => entry.feature.sidebarTab && entry.Panel).sort((a3, b2) => a3.feature.sidebarTab.order - b2.feature.sidebarTab.order);
    const active = tabs.find((entry) => entry.feature.id === activeTab) ?? tabs[0];
    const setCollapsed = (collapsed) => settings.update((value) => ({ ...value, sidebarCollapsed: collapsed }));
    return /* @__PURE__ */ u3(S, { children: [
      sidebarCollapsed && /* @__PURE__ */ u3("button", { type: "button", class: "ptm-expand-tab", title: t4("expand"), "aria-label": t4("expand"), onClick: () => setCollapsed(false), children: [
        /* @__PURE__ */ u3(IconChevronLeft, { size: 16 }),
        /* @__PURE__ */ u3(Logo, { size: 24 })
      ] }),
      /* @__PURE__ */ u3("aside", { class: "ptm-sidebar", "aria-label": t4("appName"), "aria-hidden": sidebarCollapsed, children: [
        /* @__PURE__ */ u3("header", { class: "ptm-sidebar__header", children: [
          /* @__PURE__ */ u3(IconButton, { label: t4("collapse"), onClick: () => setCollapsed(true), children: /* @__PURE__ */ u3(IconChevronRight, { size: 18 }) }),
          /* @__PURE__ */ u3("div", { class: "ptm-sidebar__brand", children: [
            /* @__PURE__ */ u3(Logo, {}),
            /* @__PURE__ */ u3("span", { children: t4("appName") })
          ] }),
          /* @__PURE__ */ u3(IconButton, { label: t4("settings"), onClick: () => setSettingsOpen(true), children: /* @__PURE__ */ u3(IconSettings, { size: 18 }) })
        ] }),
        tabs.length > 0 ? /* @__PURE__ */ u3(S, { children: [
          /* @__PURE__ */ u3("nav", { class: "ptm-tabs", role: "tablist", children: tabs.map(({ feature }) => {
            const TabIcon = feature.sidebarTab.icon;
            const selected = feature.id === active?.feature.id;
            return /* @__PURE__ */ u3(
              "button",
              {
                type: "button",
                role: "tab",
                "aria-selected": selected,
                class: selected ? "ptm-tab ptm-tab--active" : "ptm-tab",
                onClick: () => settings.update((value) => ({ ...value, activeTab: feature.id })),
                children: [
                  /* @__PURE__ */ u3(TabIcon, {}),
                  /* @__PURE__ */ u3("span", { children: feature.sidebarTab.label() })
                ]
              },
              feature.id
            );
          }) }),
          /* @__PURE__ */ u3("div", { class: "ptm-sidebar__panel", role: "tabpanel", children: active?.Panel && /* @__PURE__ */ u3(active.Panel, {}) })
        ] }) : /* @__PURE__ */ u3("p", { class: "ptm-empty", children: t4("noTabs") })
      ] }),
      settingsOpen && /* @__PURE__ */ u3(SettingsModal, { features: host.features, onClose: () => setSettingsOpen(false) })
    ] });
  }

  // src/ui/Toasts.tsx
  function Toasts() {
    const { toast } = useApp();
    const toasts = useStore(toast.toasts);
    return /* @__PURE__ */ u3("div", { class: "ptm-toasts", role: "status", "aria-live": "polite", children: toasts.map((entry) => /* @__PURE__ */ u3("button", { type: "button", class: `ptm-toast ptm-toast--${entry.kind}`, onClick: () => toast.dismiss(entry.id), children: entry.message }, entry.id)) });
  }

  // src/ui/App.tsx
  function App({ ctx, host }) {
    return /* @__PURE__ */ u3(AppContextValue.Provider, { value: ctx, children: [
      /* @__PURE__ */ u3(Sidebar, { host }),
      /* @__PURE__ */ u3(Toasts, {})
    ] });
  }

  // src/ui/core.css
  var core_default = "/* Shared UI shell. Tokens and components follow DESIGN.md. Components are scoped to #ptm-root. */\n\n/* Tokens live on :root so feature styles inside the trade page can use them too. */\n:root {\n  --ptm-sidebar-width: 400px;\n  --ptm-bg: rgba(10, 10, 10, 0.88);\n  --ptm-surface: #161616;\n  --ptm-input: #1e2124;\n  --ptm-blue: #0f304d;\n  --ptm-blue-hover: #133d62;\n  --ptm-blue-border: #4c4c7d;\n  --ptm-blue-line: rgba(76, 76, 125, 0.4);\n  --ptm-gold: #5a3806;\n  --ptm-gold-hover: #724708;\n  --ptm-gold-border: #8a5609;\n  --ptm-red: #5a0a09;\n  --ptm-red-hover: #710d0b;\n  --ptm-red-border: #6d2725;\n  --ptm-green: #4b7e42;\n  --ptm-green-border: #5e9954;\n  --ptm-yellow: #666521;\n  --ptm-yellow-border: #7a7921;\n  --ptm-text: #ffffff;\n  --ptm-beige: #fff8e1;\n  --ptm-muted: #a38d6d;\n  --ptm-menu: #373737;\n  --ptm-menu-border: #7a7a7a;\n  --ptm-font-title: FontinSmallCaps, FontinSmallcaps, Verdana, Arial, sans-serif;\n  --ptm-font-body: Verdana, Arial, Helvetica, sans-serif;\n}\n\n#ptm-root {\n  font-family: var(--ptm-font-body);\n  font-size: 13px;\n  color: var(--ptm-text);\n  line-height: 1.35;\n}\n\n#ptm-root *,\n#ptm-root *::before,\n#ptm-root *::after {\n  box-sizing: border-box;\n}\n\n#ptm-root button {\n  font: inherit;\n  color: inherit;\n}\n\n/* Page gets pushed left instead of being covered (Better Trading overlays it since PoE2 0.5). */\nhtml.ptm-sidebar-open body {\n  padding-right: var(--ptm-sidebar-width, 400px);\n  transition: padding-right 0.2s;\n}\n\n.ptm-icon {\n  flex: none;\n  vertical-align: middle;\n}\n\n/* Sidebar */\n\n.ptm-sidebar {\n  position: fixed;\n  top: 0;\n  right: 0;\n  bottom: 0;\n  width: var(--ptm-sidebar-width);\n  z-index: 1000;\n  display: flex;\n  flex-direction: column;\n  padding: 5px 10px;\n  background: var(--ptm-bg);\n  border-left: 1px solid #000;\n  transition: right 0.2s;\n}\n\nhtml:not(.ptm-sidebar-open) .ptm-sidebar {\n  right: calc(-1 * var(--ptm-sidebar-width) - 2px);\n}\n\n.ptm-sidebar__header {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  padding: 4px 0 8px;\n}\n\n.ptm-sidebar__brand {\n  flex: 1;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  gap: 8px;\n  font-family: var(--ptm-font-title);\n  font-size: 20px;\n  color: var(--ptm-beige);\n  white-space: nowrap;\n}\n\n.ptm-sidebar__brand .ptm-logo {\n  transition: transform 0.2s;\n}\n\n.ptm-sidebar__brand:hover .ptm-logo {\n  transform: rotate(5deg);\n}\n\n.ptm-sidebar__panel {\n  flex: 1;\n  overflow-y: auto;\n  padding: 8px 0;\n  scrollbar-width: thin;\n}\n\n.ptm-expand-tab {\n  position: fixed;\n  top: 50px;\n  right: 0;\n  z-index: 1000;\n  display: flex;\n  align-items: center;\n  gap: 6px;\n  padding: 6px 8px 6px 10px;\n  border: 1px solid var(--ptm-blue-border);\n  border-right: 0;\n  background: var(--ptm-blue);\n  cursor: pointer;\n  transition: padding-left 0.2s, background-color 0.2s;\n}\n\n.ptm-expand-tab:hover {\n  padding-left: 15px;\n  background: var(--ptm-blue-hover);\n}\n\n/* Tabs */\n\n.ptm-tabs {\n  display: flex;\n}\n\n.ptm-tab {\n  flex: 1;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  gap: 5px;\n  padding: 6px 0;\n  border: 0;\n  border-bottom: 2px solid transparent;\n  background: none;\n  font-family: var(--ptm-font-title) !important;\n  font-size: 14px;\n  cursor: pointer;\n}\n\n.ptm-tab:hover {\n  background: rgba(90, 56, 6, 0.2);\n}\n\n.ptm-tab--active {\n  border-bottom-color: var(--ptm-gold-border);\n}\n\n/* Buttons */\n\n.ptm-btn {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  gap: 5px;\n  height: 32px;\n  padding: 0 10px;\n  border: 1px solid;\n  font-family: var(--ptm-font-title) !important;\n  font-size: 13px;\n  line-height: 1;\n  color: var(--ptm-text);\n  cursor: pointer;\n  transition: background-color 0.2s;\n  user-select: none;\n}\n\n.ptm-btn + .ptm-btn {\n  margin-left: 5px;\n}\n\n.ptm-btn:disabled {\n  opacity: 0.5;\n  cursor: default;\n}\n\n.ptm-btn--block {\n  display: flex;\n  width: 100%;\n}\n\n.ptm-btn--blue { background: var(--ptm-blue); border-color: var(--ptm-blue-border); }\n.ptm-btn--blue:hover:not(:disabled) { background: var(--ptm-blue-hover); }\n.ptm-btn--gold { background: var(--ptm-gold); border-color: var(--ptm-gold-border); }\n.ptm-btn--gold:hover:not(:disabled) { background: var(--ptm-gold-hover); }\n.ptm-btn--red { background: var(--ptm-red); border-color: var(--ptm-red-border); }\n.ptm-btn--red:hover:not(:disabled) { background: var(--ptm-red-hover); }\n.ptm-btn--plain { background: transparent; border-color: var(--ptm-menu-border); }\n.ptm-btn--plain:hover:not(:disabled) { background: rgba(255, 255, 255, 0.06); }\n\n.ptm-icon-btn {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  min-width: 24px;\n  height: 24px;\n  padding: 0 3px;\n  border: 0;\n  background: none;\n  color: rgba(255, 255, 255, 0.8);\n  cursor: pointer;\n}\n\n.ptm-icon-btn:hover {\n  color: #fff;\n}\n\n.ptm-toolbar {\n  display: flex;\n  flex-wrap: wrap;\n  justify-content: flex-end;\n  gap: 5px;\n  margin-bottom: 8px;\n}\n\n.ptm-toolbar .ptm-btn + .ptm-btn {\n  margin-left: 0;\n}\n\n/* Menu */\n\n.ptm-menu {\n  position: relative;\n}\n\n.ptm-menu__list {\n  position: absolute;\n  top: 100%;\n  right: 0;\n  z-index: 10;\n  width: 200px;\n  margin: 2px 0 0;\n  padding: 0;\n  list-style: none;\n  background: var(--ptm-menu);\n  border: 1px solid var(--ptm-menu-border);\n  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.6);\n}\n\n.ptm-menu__item {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  width: 100%;\n  padding: 5px 8px;\n  border: 0;\n  background: none;\n  font-family: var(--ptm-font-body) !important;\n  font-size: 13px;\n  text-align: left;\n  cursor: pointer;\n}\n\n.ptm-menu__item:hover {\n  background: linear-gradient(90deg, var(--ptm-menu-border), transparent);\n}\n\n.ptm-menu__item--danger {\n  color: #ef7d7d !important;\n}\n\n/* Modal */\n\n.ptm-modal-overlay {\n  position: fixed;\n  inset: 0;\n  z-index: 1100;\n  display: flex;\n  align-items: flex-start;\n  justify-content: center;\n  padding-top: 8vh;\n  background: rgba(0, 0, 0, 0.6);\n  animation: ptm-fade-in 0.2s;\n}\n\n.ptm-modal {\n  max-height: 84vh;\n  display: flex;\n  flex-direction: column;\n  background: rgba(20, 20, 20, 0.95);\n  border: 1px solid var(--ptm-gold-border);\n  backdrop-filter: blur(2px);\n  animation: ptm-slide-in 0.2s;\n}\n\n.ptm-modal__header {\n  display: flex;\n  align-items: center;\n  gap: 10px;\n  padding: 10px 12px;\n  border-bottom: 1px solid var(--ptm-gold-border);\n}\n\n.ptm-modal__title {\n  flex: 1;\n  margin: 0;\n  font-family: var(--ptm-font-title);\n  font-size: 15px;\n  font-weight: normal;\n  text-transform: uppercase;\n  letter-spacing: 0.5px;\n  color: var(--ptm-beige);\n}\n\n.ptm-modal__body {\n  overflow-y: auto;\n  padding: 14px;\n  display: grid;\n  gap: 14px;\n}\n\n.ptm-modal__footer {\n  display: flex;\n  justify-content: flex-end;\n  gap: 5px;\n  padding: 10px 14px;\n  border-top: 1px solid rgba(138, 86, 9, 0.5);\n}\n\n/* Forms */\n\n.ptm-field {\n  display: grid;\n  gap: 6px;\n}\n\n.ptm-field__label {\n  font-family: var(--ptm-font-title);\n  font-size: 15px;\n  letter-spacing: 0.5px;\n  color: var(--ptm-beige);\n}\n\n.ptm-field__hint {\n  font-size: 11px;\n  color: rgba(255, 248, 225, 0.7);\n}\n\n.ptm-input {\n  width: 100%;\n  height: 30px;\n  padding: 0 8px;\n  border: 1px solid transparent;\n  background: var(--ptm-input);\n  color: var(--ptm-text);\n  font-family: var(--ptm-font-body);\n  font-size: 13px;\n}\n\n.ptm-input:focus {\n  outline: none;\n  border-color: var(--ptm-gold-border);\n}\n\n.ptm-textarea {\n  height: 120px;\n  padding: 6px 8px;\n  resize: vertical;\n  font-family: Consolas, monospace;\n  font-size: 12px;\n}\n\n.ptm-checkbox {\n  display: flex;\n  align-items: flex-start;\n  gap: 8px;\n  cursor: pointer;\n}\n\n.ptm-checkbox input {\n  position: absolute;\n  opacity: 0;\n  pointer-events: none;\n}\n\n.ptm-checkbox__box {\n  flex: none;\n  position: relative;\n  width: 15px;\n  height: 15px;\n  margin-top: 1px;\n  border: 2px solid #634928;\n}\n\n.ptm-checkbox__box::after {\n  content: '';\n  position: absolute;\n  inset: 2px;\n  background: #fff;\n  transform: scale(0);\n  transition: transform 0.15s;\n}\n\n.ptm-checkbox input:checked + .ptm-checkbox__box::after {\n  transform: scale(1);\n}\n\n.ptm-checkbox input:focus-visible + .ptm-checkbox__box {\n  outline: 1px solid var(--ptm-gold-border);\n}\n\n.ptm-checkbox__text {\n  display: grid;\n  gap: 2px;\n}\n\n.ptm-checkbox__label {\n  font-family: var(--ptm-font-title);\n  font-size: 14px;\n  color: var(--ptm-beige);\n}\n\n.ptm-checkbox__description {\n  font-size: 11px;\n  color: var(--ptm-muted);\n}\n\n.ptm-settings-grid {\n  display: grid;\n  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));\n  gap: 12px 18px;\n}\n\n.ptm-section-title {\n  margin: 4px 0 0;\n  font-family: var(--ptm-font-title);\n  font-size: 15px;\n  font-weight: normal;\n  color: var(--ptm-beige);\n  border-bottom: 1px solid rgba(138, 86, 9, 0.5);\n  padding-bottom: 4px;\n}\n\n/* Text, alerts, toasts */\n\n.ptm-text {\n  margin: 0;\n}\n\n.ptm-meta {\n  margin: 0;\n  font-size: 11px;\n  color: var(--ptm-muted);\n}\n\n.ptm-meta a {\n  color: var(--ptm-beige);\n}\n\n.ptm-empty {\n  margin: 12px 0;\n  padding: 8px;\n  color: var(--ptm-muted);\n  text-align: center;\n}\n\n.ptm-alert {\n  display: flex;\n  align-items: center;\n  gap: 6px;\n  padding: 8px;\n  border: 1px solid;\n}\n\n.ptm-alert--warning { background: var(--ptm-yellow); border-color: var(--ptm-yellow-border); }\n.ptm-alert--error { background: var(--ptm-red); border-color: var(--ptm-red-border); }\n.ptm-alert--success { background: var(--ptm-green); border-color: var(--ptm-green-border); }\n\n.ptm-toasts {\n  position: fixed;\n  right: 30px;\n  bottom: 20px;\n  z-index: 1200;\n  display: grid;\n  gap: 6px;\n  justify-items: end;\n}\n\nhtml.ptm-sidebar-open .ptm-toasts {\n  right: calc(var(--ptm-sidebar-width) + 20px);\n}\n\n.ptm-toast {\n  max-width: 340px;\n  padding: 8px 12px;\n  border: 1px solid;\n  text-align: left;\n  cursor: pointer;\n  animation: ptm-slide-in 0.2s;\n}\n\n.ptm-toast--success { background: var(--ptm-green); border-color: var(--ptm-green-border); }\n.ptm-toast--warning { background: var(--ptm-yellow); border-color: var(--ptm-yellow-border); }\n.ptm-toast--error { background: var(--ptm-red); border-color: var(--ptm-red-border); }\n\n@keyframes ptm-fade-in {\n  from { opacity: 0; }\n}\n\n@keyframes ptm-slide-in {\n  from { opacity: 0; transform: translateY(10px); }\n}\n\n@media (prefers-reduced-motion: reduce) {\n  #ptm-root *,\n  .ptm-modal-overlay,\n  .ptm-modal,\n  .ptm-toast {\n    animation: none !important;\n    transition: none !important;\n  }\n}\n";

  // src/main.tsx
  var bridge = new PageBridge(window);
  if (!window.__ptmLoaded) injectPageScript('"use strict";(()=>{var l="ptm:page",c="ptm:content";var y=/\\/api\\/trade2\\/(search|exchange)\\/(?:(poe2|xbox|sony)\\/)?([^/?#]+)\\/?(?:[?#]|$)/,k=/\\/api\\/trade2\\/fetch\\//;function u(e){let t=y.exec(e);return t?{type:t[1],realm:t[2]??"poe2",league:decodeURIComponent(t[3])}:null}function d(e){return k.test(e)}function h(e,t){w(e,t),S(e,t)}function m(e,t,n,r){let a=u(e);if(!(!a||typeof t!="string"))try{let o=JSON.parse(n);if(!o||typeof o.id!="string")return;r.onSearch({...a,request:JSON.parse(t),response:o})}catch{}}function f(e,t){let n=e?.result;Array.isArray(n)&&t.onListings(n.filter(Boolean))}function w(e,t){let n=e.XMLHttpRequest.prototype,r=n.open,a=n.send,o=new WeakMap;n.open=function(...s){return o.set(this,String(s[1])),r.apply(this,s)},n.send=function(s){let i=o.get(this)??"";return u(i)?this.addEventListener("load",()=>{this.status===200&&m(i,s,this.responseText,t)}):d(i)&&this.addEventListener("load",()=>{if(this.status===200)try{f(JSON.parse(this.responseText),t)}catch{}}),a.call(this,s)}}function S(e,t){let n=e.fetch;e.fetch=async function(r,a){let o=await n.call(e,r,a),s=typeof r=="string"?r:r instanceof URL?r.href:r.url;return o.ok&&(d(s)||u(s))&&o.clone().text().then(i=>{d(s)?f(JSON.parse(i),t):m(s,a?.body,i,t)}).catch(()=>{}),o}}function T(e){let t=e.app??e.document.querySelector("#trade")?.__vue__;return t?.$store?t:null}function g(e,t=3e4){return new Promise((n,r)=>{let a=Date.now(),o=()=>{let s=T(e);if(s)return n(s);if(Date.now()-a>t)return r(new Error("trade app not found"));e.setTimeout(o,100)};o()})}function p(e){window.dispatchEvent(new CustomEvent(l,{detail:JSON.stringify(e)}))}function C(e,t){let{requestId:n}=t;try{switch(t.kind){case"getState":return{kind:"reply",requestId:n,ok:!0,value:JSON.parse(JSON.stringify(e.$store.state.persistent))};case"commit":return e.$store.commit(t.mutation,t.payload),{kind:"reply",requestId:n,ok:!0,value:null}}}catch(r){return{kind:"reply",requestId:n,ok:!1,error:String(r)}}}window.__ptmPageBridge||(window.__ptmPageBridge=!0,h(window,{onSearch:e=>p({kind:"search",captured:e}),onListings:e=>p({kind:"listings",results:e})}),g(window).then(e=>{window.addEventListener(c,t=>{let n=t.detail;typeof n=="string"&&p(C(e,JSON.parse(n)))}),e.$store.subscribe(t=>p({kind:"mutation",type:t.type})),p({kind:"ready"})},()=>{}));})();\n');
  async function boot() {
    await domReady();
    const appReady = await Promise.race([bridge.whenReady().then(() => true), delay(3e4).then(() => false)]);
    if (!appReady) {
      log.info("trade app not found on this page, staying inactive");
      return;
    }
    const storage = new GmStorage();
    const settings = await loadSettings(storage);
    const { location: location2 } = trackLocation(window);
    const leagues = new LeagueService(storage, location2);
    void leagues.load();
    const ctx = {
      win: window,
      doc: document,
      bridge,
      storage,
      settings,
      location: location2,
      currentSearch: trackCurrentSearch(location2, bridge),
      leagues,
      searchNames: new Store({}),
      results: new ResultsObserver(bridge, document),
      data: new TradeData(),
      toast: createToaster()
    };
    applyLanguage(settings.get());
    applySidebarState(settings.get());
    settings.subscribe((next, previous) => {
      applySidebarState(next);
      if (next.language !== previous.language) applyLanguage(next);
    });
    addStyle(core_default, "core");
    ctx.results.start();
    const host = new FeatureHost(features, ctx);
    host.start();
    const root = document.createElement("div");
    root.id = "ptm-root";
    document.body.append(root);
    const renderApp = () => R(/* @__PURE__ */ u3(App, { ctx, host }), root);
    renderApp();
    settings.subscribe((next, previous) => {
      if (next.language !== previous.language) renderApp();
    });
    log.info(`v${"0.1.0"} ready with ${features.length} features`);
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
  }
  function domReady() {
    if (document.readyState !== "loading") return Promise.resolve();
    return new Promise((resolve) => document.addEventListener("DOMContentLoaded", () => resolve(), { once: true }));
  }
  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  if (!window.__ptmLoaded) {
    window.__ptmLoaded = true;
    boot().catch((error) => log.error("startup failed", error));
  }
})();
