import { activeNodes } from "../util.js";

// Bundled table: oldest typeVersion we still consider current, and node types that were replaced.
// Conservative on purpose. Update when n8n ships a new major node version.
export const MIN_VERSION = {
  "n8n-nodes-base.httpRequest": 4,
  "n8n-nodes-base.set": 3,
  "n8n-nodes-base.if": 2,
  "n8n-nodes-base.switch": 3,
  "n8n-nodes-base.merge": 3,
  "n8n-nodes-base.splitInBatches": 3,
  "n8n-nodes-base.webhook": 2,
};
export const REPLACED = {
  "n8n-nodes-base.function": "Code node",
  "n8n-nodes-base.functionItem": "Code node",
  "n8n-nodes-base.start": "a Manual Trigger or another trigger node",
};

export default {
  id: "N8N015",
  severity: "low",
  title: "Deprecated node typeVersion",
  message: "Node uses an outdated typeVersion or a replaced node type.",
  fix: "Re-add the node from the node panel (or open and re-save it in a current n8n) so it picks up the current version.",
  why: "Old node versions miss bug fixes and options, and replaced node types are eventually removed.",
  bad: '{ "type": "n8n-nodes-base.httpRequest", "typeVersion": 1 }',
  good: '{ "type": "n8n-nodes-base.httpRequest", "typeVersion": 4.2 }',
  check(wf) {
    const out = [];
    for (const n of activeNodes(wf)) {
      if (REPLACED[n.type])
        out.push({
          node: n.name,
          message: `"${n.type}" is replaced by ${REPLACED[n.type]}.`,
        });
      else if (
        MIN_VERSION[n.type] &&
        Number(n.typeVersion) < MIN_VERSION[n.type]
      ) {
        out.push({
          node: n.name,
          message: `typeVersion ${n.typeVersion} is older than ${MIN_VERSION[n.type]} for ${n.type}.`,
        });
      }
    }
    return out;
  },
};
