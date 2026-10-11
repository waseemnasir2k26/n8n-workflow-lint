// Dev helper: print the rule ids that fire for every fixture.
import fs from "node:fs";
import path from "node:path";
import { lintText } from "../src/index.js";

for (const kind of ["good", "bad"]) {
  const dir = path.join("fixtures", kind);
  for (const f of fs.readdirSync(dir).sort()) {
    const r = lintText(fs.readFileSync(path.join(dir, f), "utf8"), f)[0];
    console.log(
      `${kind}/${f}: ${[...new Set(r.findings.map((x) => x.ruleId))].join(",") || "-"}`,
    );
  }
}
