#!/usr/bin/env node
import fs from "node:fs";
import {
  lintPaths,
  exitCodeFor,
  badgeFor,
  RULES,
  VERSION,
  ParseError,
} from "../src/index.js";
import { SEVERITIES } from "../src/util.js";
import text from "../src/report/text.js";
import json from "../src/report/json.js";
import sarif from "../src/report/sarif.js";
import md from "../src/report/md.js";
import html from "../src/report/html.js";

const FORMATS = { text, json, sarif, md, html };

const HELP = `n8n-workflow-lint ${VERSION}
Lint n8n workflow JSON for production readiness.

Usage: n8n-workflow-lint <file|dir|glob>... [options]

Options:
  --format <text|json|sarif|md|html>  Output format (default: text)
  --out <file>                        Write the report to a file instead of stdout
  --fail-on <severity>                Exit 1 on findings at/above: info|low|medium|high|critical (default: high)
  --min-score <N>                     Also exit 1 if the overall score is below N
  --rules <r1,r2>                     Only run these rules
  --disable <r3,r4>                   Skip these rules
  --config <file>                     Config file (default: .n8nlintrc.json if present)
  --runs-per-day <N>                  Runs/day for the cost estimate (default: 100)
  --cost-threshold <USD>              Monthly USD at which N8N023 fires (default: 100)
  --badge                             Print a shields.io badge (markdown) for the overall score
  --list-rules                        List all rules
  -v, --version                       Print version
  -h, --help                          Show this help

Exit codes: 0 clean | 1 findings at/above threshold | 2 parse or usage error
Suppress a finding: put "n8n-lint-disable N8N011" in the node's Notes field.
`;

function die(msg) {
  process.stderr.write(`n8n-workflow-lint: ${msg}\n`);
  process.exit(2);
}

function parseArgs(argv) {
  const o = { _: [], format: "text" };
  const takes = new Set([
    "--format",
    "--out",
    "--fail-on",
    "--min-score",
    "--rules",
    "--disable",
    "--config",
    "--runs-per-day",
    "--cost-threshold",
  ]);
  for (let i = 0; i < argv.length; i++) {
    let a = argv[i];
    let val;
    if (a.startsWith("--") && a.includes("=")) {
      [a, val] = [a.slice(0, a.indexOf("=")), a.slice(a.indexOf("=") + 1)];
    }
    if (a === "-h" || a === "--help") o.help = true;
    else if (a === "-v" || a === "--version") o.version = true;
    else if (a === "--badge") o.badge = true;
    else if (a === "--list-rules") o.list = true;
    else if (takes.has(a)) {
      if (val === undefined) val = argv[++i];
      if (val === undefined) die(`${a} needs a value`);
      o[a.slice(2).replace(/-(\w)/g, (_, c) => c.toUpperCase())] = val;
    } else if (a.startsWith("-") && a !== "-")
      die(`unknown option ${a} (see --help)`);
    else o._.push(a);
  }
  return o;
}

const csv = (s) =>
  s
    ? String(s)
        .split(",")
        .map((x) => x.trim().toUpperCase())
        .filter(Boolean)
    : undefined;
const num = (name, v) => {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0)
    die(`${name} must be a non-negative number`);
  return n;
};

const args = parseArgs(process.argv.slice(2));
if (args.help) {
  process.stdout.write(HELP);
  process.exit(0);
}
if (args.version) {
  process.stdout.write(`${VERSION}\n`);
  process.exit(0);
}
if (args.list) {
  for (const r of RULES)
    process.stdout.write(`${r.id}  ${r.severity.padEnd(8)} ${r.title}\n`);
  process.exit(0);
}
if (!args._.length) {
  process.stderr.write(HELP);
  process.exit(2);
}

let cfg = {};
const cfgPath =
  args.config || (fs.existsSync(".n8nlintrc.json") ? ".n8nlintrc.json" : null);
if (cfgPath) {
  try {
    cfg = JSON.parse(fs.readFileSync(cfgPath, "utf8"));
  } catch (e) {
    die(`cannot read config ${cfgPath}: ${e.message}`);
  }
}

const opts = {
  rules: csv(args.rules) || cfg.rules,
  disable: csv(args.disable) || cfg.disable,
  severity: cfg.severity,
  failOn: args.failOn || cfg.failOn,
  minScore:
    args.minScore !== undefined
      ? num("--min-score", args.minScore)
      : cfg.minScore,
  runsPerDay:
    args.runsPerDay !== undefined
      ? num("--runs-per-day", args.runsPerDay)
      : cfg.runsPerDay,
  costThreshold:
    args.costThreshold !== undefined
      ? num("--cost-threshold", args.costThreshold)
      : cfg.costThreshold,
};
if (opts.failOn && !SEVERITIES.includes(opts.failOn))
  die(`--fail-on must be one of ${SEVERITIES.join(", ")}`);
if (!FORMATS[args.format])
  die(`--format must be one of ${Object.keys(FORMATS).join(", ")}`);

let report;
try {
  report = lintPaths(args._, opts);
} catch (e) {
  if (e instanceof ParseError || /^Unknown rule/.test(e.message))
    die(e.message);
  throw e;
}

let out;
if (args.badge) out = badgeFor(report.summary.score).markdown + "\n";
else
  out = FORMATS[args.format](report, {
    color: !args.out && process.stdout.isTTY && !process.env.NO_COLOR,
  });
if (args.out) fs.writeFileSync(args.out, out);
else process.stdout.write(out);
process.exitCode = exitCodeFor(report, opts);
