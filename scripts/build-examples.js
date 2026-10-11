// Regenerates examples/*: the risky "before" workflow, the fixed "after" workflow and real reports from the CLI code.
// Run: node scripts/build-examples.js
import fs from "node:fs";
import { lintPaths } from "../src/index.js";
import text from "../src/report/text.js";
import md from "../src/report/md.js";
import html from "../src/report/html.js";
import sarif from "../src/report/sarif.js";

const n = (name, type, typeVersion, parameters = {}, extra = {}) => ({
  id: name.toLowerCase().replace(/\W+/g, "-"),
  name,
  type,
  typeVersion,
  position: [0, 0],
  parameters,
  ...extra,
});
const c = (to, i = 0) => ({ node: to, type: "main", index: i });

const risky = {
  name: "Lead intake agent (risky)",
  nodes: [
    n("Webhook", "n8n-nodes-base.webhook", 2, { path: "lead-intake" }),
    n("HTTP Request", "n8n-nodes-base.httpRequest", 1, {
      url: "https://crm.example.com/api/leads",
      sendHeaders: true,
      headerParameters: {
        parameters: [
          {
            name: "Authorization",
            value: "Bearer demoDEMOdemo1234567890abcdefXYZ",
          },
        ],
      },
      options: { allowUnauthorizedCerts: true },
    }),
    n("AI Agent", "@n8n/n8n-nodes-langchain.agent", 1.7, { options: {} }),
    n("Anthropic Chat Model", "@n8n/n8n-nodes-langchain.lmChatAnthropic", 1.3, {
      model: "claude-3-opus-20240229",
    }),
    n("Code", "n8n-nodes-base.code", 2, {
      jsCode: "const lead = $input.first().json;\nreturn [{ json: { lead } }];",
    }),
    n(
      "HTTP Request1",
      "n8n-nodes-base.httpRequest",
      4.2,
      { url: "https://crm.example.com/api/enrich", options: {} },
      { onError: "continueErrorOutput" },
    ),
  ],
  connections: {
    Webhook: { main: [[c("HTTP Request")]] },
    "HTTP Request": { main: [[c("AI Agent")]] },
    "Anthropic Chat Model": {
      ai_languageModel: [
        [{ node: "AI Agent", type: "ai_languageModel", index: 0 }],
      ],
    },
    "AI Agent": { main: [[c("Code")]] },
    Code: { main: [[c("HTTP Request1")]] },
    "HTTP Request1": { main: [[], [c("AI Agent")]] },
  },
  pinData: { Webhook: [{ json: { email: "pinned.sample@example.com" } }] },
  settings: {},
};

const fixed = {
  name: "Lead intake agent (hardened)",
  nodes: [
    n("Lead Intake Webhook", "n8n-nodes-base.webhook", 2, {
      path: "lead-intake",
      authentication: "headerAuth",
    }),
    n(
      "Create CRM Lead",
      "n8n-nodes-base.httpRequest",
      4.2,
      {
        url: "https://crm.example.com/api/leads",
        sendHeaders: true,
        headerParameters: {
          parameters: [
            {
              name: "Authorization",
              value: "={{ 'Bearer ' + $env.CRM_TOKEN }}",
            },
          ],
        },
        options: { timeout: 30000 },
      },
      { retryOnFail: true, maxTries: 3 },
    ),
    n("Qualify Lead", "@n8n/n8n-nodes-langchain.agent", 1.7, {
      options: { maxIterations: 4 },
    }),
    n("Claude Haiku", "@n8n/n8n-nodes-langchain.lmChatAnthropic", 1.3, {
      model: "claude-3-5-haiku-20241022",
    }),
    n("Pick Lead", "n8n-nodes-base.code", 2, {
      jsCode:
        "const first = $input.first();\nif (!first) return [];\nreturn [{ json: { lead: first.json } }];",
    }),
    n(
      "Enrich Lead",
      "n8n-nodes-base.httpRequest",
      4.2,
      {
        url: "https://crm.example.com/api/enrich",
        options: { timeout: 30000 },
      },
      { onError: "continueErrorOutput", retryOnFail: true, maxTries: 3 },
    ),
    n("Stop On Enrich Failure", "n8n-nodes-base.stopAndError", 1, {
      errorMessage: "Enrichment failed",
    }),
  ],
  connections: {
    "Lead Intake Webhook": { main: [[c("Create CRM Lead")]] },
    "Create CRM Lead": { main: [[c("Qualify Lead")]] },
    "Claude Haiku": {
      ai_languageModel: [
        [{ node: "Qualify Lead", type: "ai_languageModel", index: 0 }],
      ],
    },
    "Qualify Lead": { main: [[c("Pick Lead")]] },
    "Pick Lead": { main: [[c("Enrich Lead")]] },
    "Enrich Lead": { main: [[], [c("Stop On Enrich Failure")]] },
  },
  settings: { errorWorkflow: "error-handler-1" },
};

fs.mkdirSync("examples", { recursive: true });
const w = (f, d) =>
  fs.writeFileSync(
    `examples/${f}`,
    typeof d === "string" ? d : JSON.stringify(d, null, 2) + "\n",
  );
w("risky-workflow.json", risky);
w("fixed-workflow.json", fixed);

const before = lintPaths(["examples/risky-workflow.json"], {});
const after = lintPaths(["examples/fixed-workflow.json"], {});
w("sample-report.html", html(before));
w("sample-report.md", md(before));
w("sample-report.sarif", sarif(before));
w("sample-output-before.txt", text(before));
w("sample-output-after.txt", text(after));
console.log(
  `before ${before.summary.score}/100, after ${after.summary.score}/100`,
);
