// Regenerates fixtures/good/*.json and fixtures/bad/*.json from a clean baseline.
// Run: node scripts/build-fixtures.js
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "fixtures",
);
const clone = (o) => JSON.parse(JSON.stringify(o));

const link = (...names) => {
  const c = {};
  for (let i = 0; i < names.length - 1; i++)
    c[names[i]] = { main: [[{ node: names[i + 1], type: "main", index: 0 }]] };
  return c;
};
const node = (name, type, typeVersion, parameters = {}, extra = {}) => ({
  id: name.toLowerCase().replace(/\W+/g, "-"),
  name,
  type,
  typeVersion,
  position: [0, 0],
  parameters,
  ...extra,
});

const trigger = () =>
  node("Every Morning", "n8n-nodes-base.scheduleTrigger", 1.2, {
    rule: { interval: [{ field: "hours", hoursInterval: 24 }] },
  });
const http = (extra = {}, opts = { timeout: 30000 }) =>
  node(
    "Fetch Orders",
    "n8n-nodes-base.httpRequest",
    4.2,
    { url: "https://api.example.com/orders", options: opts },
    { retryOnFail: true, maxTries: 3, ...extra },
  );
const shape = () =>
  node("Shape Order", "n8n-nodes-base.set", 3.4, {
    assignments: { assignments: [] },
  });
const model = (m = "gpt-4o-mini") =>
  node("Chat Model", "@n8n/n8n-nodes-langchain.lmChatOpenAi", 1.2, {
    model: m,
  });
const agent = (opts) =>
  node("Support Agent", "@n8n/n8n-nodes-langchain.agent", 1.7, {
    options: opts,
  });
const aiLink = () => ({
  "Chat Model": {
    ai_languageModel: [
      [{ node: "Support Agent", type: "ai_languageModel", index: 0 }],
    ],
  },
});

const base = () => ({
  name: "Daily orders",
  nodes: [trigger(), http(), shape()],
  connections: link("Every Morning", "Fetch Orders", "Shape Order"),
  settings: { errorWorkflow: "error-handler-1" },
});
const aiBase = (opts = { maxIterations: 5 }, m = "gpt-4o-mini") => ({
  name: "Support agent",
  nodes: [trigger(), agent(opts), model(m)],
  connections: { ...link("Every Morning", "Support Agent"), ...aiLink() },
  settings: { errorWorkflow: "error-handler-1" },
});

const write = (kind, name, wf) => {
  const dir = path.join(root, kind);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, `${name}.json`),
    JSON.stringify(wf, null, 2) + "\n",
  );
};

// ---------- good ----------
write("good", "clean-basic", base());
write("good", "ai-agent-capped", aiBase());
{
  const w = base();
  w.nodes[0] = node("Order Webhook", "n8n-nodes-base.webhook", 2, {
    path: "orders",
    authentication: "headerAuth",
  });
  w.connections = link("Order Webhook", "Fetch Orders", "Shape Order");
  write("good", "webhook-authenticated", w);
}
{
  const w = base();
  delete w.settings.errorWorkflow;
  w.nodes = [
    node("On Failure", "n8n-nodes-base.errorTrigger", 1),
    node("Alert Ops", "n8n-nodes-base.set", 3.4, {}),
  ];
  w.connections = link("On Failure", "Alert Ops");
  write("good", "error-workflow", w);
}
{
  const w = base();
  w.nodes.push(
    node("Pick First", "n8n-nodes-base.code", 2, {
      jsCode:
        "const first = $input.first();\nif (!first) return [];\nreturn [{ json: { id: first.json.id } }];",
    }),
  );
  w.connections = link(
    "Every Morning",
    "Fetch Orders",
    "Shape Order",
    "Pick First",
  );
  write("good", "guarded-code", w);
}
{
  const w = base();
  w.nodes.push(
    node("Per Batch", "n8n-nodes-base.splitInBatches", 3, { batchSize: 10 }),
    node("Summarise", "n8n-nodes-base.set", 3.4, {}),
  );
  w.connections = {
    "Every Morning": {
      main: [[{ node: "Fetch Orders", type: "main", index: 0 }]],
    },
    "Fetch Orders": { main: [[{ node: "Per Batch", type: "main", index: 0 }]] },
    "Per Batch": {
      main: [
        [{ node: "Summarise", type: "main", index: 0 }],
        [{ node: "Shape Order", type: "main", index: 0 }],
      ],
    },
    "Shape Order": { main: [[{ node: "Per Batch", type: "main", index: 0 }]] },
  };
  write("good", "batch-loop-with-exit", w);
}
{
  const w = base();
  w.nodes[1] = http({}, { timeout: 30000 });
  w.nodes[1].parameters.sendHeaders = true;
  w.nodes[1].parameters.headerParameters = {
    parameters: [
      { name: "Authorization", value: "={{ 'Bearer ' + $env.API_TOKEN }}" },
    ],
  };
  write("good", "secrets-from-env", w);
}

// ---------- bad ----------
{
  const w = base();
  w.nodes[1].parameters.sendHeaders = true;
  w.nodes[1].parameters.headerParameters = {
    parameters: [
      { name: "Authorization", value: "Bearer abcdEFGH1234567890qrstUVWX9876" },
    ],
  };
  write("bad", "N8N001", w);
}
{
  const w = base();
  w.nodes.push(
    node("Build Request", "n8n-nodes-base.code", 2, {
      jsCode:
        'const key = "sk-FAKEFAKEFAKEFAKEFAKEFAKE0000";\nreturn [{ json: { key } }];',
    }),
  );
  w.connections = link(
    "Every Morning",
    "Fetch Orders",
    "Shape Order",
    "Build Request",
  );
  write("bad", "N8N001-sk", w);
}
{
  const w = base();
  w.nodes[1].parameters.sendHeaders = true;
  w.nodes[1].parameters.headerParameters = {
    parameters: [
      { name: "x-api-key", value: "q8Zr3LkP9vXw2NbT7yHs5JdG1cMf4AeU" },
    ],
  };
  write("bad", "N8N001-entropy", w);
}
{
  const w = base();
  w.pinData = { "Fetch Orders": [{ json: { customer: "pinned sample row" } }] };
  write("bad", "N8N002", w);
}
{
  const w = base();
  w.nodes[0] = node("Order Webhook", "n8n-nodes-base.webhook", 2, {
    path: "orders",
  });
  w.connections = link("Order Webhook", "Fetch Orders", "Shape Order");
  write("bad", "N8N003", w);
}
{
  const w = base();
  w.nodes[1].credentials = {
    httpHeaderAuth: { id: "Qx81aB7", name: "Acme production header auth" },
  };
  write("bad", "N8N004", w);
}
{
  const w = base();
  w.nodes[1].parameters.options.allowUnauthorizedCerts = true;
  write("bad", "N8N005", w);
}
{
  const w = base();
  delete w.settings.errorWorkflow;
  write("bad", "N8N010", w);
}
{
  const w = base();
  delete w.nodes[1].retryOnFail;
  delete w.nodes[1].maxTries;
  write("bad", "N8N011", w);
}
{
  const w = base();
  w.nodes[1].parameters.options = {};
  write("bad", "N8N011-timeout", w);
}
{
  const w = base();
  w.nodes[1] = node("Split Orders", "n8n-nodes-base.splitInBatches", 3, {
    batchSize: 5,
  });
  w.nodes.push(http());
  w.connections = {
    "Every Morning": {
      main: [[{ node: "Split Orders", type: "main", index: 0 }]],
    },
    "Split Orders": {
      main: [[], [{ node: "Fetch Orders", type: "main", index: 0 }]],
    },
    "Fetch Orders": {
      main: [[{ node: "Split Orders", type: "main", index: 0 }]],
    },
  };
  w.nodes = [w.nodes[0], w.nodes[1], w.nodes[3]];
  write("bad", "N8N012", w);
}
{
  const w = base();
  w.nodes.push(node("Unused Notes", "n8n-nodes-base.set", 3.4, {}));
  write("bad", "N8N013", w);
}
{
  const w = base();
  w.nodes[1].name = "HTTP Request1";
  w.connections = link("Every Morning", "HTTP Request1", "Shape Order");
  write("bad", "N8N014", w);
}
{
  const w = base();
  w.nodes[2].typeVersion = 1;
  write("bad", "N8N015", w);
}
{
  const w = base();
  w.nodes.push(
    node("Run Legacy", "n8n-nodes-base.function", 1, {
      functionCode: "return items;",
    }),
  );
  w.connections = link(
    "Every Morning",
    "Fetch Orders",
    "Shape Order",
    "Run Legacy",
  );
  write("bad", "N8N015-function", w);
}
{
  const w = base();
  w.nodes.push(
    node("Pick First", "n8n-nodes-base.code", 2, {
      jsCode: "const id = $input.first().json.id;\nreturn [{ json: { id } }];",
    }),
  );
  w.connections = link(
    "Every Morning",
    "Fetch Orders",
    "Shape Order",
    "Pick First",
  );
  write("bad", "N8N016", w);
}
{
  const w = base();
  w.nodes.shift();
  w.connections = link("Fetch Orders", "Shape Order");
  write("bad", "N8N017", w);
}
{
  const w = base();
  w.nodes.push(
    node("Old Notify", "n8n-nodes-base.set", 3.4, {}, { disabled: true }),
  );
  write("bad", "N8N018", w);
}
{
  const w = base();
  w.nodes.push(
    node("Run Cleanup", "n8n-nodes-base.executeCommand", 1, {
      command: "echo done",
    }),
  );
  w.connections = link(
    "Every Morning",
    "Fetch Orders",
    "Shape Order",
    "Run Cleanup",
  );
  write("bad", "N8N019", w);
}
write("bad", "N8N020", aiBase({}));
write("bad", "N8N020-over", aiBase({ maxIterations: 25 }));
{
  const w = aiBase();
  w.nodes.push(node("Needs Retry?", "n8n-nodes-base.if", 2.2, {}));
  w.connections["Support Agent"] = {
    main: [[{ node: "Needs Retry?", type: "main", index: 0 }]],
  };
  w.connections["Needs Retry?"] = {
    main: [[{ node: "Support Agent", type: "main", index: 0 }], []],
  };
  write("bad", "N8N021", w);
}
{
  const w = aiBase();
  w.nodes.push(http({ onError: "continueErrorOutput" }));
  w.nodes.push(shape());
  w.connections = {
    ...link("Every Morning", "Fetch Orders"),
    "Fetch Orders": {
      main: [
        [{ node: "Shape Order", type: "main", index: 0 }],
        [{ node: "Support Agent", type: "main", index: 0 }],
      ],
    },
    ...aiLink(),
  };
  write("bad", "N8N022", w);
}
write("bad", "N8N023", aiBase({ maxIterations: 10 }, "claude-3-opus-20240229"));

console.log("fixtures written");
