import fs from "node:fs";
import path from "node:path";
import { RULES } from "./rules/index.js";
import { parseWorkflows, lineOf, expandInputs, ParseError } from "./parse.js";
import { estimate, priceWarning } from "./cost.js";
import { SEVERITIES, sevRank } from "./util.js";

export { RULES, ParseError, estimate };
export const VERSION = JSON.parse(
  fs.readFileSync(new URL("../package.json", import.meta.url), "utf8"),
).version;

export const WEIGHTS = { critical: 25, high: 12, medium: 5, low: 2, info: 0 };

export function gradeFor(score) {
  return score >= 90
    ? "A"
    : score >= 80
      ? "B"
      : score >= 70
        ? "C"
        : score >= 60
          ? "D"
          : "F";
}

export function scoreOf(findings) {
  const penalty = findings.reduce((a, f) => a + (WEIGHTS[f.severity] ?? 0), 0);
  return Math.max(0, 100 - penalty);
}

function selectRules(opts) {
  const known = new Set(RULES.map((r) => r.id));
  for (const id of [...(opts.rules || []), ...(opts.disable || [])]) {
    if (!known.has(id)) throw new Error(`Unknown rule id: ${id}`);
  }
  return RULES.filter(
    (r) =>
      (!opts.rules || opts.rules.includes(r.id)) &&
      !(opts.disable || []).includes(r.id),
  );
}

function suppressed(wf, finding) {
  const node = (wf.nodes || []).find((n) => n.name === finding.node);
  const notes = String(node?.notes || "");
  return new RegExp(
    `n8n-lint-disable\\s+([\\w, ]*\\b${finding.ruleId}\\b|all\\b)`,
    "i",
  ).test(notes);
}

/** Lint one parsed workflow. Returns the list of findings (sorted). */
export function lintWorkflow(wf, opts = {}, text = "") {
  const ctx = { opts, now: opts.now || new Date() };
  const overrides = opts.severity || {};
  const findings = [];
  for (const rule of selectRules(opts)) {
    for (const hit of rule.check(wf, ctx)) {
      const f = {
        ruleId: rule.id,
        severity: overrides[rule.id] || hit.severity || rule.severity,
        title: rule.title,
        message: hit.message || rule.message,
        fix: rule.fix,
        node: hit.node || null,
        line: lineOf(text, hit.node),
      };
      if (!suppressed(wf, f)) findings.push(f);
    }
  }
  findings.sort(
    (a, b) =>
      sevRank(b.severity) - sevRank(a.severity) ||
      a.ruleId.localeCompare(b.ruleId) ||
      String(a.node).localeCompare(String(b.node)),
  );
  return findings;
}

export function lintText(text, file = "<input>", opts = {}) {
  return parseWorkflows(text, file).map((wf, i) => {
    const findings = lintWorkflow(wf, opts, text);
    const score = scoreOf(findings);
    return {
      file: wf === undefined ? file : file,
      name: wf.name || path.basename(file),
      index: i,
      findings,
      score,
      grade: gradeFor(score),
      estimate: estimate(wf, {
        runsPerDay: opts.runsPerDay ?? 100,
        now: opts.now || new Date(),
      }),
    };
  });
}

/** Lint files/dirs/globs. Throws ParseError for unreadable/invalid explicit inputs (CLI exit 2). */
export function lintPaths(args, opts = {}) {
  const results = [];
  const skipped = [];
  for (const { file, explicit } of expandInputs(args)) {
    const text = fs.readFileSync(file, "utf8");
    const rel = path.relative(process.cwd(), file).replace(/\\/g, "/") || file;
    try {
      results.push(
        ...lintText(
          text,
          rel.startsWith("..") ? file.replace(/\\/g, "/") : rel,
          opts,
        ),
      );
    } catch (e) {
      if (!(e instanceof ParseError)) throw e;
      if (explicit || /invalid JSON/.test(e.message)) throw e;
      skipped.push(rel);
    }
  }
  if (!results.length)
    throw new ParseError(`No n8n workflow JSON found in: ${args.join(", ")}`);
  return buildReport(results, skipped, opts);
}

export function buildReport(files, skipped = [], opts = {}) {
  const all = files.flatMap((f) => f.findings);
  const counts = Object.fromEntries(
    SEVERITIES.map((s) => [s, all.filter((f) => f.severity === s).length]),
  );
  const score = files.length
    ? Math.round(files.reduce((a, f) => a + f.score, 0) / files.length)
    : 100;
  const warnings = [priceWarning(opts.now || new Date())].filter(Boolean);
  return {
    tool: "n8n-workflow-lint",
    version: VERSION,
    files,
    skipped,
    summary: {
      files: files.length,
      findings: all.length,
      counts,
      score,
      grade: gradeFor(score),
    },
    warnings,
  };
}

/** Exit code: 0 clean, 1 findings at/above threshold or score below --min-score. */
export function exitCodeFor(report, opts = {}) {
  const failOn = opts.failOn || "high";
  const bad = report.files.some((f) =>
    f.findings.some((x) => sevRank(x.severity) >= sevRank(failOn)),
  );
  const low = opts.minScore != null && report.summary.score < opts.minScore;
  return bad || low ? 1 : 0;
}

export function badgeFor(score) {
  const color =
    score >= 90
      ? "brightgreen"
      : score >= 80
        ? "green"
        : score >= 70
          ? "yellow"
          : score >= 60
            ? "orange"
            : "red";
  const url = `https://img.shields.io/badge/n8n%20lint-${score}%2F100-${color}`;
  return { url, markdown: `![n8n lint score](${url})` };
}
