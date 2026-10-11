// Shared helpers: node classification, graph building, string walking, entropy.

export const SEVERITIES = ["info", "low", "medium", "high", "critical"];
export const sevRank = (s) => SEVERITIES.indexOf(s);

export const isSticky = (n) => /stickyNote$/i.test(n.type || "");
export const typeIs = (n, ...names) =>
  names.some((t) => (n.type || "").toLowerCase().endsWith(t.toLowerCase()));
export const activeNodes = (wf) =>
  (wf.nodes || []).filter((n) => n && !n.disabled && !isSticky(n));

export function isTrigger(n) {
  const t = (n.type || "").toLowerCase();
  return (
    /trigger$/.test(t) ||
    t.endsWith(".webhook") ||
    t.endsWith(".start") ||
    t.endsWith(".cron")
  );
}
export const isAgent = (n) => /langchain\.agent$/i.test(n.type || "");
export const isLLMModel = (n) => /langchain\.lm[a-z]+$/i.test(n.type || "");
export const isStandaloneLLM = (n) =>
  /(n8n-nodes-base|langchain)\.(openai|anthropic|googlegemini|mistralai|chainllm)$/i.test(
    n.type || "",
  );
export const isLLM = (n) => isAgent(n) || isLLMModel(n) || isStandaloneLLM(n);
export const isHttp = (n) => typeIs(n, ".httpRequest");

/** Edges as [from, to, connType, outputIndex]. */
export function edges(wf) {
  const out = [];
  for (const [from, byType] of Object.entries(wf.connections || {})) {
    for (const [ctype, outputs] of Object.entries(byType || {})) {
      (outputs || []).forEach((targets, idx) => {
        for (const t of targets || []) out.push([from, t.node, ctype, idx]);
      });
    }
  }
  return out;
}

/** Cycles over `main` edges (Tarjan SCC); returns arrays of node names. */
export function cycles(wf) {
  const adj = new Map();
  for (const [a, b, c] of edges(wf)) {
    if (c !== "main") continue;
    if (!adj.has(a)) adj.set(a, []);
    adj.get(a).push(b);
  }
  let idx = 0;
  const st = [],
    on = new Set(),
    ix = new Map(),
    low = new Map(),
    res = [];
  const strong = (v) => {
    ix.set(v, idx);
    low.set(v, idx);
    idx++;
    st.push(v);
    on.add(v);
    for (const w of adj.get(v) || []) {
      if (!ix.has(w)) {
        strong(w);
        low.set(v, Math.min(low.get(v), low.get(w)));
      } else if (on.has(w)) low.set(v, Math.min(low.get(v), ix.get(w)));
    }
    if (low.get(v) === ix.get(v)) {
      const comp = [];
      let w;
      do {
        w = st.pop();
        on.delete(w);
        comp.push(w);
      } while (w !== v);
      if (comp.length > 1 || (adj.get(v) || []).includes(v)) res.push(comp);
    }
  };
  for (const v of adj.keys()) if (!ix.has(v)) strong(v);
  return res;
}

/** Nodes reachable from `starts` following main edges forward and sub-node edges parent -> child. */
export function reachable(wf, starts) {
  const adj = new Map();
  const add = (a, b) => {
    if (!adj.has(a)) adj.set(a, []);
    adj.get(a).push(b);
  };
  for (const [a, b, c] of edges(wf)) {
    if (c === "main") add(a, b);
    else add(b, a);
  }
  const seen = new Set(starts);
  const q = [...starts];
  while (q.length)
    for (const w of adj.get(q.pop()) || [])
      if (!seen.has(w)) {
        seen.add(w);
        q.push(w);
      }
  return seen;
}

/** Yield [label, string, path] for every string leaf. `label` is the nearest key or {name,value} name. */
export function* walkStrings(value, path = "", label = "") {
  if (typeof value === "string") {
    yield [label, value, path];
    return;
  }
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++)
      yield* walkStrings(value[i], `${path}[${i}]`, label);
    return;
  }
  if (value && typeof value === "object") {
    const named =
      typeof value.name === "string" && typeof value.value === "string";
    for (const [k, v] of Object.entries(value)) {
      if (named && k === "value") yield [value.name, v, `${path}.${k}`];
      else yield* walkStrings(v, path ? `${path}.${k}` : k, k);
    }
  }
}

export function entropy(s) {
  const f = new Map();
  for (const ch of s) f.set(ch, (f.get(ch) || 0) + 1);
  let h = 0;
  for (const c of f.values()) {
    const p = c / s.length;
    h -= p * Math.log2(p);
  }
  return h;
}

export const mask = (s) =>
  s.length <= 8 ? "****" : `${s.slice(0, 4)}...(${s.length} chars)`;
