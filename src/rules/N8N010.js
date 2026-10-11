import { typeIs } from "../util.js";

export default {
  id: "N8N010",
  severity: "high",
  title: "No error workflow",
  message: "No Error Workflow is configured and there is no Error Trigger.",
  fix: "Set Settings -> Error Workflow to a workflow that starts with an Error Trigger and alerts you (Slack, email).",
  why: "Without an error workflow, production failures are silent until a customer tells you.",
  bad: '{ "settings": {} }',
  good: '{ "settings": { "errorWorkflow": "<id of your error workflow>" } }',
  check(wf) {
    if (wf.settings?.errorWorkflow) return [];
    if ((wf.nodes || []).some((n) => !n.disabled && typeIs(n, ".errorTrigger")))
      return [];
    return [{}];
  },
};
