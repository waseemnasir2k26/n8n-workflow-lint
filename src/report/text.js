const COLORS = {
  critical: "\x1b[1;31m",
  high: "\x1b[31m",
  medium: "\x1b[33m",
  low: "\x1b[36m",
  info: "\x1b[90m",
};

export default function text(report, { color = false } = {}) {
  const c = (sev, s) => (color ? `${COLORS[sev]}${s}\x1b[0m` : s);
  const out = [];
  for (const f of report.files) {
    out.push(`${f.file}  (${f.name})  score ${f.score}/100 [${f.grade}]`);
    if (!f.findings.length) out.push("  no findings");
    for (const x of f.findings) {
      out.push(
        `  ${c(x.severity, `[${x.severity.toUpperCase()}]`.padEnd(10))} ${x.ruleId}  ${x.node ? `"${x.node}": ` : ""}${x.message}`,
      );
      out.push(`             fix: ${x.fix}`);
    }
    const e = f.estimate;
    if (e.rows.length)
      out.push(
        `  est. LLM cost: ~$${e.monthlyUsd.toFixed(2)}/month at ${e.runsPerDay} runs/day (upper bound, prices dated ${e.pricesDate})`,
      );
    out.push("");
  }
  const s = report.summary;
  const n = s.counts;
  out.push(
    `${s.files} workflow(s), ${s.findings} finding(s): ${n.critical} critical, ${n.high} high, ${n.medium} medium, ${n.low} low, ${n.info} info`,
  );
  out.push(`Overall score: ${s.score}/100 [${s.grade}]`);
  for (const w of report.warnings) out.push(`warning: ${w}`);
  return out.join("\n") + "\n";
}
