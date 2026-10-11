import { activeNodes, edges, isTrigger, reachable } from "../util.js";

export default {
  id: "N8N013",
  severity: "low",
  title: "Orphan or disconnected node",
  message: "Node is not connected to the workflow.",
  fix: "Connect the node, or delete it. Disable it only if you plan to use it again.",
  why: "Dead nodes hide stale logic and mislead the next person who edits the workflow.",
  bad: "A node with no incoming or outgoing connection.",
  good: "Every active node sits on a path from a trigger.",
  check(wf) {
    const nodes = activeNodes(wf);
    if (nodes.length < 2) return [];
    const touched = new Set();
    for (const [a, b] of edges(wf)) {
      touched.add(a);
      touched.add(b);
    }
    const out = [];
    nodes
      .filter((n) => !touched.has(n.name))
      .forEach((n) =>
        out.push({
          node: n.name,
          message: "Node has no connections (orphan).",
        }),
      );
    const triggers = nodes.filter(isTrigger).map((n) => n.name);
    if (triggers.length) {
      const reach = reachable(wf, triggers);
      for (const n of nodes) {
        if (
          touched.has(n.name) &&
          !reach.has(n.name) &&
          !triggers.includes(n.name)
        )
          out.push({
            node: n.name,
            message: "Node is not reachable from any trigger.",
          });
      }
    }
    return out;
  },
};
