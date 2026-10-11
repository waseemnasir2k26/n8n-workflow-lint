import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  lintText,
  lintWorkflow,
  lintPaths,
  scoreOf,
  gradeFor,
  exitCodeFor,
  badgeFor,
  estimate,
  ParseError,
} from "../src/index.js";
import { parseWorkflows, lineOf } from "../src/parse.js";
import { entropy } from "../src/util.js";
import { priceWarning, priceFor } from "../src/cost.js";

const CLI = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "bin",
  "cli.js",
);

const http = (headers) => ({
  name: "Call API",
  type: "n8n-nodes-base.httpRequest",
  typeVersion: 4.2,
  retryOnFail: true,
  parameters: {
    options: { timeout: 1000 },
    sendHeaders: true,
    headerParameters: { parameters: headers },
  },
});
const wfWith = (...nodes) => ({
  name: "t",
  nodes: [
    {
      name: "Tick",
      type: "n8n-nodes-base.scheduleTrigger",
      typeVersion: 1.2,
      parameters: {},
    },
    ...nodes,
  ],
  connections: {},
  settings: { errorWorkflow: "x" },
});
const ids = (wf) => lintWorkflow(wf, {}).map((f) => f.ruleId);

// Secret patterns are assembled at runtime so no secret-shaped literal sits in the repo.
const fake = {
  ghp: "ghp_" + "a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P6q7R8",
  aws: "AKIA" + "ABCDEFGHIJKLMNOP",
  slack: "xox" + "b-" + "1234567890-abcdefghij",
  google: "AIza" + "SyA1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q",
};

for (const [kind, value] of Object.entries(fake)) {
  test(`N8N001 detects ${kind} token in a Code node`, () => {
    const wf = wfWith({
      name: "Make Call",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      parameters: { jsCode: `const t = "${value}";` },
    });
    assert.ok(ids(wf).includes("N8N001"));
  });
}

test("N8N001 never prints the full secret", () => {
  const wf = wfWith(
    http([{ name: "Authorization", value: "Bearer " + fake.ghp }]),
  );
  const f = lintWorkflow(wf, {}).find((x) => x.ruleId === "N8N001");
  assert.ok(f);
  assert.ok(!f.message.includes(fake.ghp));
});

test("N8N001 ignores expression-based tokens and URLs", () => {
  const wf = wfWith(
    http([
      { name: "Authorization", value: "={{ 'Bearer ' + $env.TOKEN }}" },
      { name: "x-api-key", value: "={{ $credentials.key }}" },
    ]),
  );
  assert.ok(!ids(wf).includes("N8N001"));
});

test("N8N001 entropy check only applies to secret-like labels", () => {
  const rnd = "q8Zr3LkP9vXw2NbT7yHs5JdG1cMf4AeU";
  assert.ok(
    ids(wfWith(http([{ name: "x-api-key", value: rnd }]))).includes("N8N001"),
  );
  assert.ok(
    !ids(wfWith(http([{ name: "x-request-note", value: rnd }]))).includes(
      "N8N001",
    ),
  );
});

test("entropy helper orders random above repetitive", () => {
  assert.ok(entropy("q8Zr3LkP9vXw2NbT7yHs5JdG1cMf4AeU") > 4);
  assert.ok(entropy("aaaaaaaaaaaaaaaaaaaa") < 0.1);
});

test("N8N010 passes when the workflow itself is an Error Trigger workflow", () => {
  const wf = {
    nodes: [
      {
        name: "On Failure",
        type: "n8n-nodes-base.errorTrigger",
        typeVersion: 1,
        parameters: {},
      },
    ],
    connections: {},
  };
  assert.ok(!ids(wf).includes("N8N010"));
});

test("N8N013 ignores sticky notes and disabled nodes", () => {
  const wf = wfWith(
    {
      name: "Note",
      type: "n8n-nodes-base.stickyNote",
      typeVersion: 1,
      parameters: {},
    },
    {
      name: "Off",
      type: "n8n-nodes-base.set",
      typeVersion: 3.4,
      disabled: true,
      parameters: {},
    },
  );
  assert.ok(!ids(wf).includes("N8N013"));
});

test("N8N020 flags string maxIterations above the limit and passes 10", () => {
  const agent = (m) =>
    wfWith({
      name: "Agent",
      type: "@n8n/n8n-nodes-langchain.agent",
      typeVersion: 1.7,
      parameters: { options: { maxIterations: m } },
    });
  assert.ok(ids(agent("15")).includes("N8N020"));
  assert.ok(!ids(agent(10)).includes("N8N020"));
});

test("N8N020 severity differs for unset (medium) and over-limit (high)", () => {
  const a = (opts) =>
    lintWorkflow(
      wfWith({
        name: "Agent",
        type: "@n8n/n8n-nodes-langchain.agent",
        typeVersion: 1.7,
        parameters: { options: opts },
      }),
      {},
    ).find((f) => f.ruleId === "N8N020");
  assert.equal(a({}).severity, "medium");
  assert.equal(a({ maxIterations: 20 }).severity, "high");
});

test("inline suppression via node notes", () => {
  const n = http([]);
  n.parameters.options = {};
  assert.ok(ids(wfWith(n)).includes("N8N011"));
  n.notes = "n8n-lint-disable N8N011";
  assert.ok(!ids(wfWith(n)).includes("N8N011"));
});

test("--rules / --disable selection and unknown rule ids", () => {
  const n = http([]);
  n.parameters.options = {};
  const wf = wfWith(n);
  assert.deepEqual(
    [...new Set(lintWorkflow(wf, { rules: ["N8N011"] }).map((f) => f.ruleId))],
    ["N8N011"],
  );
  assert.ok(
    !lintWorkflow(wf, { disable: ["N8N011"] }).some(
      (f) => f.ruleId === "N8N011",
    ),
  );
  assert.throws(() => lintWorkflow(wf, { rules: ["N8N999"] }), /Unknown rule/);
});

test("severity overrides from config apply", () => {
  const n = http([]);
  n.parameters.options = {};
  const f = lintWorkflow(wfWith(n), { severity: { N8N011: "critical" } }).find(
    (x) => x.ruleId === "N8N011",
  );
  assert.equal(f.severity, "critical");
});

test("score weights and grades", () => {
  assert.equal(scoreOf([]), 100);
  assert.equal(scoreOf([{ severity: "critical" }]), 75);
  assert.equal(
    scoreOf([
      { severity: "high" },
      { severity: "medium" },
      { severity: "low" },
      { severity: "info" },
    ]),
    81,
  );
  assert.equal(scoreOf(Array(10).fill({ severity: "critical" })), 0);
  assert.deepEqual([95, 85, 75, 65, 10].map(gradeFor), [
    "A",
    "B",
    "C",
    "D",
    "F",
  ]);
});

test("exit code logic: fail-on and min-score", () => {
  const rep = (sev, score) => ({
    files: [{ findings: sev ? [{ severity: sev }] : [] }],
    summary: { score },
  });
  assert.equal(exitCodeFor(rep(null, 100), {}), 0);
  assert.equal(exitCodeFor(rep("medium", 95), {}), 0);
  assert.equal(exitCodeFor(rep("high", 88), {}), 1);
  assert.equal(exitCodeFor(rep("medium", 95), { failOn: "medium" }), 1);
  assert.equal(exitCodeFor(rep(null, 70), { minScore: 80 }), 1);
  assert.equal(exitCodeFor(rep(null, 90), { minScore: 80 }), 0);
});

test("badge colour tracks the score", () => {
  assert.match(badgeFor(95).url, /brightgreen/);
  assert.match(badgeFor(40).url, /red/);
  assert.match(
    badgeFor(88).markdown,
    /^!\[n8n lint score\]\(https:\/\/img\.shields\.io\/badge\/n8n%20lint-88%2F100-green\)$/,
  );
});

test("cost estimate maths: opus, 10 iterations, 100 runs/day", () => {
  const wf = {
    nodes: [
      {
        name: "Agent",
        type: "@n8n/n8n-nodes-langchain.agent",
        typeVersion: 1.7,
        parameters: { options: { maxIterations: 10 } },
      },
      {
        name: "Model",
        type: "@n8n/n8n-nodes-langchain.lmChatAnthropic",
        typeVersion: 1.3,
        parameters: { model: "claude-3-opus-20240229" },
      },
    ],
    connections: {
      Model: {
        ai_languageModel: [
          [{ node: "Agent", type: "ai_languageModel", index: 0 }],
        ],
      },
    },
  };
  const e = estimate(wf, { runsPerDay: 100 });
  // (15*2000 + 75*500)/1e6 = 0.0675 per call; x10 calls x100 runs x30 days
  assert.ok(Math.abs(e.monthlyUsd - 2025) < 0.01);
  assert.equal(e.rows.length, 1);
});

test("cost: unknown model uses the assumed default price and says so", () => {
  assert.equal(priceFor("totally-new-model").assumed, true);
  assert.equal(priceFor("GPT-4o-mini-2024").model, "gpt-4o-mini");
});

test("price table staleness warning after 90 days", () => {
  assert.equal(priceWarning(new Date("2026-10-20")), null);
  assert.match(priceWarning(new Date("2027-06-01")), /days old/);
});

test("N8N023 honours --runs-per-day and --cost-threshold", () => {
  const wf = JSON.parse(
    fs.readFileSync(
      new URL("../fixtures/bad/N8N023.json", import.meta.url),
      "utf8",
    ),
  );
  assert.ok(ids(wf).includes("N8N023"));
  assert.ok(
    !lintWorkflow(wf, { runsPerDay: 1 }).some((f) => f.ruleId === "N8N023"),
  );
  assert.ok(
    !lintWorkflow(wf, { costThreshold: 1e9 }).some(
      (f) => f.ruleId === "N8N023",
    ),
  );
});

test("parse: invalid JSON and non-workflow JSON raise ParseError", () => {
  assert.throws(() => parseWorkflows("{nope", "a.json"), ParseError);
  assert.throws(
    () => parseWorkflows('{"a":1}', "a.json"),
    /not an n8n workflow/,
  );
});

test("parse: accepts arrays, {data:[...]} and BOM", () => {
  const w = { nodes: [], connections: {} };
  assert.equal(parseWorkflows(JSON.stringify([w, w])).length, 2);
  assert.equal(parseWorkflows(JSON.stringify({ data: [w] })).length, 1);
  assert.equal(parseWorkflows("﻿" + JSON.stringify(w)).length, 1);
});

test("lineOf finds the node line", () => {
  const text =
    '{\n  "nodes": [\n    {\n      "name": "Fetch",\n      "type": "x"\n    }\n  ]\n}';
  assert.equal(lineOf(text, "Fetch"), 4);
  assert.equal(lineOf(text, "Missing"), 1);
});

test("lintPaths: directory and glob skip non-workflow JSON, explicit non-workflow fails", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "n8nlint-"));
  fs.mkdirSync(path.join(dir, "sub"));
  fs.writeFileSync(
    path.join(dir, "a.json"),
    JSON.stringify({
      name: "A",
      nodes: [
        {
          name: "Tick",
          type: "n8n-nodes-base.scheduleTrigger",
          typeVersion: 1.2,
          parameters: {},
        },
      ],
      connections: {},
    }),
  );
  fs.writeFileSync(path.join(dir, "sub", "package.json"), '{"name":"x"}');
  const rep = lintPaths([dir], {});
  assert.equal(rep.files.length, 1);
  assert.equal(rep.skipped.length, 1);
  assert.equal(
    lintPaths([path.join(dir, "*.json").replace(/\\/g, "/")], {}).files.length,
    1,
  );
  assert.throws(
    () => lintPaths([path.join(dir, "sub", "package.json")], {}),
    ParseError,
  );
  assert.throws(
    () => lintPaths([path.join(dir, "missing.json")], {}),
    ParseError,
  );
});

const run = (...args) =>
  spawnSync(process.execPath, [CLI, ...args], { encoding: "utf8" });
const fx = (p) => path.join(path.dirname(CLI), "..", "fixtures", p);

test("CLI exit codes: 0 clean, 1 findings, 2 parse/usage error", () => {
  assert.equal(run(fx("good/clean-basic.json")).status, 0);
  assert.equal(run(fx("bad/N8N003.json")).status, 1);
  assert.equal(run(fx("bad/N8N003.json"), "--fail-on", "critical").status, 0);
  assert.equal(run(fx("bad/N8N010.json"), "--min-score", "100").status, 1);
  assert.equal(run("does-not-exist.json").status, 2);
  assert.equal(run(fx("good/clean-basic.json"), "--format", "pdf").status, 2);
  assert.equal(run().status, 2);
});

test("CLI: --list-rules, --version, --badge, --rules, --disable", () => {
  assert.match(run("--list-rules").stdout, /N8N001[\s\S]*N8N023/);
  assert.match(run("--version").stdout, /^1\.0\.0/);
  assert.match(
    run(fx("good/clean-basic.json"), "--badge").stdout,
    /img\.shields\.io\/badge\/n8n%20lint-100%2F100-brightgreen/,
  );
  assert.equal(run(fx("bad/N8N003.json"), "--disable", "N8N003").status, 0);
  assert.equal(run(fx("bad/N8N003.json"), "--rules", "N8N010").status, 0);
});

test("CLI: --config file is honoured and --out writes a file", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "n8nlint-"));
  const cfg = path.join(dir, "rc.json");
  fs.writeFileSync(cfg, JSON.stringify({ disable: ["N8N003"] }));
  assert.equal(run(fx("bad/N8N003.json"), "--config", cfg).status, 0);
  const out = path.join(dir, "r.json");
  run(fx("bad/N8N003.json"), "--format", "json", "--out", out);
  assert.equal(
    JSON.parse(fs.readFileSync(out, "utf8")).tool,
    "n8n-workflow-lint",
  );
});

test("lintText returns one result per workflow in an array export", () => {
  const w = { name: "A", nodes: [], connections: {} };
  assert.equal(
    lintText(JSON.stringify([w, { ...w, name: "B" }]), "x.json").length,
    2,
  );
});
