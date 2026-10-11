import { activeNodes, typeIs } from "../util.js";

export default {
  id: "N8N003",
  severity: "high",
  title: "Webhook with no authentication",
  message: "Webhook node accepts unauthenticated requests.",
  fix: "Set Authentication to Header Auth / Basic Auth / JWT on the Webhook node, or verify a signature in the first node.",
  why: 'A public production URL with authentication "none" lets anyone on the internet trigger your workflow and spend your API credits.',
  bad: '{ "type": "n8n-nodes-base.webhook", "parameters": { "path": "orders" } }',
  good: '{ "type": "n8n-nodes-base.webhook", "parameters": { "path": "orders", "authentication": "headerAuth" } }',
  check(wf) {
    return activeNodes(wf)
      .filter((n) => typeIs(n, ".webhook"))
      .filter(
        (n) =>
          !n.parameters?.authentication ||
          n.parameters.authentication === "none",
      )
      .map((n) => ({ node: n.name }));
  },
};
