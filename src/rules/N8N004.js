import { activeNodes } from "../util.js";

const PLACEHOLDER =
  /REPLACE|YOUR_|CHANGE_ME|PLACEHOLDER|TODO|<.+>|\{\{|^x{3,}|^\*+$/i;

export default {
  id: "N8N004",
  severity: "info",
  title: "Credential referenced by instance id/name, not placeholder",
  message: "Node references an instance-specific credential.",
  fix: 'Before sharing the workflow as a template, replace credential ids/names with placeholders (or strip the "credentials" key).',
  why: "Credential ids and names reveal how your instance is wired and break on import. Shared templates should use placeholders.",
  bad: '{ "credentials": { "slackApi": { "id": "Qx81aB", "name": "Acme prod Slack" } } }',
  good: '{ "credentials": { "slackApi": { "id": "REPLACE_ME", "name": "REPLACE_ME" } } }',
  check(wf) {
    const out = [];
    for (const n of activeNodes(wf)) {
      for (const [type, ref] of Object.entries(n.credentials || {})) {
        const id = String(ref?.id ?? ""),
          name = String(ref?.name ?? "");
        if (
          (id && !PLACEHOLDER.test(id)) ||
          (name && !PLACEHOLDER.test(name))
        ) {
          out.push({
            node: n.name,
            message: `Credential "${type}" is referenced as "${name || id}".`,
          });
        }
      }
    }
    return out;
  },
};
