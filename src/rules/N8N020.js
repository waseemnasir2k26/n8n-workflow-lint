import { activeNodes, isAgent } from "../util.js";

export const MAX_ITER_LIMIT = 10;

export default {
  id: "N8N020",
  severity: "high",
  title: "AI Agent without a sane iteration cap",
  message: "AI Agent has no explicit maxIterations or it is above 10.",
  fix: "Set Options -> Max Iterations to a small number (3-5 for most agents; never above 10).",
  why: "An agent that keeps calling tools can loop on every failure. The iteration cap is the cheapest circuit breaker you have.",
  bad: '{ "type": "@n8n/n8n-nodes-langchain.agent", "parameters": { "options": {} } }',
  good: '{ "type": "@n8n/n8n-nodes-langchain.agent", "parameters": { "options": { "maxIterations": 5 } } }',
  check(wf) {
    const out = [];
    for (const n of activeNodes(wf).filter(isAgent)) {
      const m = n.parameters?.options?.maxIterations;
      if (m === undefined || m === null || m === "") {
        out.push({
          node: n.name,
          severity: "medium",
          message:
            "AI Agent relies on the default iteration limit (no explicit maxIterations).",
        });
      } else if (typeof m === "number" && m > MAX_ITER_LIMIT) {
        out.push({
          node: n.name,
          message: `maxIterations is ${m} (limit ${MAX_ITER_LIMIT}).`,
        });
      } else if (
        typeof m === "string" &&
        !Number.isNaN(Number(m)) &&
        Number(m) > MAX_ITER_LIMIT
      ) {
        out.push({
          node: n.name,
          message: `maxIterations is ${m} (limit ${MAX_ITER_LIMIT}).`,
        });
      }
    }
    return out;
  },
};
