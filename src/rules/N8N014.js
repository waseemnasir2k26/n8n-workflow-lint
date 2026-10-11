import { activeNodes } from "../util.js";

const DEFAULTS =
  /^(HTTP Request|Code|Edit Fields|Set|IF|If|Switch|Merge|Function|Filter|Loop Over Items|Split In Batches|Execute Command|Respond to Webhook|AI Agent|OpenAI Chat Model|Wait|No Operation, do nothing)\s?\d*$/;

export default {
  id: "N8N014",
  severity: "low",
  title: "Default node names",
  message: "Nodes still carry default names.",
  fix: 'Rename nodes to say what they do ("Fetch Orders", "Is VIP?"). Expressions that reference them become readable.',
  why: "Names like \"HTTP Request1\" make errors, execution logs and expressions ($('HTTP Request1')) impossible to read at 3am.",
  bad: '{ "name": "HTTP Request1" }',
  good: '{ "name": "Fetch Open Invoices" }',
  check(wf) {
    const bad = activeNodes(wf).filter((n) => DEFAULTS.test(n.name || ""));
    if (!bad.length) return [];
    const list = bad
      .slice(0, 5)
      .map((n) => `"${n.name}"`)
      .join(", ");
    return [
      {
        node: bad[0].name,
        message: `${bad.length} node(s) have default names: ${list}${bad.length > 5 ? ", ..." : ""}.`,
      },
    ];
  },
};
