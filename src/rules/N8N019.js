import { activeNodes, typeIs } from "../util.js";

export default {
  id: "N8N019",
  severity: "medium",
  title: "Execute Command node",
  message: "Execute Command runs shell commands on the n8n host.",
  fix: "Replace it with a dedicated node, an HTTP call to a service, or a sandboxed worker. If you must keep it, never interpolate user input.",
  why: "Shell execution plus expression input is a command-injection path, and n8n Cloud does not allow the node at all.",
  bad: '{ "type": "n8n-nodes-base.executeCommand" }',
  good: "Use an HTTP Request to a small internal service instead.",
  check(wf) {
    return activeNodes(wf)
      .filter((n) => typeIs(n, ".executeCommand"))
      .map((n) => ({ node: n.name }));
  },
};
