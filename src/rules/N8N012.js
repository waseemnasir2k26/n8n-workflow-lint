import { activeNodes, typeIs, edges } from "../util.js";

export default {
  id: "N8N012",
  severity: "medium",
  title: "Loop with no exit branch",
  message: 'Loop Over Items has no exit ("done") branch.',
  fix: 'Connect the "done" output (output 0 in Loop Over Items v3) to the next step, so the loop can finish and continue.',
  why: "A batch loop whose finished branch goes nowhere never hands results on, and a mis-wired loop can run forever.",
  bad: '{ "type": "n8n-nodes-base.splitInBatches", "typeVersion": 3 }  // output 0 unconnected',
  good: 'Connect output 0 ("done") to a downstream node.',
  check(wf) {
    const out = [];
    const all = edges(wf);
    for (const n of activeNodes(wf).filter((x) =>
      typeIs(x, ".splitInBatches"),
    )) {
      if ((n.typeVersion ?? 1) >= 3) {
        if (!all.some(([f, , c, i]) => f === n.name && c === "main" && i === 0))
          out.push({ node: n.name });
      } else if (!JSON.stringify(wf.nodes).includes("noItemsLeft")) {
        out.push({
          node: n.name,
          message:
            "Loop (v<3) never checks noItemsLeft, so it has no exit condition.",
        });
      }
    }
    return out;
  },
};
