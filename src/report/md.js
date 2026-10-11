const cell = (s) => String(s).replace(/\|/g, "\\|").replace(/\n/g, " ");

export default function md(report) {
  const s = report.summary;
  const L = [];
  L.push("# n8n workflow lint report", "");
  L.push(
    `**Overall score: ${s.score}/100 (${s.grade})** | ${s.files} workflow(s) | ${s.findings} finding(s)`,
    "",
  );
  L.push(
    "| Critical | High | Medium | Low | Info |",
    "|---:|---:|---:|---:|---:|",
  );
  L.push(
    `| ${s.counts.critical} | ${s.counts.high} | ${s.counts.medium} | ${s.counts.low} | ${s.counts.info} |`,
    "",
  );
  for (const f of report.files) {
    L.push(
      `## ${cell(f.name)}`,
      "",
      `File: \`${f.file}\` | Score: **${f.score}/100 (${f.grade})**`,
      "",
    );
    if (f.findings.length) {
      L.push(
        "| Severity | Rule | Node | Finding | Fix |",
        "|---|---|---|---|---|",
      );
      for (const x of f.findings)
        L.push(
          `| ${x.severity} | ${x.ruleId} | ${x.node ? cell(x.node) : "-"} | ${cell(x.message)} | ${cell(x.fix)} |`,
        );
    } else L.push("No findings.");
    if (f.estimate.rows.length) {
      L.push(
        "",
        `Estimated LLM cost (upper bound): ~$${f.estimate.monthlyUsd.toFixed(2)}/month at ${f.estimate.runsPerDay} runs/day, prices dated ${f.estimate.pricesDate}.`,
      );
    }
    L.push("");
  }
  for (const w of report.warnings) L.push(`> Warning: ${w}`, "");
  L.push("---", "", "Production-readiness lint by SkynetLabs", "");
  return L.join("\n");
}
