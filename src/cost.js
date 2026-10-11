import fs from "node:fs";
import {
  activeNodes,
  edges,
  isAgent,
  isStandaloneLLM,
  typeIs,
} from "./util.js";

export const PRICES = JSON.parse(
  fs.readFileSync(new URL("./prices.json", import.meta.url), "utf8"),
);
const MODEL_KEYS = Object.keys(PRICES.models).sort(
  (a, b) => b.length - a.length,
);

export const DEFAULT_ITERATIONS = 10;

export function priceAgeDays(now = new Date()) {
  return Math.floor(
    (now.getTime() - new Date(PRICES.date + "T00:00:00Z").getTime()) / 86400000,
  );
}
export function priceWarning(now = new Date()) {
  const age = priceAgeDays(now);
  return age > 90
    ? `Bundled price table is ${age} days old (dated ${PRICES.date}); cost estimates may be stale.`
    : null;
}

function modelName(n) {
  const p = n.parameters || {};
  const cand = [p.model, p.modelName, p.options?.model, p.options?.modelName];
  for (const c of cand) {
    if (typeof c === "string" && c && !c.startsWith("=")) return c;
    if (c && typeof c === "object" && typeof c.value === "string")
      return c.value;
  }
  return "";
}

export function priceFor(name) {
  const lower = name.toLowerCase();
  const key = MODEL_KEYS.find((k) => lower.includes(k));
  return key
    ? { ...PRICES.models[key], model: key, assumed: false }
    : { ...PRICES.default, model: name || "unknown", assumed: true };
}

/** Rough, upper-bound token-cost estimate per workflow. See README "Cost model". */
export function estimate(wf, { runsPerDay = 100, now = new Date() } = {}) {
  const nodes = activeNodes(wf);
  const byName = new Map(nodes.map((n) => [n.name, n]));
  const modelOf = new Map(); // consumer name -> model node
  for (const [from, to, ctype] of edges(wf)) {
    if (ctype === "ai_languageModel" && byName.has(from))
      modelOf.set(to, byName.get(from));
  }
  const { inputTokensPerCall: tin, outputTokensPerCall: tout } =
    PRICES.assumptions;
  const rows = [];
  for (const n of nodes) {
    let calls = 0;
    if (isAgent(n)) {
      const m = Number(n.parameters?.options?.maxIterations);
      calls = Number.isFinite(m) && m > 0 ? m : DEFAULT_ITERATIONS;
    } else if (isStandaloneLLM(n) || typeIs(n, ".chainLlm")) calls = 1;
    if (!calls) continue;
    const modelNode = modelOf.get(n.name);
    const name = modelName(modelNode || n) || modelName(n);
    const price = priceFor(name);
    const perCall = (price.in * tin + price.out * tout) / 1e6;
    rows.push({
      node: n.name,
      model: price.model,
      assumedPrice: price.assumed,
      callsPerRun: calls,
      perRunUsd: perCall * calls,
    });
  }
  const perRunUsd = rows.reduce((a, r) => a + r.perRunUsd, 0);
  const monthlyUsd = perRunUsd * runsPerDay * 30;
  return {
    runsPerDay,
    rows,
    perRunUsd,
    monthlyUsd,
    pricesDate: PRICES.date,
    stale: priceAgeDays(now) > 90,
  };
}
