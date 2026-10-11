// Generates docs/rules/<id>.md and docs/rules/README.md from rule metadata.
// Run: node scripts/gen-docs.js
import fs from "node:fs";
import { RULES, CATEGORY } from "../src/rules/index.js";

fs.mkdirSync("docs/rules", { recursive: true });
for (const r of RULES) {
  const body = `# ${r.id}: ${r.title}

- Severity: **${r.severity}**
- Category: ${CATEGORY(r.id)}
- Disable: \`--disable ${r.id}\` or put \`n8n-lint-disable ${r.id}\` in the node's Notes field.

## Why it matters

${r.why}

## What triggers it

${r.message}

## Example

Flagged:

\`\`\`
${r.bad}
\`\`\`

Better:

\`\`\`
${r.good}
\`\`\`

## How to fix

${r.fix}

---

Production-readiness lint by SkynetLabs
`;
  fs.writeFileSync(`docs/rules/${r.id}.md`, body);
}
const index = `# Rule catalogue

| Rule | Severity | Category | What it catches |
|---|---|---|---|
${RULES.map((r) => `| [${r.id}](${r.id}.md) | ${r.severity} | ${CATEGORY(r.id)} | ${r.title} |`).join("\n")}
`;
fs.writeFileSync("docs/rules/README.md", index);
console.log(`wrote ${RULES.length} rule docs`);
