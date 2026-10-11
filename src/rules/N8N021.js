import { activeNodes, cycles, isLLM, typeIs } from "../util.js";

export default {
  id: "N8N021",
  severity: "high",
  title: "Retry path loops back into an LLM node",
  message: "A connection cycle passes through an LLM/Agent node.",
  fix: "Break the cycle: cap attempts with a counter and an IF, or use node-level Retry On Fail (bounded by maxTries) instead of wiring a loop.",
  why: "A hand-wired retry that re-enters an LLM node has no built-in ceiling, so every failure becomes another paid call.",
  bad: "LLM Call -> IF failed? -> (true) -> LLM Call",
  good: "LLM Call (Retry On Fail, maxTries 3) -> IF failed? -> Alert",
  check(wf) {
    const byName = new Map(activeNodes(wf).map((n) => [n.name, n]));
    const out = [];
    for (const comp of cycles(wf)) {
      const nodes = comp.map((c) => byName.get(c)).filter(Boolean);
      if (nodes.some((n) => typeIs(n, ".splitInBatches"))) continue; // intended batch loop, see N8N012
      const llm = nodes.find(isLLM);
      if (llm)
        out.push({
          node: llm.name,
          message: `Cycle through ${comp
            .slice()
            .sort()
            .map((c) => `"${c}"`)
            .join(" -> ")} re-enters an LLM node with no ceiling.`,
        });
    }
    return out;
  },
};
