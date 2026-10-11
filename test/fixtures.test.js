import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { lintText, RULES } from "../src/index.js";

const root = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "fixtures",
);
const read = (kind) =>
  fs
    .readdirSync(path.join(root, kind))
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => [f, fs.readFileSync(path.join(root, kind, f), "utf8")]);

const good = read("good");
const bad = read("bad");

test("there are at least 30 fixtures", () => {
  assert.ok(good.length + bad.length >= 30, `got ${good.length + bad.length}`);
});

for (const [name, text] of good) {
  test(`good/${name} has zero findings`, () => {
    const [r] = lintText(text, name);
    assert.deepEqual(
      r.findings.map((f) => `${f.ruleId}:${f.node}`),
      [],
    );
    assert.equal(r.score, 100);
  });
}

for (const [name, text] of bad) {
  const id = name.match(/^(N8N\d{3})/)[1];
  test(`bad/${name} fires exactly ${id}`, () => {
    const [r] = lintText(text, name);
    const ids = [...new Set(r.findings.map((f) => f.ruleId))];
    assert.deepEqual(ids, [id]);
    assert.ok(r.findings.length >= 1);
    assert.ok(r.findings.every((f) => f.fix && f.message));
  });
}

test("every rule has a bad fixture and a docs page", () => {
  for (const rule of RULES) {
    assert.ok(
      bad.some(([n]) => n.startsWith(rule.id)),
      `no bad fixture for ${rule.id}`,
    );
    assert.ok(
      fs.existsSync(path.join(root, "..", "docs", "rules", `${rule.id}.md`)),
      `no docs for ${rule.id}`,
    );
  }
});

test("at least 19 rules, ids unique, metadata complete", () => {
  assert.ok(RULES.length >= 19);
  assert.equal(new Set(RULES.map((r) => r.id)).size, RULES.length);
  for (const r of RULES) {
    for (const k of ["id", "severity", "title", "message", "fix", "why"])
      assert.ok(r[k], `${r.id}.${k}`);
    assert.equal(typeof r.check, "function");
  }
});
