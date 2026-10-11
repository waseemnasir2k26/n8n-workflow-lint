import { activeNodes, typeIs, walkStrings, entropy, mask } from "../util.js";

const PACK = [
  ["OpenAI-style key", /\bsk-(?:proj-|ant-)?[A-Za-z0-9_-]{20,}/],
  [
    "GitHub token",
    /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{36}\b|\bgithub_pat_[A-Za-z0-9_]{22,}/,
  ],
  ["Slack token", /\bxox[abprs]-[A-Za-z0-9-]{10,}/],
  ["AWS access key id", /\bAKIA[0-9A-Z]{16}\b/],
  ["Google API key", /\bAIza[0-9A-Za-z_-]{35}\b/],
  ["Bearer token", /\bBearer\s+(?!\{\{|\$)[A-Za-z0-9._~+/=-]{20,}/],
  ["Private key block", /-----BEGIN (?:RSA |EC |OPENSSH |)PRIVATE KEY-----/],
];
const SECRETISH = /key|token|secret|passw|auth|bearer|signature|credential/i;

export default {
  id: "N8N001",
  severity: "critical",
  title: "Hardcoded secret in Code or HTTP node",
  message: "Hardcoded secret in a Code/HTTP node.",
  fix: "Move the value into an n8n credential or an environment variable and reference it by expression; rotate the exposed secret.",
  why: "Workflow JSON is routinely pasted into forums, tickets and git. A key typed into a header or Code node travels with the export.",
  bad: '{ "name": "Authorization", "value": "Bearer <a 30+ character literal token>" }',
  good: '{ "name": "Authorization", "value": "={{ \'Bearer \' + $env.API_TOKEN }}" }',
  check(wf) {
    const out = [];
    for (const n of activeNodes(wf)) {
      if (
        !typeIs(
          n,
          ".code",
          ".function",
          ".functionItem",
          ".httpRequest",
          ".toolHttpRequest",
        )
      )
        continue;
      for (const [label, str, p] of walkStrings(n.parameters || {})) {
        let hit = null;
        for (const [name, re] of PACK) {
          const m = str.match(re);
          if (m) {
            hit = [name, m[0]];
            break;
          }
        }
        if (
          !hit &&
          SECRETISH.test(label) &&
          !/\s/.test(str) &&
          str.length >= 20 &&
          !/\{\{|^=\s*\$|^https?:/.test(str)
        ) {
          if (/[0-9]/.test(str) && /[A-Za-z]/.test(str) && entropy(str) >= 3.8)
            hit = ["High-entropy value", str];
        }
        if (hit)
          out.push({
            node: n.name,
            message: `${hit[0]} at ${p || "parameters"} (${mask(hit[1])}).`,
          });
      }
    }
    return out;
  },
};
