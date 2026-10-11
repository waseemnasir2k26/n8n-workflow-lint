import { activeNodes, isTrigger } from "../util.js";

export default {
  id: "N8N017",
  severity: "medium",
  title: "No trigger node",
  message: "Workflow has no trigger node.",
  fix: "Add a Schedule, Webhook or other trigger, or mark the workflow as a sub-workflow with an Execute Workflow Trigger.",
  why: 'A workflow with no trigger never runs on its own, so a "scheduled" automation silently does nothing.',
  bad: "nodes: [ HTTP Request, Set ]",
  good: "nodes: [ Schedule Trigger, HTTP Request, Set ]",
  check(wf) {
    const nodes = activeNodes(wf);
    return nodes.length && !nodes.some(isTrigger) ? [{}] : [];
  },
};
