import { activeNodes, edges, isAgent, isHttp, reachable } from "../util.js";

export default {
  id: "N8N022",
  severity: "high",
  title: "HTTP error output wired back into an agent",
  message: "An HTTP Request error output feeds an AI Agent.",
  fix: "Send the error output to an alert/stop path (Stop and Error, Slack), not back into the agent. Cap agent iterations (N8N020).",
  why: "An agent that receives a 404/500 as fresh input tends to retry the same tool call. One community report describes this pattern costing $300 in about 30 minutes.",
  bad: "HTTP Request (On Error: continue using error output) -[error]-> AI Agent",
  good: "HTTP Request -[error]-> Stop and Error",
  check(wf) {
    const out = [];
    const nodes = activeNodes(wf);
    const agents = new Set(nodes.filter(isAgent).map((n) => n.name));
    if (!agents.size) return out;
    const all = edges(wf);
    for (const n of nodes.filter(isHttp)) {
      if (n.onError !== "continueErrorOutput") continue;
      const starts = all
        .filter(([f, , c, i]) => f === n.name && c === "main" && i === 1)
        .map(([, t]) => t);
      if (!starts.length) continue;
      const hit = [...reachable(wf, starts)].find((x) => agents.has(x));
      if (hit)
        out.push({
          node: n.name,
          message: `Error output of "${n.name}" reaches AI Agent "${hit}".`,
        });
    }
    return out;
  },
};
