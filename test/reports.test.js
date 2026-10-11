import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { lintPaths, RULES } from "../src/index.js";
import text from "../src/report/text.js";
import json from "../src/report/json.js";
import sarif from "../src/report/sarif.js";
import md from "../src/report/md.js";
import html from "../src/report/html.js";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const rel = (p) =>
  path.relative(process.cwd(), path.join(root, p)).replace(/\\/g, "/");
const risky = () =>
  lintPaths([path.join(root, "examples", "risky-workflow.json")], {});
const GOLDEN = path.join(root, "test", "golden", "risky.md");

test("SARIF has the SARIF 2.1.0 shape", () => {
  const doc = JSON.parse(sarif(risky()));
  assert.equal(doc.version, "2.1.0");
  assert.match(doc.$schema, /sarif-2\.1\.0/);
  assert.equal(doc.runs.length, 1);
  const driver = doc.runs[0].tool.driver;
  assert.equal(driver.name, "n8n-workflow-lint");
  assert.equal(driver.rules.length, RULES.length);
  for (const r of driver.rules) {
    assert.ok(r.id && r.shortDescription.text && r.helpUri);
    assert.ok(
      ["error", "warning", "note"].includes(r.defaultConfiguration.level),
    );
  }
  const results = doc.runs[0].results;
  assert.ok(results.length >= 10);
  for (const x of results) {
    assert.ok(driver.rules.some((r) => r.id === x.ruleId));
    assert.equal(driver.rules[x.ruleIndex].id, x.ruleId);
    assert.ok(["error", "warning", "note"].includes(x.level));
    assert.ok(x.message.text.length > 5);
    const loc = x.locations[0].physicalLocation;
    assert.ok(loc.artifactLocation.uri);
    assert.ok(
      Number.isInteger(loc.region.startLine) && loc.region.startLine >= 1,
    );
  }
});

test("SARIF maps critical/high to error and info to note", () => {
  const doc = JSON.parse(sarif(risky()));
  const level = (id) => doc.runs[0].results.find((r) => r.ruleId === id)?.level;
  assert.equal(level("N8N001"), "error");
  assert.equal(level("N8N011"), "warning");
  assert.equal(level("N8N014"), "note");
});

test("SARIF startLine points at the offending node", () => {
  const doc = JSON.parse(sarif(risky()));
  const r = doc.runs[0].results.find((x) => x.ruleId === "N8N003");
  const lines = fs
    .readFileSync(path.join(root, "examples", "risky-workflow.json"), "utf8")
    .split("\n");
  assert.match(
    lines[r.locations[0].physicalLocation.region.startLine - 1],
    /"Webhook"/,
  );
});

test("markdown report matches the golden file", () => {
  const out = md(lintPaths([rel("examples/risky-workflow.json")], {}));
  if (process.env.UPDATE_GOLDEN) {
    fs.mkdirSync(path.dirname(GOLDEN), { recursive: true });
    fs.writeFileSync(GOLDEN, out);
  }
  assert.equal(out, fs.readFileSync(GOLDEN, "utf8"));
});

test("md and html footers carry the SkynetLabs line", () => {
  const rep = risky();
  assert.match(md(rep), /Production-readiness lint by SkynetLabs\n$/);
  assert.match(
    html(rep),
    /<footer>Production-readiness lint by SkynetLabs<\/footer>/,
  );
});

test("html is self-contained and escapes content", () => {
  const rep = risky();
  rep.files[0].name = "<script>alert(1)</script>";
  const out = html(rep);
  assert.ok(!out.includes("<script>alert"));
  assert.ok(!/<link |<script src/i.test(out));
  assert.match(out, /^<!doctype html>/);
});

test("json report round-trips and carries a summary", () => {
  const doc = JSON.parse(json(risky()));
  assert.equal(doc.summary.files, 1);
  assert.equal(doc.summary.score, 0);
  assert.ok(doc.files[0].findings.length >= 10);
  assert.ok(doc.files[0].estimate.monthlyUsd > 1000);
});

test("text report lists fixes and the overall score", () => {
  const out = text(risky());
  assert.match(out, /Overall score: 0\/100 \[F\]/);
  assert.match(out, /fix:/);
});

test("hardened example scores 100 and risky example fails", () => {
  assert.equal(
    lintPaths([path.join(root, "examples", "fixed-workflow.json")], {}).summary
      .score,
    100,
  );
  assert.ok(risky().summary.counts.critical >= 1);
});

test("shipped sample report is up to date with the code", () => {
  const shipped = fs.readFileSync(
    path.join(root, "examples", "sample-report.md"),
    "utf8",
  );
  assert.equal(
    shipped,
    md(lintPaths([rel("examples/risky-workflow.json")], {})),
  );
});

test("action.yml wires SARIF upload and a node20 setup", () => {
  const y = fs.readFileSync(path.join(root, "action.yml"), "utf8");
  assert.match(y, /using: 'composite'/);
  assert.match(y, /github\/codeql-action\/upload-sarif@v3/);
  assert.match(y, /--format sarif/);
});
