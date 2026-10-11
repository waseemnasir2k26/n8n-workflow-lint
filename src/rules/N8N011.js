import { activeNodes, isHttp } from "../util.js";

export default {
  id: "N8N011",
  severity: "medium",
  title: "HTTP Request without retry or timeout",
  message: "HTTP Request has no retry/timeout.",
  fix: 'Enable "Retry On Fail" (3 tries, 2-5 s wait) and set Options -> Timeout (e.g. 30000 ms).',
  why: "Remote APIs fail transiently. A missing timeout can hang an execution; a missing retry turns a blip into a failed run.",
  bad: '{ "type": "n8n-nodes-base.httpRequest", "parameters": { "url": "https://api.example.com" } }',
  good: '{ "type": "n8n-nodes-base.httpRequest", "retryOnFail": true, "maxTries": 3, "parameters": { "options": { "timeout": 30000 } } }',
  check(wf) {
    const out = [];
    for (const n of activeNodes(wf).filter(isHttp)) {
      const missing = [];
      if (!n.retryOnFail) missing.push("retryOnFail");
      if (!n.parameters?.options?.timeout) missing.push("timeout");
      if (missing.length)
        out.push({
          node: n.name,
          message: `HTTP Request is missing ${missing.join(" and ")}.`,
        });
    }
    return out;
  },
};
