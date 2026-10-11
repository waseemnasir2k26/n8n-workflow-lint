import { RULES, CATEGORY } from "../rules/index.js";

const LEVEL = {
  critical: "error",
  high: "error",
  medium: "warning",
  low: "note",
  info: "note",
};
const SECURITY_SEVERITY = {
  critical: "9.5",
  high: "8.0",
  medium: "5.5",
  low: "3.0",
  info: "1.0",
};

export default function sarif(report) {
  const used = RULES;
  const doc = {
    $schema: "https://json.schemastore.org/sarif-2.1.0.json",
    version: "2.1.0",
    runs: [
      {
        tool: {
          driver: {
            name: "n8n-workflow-lint",
            version: report.version,
            informationUri:
              "https://github.com/waseemnasir2k26/n8n-workflow-lint",
            rules: used.map((r) => ({
              id: r.id,
              name: r.title
                .replace(/[^A-Za-z0-9]+/g, " ")
                .trim()
                .replace(/ (\w)/g, (_, ch) => ch.toUpperCase()),
              shortDescription: { text: r.title },
              fullDescription: { text: r.why },
              help: {
                text: `${r.fix}`,
                markdown: `**Fix:** ${r.fix}\n\nDocs: https://github.com/waseemnasir2k26/n8n-workflow-lint/blob/main/docs/rules/${r.id}.md`,
              },
              helpUri: `https://github.com/waseemnasir2k26/n8n-workflow-lint/blob/main/docs/rules/${r.id}.md`,
              defaultConfiguration: { level: LEVEL[r.severity] },
              properties: {
                tags: [CATEGORY(r.id).toLowerCase(), "n8n"],
                "security-severity": SECURITY_SEVERITY[r.severity],
              },
            })),
          },
        },
        results: report.files.flatMap((f) =>
          f.findings.map((x) => ({
            ruleId: x.ruleId,
            ruleIndex: used.findIndex((r) => r.id === x.ruleId),
            level: LEVEL[x.severity],
            message: {
              text: `${x.node ? `"${x.node}": ` : ""}${x.message} Fix: ${x.fix}`,
            },
            locations: [
              {
                physicalLocation: {
                  artifactLocation: { uri: f.file },
                  region: { startLine: x.line || 1 },
                },
              },
            ],
          })),
        ),
      },
    ],
  };
  return JSON.stringify(doc, null, 2) + "\n";
}
