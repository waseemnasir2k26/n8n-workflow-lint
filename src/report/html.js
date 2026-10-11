const esc = (s) =>
  String(s).replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
  );
const COLOR = {
  critical: "#b42318",
  high: "#d92d20",
  medium: "#b54708",
  low: "#175cd3",
  info: "#667085",
};

export default function html(report) {
  const s = report.summary;
  const files = report.files
    .map((f) => {
      const rows = f.findings.length
        ? f.findings
            .map(
              (x) =>
                `<tr><td><span class="sev" style="background:${COLOR[x.severity]}">${esc(x.severity)}</span></td><td><code>${esc(x.ruleId)}</code></td><td>${x.node ? esc(x.node) : "-"}</td><td>${esc(x.message)}<div class="fix">Fix: ${esc(x.fix)}</div></td></tr>`,
            )
            .join("")
        : '<tr><td colspan="4">No findings.</td></tr>';
      const e = f.estimate;
      const cost = e.rows.length
        ? `<p class="meta">Estimated LLM cost (upper bound): ~$${e.monthlyUsd.toFixed(2)}/month at ${e.runsPerDay} runs/day, prices dated ${esc(e.pricesDate)}.</p>`
        : "";
      return `<section><h2>${esc(f.name)} <span class="score g${f.grade}">${f.score}/100 ${f.grade}</span></h2><p class="meta">${esc(f.file)}</p><table><thead><tr><th>Severity</th><th>Rule</th><th>Node</th><th>Finding</th></tr></thead><tbody>${rows}</tbody></table>${cost}</section>`;
    })
    .join("\n");
  const warn = report.warnings
    .map((w) => `<p class="warn">${esc(w)}</p>`)
    .join("");
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>n8n workflow lint report</title>
<style>
:root{--bg:#fff;--fg:#101828;--mut:#667085;--line:#eaecf0;--card:#f9fafb}
@media (prefers-color-scheme:dark){:root{--bg:#0b1020;--fg:#eef2f6;--mut:#98a2b3;--line:#1d2939;--card:#111830}}
body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.5 system-ui,-apple-system,Segoe UI,sans-serif}
main{max-width:960px;margin:0 auto;padding:24px 16px}
h1{margin:0 0 4px}.meta{color:var(--mut);font-size:13px}.warn{color:#b54708}
.hero{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:16px;margin:16px 0}
.big{font-size:44px;font-weight:700}
section{margin:24px 0;overflow-x:auto}
table{border-collapse:collapse;width:100%;font-size:14px}th,td{text-align:left;padding:8px;border-bottom:1px solid var(--line);vertical-align:top}
.sev{color:#fff;border-radius:6px;padding:2px 8px;font-size:12px;text-transform:uppercase}
.fix{color:var(--mut);font-size:13px;margin-top:2px}
.score{font-size:14px;border:1px solid var(--line);border-radius:999px;padding:2px 10px;margin-left:8px}
footer{margin-top:32px;color:var(--mut);font-size:13px;border-top:1px solid var(--line);padding-top:12px}
</style></head><body><main>
<h1>n8n workflow lint report</h1>
<div class="hero"><div class="big">${s.score}/100 <small>${s.grade}</small></div>
<div class="meta">${s.files} workflow(s) | ${s.counts.critical} critical, ${s.counts.high} high, ${s.counts.medium} medium, ${s.counts.low} low, ${s.counts.info} info</div></div>
${warn}
${files}
<footer>Production-readiness lint by SkynetLabs</footer>
</main></body></html>
`;
}
