var Jt = Object.defineProperty;
var qt = (t, e, s) => e in t ? Jt(t, e, { enumerable: !0, configurable: !0, writable: !0, value: s }) : t[e] = s;
var V = (t, e, s) => qt(t, typeof e != "symbol" ? e + "" : e, s);
const Gt = (t, e) => t === e, Z = Symbol("solid-proxy"), je = Symbol("solid-track"), De = {
  equals: Gt
};
let Ct = At;
const Q = 1, Ie = 2, Et = {
  owned: null,
  cleanups: null,
  context: null,
  owner: null
};
var j = null;
let tt = null, Yt = null, T = null, I = null, X = null, Xe = 0;
function Le(t, e) {
  const s = T, n = j, r = t.length === 0, o = e === void 0 ? n : e, i = r ? Et : {
    owned: null,
    cleanups: null,
    context: o ? o.context : null,
    owner: o
  }, a = r ? t : () => t(() => ae(() => _e(i)));
  j = i, T = null;
  try {
    return be(a, !0);
  } finally {
    T = s, j = n;
  }
}
function L(t, e) {
  e = e ? Object.assign({}, De, e) : De;
  const s = {
    value: t,
    observers: null,
    observerSlots: null,
    comparator: e.equals || void 0
  }, n = (r) => (typeof r == "function" && (r = r(s.value)), Pt(s, r));
  return [Ht.bind(s), n];
}
function _(t, e, s) {
  const n = pt(t, e, !1, Q);
  Pe(n);
}
function Ke(t, e, s) {
  Ct = Zt;
  const n = pt(t, e, !1, Q);
  n.user = !0, X ? X.push(n) : Pe(n);
}
function Ne(t, e, s) {
  s = s ? Object.assign({}, De, s) : De;
  const n = pt(t, e, !0, 0);
  return n.observers = null, n.observerSlots = null, n.comparator = s.equals || void 0, Pe(n), Ht.bind(n);
}
function ue(t) {
  return be(t, !1);
}
function ae(t) {
  if (T === null) return t();
  const e = T;
  T = null;
  try {
    return t();
  } finally {
    T = e;
  }
}
function Ze(t) {
  Ke(() => ae(t));
}
function Qe(t) {
  return j === null || (j.cleanups === null ? j.cleanups = [t] : j.cleanups.push(t)), t;
}
function rt() {
  return T;
}
function Ht() {
  if (this.sources && this.state)
    if (this.state === Q) Pe(this);
    else {
      const t = I;
      I = null, be(() => Re(this), !1), I = t;
    }
  if (T) {
    const t = this.observers;
    if (!t || t[t.length - 1] !== T) {
      const e = t ? t.length : 0;
      T.sources ? (T.sources.push(this), T.sourceSlots.push(e)) : (T.sources = [this], T.sourceSlots = [e]), t ? (t.push(T), this.observerSlots.push(T.sources.length - 1)) : (this.observers = [T], this.observerSlots = [T.sources.length - 1]);
    }
  }
  return this.value;
}
function Pt(t, e, s) {
  let n = t.value;
  return (!t.comparator || !t.comparator(n, e)) && (t.value = e, t.observers && t.observers.length && be(() => {
    for (let r = 0; r < t.observers.length; r += 1) {
      const o = t.observers[r], i = tt && tt.running;
      i && tt.disposed.has(o), (i ? !o.tState : !o.state) && (o.pure ? I.push(o) : X.push(o), o.observers && Bt(o)), i || (o.state = Q);
    }
    if (I.length > 1e6)
      throw I = [], new Error();
  }, !1)), e;
}
function Pe(t) {
  if (!t.fn) return;
  _e(t);
  const e = Xe;
  Xt(t, t.value, e);
}
function Xt(t, e, s) {
  let n;
  const r = j, o = T;
  T = j = t;
  try {
    n = t.fn(e);
  } catch (i) {
    return t.pure && (t.state = Q, t.owned && t.owned.forEach(_e), t.owned = null), t.updatedAt = s + 1, Lt(i);
  } finally {
    T = o, j = r;
  }
  (!t.updatedAt || t.updatedAt <= s) && (t.updatedAt != null && "observers" in t ? Pt(t, n) : t.value = n, t.updatedAt = s);
}
function pt(t, e, s, n = Q, r) {
  const o = {
    fn: t,
    state: n,
    updatedAt: null,
    owned: null,
    sources: null,
    sourceSlots: null,
    cleanups: null,
    value: e,
    owner: j,
    context: j ? j.context : null,
    pure: s
  };
  return j === null || j !== Et && (j.owned ? j.owned.push(o) : j.owned = [o]), o;
}
function Fe(t) {
  if (t.state === 0) return;
  if (t.state === Ie) return Re(t);
  if (t.suspense && ae(t.suspense.inFallback)) return t.suspense.effects.push(t);
  const e = [t];
  for (; (t = t.owner) && (!t.updatedAt || t.updatedAt < Xe); )
    t.state && e.push(t);
  for (let s = e.length - 1; s >= 0; s--)
    if (t = e[s], t.state === Q)
      Pe(t);
    else if (t.state === Ie) {
      const n = I;
      I = null, be(() => Re(t, e[0]), !1), I = n;
    }
}
function be(t, e) {
  if (I) return t();
  let s = !1;
  e || (I = []), X ? s = !0 : X = [], Xe++;
  try {
    const n = t();
    return Kt(s), n;
  } catch (n) {
    s || (X = null), I = null, Lt(n);
  }
}
function Kt(t) {
  if (I && (At(I), I = null), t) return;
  const e = X;
  X = null, e.length && be(() => Ct(e), !1);
}
function At(t) {
  for (let e = 0; e < t.length; e++) Fe(t[e]);
}
function Zt(t) {
  let e, s = 0;
  for (e = 0; e < t.length; e++) {
    const n = t[e];
    n.user ? t[s++] = n : Fe(n);
  }
  for (e = 0; e < s; e++) Fe(t[e]);
}
function Re(t, e) {
  t.state = 0;
  for (let s = 0; s < t.sources.length; s += 1) {
    const n = t.sources[s];
    if (n.sources) {
      const r = n.state;
      r === Q ? n !== e && (!n.updatedAt || n.updatedAt < Xe) && Fe(n) : r === Ie && Re(n, e);
    }
  }
}
function Bt(t) {
  for (let e = 0; e < t.observers.length; e += 1) {
    const s = t.observers[e];
    s.state || (s.state = Ie, s.pure ? I.push(s) : X.push(s), s.observers && Bt(s));
  }
}
function _e(t) {
  let e;
  if (t.sources)
    for (; t.sources.length; ) {
      const s = t.sources.pop(), n = t.sourceSlots.pop(), r = s.observers;
      if (r && r.length) {
        const o = r.pop(), i = s.observerSlots.pop();
        n < r.length && (o.sourceSlots[i] = n, r[n] = o, s.observerSlots[n] = i);
      }
    }
  if (t.tOwned) {
    for (e = t.tOwned.length - 1; e >= 0; e--) _e(t.tOwned[e]);
    delete t.tOwned;
  }
  if (t.owned) {
    for (e = t.owned.length - 1; e >= 0; e--) _e(t.owned[e]);
    t.owned = null;
  }
  if (t.cleanups) {
    for (e = t.cleanups.length - 1; e >= 0; e--) t.cleanups[e]();
    t.cleanups = null;
  }
  t.state = 0;
}
function Qt(t) {
  return t instanceof Error ? t : new Error(typeof t == "string" ? t : "Unknown error", {
    cause: t
  });
}
function Lt(t, e = j) {
  throw Qt(t);
}
const es = Symbol("fallback");
function yt(t) {
  for (let e = 0; e < t.length; e++) t[e]();
}
function ts(t, e, s = {}) {
  let n = [], r = [], o = [], i = 0, a = e.length > 1 ? [] : null;
  return Qe(() => yt(o)), () => {
    let l = t() || [], c = l.length, g, h;
    return l[je], ae(() => {
      let f, y, u, p, d, m, b, x, S;
      if (c === 0)
        i !== 0 && (yt(o), o = [], n = [], r = [], i = 0, a && (a = [])), s.fallback && (n = [es], r[0] = Le((E) => (o[0] = E, s.fallback())), i = 1);
      else if (i === 0) {
        for (r = new Array(c), h = 0; h < c; h++)
          n[h] = l[h], r[h] = Le(v);
        i = c;
      } else {
        for (u = new Array(c), p = new Array(c), a && (d = new Array(c)), m = 0, b = Math.min(i, c); m < b && n[m] === l[m]; m++) ;
        for (b = i - 1, x = c - 1; b >= m && x >= m && n[b] === l[x]; b--, x--)
          u[x] = r[b], p[x] = o[b], a && (d[x] = a[b]);
        for (f = /* @__PURE__ */ new Map(), y = new Array(x + 1), h = x; h >= m; h--)
          S = l[h], g = f.get(S), y[h] = g === void 0 ? -1 : g, f.set(S, h);
        for (g = m; g <= b; g++)
          S = n[g], h = f.get(S), h !== void 0 && h !== -1 ? (u[h] = r[g], p[h] = o[g], a && (d[h] = a[g]), h = y[h], f.set(S, h)) : o[g]();
        for (h = m; h < c; h++)
          h in u ? (r[h] = u[h], o[h] = p[h], a && (a[h] = d[h], a[h](h))) : r[h] = Le(v);
        r = r.slice(0, i = c), n = l.slice(0);
      }
      return r;
    });
    function v(f) {
      if (o[h] = f, a) {
        const [y, u] = L(h);
        return a[h] = u, e(l[h], y);
      }
      return e(l[h]);
    }
  };
}
function H(t, e) {
  return ae(() => t(e || {}));
}
function z(t) {
  const e = "fallback" in t && {
    fallback: () => t.fallback
  };
  return Ne(ts(() => t.each, t.children, e || void 0));
}
const P = (t) => Ne(() => t());
function ss(t, e, s) {
  let n = s.length, r = e.length, o = n, i = 0, a = 0, l = e[r - 1].nextSibling, c = null;
  for (; i < r || a < o; ) {
    if (e[i] === s[a]) {
      i++, a++;
      continue;
    }
    for (; e[r - 1] === s[o - 1]; )
      r--, o--;
    if (r === i) {
      const g = o < n ? a ? s[a - 1].nextSibling : s[o - a] : l;
      for (; a < o; ) t.insertBefore(s[a++], g);
    } else if (o === a)
      for (; i < r; )
        (!c || !c.has(e[i])) && e[i].remove(), i++;
    else if (e[i] === s[o - 1] && s[a] === e[r - 1]) {
      const g = e[--r].nextSibling;
      t.insertBefore(s[a++], e[i++].nextSibling), t.insertBefore(s[--o], g), e[r] = s[o];
    } else {
      if (!c) {
        c = /* @__PURE__ */ new Map();
        let h = a;
        for (; h < o; ) c.set(s[h], h++);
      }
      const g = c.get(e[i]);
      if (g != null)
        if (a < g && g < o) {
          let h = i, v = 1, f;
          for (; ++h < r && h < o && !((f = c.get(e[h])) == null || f !== g + v); )
            v++;
          if (v > g - a) {
            const y = e[i];
            for (; a < g; ) t.insertBefore(s[a++], y);
          } else t.replaceChild(s[a++], e[i++]);
        } else i++;
      else e[i++].remove();
    }
  }
}
const bt = "_$DX_DELEGATE";
function ns(t, e, s, n = {}) {
  let r;
  return Le((o) => {
    r = o, e === document ? t() : w(e, t(), e.firstChild ? null : void 0, s);
  }, n.owner), () => {
    r(), e.textContent = "";
  };
}
function k(t, e, s, n) {
  let r;
  const o = () => {
    const a = n ? document.createElementNS("http://www.w3.org/1998/Math/MathML", "template") : document.createElement("template");
    return a.innerHTML = t, s ? a.content.firstChild.firstChild : n ? a.firstChild : a.content.firstChild;
  }, i = e ? () => ae(() => document.importNode(r || (r = o()), !0)) : () => (r || (r = o())).cloneNode(!0);
  return i.cloneNode = i, i;
}
function ee(t, e = window.document) {
  const s = e[bt] || (e[bt] = /* @__PURE__ */ new Set());
  for (let n = 0, r = t.length; n < r; n++) {
    const o = t[n];
    s.has(o) || (s.add(o), e.addEventListener(o, as));
  }
}
function C(t, e, s) {
  s == null ? t.removeAttribute(e) : t.setAttribute(e, s);
}
function D(t, e) {
  e == null ? t.removeAttribute("class") : t.className = e;
}
function os(t, e, s, n) {
  Array.isArray(s) ? (t[`$$${e}`] = s[0], t[`$$${e}Data`] = s[1]) : t[`$$${e}`] = s;
}
function Ot(t, e, s) {
  if (!e) return s ? C(t, "style") : e;
  const n = t.style;
  if (typeof e == "string") return n.cssText = e;
  typeof s == "string" && (n.cssText = s = void 0), s || (s = {}), e || (e = {});
  let r, o;
  for (o in s)
    e[o] == null && n.removeProperty(o), delete s[o];
  for (o in e)
    r = e[o], r !== s[o] && (n.setProperty(o, r), s[o] = r);
  return s;
}
function Y(t, e, s) {
  s != null ? t.style.setProperty(e, s) : t.style.removeProperty(e);
}
function it(t, e, s) {
  return ae(() => t(e, s));
}
function w(t, e, s, n) {
  if (s !== void 0 && !n && (n = []), typeof e != "function") return Ue(t, e, n, s);
  _((r) => Ue(t, e(), r, s), n);
}
function as(t) {
  let e = t.target;
  const s = `$$${t.type}`, n = t.target, r = t.currentTarget, o = (l) => Object.defineProperty(t, "target", {
    configurable: !0,
    value: l
  }), i = () => {
    const l = e[s];
    if (l && !e.disabled) {
      const c = e[`${s}Data`];
      if (c !== void 0 ? l.call(e, c, t) : l.call(e, t), t.cancelBubble) return;
    }
    return e.host && typeof e.host != "string" && !e.host._$host && e.contains(t.target) && o(e.host), !0;
  }, a = () => {
    for (; i() && (e = e._$host || e.parentNode || e.host); ) ;
  };
  if (Object.defineProperty(t, "currentTarget", {
    configurable: !0,
    get() {
      return e || document;
    }
  }), t.composedPath) {
    const l = t.composedPath();
    o(l[0]);
    for (let c = 0; c < l.length - 2 && (e = l[c], !!i()); c++) {
      if (e._$host) {
        e = e._$host, a();
        break;
      }
      if (e.parentNode === r)
        break;
    }
  } else a();
  o(n);
}
function Ue(t, e, s, n, r) {
  for (; typeof s == "function"; ) s = s();
  if (e === s) return s;
  const o = typeof e, i = n !== void 0;
  if (t = i && s[0] && s[0].parentNode || t, o === "string" || o === "number") {
    if (o === "number" && (e = e.toString(), e === s))
      return s;
    if (i) {
      let a = s[0];
      a && a.nodeType === 3 ? a.data !== e && (a.data = e) : a = document.createTextNode(e), s = ie(t, s, n, a);
    } else
      s !== "" && typeof s == "string" ? s = t.firstChild.data = e : s = t.textContent = e;
  } else if (e == null || o === "boolean")
    s = ie(t, s, n);
  else {
    if (o === "function")
      return _(() => {
        let a = e();
        for (; typeof a == "function"; ) a = a();
        s = Ue(t, a, s, n);
      }), () => s;
    if (Array.isArray(e)) {
      const a = [], l = s && Array.isArray(s);
      if (lt(a, e, s, r))
        return _(() => s = Ue(t, a, s, n, !0)), () => s;
      if (a.length === 0) {
        if (s = ie(t, s, n), i) return s;
      } else l ? s.length === 0 ? vt(t, a, n) : ss(t, s, a) : (s && ie(t), vt(t, a));
      s = a;
    } else if (e.nodeType) {
      if (Array.isArray(s)) {
        if (i) return s = ie(t, s, n, e);
        ie(t, s, null, e);
      } else s == null || s === "" || !t.firstChild ? t.appendChild(e) : t.replaceChild(e, t.firstChild);
      s = e;
    }
  }
  return s;
}
function lt(t, e, s, n) {
  let r = !1;
  for (let o = 0, i = e.length; o < i; o++) {
    let a = e[o], l = s && s[t.length], c;
    if (!(a == null || a === !0 || a === !1)) if ((c = typeof a) == "object" && a.nodeType)
      t.push(a);
    else if (Array.isArray(a))
      r = lt(t, a, l) || r;
    else if (c === "function")
      if (n) {
        for (; typeof a == "function"; ) a = a();
        r = lt(t, Array.isArray(a) ? a : [a], Array.isArray(l) ? l : [l]) || r;
      } else
        t.push(a), r = !0;
    else {
      const g = String(a);
      l && l.nodeType === 3 && l.data === g ? t.push(l) : t.push(document.createTextNode(g));
    }
  }
  return r;
}
function vt(t, e, s = null) {
  for (let n = 0, r = e.length; n < r; n++) t.insertBefore(e[n], s);
}
function ie(t, e, s, n) {
  if (s === void 0) return t.textContent = "";
  const r = n || document.createTextNode("");
  if (e.length) {
    let o = !1;
    for (let i = e.length - 1; i >= 0; i--) {
      const a = e[i];
      if (r !== a) {
        const l = a.parentNode === t;
        !o && !i ? l ? t.replaceChild(r, a) : t.insertBefore(r, s) : l && a.remove();
      } else o = !0;
    }
  } else t.insertBefore(r, s);
  return [r];
}
const rs = "sample-cat-fact", is = "Cat Fact API", ls = "Fetches a random cat fact from catfact.ninja and logs it", cs = "2.0.0", us = [
  {
    id: "start_1",
    type: "start",
    label: "Start",
    data: {}
  },
  {
    id: "http_1",
    type: "http-request",
    label: "Get Cat Fact",
    data: {
      method: "GET",
      url: "https://catfact.ninja/fact",
      outputs: {
        catFact: "$.fact",
        factLength: "$.length"
      }
    }
  },
  {
    id: "log_1",
    type: "log",
    label: "Log Fact",
    data: {
      message: "Cat Fact: {{catFact}} ({{factLength}} chars)",
      level: "info"
    }
  },
  {
    id: "end_1",
    type: "end",
    label: "End",
    data: {
      outputs: {
        fact: "{{catFact}}"
      }
    }
  }
], ds = [
  {
    id: "e1",
    type: "execution",
    source: "start_1",
    sourceHandle: "default",
    target: "http_1",
    targetHandle: "trigger"
  },
  {
    id: "e2",
    type: "execution",
    source: "http_1",
    sourceHandle: "success",
    target: "log_1",
    targetHandle: "trigger"
  },
  {
    id: "e3",
    type: "execution",
    source: "log_1",
    sourceHandle: "success",
    target: "end_1",
    targetHandle: "trigger"
  }
], ps = {
  id: rs,
  name: is,
  description: ls,
  version: cs,
  nodes: us,
  edges: ds
}, gs = "sample-users-posts", hs = "Users & Posts", fs = "Fetches users from JSONPlaceholder, extracts the first user, then fetches their posts", ms = "2.0.0", ys = [
  {
    id: "start_1",
    type: "start",
    label: "Start",
    data: {
      values: {
        baseUrl: "https://jsonplaceholder.typicode.com"
      }
    }
  },
  {
    id: "http_users",
    type: "http-request",
    label: "Get Users",
    data: {
      method: "GET",
      url: "{{baseUrl}}/users",
      outputs: {
        firstUser: "$.[0].name",
        firstUserId: "$.[0].id",
        firstUserEmail: "$.[0].email",
        totalUsers: "$.length"
      }
    }
  },
  {
    id: "log_user",
    type: "log",
    label: "Log User Info",
    data: {
      message: "Found user: {{firstUser}} ({{firstUserEmail}}), fetching their posts...",
      level: "info"
    }
  },
  {
    id: "http_posts",
    type: "http-request",
    label: "Get User Posts",
    data: {
      method: "GET",
      url: "{{baseUrl}}/posts?userId={{firstUserId}}",
      outputs: {
        firstPostTitle: "$.[0].title",
        firstPostBody: "$.[0].body"
      }
    }
  },
  {
    id: "log_post",
    type: "log",
    label: "Log Post",
    data: {
      message: "Latest post by {{firstUser}}: {{firstPostTitle}}",
      level: "success"
    }
  },
  {
    id: "end_1",
    type: "end",
    label: "End",
    data: {
      outputs: {
        user: "{{firstUser}}",
        email: "{{firstUserEmail}}",
        postTitle: "{{firstPostTitle}}",
        postBody: "{{firstPostBody}}"
      }
    }
  }
], bs = [
  {
    id: "e1",
    type: "execution",
    source: "start_1",
    sourceHandle: "default",
    target: "http_users",
    targetHandle: "trigger"
  },
  {
    id: "e2",
    type: "execution",
    source: "http_users",
    sourceHandle: "success",
    target: "log_user",
    targetHandle: "trigger"
  },
  {
    id: "e3",
    type: "execution",
    source: "log_user",
    sourceHandle: "success",
    target: "http_posts",
    targetHandle: "trigger"
  },
  {
    id: "e4",
    type: "execution",
    source: "http_posts",
    sourceHandle: "success",
    target: "log_post",
    targetHandle: "trigger"
  },
  {
    id: "e5",
    type: "execution",
    source: "log_post",
    sourceHandle: "success",
    target: "end_1",
    targetHandle: "trigger"
  }
], vs = {
  id: gs,
  name: hs,
  description: fs,
  version: ms,
  nodes: ys,
  edges: bs
}, $s = "sample-status-check", ws = "API Status Check", xs = "Calls an API and branches on success/failure using a condition block", ks = "2.0.0", _s = [
  {
    id: "start_1",
    type: "start",
    label: "Start",
    data: {}
  },
  {
    id: "http_1",
    type: "http-request",
    label: "Check API",
    data: {
      method: "GET",
      url: "https://jsonplaceholder.typicode.com/posts/1",
      outputs: {
        postTitle: "$.title",
        postId: "$.id"
      }
    }
  },
  {
    id: "condition_1",
    type: "condition",
    label: "Got Data?",
    data: {
      expression: "statusCode == 200"
    }
  },
  {
    id: "log_ok",
    type: "log",
    label: "Log Success",
    data: {
      message: "API is healthy! Got post: {{postTitle}}",
      level: "success"
    }
  },
  {
    id: "log_fail",
    type: "log",
    label: "Log Failure",
    data: {
      message: "API call failed! Status: {{statusCode}}",
      level: "error"
    }
  },
  {
    id: "end_1",
    type: "end",
    label: "End",
    data: {
      outputs: {
        status: "{{statusCode}}",
        title: "{{postTitle}}"
      }
    }
  }
], Ss = [
  {
    id: "e1",
    type: "execution",
    source: "start_1",
    sourceHandle: "default",
    target: "http_1",
    targetHandle: "trigger"
  },
  {
    id: "e2",
    type: "execution",
    source: "http_1",
    sourceHandle: "success",
    target: "condition_1",
    targetHandle: "trigger"
  },
  {
    id: "e3",
    type: "execution",
    source: "condition_1",
    sourceHandle: "success",
    target: "log_ok",
    targetHandle: "trigger"
  },
  {
    id: "e4",
    type: "execution",
    source: "condition_1",
    sourceHandle: "fail",
    target: "log_fail",
    targetHandle: "trigger"
  },
  {
    id: "e5",
    type: "execution",
    source: "log_ok",
    sourceHandle: "success",
    target: "end_1",
    targetHandle: "trigger"
  },
  {
    id: "e6",
    type: "execution",
    source: "log_fail",
    sourceHandle: "success",
    target: "end_1",
    targetHandle: "trigger"
  },
  {
    id: "e7",
    type: "execution",
    source: "http_1",
    sourceHandle: "fail",
    target: "log_fail",
    targetHandle: "trigger"
  }
], Cs = {
  id: $s,
  name: ws,
  description: xs,
  version: ks,
  nodes: _s,
  edges: Ss
}, Es = "sample-chained-apis", Hs = "Chained Public APIs", Ps = "Chains multiple public APIs: gets a random dog image, a random activity from Bored API, and a random joke - combining results", As = "2.0.0", Bs = [
  {
    id: "start_1",
    type: "start",
    label: "Start",
    data: {}
  },
  {
    id: "http_dog",
    type: "http-request",
    label: "Random Dog Image",
    data: {
      method: "GET",
      url: "https://dog.ceo/api/breeds/image/random",
      outputs: {
        dogImage: "$.message",
        dogStatus: "$.status"
      }
    }
  },
  {
    id: "log_dog",
    type: "log",
    label: "Log Dog",
    data: {
      message: "Dog image: {{dogImage}}",
      level: "info"
    }
  },
  {
    id: "http_joke",
    type: "http-request",
    label: "Random Joke",
    data: {
      method: "GET",
      url: "https://official-joke-api.appspot.com/random_joke",
      outputs: {
        jokeSetup: "$.setup",
        jokePunchline: "$.punchline",
        jokeType: "$.type"
      }
    }
  },
  {
    id: "log_joke",
    type: "log",
    label: "Log Joke",
    data: {
      message: "Joke: {{jokeSetup}} ... {{jokePunchline}}",
      level: "info"
    }
  },
  {
    id: "http_country",
    type: "http-request",
    label: "Get Country Info",
    data: {
      method: "GET",
      url: "https://restcountries.com/v3.1/name/japan?fields=name,capital,population,region",
      outputs: {
        countryName: "$.[0].name.common",
        capital: "$.[0].capital[0]",
        population: "$.[0].population",
        region: "$.[0].region"
      }
    }
  },
  {
    id: "log_country",
    type: "log",
    label: "Log Country",
    data: {
      message: "Country: {{countryName}}, Capital: {{capital}}, Population: {{population}}, Region: {{region}}",
      level: "success"
    }
  },
  {
    id: "var_summary",
    type: "variable",
    label: "Build Summary",
    data: {
      values: {
        summary: "Dog: {{dogImage}} | Joke: {{jokeSetup}} | Country: {{countryName}} ({{capital}})"
      }
    }
  },
  {
    id: "end_1",
    type: "end",
    label: "End",
    data: {
      outputs: {
        dogImage: "{{dogImage}}",
        joke: "{{jokeSetup}} - {{jokePunchline}}",
        country: "{{countryName}}",
        summary: "{{summary}}"
      }
    }
  }
], Ls = [
  {
    id: "e1",
    type: "execution",
    source: "start_1",
    sourceHandle: "default",
    target: "http_dog",
    targetHandle: "trigger"
  },
  {
    id: "e2",
    type: "execution",
    source: "http_dog",
    sourceHandle: "success",
    target: "log_dog",
    targetHandle: "trigger"
  },
  {
    id: "e3",
    type: "execution",
    source: "log_dog",
    sourceHandle: "success",
    target: "http_joke",
    targetHandle: "trigger"
  },
  {
    id: "e4",
    type: "execution",
    source: "http_joke",
    sourceHandle: "success",
    target: "log_joke",
    targetHandle: "trigger"
  },
  {
    id: "e5",
    type: "execution",
    source: "log_joke",
    sourceHandle: "success",
    target: "http_country",
    targetHandle: "trigger"
  },
  {
    id: "e6",
    type: "execution",
    source: "http_country",
    sourceHandle: "success",
    target: "log_country",
    targetHandle: "trigger"
  },
  {
    id: "e7",
    type: "execution",
    source: "log_country",
    sourceHandle: "success",
    target: "var_summary",
    targetHandle: "trigger"
  },
  {
    id: "e8",
    type: "execution",
    source: "var_summary",
    sourceHandle: "success",
    target: "end_1",
    targetHandle: "trigger"
  }
], Os = {
  id: Es,
  name: Hs,
  description: Ps,
  version: As,
  nodes: Bs,
  edges: Ls
}, Ts = "sample-loop-users", Vs = "Loop Over Users", js = "Fetches users from JSONPlaceholder and loops over each one, logging their details", Ds = "2.0.0", Is = [
  {
    id: "start_1",
    type: "start",
    label: "Start",
    data: {}
  },
  {
    id: "http_users",
    type: "http-request",
    label: "Get Users",
    data: {
      method: "GET",
      url: "https://jsonplaceholder.typicode.com/users"
    }
  },
  {
    id: "var_items",
    type: "variable",
    label: "Store Users",
    data: {
      values: {
        users: "{{body}}"
      }
    }
  },
  {
    id: "loop_1",
    type: "loop",
    label: "Each User",
    data: {
      items: "{{users}}"
    }
  },
  {
    id: "log_item",
    type: "log",
    label: "Log User",
    data: {
      message: "#{{loopIndex}} - {{loopItem}}",
      level: "info"
    }
  },
  {
    id: "log_done",
    type: "log",
    label: "Loop Done",
    data: {
      message: "Processed {{loopCount}} users",
      level: "success"
    }
  },
  {
    id: "end_1",
    type: "end",
    label: "End",
    data: {
      outputs: {
        totalUsers: "{{loopCount}}"
      }
    }
  }
], Ns = [
  {
    id: "e1",
    type: "execution",
    source: "start_1",
    sourceHandle: "default",
    target: "http_users",
    targetHandle: "trigger"
  },
  {
    id: "e2",
    type: "execution",
    source: "http_users",
    sourceHandle: "success",
    target: "var_items",
    targetHandle: "trigger"
  },
  {
    id: "e3",
    type: "execution",
    source: "var_items",
    sourceHandle: "success",
    target: "loop_1",
    targetHandle: "trigger"
  },
  {
    id: "e4",
    type: "execution",
    source: "loop_1",
    sourceHandle: "each",
    target: "log_item",
    targetHandle: "trigger"
  },
  {
    id: "e5",
    type: "execution",
    source: "loop_1",
    sourceHandle: "done",
    target: "log_done",
    targetHandle: "trigger"
  },
  {
    id: "e6",
    type: "execution",
    source: "log_done",
    sourceHandle: "success",
    target: "end_1",
    targetHandle: "trigger"
  }
], Fs = {
  id: Ts,
  name: Vs,
  description: js,
  version: Ds,
  nodes: Is,
  edges: Ns
}, Rs = "sample-evaluate-delay-switch", Us = "Evaluate, Delay & Switch", Ms = "Fetches a post, evaluates its ID, waits 1 second, then branches with a condition", Ws = "2.0.0", zs = [
  {
    id: "start_1",
    type: "start",
    label: "Start",
    data: {
      values: {
        postId: "3"
      }
    }
  },
  {
    id: "http_1",
    type: "http-request",
    label: "Get Post",
    data: {
      method: "GET",
      url: "https://jsonplaceholder.typicode.com/posts/{{postId}}",
      outputs: {
        title: "$.title",
        userId: "$.userId"
      }
    }
  },
  {
    id: "eval_1",
    type: "evaluate",
    label: "Double User ID",
    data: {
      expression: "{{userId}} * 2"
    }
  },
  {
    id: "log_eval",
    type: "log",
    label: "Log Result",
    data: {
      message: "userId={{userId}}, doubled={{result}}",
      level: "info"
    }
  },
  {
    id: "delay_1",
    type: "delay",
    label: "Wait 1s",
    data: {
      duration: "1",
      unit: "seconds"
    }
  },
  {
    id: "condition_1",
    type: "condition",
    label: "Result > 5?",
    data: {
      expression: "result > 5"
    }
  },
  {
    id: "log_high",
    type: "log",
    label: "High Value",
    data: {
      message: "Result {{result}} is greater than 5",
      level: "success"
    }
  },
  {
    id: "log_low",
    type: "log",
    label: "Low Value",
    data: {
      message: "Result {{result}} is 5 or less",
      level: "warning"
    }
  },
  {
    id: "end_1",
    type: "end",
    label: "End",
    data: {
      outputs: {
        title: "{{title}}",
        originalUserId: "{{userId}}",
        doubled: "{{result}}"
      }
    }
  }
], Js = [
  {
    id: "e1",
    type: "execution",
    source: "start_1",
    sourceHandle: "default",
    target: "http_1",
    targetHandle: "trigger"
  },
  {
    id: "e2",
    type: "execution",
    source: "http_1",
    sourceHandle: "success",
    target: "eval_1",
    targetHandle: "trigger"
  },
  {
    id: "e3",
    type: "execution",
    source: "eval_1",
    sourceHandle: "success",
    target: "log_eval",
    targetHandle: "trigger"
  },
  {
    id: "e4",
    type: "execution",
    source: "log_eval",
    sourceHandle: "success",
    target: "delay_1",
    targetHandle: "trigger"
  },
  {
    id: "e5",
    type: "execution",
    source: "delay_1",
    sourceHandle: "success",
    target: "condition_1",
    targetHandle: "trigger"
  },
  {
    id: "e6",
    type: "execution",
    source: "condition_1",
    sourceHandle: "success",
    target: "log_high",
    targetHandle: "trigger"
  },
  {
    id: "e7",
    type: "execution",
    source: "condition_1",
    sourceHandle: "fail",
    target: "log_low",
    targetHandle: "trigger"
  },
  {
    id: "e8",
    type: "execution",
    source: "log_high",
    sourceHandle: "success",
    target: "end_1",
    targetHandle: "trigger"
  },
  {
    id: "e9",
    type: "execution",
    source: "log_low",
    sourceHandle: "success",
    target: "end_1",
    targetHandle: "trigger"
  }
], qs = {
  id: Rs,
  name: Us,
  description: Ms,
  version: Ws,
  nodes: zs,
  edges: Js
}, Gs = "sample-file-stream", Ys = "File Download & Stream Processing", Xs = "Downloads a small public CSV (continent codes, 7 rows), reads it line by line with FileStreamReader, accumulates the lines with FileStreamWriter, and logs the result. Demonstrates all four file blocks.", Ks = "2.0.0", Zs = [
  {
    id: "start_1",
    type: "start",
    label: "Start",
    data: {}
  },
  {
    id: "download_1",
    type: "file-download",
    label: "Download CSV",
    data: {
      url: "https://raw.githubusercontent.com/datasets/continent-codes/master/data/continent-codes.csv",
      outputVar: "csvData",
      encoding: "text",
      saveAs: !1
    }
  },
  {
    id: "log_downloaded",
    type: "log",
    label: "Log Download",
    data: {
      message: "Downloaded {{fileName}} ({{fileSize}} bytes)",
      level: "info"
    }
  },
  {
    id: "reader_1",
    type: "file-stream-reader",
    label: "Read Lines",
    data: {
      source: "csvData",
      mode: "lines",
      chunkSize: 1,
      outputVar: "line"
    }
  },
  {
    id: "log_line",
    type: "log",
    label: "Log Line",
    data: {
      message: "[{{chunkIndex}}] {{line}}",
      level: "debug"
    }
  },
  {
    id: "writer_1",
    type: "file-stream-writer",
    label: "Collect Lines",
    data: {
      streamVar: "processedLines",
      value: "{{line}}",
      separator: "\\n"
    }
  },
  {
    id: "log_done",
    type: "log",
    label: "Stream Done",
    data: {
      message: "Processed {{chunkCount}} lines. Result stored in processedLines.",
      level: "success"
    }
  },
  {
    id: "end_1",
    type: "end",
    label: "End",
    data: {
      outputs: {
        lineCount: "{{chunkCount}}",
        result: "{{processedLines}}"
      }
    }
  }
], Qs = [
  {
    id: "e1",
    type: "execution",
    source: "start_1",
    sourceHandle: "default",
    target: "download_1",
    targetHandle: "trigger"
  },
  {
    id: "e2",
    type: "execution",
    source: "download_1",
    sourceHandle: "success",
    target: "log_downloaded",
    targetHandle: "trigger"
  },
  {
    id: "e3",
    type: "execution",
    source: "log_downloaded",
    sourceHandle: "success",
    target: "reader_1",
    targetHandle: "trigger"
  },
  {
    id: "e4",
    type: "execution",
    source: "reader_1",
    sourceHandle: "each",
    target: "log_line",
    targetHandle: "trigger"
  },
  {
    id: "e5",
    type: "execution",
    source: "log_line",
    sourceHandle: "success",
    target: "writer_1",
    targetHandle: "trigger"
  },
  {
    id: "e6",
    type: "execution",
    source: "reader_1",
    sourceHandle: "done",
    target: "log_done",
    targetHandle: "trigger"
  },
  {
    id: "e7",
    type: "execution",
    source: "log_done",
    sourceHandle: "success",
    target: "end_1",
    targetHandle: "trigger"
  }
], en = {
  id: Gs,
  name: Ys,
  description: Xs,
  version: Ks,
  nodes: Zs,
  edges: Qs
}, tn = "sample-large-csv", sn = "Large CSV — World Cities (26k rows)", nn = "Downloads world-cities.csv (26,000+ rows), processes it in batches of 100 lines (skip=1 to skip header), accumulates the raw data, and logs summary. Demonstrates large-file handling with FileStreamReader chunkSize + skip + limit fields. No per-line logging — only batch progress and final summary.", on = "2.0.0", an = [
  {
    id: "start_1",
    type: "start",
    label: "Start",
    data: {}
  },
  {
    id: "download_1",
    type: "file-download",
    label: "Download world-cities.csv",
    data: {
      url: "https://raw.githubusercontent.com/datasets/world-cities/master/data/world-cities.csv",
      outputVar: "csvData",
      encoding: "text",
      saveAs: !1
    }
  },
  {
    id: "log_downloaded",
    type: "log",
    label: "Log Download Info",
    data: {
      message: "Downloaded {{fileName}} — {{fileSize}} bytes. Starting batch processing...",
      level: "info"
    }
  },
  {
    id: "var_counter",
    type: "variable",
    label: "Init Counter",
    data: {
      values: {
        cityCount: "0"
      }
    }
  },
  {
    id: "reader_1",
    type: "file-stream-reader",
    label: "Read 100-line Batches",
    data: {
      source: "csvData",
      mode: "lines",
      chunkSize: 100,
      skip: 1,
      limit: 0,
      outputVar: "batch"
    }
  },
  {
    id: "eval_count",
    type: "evaluate",
    label: "Count Cities",
    data: {
      expression: "return (parseInt('{{cityCount}}') || 0) + ('{{batch}}'.split('\\n').filter(l => l.trim()).length);",
      outputVariable: "cityCount"
    }
  },
  {
    id: "log_done",
    type: "log",
    label: "Done",
    data: {
      message: "Processed {{chunkCount}} batches (100 lines each). Total cities counted: {{cityCount}}",
      level: "success"
    }
  },
  {
    id: "end_1",
    type: "end",
    label: "End",
    data: {
      outputs: {
        cityCount: "{{cityCount}}",
        batchCount: "{{chunkCount}}"
      }
    }
  }
], rn = [
  {
    id: "e1",
    type: "execution",
    source: "start_1",
    sourceHandle: "default",
    target: "download_1",
    targetHandle: "trigger"
  },
  {
    id: "e2",
    type: "execution",
    source: "download_1",
    sourceHandle: "success",
    target: "log_downloaded",
    targetHandle: "trigger"
  },
  {
    id: "e3",
    type: "execution",
    source: "log_downloaded",
    sourceHandle: "success",
    target: "var_counter",
    targetHandle: "trigger"
  },
  {
    id: "e4",
    type: "execution",
    source: "var_counter",
    sourceHandle: "success",
    target: "reader_1",
    targetHandle: "trigger"
  },
  {
    id: "e5",
    type: "execution",
    source: "reader_1",
    sourceHandle: "each",
    target: "eval_count",
    targetHandle: "trigger"
  },
  {
    id: "e6",
    type: "execution",
    source: "reader_1",
    sourceHandle: "done",
    target: "log_done",
    targetHandle: "trigger"
  },
  {
    id: "e7",
    type: "execution",
    source: "log_done",
    sourceHandle: "success",
    target: "end_1",
    targetHandle: "trigger"
  }
], ln = {
  id: tn,
  name: sn,
  description: nn,
  version: on,
  nodes: an,
  edges: rn
}, $t = [
  {
    id: "1-cat-fact",
    label: "Cat Fact API",
    description: "Simple GET + JSONPath extraction",
    data: ps
  },
  {
    id: "2-users-and-posts",
    label: "Users & Posts",
    description: "Chained API calls with variable passing",
    data: vs
  },
  {
    id: "3-status-check",
    label: "Status Check",
    description: "Branch on HTTP status code",
    data: Cs
  },
  {
    id: "4-chained-apis",
    label: "Chained Public APIs",
    description: "Dog image, joke, and country combined",
    data: Os
  },
  {
    id: "5-loop-users",
    label: "Loop Over Users",
    description: "Iterate a fetched array with Loop block",
    data: Fs
  },
  {
    id: "6-evaluate-delay",
    label: "Evaluate, Delay & Switch",
    description: "Expressions, wait, and multi-branch",
    data: qs
  },
  {
    id: "7-file-stream",
    label: "File Download & Stream",
    description: "CSV download, line-by-line reader",
    data: en
  },
  {
    id: "8-large-csv",
    label: "Large CSV (26k rows)",
    description: "Batch-processing a big file safely",
    data: ln
  }
], Me = Symbol("store-raw"), oe = Symbol("store-node"), J = Symbol("store-has"), Tt = Symbol("store-self");
function Vt(t) {
  let e = t[Z];
  if (!e && (Object.defineProperty(t, Z, {
    value: e = new Proxy(t, dn)
  }), !Array.isArray(t))) {
    const s = Object.keys(t), n = Object.getOwnPropertyDescriptors(t), r = Object.getPrototypeOf(t), o = r !== null && t !== null && typeof t == "object" && !Array.isArray(t) && r !== Object.prototype;
    if (o) {
      const i = Object.getOwnPropertyDescriptors(r);
      s.push(...Object.keys(i)), Object.assign(n, i);
    }
    for (let i = 0, a = s.length; i < a; i++) {
      const l = s[i];
      o && l === "constructor" || n[l].get && Object.defineProperty(t, l, {
        configurable: !0,
        enumerable: n[l].enumerable,
        get: n[l].get.bind(e)
      });
    }
  }
  return e;
}
function fe(t) {
  let e;
  return t != null && typeof t == "object" && (t[Z] || !(e = Object.getPrototypeOf(t)) || e === Object.prototype || Array.isArray(t));
}
function me(t, e = /* @__PURE__ */ new Set()) {
  let s, n, r, o;
  if (s = t != null && t[Me]) return s;
  if (!fe(t) || e.has(t)) return t;
  if (Array.isArray(t)) {
    Object.isFrozen(t) ? t = t.slice(0) : e.add(t);
    for (let i = 0, a = t.length; i < a; i++)
      r = t[i], (n = me(r, e)) !== r && (t[i] = n);
  } else {
    Object.isFrozen(t) ? t = Object.assign({}, t) : e.add(t);
    const i = Object.keys(t), a = Object.getOwnPropertyDescriptors(t);
    for (let l = 0, c = i.length; l < c; l++)
      o = i[l], !a[o].get && (r = t[o], (n = me(r, e)) !== r && (t[o] = n));
  }
  return t;
}
function We(t, e) {
  let s = t[e];
  return s || Object.defineProperty(t, e, {
    value: s = /* @__PURE__ */ Object.create(null)
  }), s;
}
function Se(t, e, s) {
  if (t[e]) return t[e];
  const [n, r] = L(s, {
    equals: !1,
    internal: !0
  });
  return n.$ = r, t[e] = n;
}
function cn(t, e) {
  const s = Reflect.getOwnPropertyDescriptor(t, e);
  return !s || s.get || !s.configurable || e === Z || e === oe || (delete s.value, delete s.writable, s.get = () => t[Z][e]), s;
}
function jt(t) {
  rt() && Se(We(t, oe), Tt)();
}
function un(t) {
  return jt(t), Reflect.ownKeys(t);
}
const dn = {
  get(t, e, s) {
    if (e === Me) return t;
    if (e === Z) return s;
    if (e === je)
      return jt(t), s;
    const n = We(t, oe), r = n[e];
    let o = r ? r() : t[e];
    if (e === oe || e === J || e === "__proto__") return o;
    if (!r) {
      const i = Object.getOwnPropertyDescriptor(t, e);
      rt() && (typeof o != "function" || t.hasOwnProperty(e)) && !(i && i.get) && (o = Se(n, e, o)());
    }
    return fe(o) ? Vt(o) : o;
  },
  has(t, e) {
    return e === Me || e === Z || e === je || e === oe || e === J || e === "__proto__" ? !0 : (rt() && Se(We(t, J), e)(), e in t);
  },
  set() {
    return !0;
  },
  deleteProperty() {
    return !0;
  },
  ownKeys: un,
  getOwnPropertyDescriptor: cn
};
function ye(t, e, s, n = !1) {
  if (e === "__proto__" || !n && t[e] === s) return;
  const r = t[e], o = t.length;
  s === void 0 ? (delete t[e], t[J] && t[J][e] && r !== void 0 && t[J][e].$()) : (t[e] = s, t[J] && t[J][e] && r === void 0 && t[J][e].$());
  let i = We(t, oe), a;
  if ((a = Se(i, e, r)) && a.$(() => s), Array.isArray(t) && t.length !== o) {
    for (let l = t.length; l < o; l++) (a = i[l]) && a.$();
    (a = Se(i, "length", o)) && a.$(t.length);
  }
  (a = i[Tt]) && a.$();
}
function Dt(t, e) {
  const s = Object.keys(e);
  for (let n = 0; n < s.length; n += 1) {
    const r = s[n];
    It(r) || ye(t, r, e[r]);
  }
}
function It(t) {
  return t === "__proto__" || t === "constructor" || t === "prototype";
}
function pn(t, e) {
  if (typeof e == "function" && (e = e(t)), e = me(e), Array.isArray(e)) {
    if (t === e) return;
    let s = 0, n = e.length;
    for (; s < n; s++) {
      const r = e[s];
      t[s] !== r && ye(t, s, r);
    }
    ye(t, "length", n);
  } else Dt(t, e);
}
function xe(t, e, s = []) {
  let n, r = t;
  if (e.length > 1) {
    n = e.shift();
    const i = typeof n, a = Array.isArray(t);
    if (i === "string" && (n === "__proto__" || e.length > 1 && It(n)))
      return;
    if (Array.isArray(n)) {
      for (let l = 0; l < n.length; l++)
        xe(t, [n[l]].concat(e), s);
      return;
    } else if (a && i === "function") {
      for (let l = 0; l < t.length; l++)
        n(t[l], l) && xe(t, [l].concat(e), s);
      return;
    } else if (a && i === "object") {
      const {
        from: l = 0,
        to: c = t.length - 1,
        by: g = 1
      } = n;
      for (let h = l; h <= c; h += g)
        xe(t, [h].concat(e), s);
      return;
    } else if (e.length > 1) {
      xe(t[n], e, [n].concat(s));
      return;
    }
    r = t[n], s = [n].concat(s);
  }
  let o = e[0];
  typeof o == "function" && (o = o(r, s), o === r) || n === void 0 && o == null || (o = me(o), n === void 0 || fe(r) && fe(o) && !Array.isArray(o) ? Dt(r, o) : ye(t, n, o));
}
function gt(...[t, e]) {
  const s = me(t || {}), n = Array.isArray(s), r = Vt(s);
  function o(...i) {
    ue(() => {
      n && i.length === 1 ? pn(s, i[0]) : xe(s, i);
    });
  }
  return [r, o];
}
const ze = /* @__PURE__ */ new WeakMap(), Nt = {
  get(t, e) {
    if (e === Me) return t;
    const s = t[e];
    if (e === Z || e === je || e === oe || e === J || e === "__proto__") return s;
    let n;
    return fe(s) ? ze.get(s) || (ze.set(s, n = new Proxy(s, Nt)), n) : s;
  },
  set(t, e, s) {
    return ye(t, e, me(s)), !0;
  },
  deleteProperty(t, e) {
    return ye(t, e, void 0, !0), !0;
  }
};
function M(t) {
  return (e) => {
    if (fe(e)) {
      let s;
      (s = ze.get(e)) || ze.set(e, s = new Proxy(e, Nt)), t(s);
    }
    return e;
  };
}
var $ = /* @__PURE__ */ ((t) => (t.Start = "start", t.End = "end", t.Variable = "variable", t.Evaluate = "evaluate", t.Log = "log", t.HttpRequest = "http-request", t.WebhookTrigger = "webhook-trigger", t.Switch = "switch", t.Loop = "loop", t.Delay = "delay", t.BatchProcess = "batch-process", t.SubWorkflow = "sub-workflow", t.Condition = "condition", t.FileDownload = "file-download", t.FileUpload = "file-upload", t.FileStreamWriter = "file-stream-writer", t.FileStreamReader = "file-stream-reader", t))($ || {}), Oe = /* @__PURE__ */ ((t) => (t.Execution = "execution", t.Data = "data", t))(Oe || {});
const gn = {
  start: "#262626",
  end: "#2e2e2e",
  "http-request": "#333333",
  variable: "#383838",
  switch: "#2a2a2a",
  condition: "#303030",
  delay: "#353535",
  log: "#2c2c2c",
  evaluate: "#323232",
  loop: "#2e2e2e",
  "batch-process": "#343434",
  "sub-workflow": "#2a2a2a",
  "webhook-trigger": "#363636",
  "file-download": "#2f2f2f",
  "file-upload": "#353030",
  "file-stream-writer": "#303535",
  "file-stream-reader": "#2a3030"
}, [R, U] = gt({}), [Ce, $e] = gt({}), [ne, Te] = L(null), [ht, ge] = L(null), [q, he] = L(1), [ft, ke] = L({ x: 0, y: 0 }), [Ee, He] = L("hand"), [Ft, Rt] = L("idle"), [hn, Je] = L(null), [fn, Ut] = L({}), [mn, ct] = L(null), [qe, mt] = L("system"), yn = 8e3, le = yn / 2;
let bn = 0;
function Mt(t = "block") {
  return `${t}_${Date.now()}_${++bn}`;
}
const vn = {
  [$.Start]: { inputs: [], outputs: [{ name: "default", type: "execution", label: "out" }] },
  [$.End]: { inputs: [{ name: "trigger", type: "execution" }], outputs: [] },
  [$.HttpRequest]: { inputs: [{ name: "trigger", type: "execution" }], outputs: [{ name: "success", type: "execution" }, { name: "fail", type: "execution" }] },
  [$.Variable]: { inputs: [{ name: "trigger", type: "execution" }], outputs: [{ name: "success", type: "execution", label: "out" }] },
  [$.Log]: { inputs: [{ name: "trigger", type: "execution" }], outputs: [{ name: "success", type: "execution", label: "out" }] },
  [$.Delay]: { inputs: [{ name: "trigger", type: "execution" }], outputs: [{ name: "success", type: "execution", label: "out" }] },
  [$.Condition]: { inputs: [{ name: "trigger", type: "execution" }], outputs: [{ name: "success", type: "execution", label: "true" }, { name: "fail", type: "execution", label: "false" }] },
  [$.Switch]: { inputs: [{ name: "trigger", type: "execution" }], outputs: [{ name: "default", type: "execution" }] },
  [$.Loop]: { inputs: [{ name: "trigger", type: "execution" }], outputs: [{ name: "each", type: "execution" }, { name: "done", type: "execution" }] },
  [$.Evaluate]: { inputs: [{ name: "trigger", type: "execution" }], outputs: [{ name: "success", type: "execution", label: "out" }] },
  [$.BatchProcess]: { inputs: [{ name: "trigger", type: "execution" }], outputs: [{ name: "each", type: "execution" }, { name: "done", type: "execution" }] },
  [$.SubWorkflow]: { inputs: [{ name: "trigger", type: "execution" }], outputs: [{ name: "success", type: "execution" }, { name: "fail", type: "execution" }] },
  [$.WebhookTrigger]: { inputs: [], outputs: [{ name: "default", type: "execution", label: "out" }] },
  [$.FileDownload]: { inputs: [{ name: "trigger", type: "execution" }], outputs: [{ name: "success", type: "execution" }, { name: "fail", type: "execution" }] },
  [$.FileUpload]: { inputs: [{ name: "trigger", type: "execution" }], outputs: [{ name: "success", type: "execution" }, { name: "fail", type: "execution" }] },
  [$.FileStreamWriter]: { inputs: [{ name: "trigger", type: "execution" }], outputs: [{ name: "out", type: "execution" }] },
  [$.FileStreamReader]: { inputs: [{ name: "trigger", type: "execution" }], outputs: [{ name: "each", type: "execution" }, { name: "done", type: "execution" }] }
}, $n = {
  [$.Start]: "Start",
  [$.End]: "End",
  [$.Variable]: "Variable",
  [$.Log]: "Log",
  [$.Evaluate]: "Evaluate",
  [$.HttpRequest]: "HTTP Request",
  [$.WebhookTrigger]: "Webhook Trigger",
  [$.Switch]: "Switch",
  [$.Loop]: "Loop",
  [$.Delay]: "Delay",
  [$.BatchProcess]: "Batch",
  [$.SubWorkflow]: "Sub Workflow",
  [$.Condition]: "Condition",
  [$.FileDownload]: "File Download",
  [$.FileUpload]: "File Upload",
  [$.FileStreamWriter]: "Stream Writer",
  [$.FileStreamReader]: "Stream Reader"
};
function et(t, e, s) {
  const n = vn[t] ?? { inputs: [{ name: "trigger", type: "execution" }], outputs: [{ name: "success", type: "execution" }] };
  return {
    id: Mt(),
    type: t,
    name: s ?? $n[t] ?? String(t),
    position: e,
    width: 220,
    height: 120,
    selected: !1,
    inputPorts: n.inputs,
    outputPorts: n.outputs,
    fields: [],
    fieldValues: {},
    hasBreakpoint: !1,
    executionState: null
  };
}
const A = {
  // Block CRUD
  addBlock(t) {
    U(t.id, t);
  },
  updateBlockField(t, e, s) {
    U(M((n) => {
      n[t] && (n[t].fieldValues[e] = s);
    }));
  },
  updateBlockFieldValues(t, e) {
    U(M((s) => {
      s[t] && (s[t].fieldValues = e);
    }));
  },
  updateBlockName(t, e) {
    U(M((s) => {
      s[t] && (s[t].name = e);
    }));
  },
  moveBlock(t, e) {
    U(M((s) => {
      s[t] && (s[t].position = { ...e });
    }));
  },
  selectBlock(t) {
    ue(() => {
      U(M((e) => {
        Object.keys(e).forEach((s) => {
          e[s].selected = s === t;
        });
      })), Te(t), t && ge(t);
    });
  },
  deleteBlock(t) {
    ue(() => {
      U(M((e) => {
        delete e[t];
      })), $e(M((e) => {
        Object.keys(e).forEach((s) => {
          const n = e[s];
          (n.sourceBlockId === t || n.targetBlockId === t) && delete e[s];
        });
      })), ne() === t && Te(null), ht() === t && ge(null);
    });
  },
  setBlockHighlight(t, e) {
    U(M((s) => {
      s[t] && (s[t].executionState = e === "clear" ? null : e);
    }));
  },
  clearAllHighlights() {
    U(M((t) => {
      Object.keys(t).forEach((e) => {
        t[e].executionState = null;
      });
    }));
  },
  toggleBreakpoint(t) {
    U(M((e) => {
      e[t] && (e[t].hasBreakpoint = !e[t].hasBreakpoint);
    }));
  },
  // Connection CRUD
  addConnection(t) {
    Object.values(Ce).some(
      (s) => s.sourceBlockId === t.sourceBlockId && s.sourcePortName === t.sourcePortName && s.targetBlockId === t.targetBlockId && s.targetPortName === t.targetPortName
    ) || $e(t.id, t);
  },
  deleteConnection(t) {
    $e(M((e) => {
      delete e[t];
    }));
  },
  // Workflow import/export
  clearAll() {
    ue(() => {
      U({}), $e({}), Te(null), ge(null), Je(null);
    });
  },
  loadFromSchema(t) {
    this.clearAll();
    const e = t.nodes ?? [], s = t.edges ?? [];
    let n = le - 400, r = le;
    const o = 280;
    ue(() => {
      e.forEach((a) => {
        const l = et(
          a.type,
          { x: n, y: r },
          a.label
        );
        l.id = a.id, a.data && Object.entries(a.data).forEach(([c, g]) => {
          l.fieldValues[c] = g ?? "";
        }), U(l.id, l), n += o, n > le + 1600 && (n = le - 400, r += 180);
      }), s.forEach((a) => {
        const l = {
          id: a.id,
          type: a.type,
          sourceBlockId: a.source,
          sourcePortName: a.sourceHandle,
          targetBlockId: a.target,
          targetPortName: a.targetHandle
        };
        $e(l.id, l);
      });
    });
    const i = Object.values(R);
    if (i.length > 0) {
      const a = Math.min(...i.map((y) => y.position.x)), l = Math.max(...i.map((y) => y.position.x + y.width)), c = Math.min(...i.map((y) => y.position.y)), g = Math.max(...i.map((y) => y.position.y + y.height)), h = (a + l) / 2, v = (c + g) / 2, f = q();
      ke({ x: (le - h) * f, y: (le - v) * f });
    }
  },
  toSchema() {
    return {
      id: Mt("workflow"),
      name: "Workflow",
      version: "2.0.0",
      nodes: Object.values(R).map((t) => ({
        id: t.id,
        type: t.type,
        label: t.name,
        data: { ...t.fieldValues }
      })),
      edges: Object.values(Ce).map((t) => ({
        id: t.id,
        type: t.type,
        source: t.sourceBlockId,
        sourceHandle: t.sourcePortName,
        target: t.targetBlockId,
        targetHandle: t.targetPortName
      }))
    };
  }
}, wt = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  blocks: R,
  connections: Ce,
  createDefaultBlock: et,
  currentTheme: qe,
  executionState: Ft,
  pan: ft,
  runtimeBlockOutputs: fn,
  runtimeCurrentBlock: mn,
  runtimeVars: hn,
  selectedBlockId: ne,
  setCurrentTheme: mt,
  setExecutionState: Rt,
  setPan: ke,
  setRuntimeBlockOutputs: Ut,
  setRuntimeCurrentBlock: ct,
  setRuntimeVars: Je,
  setSelectedBlockId: Te,
  setSettingsPanelBlockId: ge,
  setTool: He,
  setZoom: he,
  settingsPanelBlockId: ht,
  storeActions: A,
  tool: Ee,
  zoom: q
}, Symbol.toStringTag, { value: "Module" }));
var wn = /* @__PURE__ */ k('<div id=settings-dropdown-wrap style=position:relative><button class=navbar-btn title=Settings><svg width=17 height=17 viewBox="0 0 24 24"fill=none stroke=currentColor stroke-width=2><circle cx=12 cy=12 r=3></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg></button><div><div class=settings-section-title>Theme</div><div class=theme-options>'), xn = /* @__PURE__ */ k("<button><span style=font-size:16px></span><span>");
const kn = () => {
  const [t, e] = L(!1), s = (r) => {
    const o = document.getElementById("settings-dropdown-wrap");
    t() && o && !o.contains(r.target) && e(!1);
  };
  Ze(() => document.addEventListener("click", s)), Qe(() => document.removeEventListener("click", s));
  const n = [{
    id: "light",
    label: "Light",
    icon: "☀"
  }, {
    id: "dark",
    label: "Dark",
    icon: "🌙"
  }, {
    id: "system",
    label: "Auto",
    icon: "💻"
  }];
  return (() => {
    var r = wn(), o = r.firstChild, i = o.nextSibling, a = i.firstChild, l = a.nextSibling;
    return o.$$click = (c) => {
      c.stopPropagation(), e((g) => !g);
    }, w(l, () => n.map((c) => (() => {
      var g = xn(), h = g.firstChild, v = h.nextSibling;
      return g.$$click = () => {
        mt(c.id), e(!1);
      }, w(h, () => c.icon), w(v, () => c.label), _(() => D(g, `theme-option${qe() === c.id ? " active" : ""}`)), g;
    })())), _(() => D(i, `settings-dropdown${t() ? " open" : ""}`)), r;
  })();
};
ee(["click"]);
let _n = 0;
const [st, Wt] = gt([]), [Sn, Cn] = L(!1), [xt, Ve] = L(!1), Ge = {
  clear() {
    Wt([]);
  },
  expand() {
    Ve(!0);
  },
  collapse() {
    Ve(!1);
  },
  toggle() {
    Ve((t) => !t);
  }
};
function G(t, e, s) {
  const r = (/* @__PURE__ */ new Date()).toLocaleTimeString();
  Wt(M((o) => {
    o.length > 2e3 && o.splice(0, o.length - 1800), o.push({ id: _n++, ts: r, level: t, message: e, blockId: s });
  }));
}
const En = {
  log(t, e) {
    G(t, e);
  },
  logHttpRequest(t, e) {
    G("info", `→ ${t} ${e}`);
  },
  logHttpResponse(t, e) {
    G(t < 400 ? "success" : "error", `← ${t} ${e}`);
  },
  logBlockStart(t, e, s) {
    G("debug", `  Executing: [${s}] ${e}`, t);
  },
  logBlockEnd(t, e, s, n) {
    G(s ? "success" : "error", `  ${s ? "✓" : "✗"} ${e} (${n}ms)`, t);
  },
  logVariable(t, e) {
    const s = typeof e == "object" ? JSON.stringify(e).substring(0, 120) : String(e);
    G("debug", `  ${t} = ${s}`);
  },
  logMessage(t, e) {
    G(t, e);
  },
  logWorkflowStart(t) {
    G("info", `▶ Starting workflow: ${t}`);
  },
  logWorkflowEnd(t, e) {
    G(
      t ? "success" : "error",
      `${t ? "✓" : "✗"} Workflow ${t ? "completed" : "failed"} in ${(e / 1e3).toFixed(2)}s`
    );
  },
  setRunning(t) {
    Cn(t);
  },
  expand() {
    Ve(!0);
  }
};
var Hn = /* @__PURE__ */ k('<a class=navbar-brand><svg width=22 height=22 viewBox="0 0 24 24"fill=none><path d="M12 2L2 7V17L12 22L22 17V7L12 2Z"fill=var(--accent) opacity=0.25></path><path d="M12 2L2 7V17L12 22L22 17V7L12 2Z"stroke=var(--accent) stroke-width=1.8 fill=none></path><circle cx=12 cy=12 r=2.8 fill=var(--accent)></circle></svg>SiyeFlow Designer'), Pn = /* @__PURE__ */ k('<div class=navbar-brand><svg width=22 height=22 viewBox="0 0 24 24"fill=none><path d="M12 2L2 7V17L12 22L22 17V7L12 2Z"fill=var(--accent) opacity=0.25></path><path d="M12 2L2 7V17L12 22L22 17V7L12 2Z"stroke=var(--accent) stroke-width=1.8 fill=none></path><circle cx=12 cy=12 r=2.8 fill=var(--accent)></circle></svg>SiyeFlow Designer'), An = /* @__PURE__ */ k('<header class=navbar><div class=navbar-actions><button class=navbar-btn title="Import workflow"><svg width=17 height=17 viewBox="0 0 24 24"fill=none stroke=currentColor stroke-width=2 stroke-linecap=round stroke-linejoin=round><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1=12 y1=3 x2=12 y2=15></line></svg></button><button class=navbar-btn title="Export workflow"><svg width=17 height=17 viewBox="0 0 24 24"fill=none stroke=currentColor stroke-width=2 stroke-linecap=round stroke-linejoin=round><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1=12 y1=15 x2=12 y2=3></line></svg></button><div class=navbar-sep></div><div class=samples-wrapper id=samples-wrapper style=position:relative><button class="samples-trigger navbar-btn"style="width:auto;gap:5px;padding:0 10px;font-size:12px;font-weight:500"><svg width=13 height=13 viewBox="0 0 24 24"fill=none stroke=currentColor stroke-width=2 stroke-linecap=round stroke-linejoin=round><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>Try a sample<svg class=chevron width=11 height=11 viewBox="0 0 24 24"fill=none stroke=currentColor stroke-width=2.5 stroke-linecap=round stroke-linejoin=round><polyline points="6 9 12 15 18 9"></polyline></svg></button><div></div></div><div class=navbar-sep>'), Bn = /* @__PURE__ */ k("<button class=samples-item><span class=sample-label></span><span class=sample-desc>");
const Ln = (t) => {
  const [e, s] = L(!1), n = (l) => {
    const c = document.getElementById("samples-wrapper");
    e() && c && !c.contains(l.target) && s(!1);
  };
  Ze(() => document.addEventListener("click", n)), Qe(() => document.removeEventListener("click", n));
  const r = (l) => {
    const c = $t.find((g) => g.id === l);
    c && (Ge.clear(), A.loadFromSchema(c.data), s(!1));
  }, o = () => {
    const l = document.createElement("input");
    l.type = "file", l.accept = ".json", l.onchange = () => {
      var h;
      const c = (h = l.files) == null ? void 0 : h[0];
      if (!c) return;
      const g = new FileReader();
      g.onload = (v) => {
        var f;
        try {
          const y = JSON.parse((f = v.target) == null ? void 0 : f.result);
          A.loadFromSchema(y);
        } catch {
          alert("Invalid workflow JSON");
        }
      }, g.readAsText(c);
    }, l.click();
  }, i = () => {
    const l = A.toSchema(), c = new Blob([JSON.stringify(l, null, 2)], {
      type: "application/json"
    }), g = URL.createObjectURL(c), h = document.createElement("a");
    h.href = g, h.download = "workflow.json", h.click(), URL.revokeObjectURL(g);
  }, a = () => t.homeUrl ? (() => {
    var l = Hn();
    return _(() => C(l, "href", t.homeUrl)), l;
  })() : Pn();
  return (() => {
    var l = An(), c = l.firstChild, g = c.firstChild, h = g.nextSibling, v = h.nextSibling, f = v.nextSibling, y = f.firstChild, u = y.firstChild, p = u.nextSibling, d = p.nextSibling, m = y.nextSibling;
    return f.nextSibling, w(l, H(a, {}), c), g.$$click = o, h.$$click = i, y.$$click = (b) => {
      b.stopPropagation(), s((x) => !x);
    }, w(m, () => $t.map((b) => (() => {
      var x = Bn(), S = x.firstChild, E = S.nextSibling;
      return x.$$click = () => r(b.id), w(S, () => b.label), w(E, () => b.description), x;
    })())), w(c, H(kn, {}), null), _((b) => {
      var x = e(), S = e() ? "transform:rotate(180deg)" : "", E = `samples-menu${e() ? " open" : ""}`;
      return x !== b.e && C(y, "aria-expanded", b.e = x), b.t = Ot(d, S, b.t), E !== b.a && D(m, b.a = E), b;
    }, {
      e: void 0,
      t: void 0,
      a: void 0
    }), l;
  })();
};
ee(["click"]);
var On = /* @__PURE__ */ k('<aside class=palette><div class=palette-tabs><button>Blocks</button><button>API</button></div><div class=palette-search><input class=search-input type=text placeholder="Search blocks…">'), Tn = /* @__PURE__ */ k("<div class=palette-body>"), Vn = /* @__PURE__ */ k("<div class=palette-category-label>"), jn = /* @__PURE__ */ k("<div class=block-template draggable><div class=block-template-icon></div><div><div class=block-template-name></div><div class=block-template-desc>"), Dn = /* @__PURE__ */ k('<div style="color:var(--ink-muted);font-size:12px;padding:16px 8px;text-align:center">No blocks match "<!>"'), In = /* @__PURE__ */ k(`<div class=palette-body style="color:var(--ink-muted);font-size:12px;padding:16px 8px;text-align:center">Load an OpenAPI spec from the workflow's HTTP Request block.`);
const kt = [
  // Core
  {
    type: $.Start,
    name: "Start",
    category: "Core",
    description: "Entry point",
    emoji: "▶"
  },
  {
    type: $.End,
    name: "End",
    category: "Core",
    description: "Exit point",
    emoji: "⏹"
  },
  {
    type: $.Variable,
    name: "Variable",
    category: "Core",
    description: "Set/get variables",
    emoji: "📦"
  },
  {
    type: $.Log,
    name: "Log",
    category: "Core",
    description: "Log messages",
    emoji: "📝"
  },
  {
    type: $.Evaluate,
    name: "Evaluate",
    category: "Core",
    description: "Evaluate expressions",
    emoji: "🧮"
  },
  // Connectivity
  {
    type: $.HttpRequest,
    name: "HTTP Request",
    category: "Connectivity",
    description: "Make API calls",
    emoji: "🌐"
  },
  // Logic
  {
    type: $.Condition,
    name: "Condition",
    category: "Logic",
    description: "If/else branching",
    emoji: "↕"
  },
  {
    type: $.Switch,
    name: "Switch",
    category: "Logic",
    description: "Multiple branches",
    emoji: "🔀"
  },
  {
    type: $.Loop,
    name: "Loop",
    category: "Logic",
    description: "Iterate items",
    emoji: "🔄"
  },
  {
    type: $.Delay,
    name: "Delay",
    category: "Logic",
    description: "Wait duration",
    emoji: "⏱"
  },
  {
    type: $.BatchProcess,
    name: "Batch",
    category: "Logic",
    description: "Parallel processing",
    emoji: "⚡"
  },
  {
    type: $.SubWorkflow,
    name: "Sub Workflow",
    category: "Logic",
    description: "Call workflow",
    emoji: "📂"
  },
  // Files
  {
    type: $.FileDownload,
    name: "File Download",
    category: "Files",
    description: "Download file from URL",
    emoji: "⬇"
  },
  {
    type: $.FileUpload,
    name: "File Upload",
    category: "Files",
    description: "Pick file from disk",
    emoji: "⬆"
  },
  {
    type: $.FileStreamWriter,
    name: "Stream Writer",
    category: "Files",
    description: "Append to file stream",
    emoji: "✍"
  },
  {
    type: $.FileStreamReader,
    name: "Stream Reader",
    category: "Files",
    description: "Iterate file chunks",
    emoji: "📖"
  }
], Nn = () => {
  const [t, e] = L(""), [s, n] = L("blocks"), r = Ne(() => {
    const l = t().toLowerCase();
    return l ? kt.filter((c) => c.name.toLowerCase().includes(l) || c.description.toLowerCase().includes(l)) : kt;
  }), o = Ne(() => {
    const l = /* @__PURE__ */ new Map();
    return r().forEach((c) => {
      l.has(c.category) || l.set(c.category, []), l.get(c.category).push(c);
    }), l;
  }), i = (l, c) => {
    var g;
    (g = l.dataTransfer) == null || g.setData("application/siyeflow-block-type", c), l.dataTransfer.effectAllowed = "copy";
  }, a = (l) => {
    const c = et(l, {
      x: 3890,
      y: 3940
    });
    A.addBlock(c), A.selectBlock(c.id);
  };
  return (() => {
    var l = On(), c = l.firstChild, g = c.firstChild, h = g.nextSibling, v = c.nextSibling, f = v.firstChild;
    return g.$$click = () => n("blocks"), h.$$click = () => n("api"), f.$$input = (y) => e(y.target.value), w(l, (() => {
      var y = P(() => s() === "blocks");
      return () => y() && (() => {
        var u = Tn();
        return w(u, H(z, {
          get each() {
            return [...o().entries()];
          },
          children: ([p, d]) => [(() => {
            var m = Vn();
            return w(m, p), m;
          })(), H(z, {
            each: d,
            children: (m) => (() => {
              var b = jn(), x = b.firstChild, S = x.nextSibling, E = S.firstChild, N = E.nextSibling;
              return b.$$click = () => a(m.type), b.addEventListener("dragstart", (W) => i(W, m.type)), w(x, () => m.emoji), w(E, () => m.name), w(N, () => m.description), _(() => C(b, "title", m.description)), b;
            })()
          })]
        }), null), w(u, (() => {
          var p = P(() => r().length === 0);
          return () => p() && (() => {
            var d = Dn(), m = d.firstChild, b = m.nextSibling;
            return b.nextSibling, w(d, t, b), d;
          })();
        })(), null), u;
      })();
    })(), null), w(l, (() => {
      var y = P(() => s() === "api");
      return () => y() && In();
    })(), null), _((y) => {
      var u = `palette-tab${s() === "blocks" ? " active" : ""}`, p = `palette-tab${s() === "api" ? " active" : ""}`;
      return u !== y.e && D(g, y.e = u), p !== y.t && D(h, y.t = p), y;
    }, {
      e: void 0,
      t: void 0
    }), _(() => f.value = t()), l;
  })();
};
ee(["click", "input"]);
const Ye = 60;
function zt(t, e, s, n) {
  const r = t + Ye, o = s - Ye, i = o - r, a = Math.min(Math.abs(i) / 2, 80);
  return `M ${t} ${e} L ${r} ${e} C ${r + a} ${e}, ${o - a} ${n}, ${o} ${n} L ${s} ${n}`;
}
function Fn(t, e, s, n) {
  const r = t + Ye, o = s - Ye, i = o - r, a = Math.min(Math.abs(i) / 2, 80), l = r + a, c = o - a, g = 0.5;
  return {
    x: (1 - g) ** 3 * r + 3 * (1 - g) ** 2 * g * l + 3 * (1 - g) * g ** 2 * c + g ** 3 * o,
    y: (1 - g) ** 3 * e + 3 * (1 - g) ** 2 * g * e + 3 * (1 - g) * g ** 2 * n + g ** 3 * n
  };
}
var Rn = /* @__PURE__ */ k('<div><div title="Toggle breakpoint"></div><div class=block-header><span class=block-header-title></span><button class=block-delete-btn>×</button></div><div class=block-ports><div class="port-group port-group-input"></div><div class="port-group port-group-output">'), Un = /* @__PURE__ */ k("<div class=block-content>"), Mn = /* @__PURE__ */ k("<div class=block-field-row><label class=block-field-label></label><input class=block-field-input type=text>"), Wn = /* @__PURE__ */ k('<div class="port-row port-input"><div class=port-dot data-port-side=input></div><span class=port-label>'), zn = /* @__PURE__ */ k('<div class="port-row port-output"><span class=port-label></span><div class=port-dot data-port-side=output>');
const Jn = (t) => {
  const e = () => t.block, s = () => gn[e().type] ?? "#2a2a2a", n = () => {
    const o = e().executionState;
    return o ? ` exec-${o}` : "";
  }, r = () => e().selected ? " selected" : "";
  return (() => {
    var o = Rn(), i = o.firstChild, a = i.nextSibling, l = a.firstChild, c = l.nextSibling, g = a.nextSibling, h = g.firstChild, v = h.nextSibling;
    return o.$$pointerdown = (f) => {
      f.target.closest(".port-dot") || t.onPointerDown(f);
    }, i.$$click = (f) => {
      f.stopPropagation();
    }, w(l, () => e().name), c.$$click = (f) => {
      f.stopPropagation(), Promise.resolve().then(() => wt).then((y) => y.storeActions.deleteBlock(e().id));
    }, w(o, (() => {
      var f = P(() => !!(e().fields && e().fields.length > 0));
      return () => f() && (() => {
        var y = Un();
        return w(y, H(z, {
          get each() {
            return e().fields.slice(0, 2);
          },
          children: (u) => (() => {
            var p = Mn(), d = p.firstChild, m = d.nextSibling;
            return w(d, () => u.label ?? u.name), m.$$pointerdown = (b) => b.stopPropagation(), m.$$input = (b) => {
              Promise.resolve().then(() => wt).then((x) => x.storeActions.updateBlockField(e().id, u.name, b.target.value));
            }, _(() => C(m, "placeholder", u.placeholder ?? "")), _(() => m.value = String(e().fieldValues[u.name] ?? u.value ?? "")), p;
          })()
        })), y;
      })();
    })(), g), w(h, H(z, {
      get each() {
        return e().inputPorts;
      },
      children: (f) => (() => {
        var y = Wn(), u = y.firstChild, p = u.nextSibling;
        return u.$$pointerup = (d) => {
          d.stopPropagation(), t.onPortInput(f.name);
        }, w(p, () => f.label ?? f.name), _((d) => {
          var m = f.name, b = f.label ?? f.name;
          return m !== d.e && C(u, "data-port-name", d.e = m), b !== d.t && C(u, "title", d.t = b), d;
        }, {
          e: void 0,
          t: void 0
        }), y;
      })()
    })), w(v, H(z, {
      get each() {
        return e().outputPorts;
      },
      children: (f) => (() => {
        var y = zn(), u = y.firstChild, p = u.nextSibling;
        return w(u, () => f.label ?? f.name), p.$$pointerdown = (d) => {
          d.stopPropagation(), t.onPortOutput(f.name, d.currentTarget);
        }, _((d) => {
          var m = f.name, b = f.label ?? f.name;
          return m !== d.e && C(p, "data-port-name", d.e = m), b !== d.t && C(p, "title", d.t = b), d;
        }, {
          e: void 0,
          t: void 0
        }), y;
      })()
    })), _((f) => {
      var y = `workflow-block${r()}${n()}`, u = e().id, p = `${e().position.x}px`, d = `${e().position.y}px`, m = `${e().width}px`, b = `block-breakpoint${e().hasBreakpoint ? " active" : ""}`, x = s();
      return y !== f.e && D(o, f.e = y), u !== f.t && C(o, "data-block-id", f.t = u), p !== f.a && Y(o, "left", f.a = p), d !== f.o && Y(o, "top", f.o = d), m !== f.i && Y(o, "width", f.i = m), b !== f.n && D(i, f.n = b), x !== f.s && Y(a, "background", f.s = x), f;
    }, {
      e: void 0,
      t: void 0,
      a: void 0,
      o: void 0,
      i: void 0,
      n: void 0,
      s: void 0
    }), o;
  })();
};
ee(["pointerdown", "click", "input", "pointerup"]);
var qn = /* @__PURE__ */ k('<div class=floating-toolbar><button title="Hand tool (H)"><svg width=14 height=14 viewBox="0 0 24 24"fill=currentColor><path d="M7.5 1.5a1.5 1.5 0 0 1 3 0V5h1.5a1 1 0 0 1 1 1v2.5a3 3 0 0 1-3 3H9v3.5a1.5 1.5 0 0 1-3 0V8.5H5a3 3 0 0 1-3-3V6a1 1 0 0 1 1-1h1.5V1.5z"></path></svg></button><button title="Pointer tool (V)"><svg width=14 height=14 viewBox="0 0 16 16"fill=currentColor><path d="M3.5 2.036L13 8.5 8.5 9.5 7 14l-1.5-5.5L3.5 2.036z"></path></svg></button><div class=ft-sep></div><button class=ft-btn title="Zoom out (-)"><svg width=14 height=14 viewBox="0 0 24 24"fill=none stroke=currentColor stroke-width=2><circle cx=11 cy=11 r=8></circle><line x1=21 y1=21 x2=16.65 y2=16.65></line><line x1=8 y1=11 x2=14 y2=11></line></svg></button><span style=font-size:11px;color:var(--ink-muted);min-width:36px;text-align:center;font-family:var(--font-mono)>%</span><button class=ft-btn title="Zoom in (+)"><svg width=14 height=14 viewBox="0 0 24 24"fill=none stroke=currentColor stroke-width=2><circle cx=11 cy=11 r=8></circle><line x1=21 y1=21 x2=16.65 y2=16.65></line><line x1=11 y1=8 x2=11 y2=14></line><line x1=8 y1=11 x2=14 y2=11></line></svg></button><button class=ft-btn title="Fit to screen (F)"><svg width=14 height=14 viewBox="0 0 24 24"fill=none stroke=currentColor stroke-width=2><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path></svg></button><div class=ft-sep>'), Gn = /* @__PURE__ */ k('<button class="ft-btn ft-run"title="Run workflow (Ctrl+Enter)"><svg width=12 height=12 viewBox="0 0 16 16"fill=currentColor><path d="M4 2.5a.5.5 0 0 1 .724-.447l9 5.5a.5.5 0 0 1 0 .894l-9 5.5A.5.5 0 0 1 4 13.5v-11z"></path></svg>Run'), Yn = /* @__PURE__ */ k('<button class=ft-btn title=Pause style=color:var(--warning)><svg width=14 height=14 viewBox="0 0 16 16"fill=currentColor><path d="M5 3h2v10H5zM9 3h2v10H9z">'), Xn = /* @__PURE__ */ k('<button class=ft-btn title=Resume style=color:var(--accent)><svg width=14 height=14 viewBox="0 0 16 16"fill=currentColor><path d="M4 2.5a.5.5 0 0 1 .724-.447l9 5.5a.5.5 0 0 1 0 .894l-9 5.5A.5.5 0 0 1 4 13.5v-11z">'), Kn = /* @__PURE__ */ k('<button class=ft-btn title=Step style=color:var(--ink-secondary)><svg width=14 height=14 viewBox="0 0 16 16"fill=none stroke=currentColor stroke-width=1.5><path d="M4 3v10M8 8l4-3.5v7z"fill=currentColor>'), Zn = /* @__PURE__ */ k('<button class=ft-btn title=Stop style=color:var(--error)><svg width=14 height=14 viewBox="0 0 16 16"fill=currentColor><rect x=3 y=3 width=10 height=10 rx=1>');
let F = null;
const Qn = (t) => {
  F = t;
}, eo = (t) => {
  const e = Ft, s = () => e() === "idle", n = () => e() === "running", r = () => e() === "paused" || e() === "stepping", o = () => e() !== "idle", i = async () => {
    const {
      runWorkflow: a
    } = await Promise.resolve().then(() => Yo);
    a();
  };
  return (() => {
    var a = qn(), l = a.firstChild, c = l.nextSibling, g = c.nextSibling, h = g.nextSibling, v = h.nextSibling, f = v.firstChild, y = v.nextSibling, u = y.nextSibling;
    return u.nextSibling, l.$$click = () => He("hand"), c.$$click = () => He("pointer"), h.$$click = () => he((p) => Math.max(0.2, p - 0.1)), w(v, () => Math.round(q() * 100), f), y.$$click = () => he((p) => Math.min(3, p + 0.1)), os(u, "click", t.onFitToScreen), w(a, (() => {
      var p = P(() => !!s());
      return () => p() && (() => {
        var d = Gn();
        return d.$$click = i, d;
      })();
    })(), null), w(a, (() => {
      var p = P(() => !!n());
      return () => p() && (() => {
        var d = Yn();
        return d.$$click = () => F == null ? void 0 : F.pause(), d;
      })();
    })(), null), w(a, (() => {
      var p = P(() => !!r());
      return () => p() && [(() => {
        var d = Xn();
        return d.$$click = () => F == null ? void 0 : F.resume(), d;
      })(), (() => {
        var d = Kn();
        return d.$$click = () => F == null ? void 0 : F.step(), d;
      })()];
    })(), null), w(a, (() => {
      var p = P(() => !!o());
      return () => p() && (() => {
        var d = Zn();
        return d.$$click = () => F == null ? void 0 : F.stop(), d;
      })();
    })(), null), _((p) => {
      var d = `ft-btn${Ee() === "hand" ? " active" : ""}`, m = `ft-btn${Ee() === "pointer" ? " active" : ""}`;
      return d !== p.e && D(l, p.e = d), m !== p.t && D(c, p.t = m), p;
    }, {
      e: void 0,
      t: void 0
    }), a;
  })();
};
ee(["click"]);
const to = {
  [$.Start]: [
    { name: "description", label: "Description", type: "textarea", placeholder: "What does this workflow do?" },
    { name: "values", label: "Initial Variables", type: "keyvalue", hint: "Key-value pairs set at workflow start" }
  ],
  [$.End]: [
    { name: "outputs", label: "Outputs", type: "keyvalue", hint: "Variables to expose as workflow outputs" }
  ],
  [$.HttpRequest]: [
    { name: "method", label: "Method", type: "pill-select", options: ["GET", "POST", "PUT", "DELETE", "PATCH"], defaultValue: "GET" },
    { name: "url", label: "URL", type: "text", placeholder: "https://api.example.com/{{endpoint}}" },
    { name: "headers", label: "Headers", type: "keyvalue", hint: "e.g. Authorization: Bearer {{token}}" },
    { name: "body", label: "Body", type: "textarea", placeholder: '{ "key": "{{value}}" }' },
    { name: "outputs", label: "Extract Outputs", type: "keyvalue", hint: "variable: $.jsonpath.expression" }
  ],
  [$.Variable]: [
    { name: "name", label: "Variable Name", type: "text", placeholder: "myVariable" },
    { name: "value", label: "Value", type: "text", placeholder: "{{someOtherVar}} or literal" }
  ],
  [$.Log]: [
    { name: "message", label: "Message", type: "text", placeholder: "Log: {{variableName}}" },
    { name: "level", label: "Level", type: "pill-select", options: ["info", "warn", "error", "debug"], defaultValue: "info" }
  ],
  [$.Delay]: [
    { name: "duration", label: "Duration", type: "number", placeholder: "1000", defaultValue: "1000" },
    { name: "unit", label: "Unit", type: "pill-select", options: ["ms", "s", "m"], defaultValue: "ms" }
  ],
  [$.Condition]: [
    { name: "expression", label: "Expression", type: "expression", placeholder: "{{statusCode}} == 200", hint: "Evaluates to true or false" }
  ],
  [$.Switch]: [
    { name: "expression", label: "Expression", type: "expression", placeholder: "{{statusCode}}", hint: "Value to match against cases" }
  ],
  [$.Loop]: [
    { name: "items", label: "Items", type: "expression", placeholder: "{{myArray}}", hint: "Array variable to iterate" },
    { name: "maxIterations", label: "Max Iterations", type: "number", placeholder: "1000", hint: "Safety limit (0 = unlimited)" }
  ],
  [$.Evaluate]: [
    { name: "expression", label: "Expression", type: "textarea", placeholder: "return {{value}} * 2;", hint: "JavaScript expression; use return to set output" },
    { name: "outputVariable", label: "Output Variable", type: "text", placeholder: "result" }
  ],
  [$.BatchProcess]: [
    { name: "items", label: "Items", type: "expression", placeholder: "{{myArray}}", hint: "Array to process in parallel" },
    { name: "concurrency", label: "Concurrency", type: "number", placeholder: "5", defaultValue: "5", hint: "Max parallel executions" }
  ],
  [$.SubWorkflow]: [
    { name: "workflowId", label: "Workflow ID", type: "text", placeholder: "my-nested-workflow", hint: "ID of the workflow to execute inline" }
  ],
  [$.WebhookTrigger]: [
    { name: "path", label: "Path", type: "text", placeholder: "/webhook/my-event" },
    { name: "method", label: "Method", type: "pill-select", options: ["GET", "POST", "PUT", "DELETE", "PATCH"], defaultValue: "POST" }
  ],
  [$.FileDownload]: [
    { name: "url", label: "URL", type: "text", placeholder: "https://example.com/file.csv" },
    { name: "outputVar", label: "Output Variable", type: "text", placeholder: "fileData", hint: "Variable to store file contents (base64 for binary, text for text/*)" },
    { name: "encoding", label: "Encoding", type: "pill-select", options: ["auto", "base64", "text"], defaultValue: "auto" },
    { name: "saveAs", label: "Save to Disk (browser only)", type: "checkbox" },
    { name: "fileName", label: "File Name", type: "text", placeholder: "output.csv", hint: "Used when Save to Disk is enabled" }
  ],
  [$.FileUpload]: [
    { name: "outputVar", label: "Output Variable", type: "text", placeholder: "uploadedFile", hint: "Variable to store file contents" },
    { name: "accept", label: "Accept", type: "text", placeholder: ".csv,.json,*/*", hint: "File types accepted (MIME type or extension)" },
    { name: "encoding", label: "Encoding", type: "pill-select", options: ["auto", "base64", "text"], defaultValue: "auto" }
  ],
  [$.FileStreamWriter]: [
    { name: "streamVar", label: "Stream Variable", type: "text", placeholder: "myStream", hint: "Variable that accumulates the written data" },
    { name: "value", label: "Value", type: "text", placeholder: "{{line}}", hint: "Value to append on each call" },
    { name: "separator", label: "Separator", type: "text", placeholder: "\\n", hint: "Appended between writes (default: newline)" }
  ],
  [$.FileStreamReader]: [
    { name: "source", label: "Source Variable", type: "text", placeholder: "{{fileData}}", hint: "Variable holding the file contents to iterate" },
    { name: "mode", label: "Mode", type: "pill-select", options: ["lines", "chars", "bytes"], defaultValue: "lines" },
    { name: "chunkSize", label: "Chunk Size", type: "number", placeholder: "1", hint: "Lines / chars per iteration. Increase (e.g. 100) for large files." },
    { name: "skip", label: "Skip Lines", type: "number", placeholder: "0", hint: "Skip the first N lines (e.g. 1 to skip a CSV header)" },
    { name: "limit", label: "Max Chunks", type: "number", placeholder: "0", hint: "0 = process all. Set a number to cap iterations (useful for large files)." },
    { name: "outputVar", label: "Chunk Variable", type: "text", placeholder: "chunk", hint: "Variable set to the current chunk each iteration" }
  ]
};
var so = /* @__PURE__ */ k("<div>"), no = /* @__PURE__ */ k("<div class=sp-header><div class=sp-header-row><span class=sp-type-chip></span><button class=sp-close>×</button></div><input class=sp-name-input type=text>"), oo = /* @__PURE__ */ k("<div class=sp-tabs><button>Fields</button><button>JSON"), ao = /* @__PURE__ */ k("<div><div class=sp-fields-body>"), ro = /* @__PURE__ */ k('<div><div class=sp-json-body><textarea class=sp-json-area></textarea><div class=sp-json-error></div></div><div class=sp-action-bar><button class="sp-btn sp-btn-ghost">Reset</button><button class="sp-btn sp-btn-primary">Apply'), io = /* @__PURE__ */ k("<p style=color:var(--ink-muted);font-size:12px;text-align:center;margin-top:20px>No configurable fields."), lo = /* @__PURE__ */ k("<div class=sp-field><label class=sp-label></label><div class=sp-control>"), co = /* @__PURE__ */ k("<input class=sp-input type=text>"), uo = /* @__PURE__ */ k("<textarea class=sp-textarea rows=4>"), po = /* @__PURE__ */ k("<textarea class=sp-expression rows=2>"), go = /* @__PURE__ */ k("<input class=sp-input type=number>"), ho = /* @__PURE__ */ k("<div class=sp-pill-group>"), fo = /* @__PURE__ */ k("<button>"), mo = /* @__PURE__ */ k("<label style=display:flex;align-items:center;gap:7px;cursor:pointer><input type=checkbox><span style=font-size:13px;color:var(--ink-primary)>"), yo = /* @__PURE__ */ k("<p class=sp-hint>"), bo = /* @__PURE__ */ k("<div class=sp-kv-container><button class=sp-kv-add>+ Add row"), vo = /* @__PURE__ */ k("<div class=sp-kv-row><input class=sp-kv-key type=text placeholder=key><input class=sp-kv-val type=text placeholder=value><button class=sp-kv-del title=Remove>×");
const $o = () => {
  const [t, e] = L("fields"), [s, n] = L(""), [r, o] = L(""), i = ht, a = () => i() ? R[i()] : null, l = () => !!a();
  Ke(() => {
    const f = a();
    f && t() === "json" && (n(JSON.stringify(f.fieldValues, null, 2)), o(""));
  });
  const c = () => {
    ge(null), e("fields");
  }, g = (f, y) => {
    var p;
    const u = a();
    u && (A.updateBlockField(u.id, f, y), t() === "json" && n(JSON.stringify(((p = R[u.id]) == null ? void 0 : p.fieldValues) ?? {}, null, 2)));
  }, h = () => {
    try {
      const f = JSON.parse(s()), y = a();
      y && A.updateBlockFieldValues(y.id, f), o("");
    } catch (f) {
      o(`Invalid JSON: ${f.message}`);
    }
  }, v = () => {
    const f = a();
    f && n(JSON.stringify(f.fieldValues, null, 2)), o("");
  };
  return (() => {
    var f = so();
    return w(f, (() => {
      var y = P(() => !!a());
      return () => y() && [(() => {
        var u = no(), p = u.firstChild, d = p.firstChild, m = d.nextSibling, b = p.nextSibling;
        return w(d, () => a().type), m.$$click = c, b.$$keydown = (x) => x.key === "Enter" && x.target.blur(), b.$$input = (x) => A.updateBlockName(a().id, x.target.value), _(() => b.value = a().name), u;
      })(), (() => {
        var u = oo(), p = u.firstChild, d = p.nextSibling;
        return p.$$click = () => e("fields"), d.$$click = () => {
          e("json"), n(JSON.stringify(a().fieldValues, null, 2));
        }, _((m) => {
          var b = `sp-tab${t() === "fields" ? " active" : ""}`, x = `sp-tab${t() === "json" ? " active" : ""}`;
          return b !== m.e && D(p, m.e = b), x !== m.t && D(d, m.t = x), m;
        }, {
          e: void 0,
          t: void 0
        }), u;
      })(), (() => {
        var u = ao(), p = u.firstChild;
        return w(p, () => {
          const d = to[a().type];
          return !d || d.length === 0 ? io() : H(z, {
            each: d,
            children: (m) => H(wo, {
              field: m,
              get blockId() {
                return a().id;
              },
              onChange: g
            })
          });
        }), _(() => D(u, `sp-tab-body${t() === "fields" ? " active" : ""}`)), u;
      })(), (() => {
        var u = ro(), p = u.firstChild, d = p.firstChild, m = d.nextSibling, b = p.nextSibling, x = b.firstChild, S = x.nextSibling;
        return d.$$input = (E) => {
          const N = E.target.value;
          n(N);
          try {
            JSON.parse(N), o("");
          } catch (W) {
            o(`Invalid JSON: ${W.message}`);
          }
        }, w(m, r), x.$$click = v, S.$$click = h, _((E) => {
          var N = `sp-tab-body${t() === "json" ? " active" : ""}`, W = !!r();
          return N !== E.e && D(u, E.e = N), W !== E.t && (S.disabled = E.t = W), E;
        }, {
          e: void 0,
          t: void 0
        }), _(() => d.value = s()), u;
      })()];
    })()), _(() => D(f, `settings-panel${l() ? " open" : ""}`)), f;
  })();
}, wo = (t) => {
  const e = t.field, s = () => {
    var n;
    return (n = R[t.blockId]) == null ? void 0 : n.fieldValues[e.name];
  };
  return (() => {
    var n = lo(), r = n.firstChild, o = r.nextSibling;
    return w(r, () => e.label), w(o, (() => {
      var i = P(() => e.type === "text");
      return () => i() && (() => {
        var a = co();
        return a.$$input = (l) => t.onChange(e.name, l.target.value), _(() => C(a, "placeholder", e.placeholder ?? "")), _(() => a.value = String(s() ?? "")), a;
      })();
    })(), null), w(o, (() => {
      var i = P(() => e.type === "textarea");
      return () => i() && (() => {
        var a = uo();
        return a.$$input = (l) => t.onChange(e.name, l.target.value), w(a, () => String(s() ?? "")), _(() => C(a, "placeholder", e.placeholder ?? "")), a;
      })();
    })(), null), w(o, (() => {
      var i = P(() => e.type === "expression");
      return () => i() && (() => {
        var a = po();
        return a.$$input = (l) => t.onChange(e.name, l.target.value), w(a, () => String(s() ?? "")), _(() => C(a, "placeholder", e.placeholder ?? "")), a;
      })();
    })(), null), w(o, (() => {
      var i = P(() => e.type === "number");
      return () => i() && (() => {
        var a = go();
        return a.$$input = (l) => t.onChange(e.name, l.target.value), _(() => C(a, "placeholder", e.placeholder ?? "")), _(() => a.value = String(s() ?? e.defaultValue ?? "")), a;
      })();
    })(), null), w(o, (() => {
      var i = P(() => e.type === "pill-select");
      return () => i() && (() => {
        var a = ho();
        return w(a, H(z, {
          get each() {
            return e.options ?? [];
          },
          children: (l) => (() => {
            var c = fo();
            return c.$$click = () => t.onChange(e.name, l), w(c, l), _(() => D(c, `sp-pill${String(s() ?? e.defaultValue) === l ? " active" : ""}`)), c;
          })()
        })), a;
      })();
    })(), null), w(o, (() => {
      var i = P(() => e.type === "checkbox");
      return () => i() && (() => {
        var a = mo(), l = a.firstChild, c = l.nextSibling;
        return l.addEventListener("change", (g) => t.onChange(e.name, g.target.checked)), w(c, () => e.placeholder ?? e.label), _(() => l.checked = !!s()), a;
      })();
    })(), null), w(o, (() => {
      var i = P(() => e.type === "keyvalue");
      return () => i() && H(xo, {
        get value() {
          return s();
        },
        onChange: (a) => t.onChange(e.name, a)
      });
    })(), null), w(n, (() => {
      var i = P(() => !!e.hint);
      return () => i() && (() => {
        var a = yo();
        return w(a, () => e.hint), a;
      })();
    })(), null), _(() => C(n, "data-field-name", e.name)), n;
  })();
}, xo = (t) => {
  const e = () => t.value && typeof t.value == "object" ? t.value : {}, s = () => Object.entries(e()), n = (i, a, l) => {
    const c = {
      ...e()
    };
    a !== i && delete c[i], a && (c[a] = l), t.onChange(c);
  }, r = (i) => {
    const a = {
      ...e()
    };
    delete a[i], t.onChange(a);
  }, o = () => t.onChange({
    ...e(),
    "": ""
  });
  return (() => {
    var i = bo(), a = i.firstChild;
    return w(i, H(z, {
      get each() {
        return s();
      },
      children: ([l, c]) => (() => {
        var g = vo(), h = g.firstChild, v = h.nextSibling, f = v.nextSibling;
        return h.$$input = (y) => n(l, y.target.value, c), h.value = l, v.$$input = (y) => n(l, l, y.target.value), f.$$click = () => r(l), _(() => v.value = String(c ?? "")), g;
      })()
    }), a), a.$$click = o, i;
  })();
};
ee(["click", "input", "keydown"]);
var ko = /* @__PURE__ */ k('<div class=minimap><svg width=160 height=100 viewBox="0 0 160 100">'), _o = /* @__PURE__ */ k("<svg><rect height=1 rx=1 fill=var(--border-strong) opacity=0.6></svg>", !1, !0, !1), So = /* @__PURE__ */ k("<svg><rect class=minimap-viewport rx=1></svg>", !1, !0, !1);
const ut = 8e3, Co = 160, te = Co / ut, Eo = (t) => (() => {
  var e = ko(), s = e.firstChild;
  return w(s, () => Object.values(R).map((n) => (() => {
    var r = _o();
    return _((o) => {
      var i = n.position.x * te, a = n.position.y * te, l = Math.max(2, n.width * te);
      return i !== o.e && C(r, "x", o.e = i), a !== o.t && C(r, "y", o.t = a), l !== o.a && C(r, "width", o.a = l), o;
    }, {
      e: void 0,
      t: void 0,
      a: void 0
    }), r;
  })()), null), w(s, () => {
    var v;
    const n = (v = t.containerEl) == null ? void 0 : v.call(t);
    if (!n) return null;
    const r = n.clientWidth, o = n.clientHeight, i = q(), a = ft(), l = ut / 2 - a.x / i, c = ut / 2 - a.y / i, g = r / i, h = o / i;
    return (() => {
      var f = So();
      return C(f, "x", (l - g / 2) * te), C(f, "y", (c - h / 2) * te), C(f, "width", g * te), C(f, "height", h * te), f;
    })();
  }, null), e;
})();
var Ho = /* @__PURE__ */ k('<div><div class=terminal-header><div class=terminal-title><svg width=13 height=13 viewBox="0 0 24 24"fill=none stroke=currentColor stroke-width=2><polyline points="4 17 10 11 4 5"></polyline><line x1=12 y1=19 x2=20 y2=19></line></svg>Terminal<span style=font-size:11px;color:var(--ink-ghost);font-family:var(--font-mono)></span></div><div style=display:flex;gap:4px;align-items:center><button title="Clear terminal"style="font-size:11px;color:var(--ink-muted);padding:0 6px;border-radius:4px">Clear</button><svg width=12 height=12 viewBox="0 0 24 24"fill=none stroke=currentColor stroke-width=2><polyline points="18 15 12 9 6 15"></polyline></svg></div></div><div class=terminal-body>'), Po = /* @__PURE__ */ k("<span class=terminal-running-dot>"), Ao = /* @__PURE__ */ k("<div><span class=log-time></span><span class=log-msg>");
const Bo = () => {
  let t;
  return (() => {
    var e = Ho(), s = e.firstChild, n = s.firstChild, r = n.firstChild, o = r.nextSibling, i = o.nextSibling, a = n.nextSibling, l = a.firstChild, c = l.nextSibling, g = s.nextSibling;
    s.$$click = () => Ge.toggle(), w(n, (() => {
      var v = P(() => !!Sn());
      return () => v() && Po();
    })(), r), w(i, (() => {
      var v = P(() => st.length > 0);
      return () => v() ? `${st.length} entries` : "";
    })()), l.$$click = (v) => {
      v.stopPropagation(), Ge.clear();
    };
    var h = t;
    return typeof h == "function" ? it(h, g) : t = g, w(g, H(z, {
      get each() {
        return st.slice(-500);
      },
      children: (v) => (() => {
        var f = Ao(), y = f.firstChild, u = y.nextSibling;
        return w(y, () => v.ts), w(u, () => v.message), _(() => D(f, `log-row log-${v.level}`)), f;
      })()
    })), _((v) => {
      var f = `terminal${xt() ? " expanded" : " collapsed"}`, y = xt() ? "transform:rotate(180deg)" : "";
      return f !== v.e && D(e, v.e = f), v.t = Ot(c, y, v.t), v;
    }, {
      e: void 0,
      t: void 0
    }), e;
  })();
};
ee(["click"]);
var Lo = /* @__PURE__ */ k("<div class=canvas-area><div class=canvas-container><div><div class=canvas-layer><svg class=connections-layer></svg></div></div><div class=floating-toolbar-container></div><div class=settings-panel-container></div><div class=minimap-container>"), Oo = /* @__PURE__ */ k("<svg><path class=connection-preview></svg>", !1, !0, !1), To = /* @__PURE__ */ k("<svg><path fill=none stroke=transparent stroke-width=12 style=pointer-events:stroke;cursor:pointer></svg>", !1, !0, !1), Vo = /* @__PURE__ */ k("<svg><path class=connection-path></svg>", !1, !0, !1), jo = /* @__PURE__ */ k("<svg><g class=connection-delete-btn><circle r=9 fill=var(--bg-elevated) stroke=var(--border-default) stroke-width=1.5></circle><text y=4.5 text-anchor=middle font-size=12 fill=var(--ink-secondary) style=pointer-events:none>×</svg>", !1, !0, !1), Do = /* @__PURE__ */ k('<div class=block-toolbar style="transform-origin:top center"><button class=block-toolbar-btn title="Settings (opens panel)"><svg width=14 height=14 viewBox="0 0 24 24"fill=none stroke=currentColor stroke-width=2><circle cx=12 cy=12 r=3></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg></button><button class=block-toolbar-btn title="Duplicate (Ctrl+D)"><svg width=14 height=14 viewBox="0 0 24 24"fill=none stroke=currentColor stroke-width=2 stroke-linecap=round stroke-linejoin=round><rect x=9 y=9 width=13 height=13 rx=2 ry=2></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></button><button class="block-toolbar-btn danger"title="Delete (Del)"><svg width=14 height=14 viewBox="0 0 24 24"fill=none stroke=currentColor stroke-width=2 stroke-linecap=round stroke-linejoin=round><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2">');
const Io = 8e3, de = Io / 2, No = 0.2, Fo = 3;
let ce = null, nt = {
  x: 0,
  y: 0
}, Ae = !1, Be = {
  x: 0,
  y: 0
};
const [K, we] = L({
  active: !1,
  sourceBlockId: "",
  sourcePortName: "",
  startX: 0,
  startY: 0,
  endX: 0,
  endY: 0
}), [_t, ot] = L({
  x: 0,
  y: 0,
  visible: !1
});
function St(t, e) {
  if (!t) {
    ot((a) => ({
      ...a,
      visible: !1
    }));
    return;
  }
  const s = R[t];
  if (!s) {
    ot((a) => ({
      ...a,
      visible: !1
    }));
    return;
  }
  const n = s.position.x + s.width / 2, r = s.position.y, o = de + (n - de) * e, i = de + (r - de) * e - 44;
  ot({
    x: o,
    y: i,
    visible: !0
  });
}
const Ro = () => {
  let t, e;
  const s = () => {
    const u = ft();
    return `translate(calc(-50% + ${u.x}px), calc(-50% + ${u.y}px))`;
  }, n = () => `scale(${q()})`;
  Ke(() => {
    const u = ne(), p = q();
    St(u, p);
  });
  const r = (u, p) => {
    var b, x;
    p.stopPropagation();
    const d = R[u];
    if (!d) return;
    ce = u;
    const m = q();
    nt = {
      x: (p.clientX - e.getBoundingClientRect().left) / m - d.position.x,
      y: (p.clientY - e.getBoundingClientRect().top) / m - d.position.y
    }, (x = (b = p.target).setPointerCapture) == null || x.call(b, p.pointerId), A.selectBlock(u);
  }, o = (u) => {
    ce || K().active || (u.button === 1 || Ee() === "hand") && (Ae = !0, Be = {
      x: u.clientX,
      y: u.clientY
    });
  }, i = (u) => {
    if (ce) {
      const p = q(), d = e.getBoundingClientRect(), m = (u.clientX - d.left) / p - nt.x, b = (u.clientY - d.top) / p - nt.y;
      A.moveBlock(ce, {
        x: m,
        y: b
      }), St(ce, p);
    } else if (Ae) {
      const p = u.clientX - Be.x, d = u.clientY - Be.y;
      Be = {
        x: u.clientX,
        y: u.clientY
      }, ke((m) => ({
        x: m.x + p,
        y: m.y + d
      }));
    } else if (K().active) {
      const p = e.getBoundingClientRect();
      we((d) => ({
        ...d,
        endX: u.clientX - p.left,
        endY: u.clientY - p.top
      }));
    }
  }, a = (u) => {
    ce = null, Ae = !1, K().active && u.button === 0 && we((p) => ({
      ...p,
      active: !1
    }));
  }, l = (u) => {
    const p = u.target;
    p.closest(".workflow-block") || p.closest(".block-toolbar") || p.closest(".settings-panel") || (A.selectBlock(null), u.button === 0 && Ee() === "hand" && o(u), u.button === 1 && o(u));
  }, c = (u) => {
    if (!u.ctrlKey && !u.metaKey) return;
    u.preventDefault();
    const p = u.deltaY > 0 ? -0.08 : 0.08;
    he((d) => Math.max(No, Math.min(Fo, d + p)));
  }, g = (u) => {
    const p = u.target;
    if (!(p.tagName === "INPUT" || p.tagName === "TEXTAREA" || p.tagName === "SELECT")) {
      if (u.key === "Escape" && K().active) {
        we((d) => ({
          ...d,
          active: !1
        }));
        return;
      }
      (u.key === "Delete" || u.key === "Backspace") && ne() && A.deleteBlock(ne()), u.key === "h" && He("hand"), u.key === "v" && He("pointer"), u.key === "f" && h();
    }
  }, h = () => {
    const u = Object.values(R);
    if (u.length === 0) return;
    const p = Math.min(...u.map((B) => B.position.x)), d = Math.max(...u.map((B) => B.position.x + B.width)), m = Math.min(...u.map((B) => B.position.y)), b = Math.max(...u.map((B) => B.position.y + B.height)), x = t.clientWidth, S = t.clientHeight, E = 80, N = Math.min(1, (x - E) / (d - p), (S - E) / (b - m)), W = (p + d) / 2, O = (m + b) / 2;
    ue(() => {
      he(N), ke({
        x: (de - W) * N,
        y: (de - O) * N
      });
    });
  }, v = (u) => {
    var E;
    u.preventDefault();
    const p = (E = u.dataTransfer) == null ? void 0 : E.getData("application/siyeflow-block-type");
    if (!p) return;
    const d = e.getBoundingClientRect(), m = q(), b = (u.clientX - d.left) / m - 110, x = (u.clientY - d.top) / m - 60, S = et(p, {
      x: b,
      y: x
    });
    A.addBlock(S), A.selectBlock(S.id);
  };
  Ze(() => {
    document.addEventListener("keydown", g), ke({
      x: 0,
      y: 0
    }), he(1);
  }), Qe(() => {
    document.removeEventListener("keydown", g);
  });
  const f = (u, p, d) => {
    const m = e.getBoundingClientRect(), b = d.getBoundingClientRect(), x = b.left + b.width / 2 - m.left, S = b.top + b.height / 2 - m.top;
    we({
      active: !0,
      sourceBlockId: u,
      sourcePortName: p,
      startX: x,
      startY: S,
      endX: x,
      endY: S
    });
  }, y = (u, p) => {
    const d = K();
    d.active && (d.sourceBlockId !== u && A.addConnection({
      id: `conn_${Date.now()}`,
      type: "execution",
      sourceBlockId: d.sourceBlockId,
      sourcePortName: d.sourcePortName,
      targetBlockId: u,
      targetPortName: p
    }), we((m) => ({
      ...m,
      active: !1
    })));
  };
  return (() => {
    var u = Lo(), p = u.firstChild, d = p.firstChild, m = d.firstChild, b = m.firstChild, x = d.nextSibling, S = x.nextSibling, E = S.nextSibling;
    p.addEventListener("drop", v), p.addEventListener("dragover", (O) => O.preventDefault()), p.addEventListener("wheel", c), p.$$pointerup = a, p.$$pointermove = i, p.$$pointerdown = l;
    var N = t;
    typeof N == "function" ? it(N, p) : t = p;
    var W = e;
    return typeof W == "function" ? it(W, d) : e = d, w(b, H(z, {
      get each() {
        return Object.values(Ce);
      },
      children: (O) => H(Uo, {
        conn: O
      })
    }), null), w(b, (() => {
      var O = P(() => !!K().active);
      return () => O() && (() => {
        const B = K(), re = zt(B.startX, B.startY, B.endX, B.endY);
        return (() => {
          var ve = Oo();
          return C(ve, "d", re), ve;
        })();
      })();
    })(), null), w(m, H(z, {
      get each() {
        return Object.values(R);
      },
      children: (O) => H(Jn, {
        block: O,
        onPointerDown: (B) => r(O.id, B),
        onPortOutput: (B, re) => f(O.id, B, re),
        onPortInput: (B) => y(O.id, B)
      })
    }), null), w(d, (() => {
      var O = P(() => !!(_t().visible && ne()));
      return () => O() && H(Mo, {
        get blockId() {
          return ne();
        },
        get pos() {
          return _t();
        }
      });
    })(), null), w(x, H(eo, {
      onFitToScreen: h
    })), w(S, H($o, {})), w(E, H(Eo, {
      containerEl: () => t,
      wrapperEl: () => e
    })), w(u, H(Bo, {}), null), _((O) => {
      var B = `canvas-wrapper${Ae ? " panning" : ""}${K().active ? " connecting" : ""}`, re = s(), ve = n();
      return B !== O.e && D(d, O.e = B), re !== O.t && Y(d, "transform", O.t = re), ve !== O.a && Y(m, "transform", O.a = ve), O;
    }, {
      e: void 0,
      t: void 0,
      a: void 0
    }), u;
  })();
}, Uo = (t) => {
  const e = (o, i, a) => {
    const l = document.querySelector(`[data-block-id="${o}"] [data-port-name="${i}"][data-port-side="${a}"]`);
    if (!l) return null;
    const c = document.querySelector(".canvas-wrapper");
    if (!c) return null;
    const g = l.getBoundingClientRect(), h = c.getBoundingClientRect();
    return {
      x: g.left + g.width / 2 - h.left,
      y: g.top + g.height / 2 - h.top
    };
  }, s = () => {
    const o = e(t.conn.sourceBlockId, t.conn.sourcePortName, "output"), i = e(t.conn.targetBlockId, t.conn.targetPortName, "input");
    return {
      start: o,
      end: i
    };
  }, n = () => {
    const {
      start: o,
      end: i
    } = s();
    return !o || !i ? null : zt(o.x, o.y, i.x, i.y);
  }, r = () => {
    const {
      start: o,
      end: i
    } = s();
    return !o || !i ? null : Fn(o.x, o.y, i.x, i.y);
  };
  return P(() => P(() => !!n())() && [(() => {
    var o = To();
    return o.$$click = () => A.deleteConnection(t.conn.id), _(() => C(o, "d", n())), o;
  })(), (() => {
    var o = Vo();
    return _(() => C(o, "d", n())), o;
  })(), P(() => P(() => !!r())() && (() => {
    var o = jo();
    return o.$$click = () => A.deleteConnection(t.conn.id), _(() => C(o, "transform", `translate(${r().x},${r().y})`)), o;
  })())]);
}, Mo = (t) => {
  const e = q();
  return (() => {
    var s = Do(), n = s.firstChild, r = n.nextSibling, o = r.nextSibling;
    return Y(s, "transform", `translateX(-50%) scale(${1 / e})`), n.$$click = () => ge(t.blockId), r.$$click = () => {
      const i = R[t.blockId];
      if (!i) return;
      const a = {
        ...i,
        id: `block_${Date.now()}`,
        position: {
          x: i.position.x + 30,
          y: i.position.y + 30
        },
        selected: !1,
        fieldValues: {
          ...i.fieldValues
        }
      };
      A.addBlock(a), A.selectBlock(a.id);
    }, o.$$click = () => A.deleteBlock(t.blockId), _((i) => {
      var a = `${t.pos.x}px`, l = `${t.pos.y}px`;
      return a !== i.e && Y(s, "left", i.e = a), l !== i.t && Y(s, "top", i.t = l), i;
    }, {
      e: void 0,
      t: void 0
    }), s;
  })();
};
ee(["pointerdown", "pointermove", "pointerup", "click"]);
var Wo = /* @__PURE__ */ k("<div class=app>");
const zo = (t) => (Ze(() => {
  const e = window.matchMedia("(prefers-color-scheme: dark)"), s = () => {
    const n = qe();
    n === "system" ? document.documentElement.setAttribute("data-theme", e.matches ? "dark" : "light") : document.documentElement.setAttribute("data-theme", n);
  };
  e.addEventListener("change", s), s();
}), Ke(() => {
  const e = qe();
  e !== "system" && document.documentElement.setAttribute("data-theme", e);
}), (() => {
  var e = Wo();
  return w(e, H(Ln, {}), null), w(e, H(Nn, {}), null), w(e, H(Ro, {}), null), e;
})());
class at {
  /**
   * Load API definition from URL
   * Note: External URLs may fail due to CORS restrictions.
   * For external APIs, download the spec file and use loadFromFile instead.
   */
  static async loadFromUrl(e) {
    try {
      const s = await fetch(e);
      if (!s.ok)
        throw new Error(`HTTP ${s.status}: ${s.statusText}`);
      const n = await s.json();
      return this.parseOpenApi(n, e);
    } catch (s) {
      throw s instanceof TypeError && s.message.includes("fetch") ? new Error(
        `CORS Error: Cannot load from "${e}".

External APIs often block browser requests. Try:
• Download the OpenAPI/Swagger JSON file
• Use the file upload button to load it`
      ) : s;
    }
  }
  /**
   * Load API definition from file
   */
  static async loadFromFile(e) {
    return new Promise((s, n) => {
      const r = new FileReader();
      r.onload = (o) => {
        var i;
        try {
          const a = JSON.parse((i = o.target) == null ? void 0 : i.result);
          s(this.parseOpenApi(a, e.name));
        } catch (a) {
          n(new Error(`Failed to parse API definition: ${a}`));
        }
      }, r.onerror = () => n(new Error("Failed to read file")), r.readAsText(e);
    });
  }
  /**
   * Parse OpenAPI/Swagger JSON
   */
  static parseOpenApi(e, s) {
    var v, f, y, u;
    const n = (v = e.openapi) == null ? void 0 : v.startsWith("3"), r = (f = e.swagger) == null ? void 0 : f.startsWith("2");
    if (!n && !r)
      throw new Error("Unsupported API definition format. Expected OpenAPI 3.x or Swagger 2.x");
    const o = e.info || {}, i = e.paths || {}, a = e.servers || [], l = ((y = e.tags) == null ? void 0 : y.map((p) => p.name)) || [];
    let c = "";
    if (a.length > 0 ? c = a[0].url : e.host && (c = `${((u = e.schemes) == null ? void 0 : u[0]) || "https"}://${e.host}${e.basePath || ""}`), s && (!c || c === "/" || !c.startsWith("http")))
      try {
        c = new URL(s, window.location.origin).origin + (c === "/" ? "" : c);
      } catch {
      }
    const g = [], h = ["get", "post", "put", "delete", "patch"];
    for (const [p, d] of Object.entries(i))
      for (const m of h) {
        const b = d[m];
        b && g.push({
          id: this.generateEndpointId(m, p),
          name: b.summary || b.operationId || `${m.toUpperCase()} ${p}`,
          method: m.toUpperCase(),
          path: p,
          summary: b.summary,
          description: b.description,
          parameters: this.parseParameters(b.parameters || [], n),
          requestBody: b.requestBody,
          responses: b.responses,
          tags: b.tags
        });
      }
    return {
      id: this.generateId(o.title || "api"),
      name: o.title || "API",
      version: o.version || "1.0.0",
      description: o.description,
      baseUrl: c,
      endpoints: g,
      source: s,
      tags: l
    };
  }
  /**
   * Parse parameters from OpenAPI
   */
  static parseParameters(e, s) {
    return e.map((n) => {
      var r;
      return {
        name: n.name,
        in: n.in,
        required: n.required ?? !1,
        type: s ? (r = n.schema) == null ? void 0 : r.type : n.type,
        description: n.description,
        schema: n.schema
      };
    });
  }
  /**
   * Generate endpoint ID from method and path
   */
  static generateEndpointId(e, s) {
    const n = s.replace(/\{([^}]+)\}/g, "_$1_").replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_|_$/g, "");
    return `${e}_${n}`.toLowerCase();
  }
  /**
   * Generate ID from name
   */
  static generateId(e) {
    return e.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || `api_${Date.now()}`;
  }
  /**
   * Validate if JSON is a valid OpenAPI/Swagger spec
   */
  static isValidSpec(e) {
    var s, n;
    return !!((s = e.openapi) != null && s.startsWith("3") || (n = e.swagger) != null && n.startsWith("2"));
  }
}
const pe = class pe {
  constructor() {
    V(this, "apiDefinitions", /* @__PURE__ */ new Map());
    V(this, "callbacks", /* @__PURE__ */ new Set());
  }
  /**
   * Load API definition from URL
   */
  async loadFromUrl(e, s) {
    try {
      const n = await at.loadFromUrl(e);
      return s != null && s.locked && (n.locked = !0), this.apiDefinitions.set(n.id, n), this.notifyChange(), n.locked || this.saveToStorage(), n;
    } catch (n) {
      throw new Error(`Failed to load API from ${e}: ${n}`);
    }
  }
  /**
   * Load API definition from file
   */
  async loadFromFile(e) {
    try {
      const s = await at.loadFromFile(e);
      return this.apiDefinitions.set(s.id, s), this.notifyChange(), this.saveToStorage(), s;
    } catch (s) {
      throw new Error(`Failed to load API from file: ${s}`);
    }
  }
  /**
   * Load API definition from JSON object
   */
  loadFromJson(e, s) {
    const n = at.parseOpenApi(e);
    return s && (n.name = s), this.apiDefinitions.set(n.id, n), this.notifyChange(), this.saveToStorage(), n;
  }
  /**
   * Remove API definition
   */
  remove(e) {
    const s = this.apiDefinitions.delete(e);
    return s && (this.notifyChange(), this.saveToStorage()), s;
  }
  /**
   * Get all API definitions
   */
  getAll() {
    return Array.from(this.apiDefinitions.values());
  }
  /**
   * Get specific API definition
   */
  get(e) {
    return this.apiDefinitions.get(e);
  }
  /**
   * Get all endpoints from all APIs
   */
  getAllEndpoints() {
    const e = [];
    return this.apiDefinitions.forEach((s) => {
      s.endpoints.forEach((n) => {
        e.push({
          ...n,
          apiId: s.id,
          apiName: s.name
        });
      });
    }), e;
  }
  /**
   * Search endpoints by name or path
   */
  searchEndpoints(e) {
    const s = e.toLowerCase();
    return this.getAllEndpoints().filter(
      (n) => {
        var r;
        return n.name.toLowerCase().includes(s) || n.path.toLowerCase().includes(s) || ((r = n.summary) == null ? void 0 : r.toLowerCase().includes(s));
      }
    );
  }
  /**
   * Clear all API definitions
   */
  clear() {
    this.apiDefinitions.clear(), this.notifyChange(), this.saveToStorage();
  }
  /**
   * Subscribe to changes
   */
  onChange(e) {
    return this.callbacks.add(e), () => this.callbacks.delete(e);
  }
  /**
   * Notify subscribers of changes
   */
  notifyChange() {
    const e = this.getAll();
    this.callbacks.forEach((s) => {
      try {
        s(e);
      } catch (n) {
        console.error("Error in API change callback:", n);
      }
    });
  }
  /**
   * Save API sources to localStorage
   */
  saveToStorage() {
    try {
      const e = this.getAll().filter((s) => s.source).map((s) => ({
        id: s.id,
        name: s.name,
        source: s.source
      }));
      localStorage.setItem(pe.STORAGE_KEY, JSON.stringify(e));
    } catch (e) {
      console.warn("Failed to save API definitions to storage:", e);
    }
  }
  /**
   * Load API sources from localStorage
   */
  async loadFromStorage() {
    try {
      const e = localStorage.getItem(pe.STORAGE_KEY);
      if (e) {
        const n = JSON.parse(e).filter((i) => i.source);
        (await Promise.all(
          n.map(async (i) => {
            try {
              return await this.loadFromUrl(i.source), { success: !0, api: i };
            } catch {
              return { success: !1, api: i };
            }
          })
        )).filter((i) => !i.success).length > 0 && this.saveToStorage();
      }
    } catch {
      localStorage.removeItem(pe.STORAGE_KEY);
    }
  }
  /**
   * Export API definitions as JSON
   */
  exportConfig() {
    const e = this.getAll().map((s) => ({
      id: s.id,
      name: s.name,
      source: s.source,
      baseUrl: s.baseUrl
    }));
    return JSON.stringify(e, null, 2);
  }
  /**
   * Get count of loaded APIs
   */
  get count() {
    return this.apiDefinitions.size;
  }
  /**
   * Check if any APIs are loaded
   */
  get hasApis() {
    return this.apiDefinitions.size > 0;
  }
};
V(pe, "STORAGE_KEY", "siyeflow-api-definitions");
let dt = pe;
const Ko = new dt();
class Zo {
  constructor(e) {
    V(this, "dispose", null);
    const s = typeof e == "string" ? { canvasContainerId: e } : e, n = document.getElementById(s.canvasContainerId), r = (n == null ? void 0 : n.parentElement) ?? n ?? document.body;
    r && (r.innerHTML = "");
    const o = window.SiyeFlowConfig;
    o != null && o.theme && mt(o.theme);
    const i = () => zo({ homeUrl: s.homeUrl });
    this.dispose = ns(i, r);
  }
  loadWorkflow(e) {
    A.loadFromSchema(e);
  }
  clearTerminal() {
    Ge.clear();
  }
  destroy() {
    var e;
    (e = this.dispose) == null || e.call(this);
  }
}
class Jo {
  constructor(e) {
    V(this, "terminal");
    V(this, "nodes", /* @__PURE__ */ new Map());
    V(this, "edges", []);
    V(this, "state", "idle");
    V(this, "abortController", null);
    V(this, "onBlockHighlight");
    V(this, "onStateChange");
    V(this, "onContextUpdate");
    V(this, "pausePromise", null);
    V(this, "pauseResolve", null);
    V(this, "stepMode", !1);
    V(this, "breakpoints", /* @__PURE__ */ new Set());
    V(this, "alwaysInspect", !1);
    V(this, "currentContext", null);
    this.terminal = e;
  }
  setBlockHighlightCallback(e) {
    this.onBlockHighlight = e;
  }
  setStateChangeCallback(e) {
    this.onStateChange = e;
  }
  setContextUpdateCallback(e) {
    this.onContextUpdate = e;
  }
  async execute(e) {
    if (this.state !== "idle")
      return this.terminal.log("warning", "Workflow is already running"), !1;
    if (this.setState("running"), this.terminal.setRunning(!0), this.terminal.expand(), this.abortController = new AbortController(), this.stepMode = !1, this.nodes.clear(), !e.nodes || !Array.isArray(e.nodes))
      return this.terminal.log("error", "Invalid workflow: no nodes found"), this.cleanup(), !1;
    e.nodes.forEach((i) => {
      this.nodes.set(i.id, i);
    }), this.edges = e.edges || [], this.terminal.log("info", `Loaded ${this.nodes.size} nodes, ${this.edges.length} edges`);
    const s = this.findStartNode();
    if (!s)
      return this.terminal.log("error", "No Start block found in workflow"), this.cleanup(), !1;
    const n = {
      variables: /* @__PURE__ */ new Map(),
      blockOutputs: /* @__PURE__ */ new Map(),
      startTime: Date.now()
    };
    this.terminal.logWorkflowStart(e.name || "Unnamed Workflow");
    let r = !0;
    try {
      await this.executeNode(s, n);
    } catch (i) {
      r = !1, String(i).includes("aborted") ? this.terminal.log("warning", "Workflow execution stopped") : this.terminal.log("error", `Workflow execution failed: ${i}`);
    }
    const o = Date.now() - n.startTime;
    return this.terminal.logWorkflowEnd(r, o), this.clearAllHighlights(), this.cleanup(), r;
  }
  stop() {
    this.abortController && (this.abortController.abort(), this.terminal.log("warning", "Workflow execution stopped by user")), this.pauseResolve && (this.pauseResolve(), this.pauseResolve = null, this.pausePromise = null), this.cleanup();
  }
  pause() {
    this.state === "running" && (this.setState("paused"), this.terminal.log("info", "⏸ Workflow paused"), this.pausePromise = new Promise((e) => {
      this.pauseResolve = e;
    }));
  }
  resume() {
    this.state === "paused" && (this.stepMode = !1, this.setState("running"), this.terminal.log("info", "▶ Workflow resumed"), this.pauseResolve && (this.pauseResolve(), this.pauseResolve = null, this.pausePromise = null));
  }
  step() {
    this.state === "paused" && (this.stepMode = !0, this.setState("stepping"), this.terminal.log("info", "⏭ Stepping to next block"), this.pauseResolve && (this.pauseResolve(), this.pauseResolve = null, this.pausePromise = null));
  }
  getIsRunning() {
    return this.state !== "idle";
  }
  getState() {
    return this.state;
  }
  toggleBreakpoint(e) {
    return this.breakpoints.has(e) ? (this.breakpoints.delete(e), !1) : (this.breakpoints.add(e), !0);
  }
  hasBreakpoint(e) {
    return this.breakpoints.has(e);
  }
  clearBreakpoints() {
    this.breakpoints.clear();
  }
  getBreakpoints() {
    return this.breakpoints;
  }
  setAlwaysInspect(e) {
    this.alwaysInspect = e;
  }
  setState(e) {
    var s;
    this.state = e, (s = this.onStateChange) == null || s.call(this, e);
  }
  cleanup() {
    this.setState("idle"), this.terminal.setRunning(!1), this.abortController = null, this.pausePromise = null, this.pauseResolve = null, this.stepMode = !1, this.currentContext = null;
  }
  clearAllHighlights() {
    this.nodes.forEach((e, s) => {
      var n;
      (n = this.onBlockHighlight) == null || n.call(this, s, "clear");
    });
  }
  findStartNode() {
    return Array.from(this.nodes.values()).find((e) => {
      const s = String(e.type).toLowerCase();
      return s === "start" || s === $.Start.toLowerCase();
    });
  }
  async waitIfPaused(e) {
    var s, n, r, o;
    if ((s = this.abortController) != null && s.signal.aborted)
      throw new Error("Execution aborted");
    if (this.pausePromise && (await this.pausePromise, (n = this.abortController) != null && n.signal.aborted))
      throw new Error("Execution aborted");
    if (e && this.breakpoints.has(e) && this.state === "running" && (this.terminal.log("warning", "   ⏸ Breakpoint hit on block"), (r = this.onBlockHighlight) == null || r.call(this, e, "executing"), this.setState("paused"), this.emitContextUpdate(this.currentContext, e), this.pausePromise = new Promise((i) => {
      this.pauseResolve = i;
    }), await this.pausePromise, (o = this.abortController) != null && o.signal.aborted))
      throw new Error("Execution aborted");
    this.stepMode && (this.setState("paused"), e && this.currentContext && this.emitContextUpdate(this.currentContext, e), this.pausePromise = new Promise((i) => {
      this.pauseResolve = i;
    }));
  }
  async executeNode(e, s) {
    var c, g, h, v, f;
    if ((c = this.abortController) != null && c.signal.aborted)
      throw new Error("Execution aborted");
    this.currentContext = s, await this.waitIfPaused(e.id), (g = this.onBlockHighlight) == null || g.call(this, e.id, "executing");
    const n = Date.now();
    this.terminal.logBlockStart(e.id, e.label || e.id, String(e.type));
    let r;
    try {
      r = await this.executeBlock(e, s);
    } catch (y) {
      r = {
        success: !1,
        outputs: {},
        error: String(y),
        nextHandle: "fail"
      };
    }
    const o = Date.now() - n;
    if (this.terminal.logBlockEnd(e.id, e.label || e.id, r.success, o), (h = this.onBlockHighlight) == null || h.call(this, e.id, r.success ? "success" : "fail"), r.outputs) {
      s.blockOutputs.set(e.id, r.outputs);
      for (const [y, u] of Object.entries(r.outputs))
        s.variables.set(y, u);
    }
    this.alwaysInspect && this.emitContextUpdate(s, e.id);
    const i = r.nextHandle || (r.success ? "success" : "fail"), a = String(e.type).toLowerCase() === "start" ? "default" : i, l = this.edges.filter(
      (y) => y.source === e.id && y.type === Oe.Execution && (y.sourceHandle === a || y.sourceHandle === "default")
    );
    for (const y of l) {
      const u = this.nodes.get(y.target);
      u && (String(u.type).toLowerCase() !== "end" ? await this.executeNode(u, s) : ((v = this.onBlockHighlight) == null || v.call(this, u.id, "executing"), await this.executeBlock(u, s), this.terminal.logBlockEnd(u.id, u.label || u.id, !0, 0), (f = this.onBlockHighlight) == null || f.call(this, u.id, "success")));
    }
  }
  emitContextUpdate(e, s) {
    if (!this.onContextUpdate) return;
    const n = {};
    e.variables.forEach((o, i) => {
      n[i] = o;
    });
    const r = {};
    e.blockOutputs.forEach((o, i) => {
      r[i] = o;
    }), this.onContextUpdate(n, r, s);
  }
  async executeBlock(e, s) {
    switch (String(e.type).toLowerCase().replace(/-/g, "")) {
      case "start":
        return this.executeStartBlock(e, s);
      case "end":
        return this.executeEndBlock(e, s);
      case "httprequest":
        return this.executeHttpBlock(e, s);
      case "variable":
        return this.executeVariableBlock(e, s);
      case "log":
        return this.executeLogBlock(e, s);
      case "delay":
        return this.executeDelayBlock(e, s);
      case "condition":
      case "switch":
        return this.executeConditionBlock(e, s);
      case "evaluate":
        return this.executeEvaluateBlock(e, s);
      case "loop":
      case "batchprocess":
        return this.executeLoopBlock(e, s);
      case "subworkflow":
        return this.terminal.log("warning", "   Sub-workflow execution not yet implemented"), { success: !0, outputs: {}, nextHandle: "success" };
      case "filedownload":
        return this.executeFileDownloadBlock(e, s);
      case "fileupload":
        return this.executeFileUploadBlock(e, s);
      case "filestreamwriter":
        return this.executeFileStreamWriterBlock(e, s);
      case "filestreamreader":
        return this.executeFileStreamReaderBlock(e, s);
      default:
        return this.terminal.log("debug", `   Block type '${e.type}' - passing through`), { success: !0, outputs: {}, nextHandle: "success" };
    }
  }
  async executeStartBlock(e, s) {
    const n = e.data || {}, r = {};
    let o = {};
    if (n.inputs && typeof n.inputs == "object" && Object.keys(n.inputs).length > 0 ? o = n.inputs : n.values && typeof n.values == "object" && (o = n.values), Object.keys(o).length > 0)
      for (const [i, a] of Object.entries(o)) {
        if (typeof a == "object" && a !== null && Object.keys(a).length === 0)
          continue;
        const l = typeof a == "object" && a.value !== void 0 ? a.value : a;
        r[i] = l, s.variables.set(i, l), this.terminal.logVariable(i, l);
      }
    return { success: !0, outputs: r, nextHandle: "default" };
  }
  async executeEndBlock(e, s) {
    const n = e.data || {}, r = {};
    if (n.outputs && typeof n.outputs == "object")
      for (const [o, i] of Object.entries(n.outputs)) {
        const a = typeof i == "object" && i.value !== void 0 ? i.value : i, l = this.resolveValue(String(a), s);
        r[o] = l, this.terminal.log("success", `   📤 Output: ${o} = ${JSON.stringify(l).substring(0, 100)}`);
      }
    return { success: !0, outputs: r };
  }
  async executeHttpBlock(e, s) {
    var i;
    const n = e.data || {}, r = String(n.method || "GET").toUpperCase(), o = this.resolveValue(String(n.url || ""), s);
    if (!o)
      return { success: !1, outputs: {}, error: "No URL specified", nextHandle: "fail" };
    this.terminal.logHttpRequest(r, o);
    try {
      const a = {};
      if (n.headers && typeof n.headers == "object")
        for (const [y, u] of Object.entries(n.headers))
          a[y] = this.resolveValue(String(u), s);
      const l = {
        method: r,
        headers: a,
        signal: (i = this.abortController) == null ? void 0 : i.signal
      };
      n.body && ["POST", "PUT", "PATCH"].includes(r) && (l.body = typeof n.body == "string" ? this.resolveValue(n.body, s) : JSON.stringify(n.body), a["Content-Type"] = a["Content-Type"] || "application/json");
      const c = await fetch(o, l);
      this.terminal.logHttpResponse(c.status, c.statusText);
      let g;
      const h = c.headers.get("content-type");
      h != null && h.includes("application/json") ? g = await c.json() : g = await c.text();
      const v = {
        statusCode: c.status,
        status: c.statusText,
        body: g,
        response: g
        // Alias for easier access
      }, f = typeof g == "object" ? JSON.stringify(g).substring(0, 100) : String(g).substring(0, 100);
      if (this.terminal.log("debug", `   Response: ${f}${f.length >= 100 ? "..." : ""}`), n.outputs && typeof n.outputs == "object")
        for (const [y, u] of Object.entries(n.outputs)) {
          const p = String(u);
          let d;
          p.startsWith("$.") ? d = this.extractValue(g, p.substring(2)) : p.startsWith("$") ? d = this.extractValue(g, p.substring(1)) : d = this.extractValue(g, p), d !== void 0 && (v[y] = d, s.variables.set(y, d), this.terminal.log("info", `   📦 ${y} = ${typeof d == "object" ? JSON.stringify(d) : String(d).substring(0, 80)}`));
        }
      return {
        success: c.ok,
        outputs: v,
        nextHandle: c.ok ? "success" : "fail"
      };
    } catch (a) {
      return this.terminal.log("error", `   HTTP Error: ${a}`), {
        success: !1,
        outputs: { error: String(a) },
        error: String(a),
        nextHandle: "fail"
      };
    }
  }
  async executeVariableBlock(e, s) {
    const n = e.data || {}, r = {}, o = n.values || n.variables || {};
    for (const [i, a] of Object.entries(o)) {
      const l = this.resolveValue(String(a), s);
      r[i] = l, s.variables.set(i, l), this.terminal.logVariable(i, l);
    }
    return { success: !0, outputs: r, nextHandle: "success" };
  }
  async executeLogBlock(e, s) {
    const n = e.data || {}, r = this.resolveValue(String(n.message || ""), s), o = String(n.level || "info");
    return this.terminal.logMessage(o, r), { success: !0, outputs: { message: r }, nextHandle: "success" };
  }
  async executeDelayBlock(e, s) {
    const n = e.data || {};
    let r = Number(n.duration) || 1e3;
    return n.unit === "seconds" ? r *= 1e3 : n.unit === "minutes" && (r *= 6e4), this.terminal.log("debug", `   ⏱ Waiting ${r}ms...`), await new Promise((o, i) => {
      var l;
      const a = setTimeout(o, r);
      (l = this.abortController) == null || l.signal.addEventListener("abort", () => {
        clearTimeout(a), i(new Error("Aborted"));
      });
    }), { success: !0, outputs: {}, nextHandle: "success" };
  }
  async executeConditionBlock(e, s) {
    const n = e.data || {}, r = this.resolveValue(String(n.expression || n.condition || "true"), s);
    this.terminal.log("debug", `   🔀 Evaluating: ${r}`);
    try {
      const o = {};
      s.variables.forEach((l, c) => {
        o[c] = l;
      });
      const i = this.evaluateExpression(r, o), a = i ? "success" : "fail";
      return this.terminal.log("debug", `   → Result: ${i} (taking ${a} path)`), { success: !0, outputs: { result: i }, nextHandle: a };
    } catch (o) {
      return this.terminal.log("error", `   Condition error: ${o}`), { success: !1, outputs: {}, error: String(o), nextHandle: "fail" };
    }
  }
  async executeEvaluateBlock(e, s) {
    const n = e.data || {}, r = this.resolveValue(String(n.expression || ""), s);
    this.terminal.log("debug", `   🧮 Evaluating: ${r}`);
    try {
      const o = {};
      s.variables.forEach((a, l) => {
        o[l] = a;
      });
      const i = this.evaluateExpression(r, o);
      return this.terminal.logVariable("result", i), { success: !0, outputs: { result: i }, nextHandle: "success" };
    } catch (o) {
      return this.terminal.log("error", `   Evaluate error: ${o}`), { success: !1, outputs: {}, error: String(o), nextHandle: "fail" };
    }
  }
  async executeFileDownloadBlock(e, s) {
    var c, g;
    const n = e.data || {}, r = this.resolveValue(String(n.url || ""), s);
    if (!r)
      return { success: !1, outputs: {}, error: "No URL specified", nextHandle: "fail" };
    const o = String(n.encoding || "auto"), i = !!n.saveAs, a = this.resolveValue(String(n.fileName || r.split("/").pop() || "download"), s), l = String(n.outputVar || "fileData");
    this.terminal.log("info", `   Downloading ${r}`);
    try {
      const h = await fetch(r, { signal: (c = this.abortController) == null ? void 0 : c.signal });
      if (!h.ok)
        return { success: !1, outputs: { statusCode: h.status }, error: `HTTP ${h.status}`, nextHandle: "fail" };
      const v = ((g = h.headers.get("content-type")) == null ? void 0 : g.split(";")[0]) || "application/octet-stream", f = await h.blob(), y = f.size;
      let u;
      if (o === "text" || o === "auto" && v.startsWith("text/"))
        u = await f.text();
      else {
        const m = await f.arrayBuffer(), b = new Uint8Array(m);
        let x = "";
        for (let S = 0; S < b.length; S++) x += String.fromCharCode(b[S]);
        u = `data:${v};base64,${btoa(x)}`;
      }
      if (i) {
        const m = document.createElement("a");
        m.href = URL.createObjectURL(f), m.download = a, document.body.appendChild(m), m.click(), document.body.removeChild(m), setTimeout(() => URL.revokeObjectURL(m.href), 1e3);
      }
      const d = { fileData: u, fileName: a, mimeType: v, size: y };
      return s.variables.set(l, u), s.variables.set("fileName", a), s.variables.set("mimeType", v), s.variables.set("fileSize", y), this.terminal.log("info", `   Downloaded ${a} (${(y / 1024).toFixed(1)} KB, ${v})`), { success: !0, outputs: d, nextHandle: "success" };
    } catch (h) {
      return this.terminal.log("error", `   File download error: ${h}`), { success: !1, outputs: { error: String(h) }, error: String(h), nextHandle: "fail" };
    }
  }
  async executeFileUploadBlock(e, s) {
    const n = e.data || {}, r = String(n.accept || "*/*"), o = String(n.encoding || "auto"), i = String(n.outputVar || "uploadedFile");
    this.terminal.log("info", "   Waiting for file selection...");
    try {
      const a = await new Promise((y, u) => {
        var m;
        const p = document.createElement("input");
        p.type = "file", p.accept = r, p.style.cssText = "position:fixed;opacity:0;pointer-events:none;", document.body.appendChild(p);
        const d = () => document.body.removeChild(p);
        p.addEventListener("change", () => {
          var x;
          const b = (x = p.files) == null ? void 0 : x[0];
          d(), b ? y(b) : u(new Error("No file selected"));
        }), p.addEventListener("cancel", () => {
          d(), u(new Error("File selection cancelled"));
        }), (m = this.abortController) == null || m.signal.addEventListener("abort", () => {
          d(), u(new Error("Execution aborted"));
        }), p.click();
      }), l = a.type || "application/octet-stream", c = a.size, g = a.name, h = o === "text" || o === "auto" && (a.type.startsWith("text/") || /\.(csv|txt|md|json|xml|html|yaml|yml)$/i.test(a.name)), v = await new Promise((y, u) => {
        const p = new FileReader();
        p.onload = () => y(p.result), p.onerror = () => u(p.error), h ? p.readAsText(a) : p.readAsDataURL(a);
      }), f = { fileData: v, fileName: g, mimeType: l, size: c };
      return s.variables.set(i, v), s.variables.set("fileName", g), s.variables.set("mimeType", l), s.variables.set("fileSize", c), this.terminal.log("info", `   Uploaded ${g} (${(c / 1024).toFixed(1)} KB, ${l})`), { success: !0, outputs: f, nextHandle: "success" };
    } catch (a) {
      return this.terminal.log("error", `   File upload error: ${a}`), { success: !1, outputs: { error: String(a) }, error: String(a), nextHandle: "fail" };
    }
  }
  async executeFileStreamWriterBlock(e, s) {
    const n = e.data || {}, r = String(n.streamVar || "stream"), o = this.resolveValue(String(n.value || ""), s), a = (n.separator !== void 0 ? String(n.separator) : "\\n").replace(/\\n/g, `
`).replace(/\\t/g, "	"), l = s.variables.get(r), c = typeof l == "string" && l.length > 0 ? l + a + o : o;
    return s.variables.set(r, c), this.terminal.log("debug", `   Stream "${r}" += ${JSON.stringify(o).substring(0, 60)}`), { success: !0, outputs: { [r]: c }, nextHandle: "out" };
  }
  async executeFileStreamReaderBlock(e, s) {
    var p;
    const n = e.data || {}, r = String(n.source || ""), o = String(n.mode || "lines"), i = Math.max(1, Number(n.chunkSize) || 1), a = Math.max(0, Number(n.skip) || 0), l = Math.max(0, Number(n.limit) || 0), c = String(n.outputVar || "chunk"), g = r ? s.variables.get(r) ?? this.resolveValue(r, s) : "", h = String(g);
    let v;
    if (o === "lines") {
      let d = h.split(`
`);
      if (a > 0 && (d = d.slice(a)), l > 0 && (d = d.slice(0, l * i)), i === 1)
        v = d;
      else {
        v = [];
        for (let m = 0; m < d.length; m += i)
          v.push(d.slice(m, m + i).join(`
`));
      }
    } else if (o === "chars") {
      const d = a * i, m = l > 0 ? d + l * i : h.length;
      v = [];
      for (let b = d; b < Math.min(m, h.length); b += i)
        v.push(h.slice(b, b + i));
    } else {
      const d = h.includes(",") ? h.split(",")[1] : h, m = Math.ceil(i * 4 / 3), b = a * m, x = l > 0 ? b + l * m : d.length;
      v = [];
      for (let S = b; S < Math.min(x, d.length); S += m)
        v.push(d.slice(S, S + m));
    }
    const f = v.length, y = v.length * i;
    this.terminal.log("debug", `   Stream Reader: ${f} chunks (mode=${o}, chunkSize=${i}${a > 0 ? `, skip=${a}` : ""}${l > 0 ? `, limit=${l}` : ""})`), s.variables.set("chunkCount", f), s.variables.set("totalLines", y);
    const u = this.edges.filter(
      (d) => d.source === e.id && d.type === Oe.Execution && d.sourceHandle === "each"
    );
    for (let d = 0; d < v.length; d++) {
      if ((p = this.abortController) != null && p.signal.aborted) throw new Error("Execution aborted");
      d > 0 && d % 50 === 0 && (this.terminal.log("debug", `   ... ${d}/${f} chunks processed`), await new Promise((m) => setTimeout(m, 0))), s.variables.set("chunkIndex", d), s.variables.set("chunkCount", f), s.variables.set(c, v[d]), s.variables.set("chunk", v[d]);
      for (const m of u) {
        const b = this.nodes.get(m.target);
        b && await this.executeNode(b, s);
      }
    }
    return {
      success: !0,
      outputs: { chunkCount: f, totalLines: y, lastChunk: v[v.length - 1] ?? "" },
      nextHandle: "done"
    };
  }
  async executeLoopBlock(e, s) {
    var l;
    const n = e.data || {};
    let r = [];
    const o = n.items || n.array || "[]";
    if (typeof o == "string") {
      const c = this.resolveValue(o, s);
      try {
        r = JSON.parse(c);
      } catch {
        r = c.split(",").map((g) => g.trim());
      }
    } else Array.isArray(o) && (r = o);
    this.terminal.log("debug", `   🔄 Looping over ${r.length} items`), s.variables.set("loopItems", r), s.variables.set("loopCount", r.length);
    const i = this.edges.filter(
      (c) => c.source === e.id && c.type === Oe.Execution && c.sourceHandle === "each"
    );
    for (let c = 0; c < r.length; c++) {
      if ((l = this.abortController) != null && l.signal.aborted)
        throw new Error("Execution aborted");
      c > 0 && c % 50 === 0 && await new Promise((g) => setTimeout(g, 0)), s.variables.set("loopIndex", c), s.variables.set("loopItem", r[c]), this.terminal.log("info", `   🔄 Iteration ${c + 1}/${r.length}`);
      for (const g of i) {
        const h = this.nodes.get(g.target);
        h && await this.executeNode(h, s);
      }
    }
    return { success: !0, outputs: {
      items: r,
      count: r.length,
      loopIndex: r.length - 1,
      loopItem: r[r.length - 1]
    }, nextHandle: "done" };
  }
  /**
   * Resolve {{variable}} placeholders
   */
  resolveValue(e, s) {
    return typeof e != "string" ? e : e.replace(/\{\{([^}]+)\}\}/g, (n, r) => {
      const o = r.trim();
      if (s.variables.has(o)) {
        const i = s.variables.get(o);
        return typeof i == "object" ? JSON.stringify(i) : String(i);
      }
      if (o.includes(".")) {
        const i = o.split("."), a = i[0];
        if (s.variables.has(a)) {
          const l = this.extractValue(s.variables.get(a), i.slice(1).join("."));
          if (l !== void 0)
            return typeof l == "object" ? JSON.stringify(l) : String(l);
        }
      }
      return n;
    });
  }
  /**
   * Extract value using dot notation path
   */
  extractValue(e, s) {
    const n = s.replace(/\[(\d+)\]/g, ".$1").split(".").filter((o) => o !== "");
    let r = e;
    for (const o of n) {
      if (r == null) return;
      r = r[o];
    }
    return r;
  }
  /**
   * Simple expression evaluator
   */
  evaluateExpression(e, s) {
    let n = e;
    for (const [r, o] of Object.entries(s)) {
      const i = new RegExp(`\\b${r}\\b`, "g");
      n = n.replace(i, JSON.stringify(o));
    }
    try {
      return /^[\d\s\+\-\*\/\(\)\<\>\=\!\&\|\.\[\]\"\'true false null]+$/i.test(n) ? Function(`"use strict"; return (${n})`)() : n;
    } catch {
      return n;
    }
  }
}
let se = null;
function qo() {
  return se || (se = new Jo(En), Qn(se), se.setStateChangeCallback((t) => {
    Rt(t), t === "idle" && (A.clearAllHighlights(), Je(null), ct(null));
  }), se.setBlockHighlightCallback((t, e) => {
    A.setBlockHighlight(t, e);
  }), se.setContextUpdateCallback((t, e, s) => {
    Je({ ...t }), Ut({ ...e }), ct(s);
  })), se;
}
async function Go() {
  const t = qo(), e = {
    id: "workflow-" + Date.now(),
    name: "Workflow",
    version: "2.0.0",
    nodes: Object.values(R).map((s) => ({
      id: s.id,
      type: s.type,
      label: s.name,
      data: { ...s.fieldValues }
    })),
    edges: Object.values(Ce).map((s) => ({
      id: s.id,
      type: s.type,
      source: s.sourceBlockId,
      sourceHandle: s.sourcePortName,
      target: s.targetBlockId,
      targetHandle: s.targetPortName
    }))
  };
  await t.execute(e);
}
const Yo = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  runWorkflow: Go
}, Symbol.toStringTag, { value: "Module" }));
export {
  gn as BLOCK_COLORS,
  $ as BlockType,
  Oe as EdgeType,
  Zo as WorkflowDesigner,
  Ko as apiManager,
  A as storeActions
};
