import { isSticky } from "../util.js";

export default {
  id: "N8N018",
  severity: "info",
  title: "Disabled nodes left in workflow",
  message: "Workflow contains disabled nodes.",
  fix: "Delete experiments you are done with; keep the history in git instead of in the canvas.",
  why: "Disabled nodes rot: nobody remembers why they exist or whether re-enabling them is safe.",
  bad: '{ "name": "Old Notify", "disabled": true }',
  good: "Remove the node.",
  check(wf) {
    const off = (wf.nodes || []).filter((n) => n.disabled && !isSticky(n));
    return off.length
      ? [
          {
            node: off[0].name,
            message: `${off.length} disabled node(s): ${off
              .slice(0, 5)
              .map((n) => `"${n.name}"`)
              .join(", ")}.`,
          },
        ]
      : [];
  },
};
