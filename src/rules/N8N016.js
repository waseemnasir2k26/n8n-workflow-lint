import { activeNodes, typeIs } from "../util.js";

const GUARD =
  /\$input\.all\(\)\.length|\$input\.first\(\)\s*(\?\.|&&|\|\||\?\?)|if\s*\(\s*!?\s*\$input|\$input\.isExecuted/;

export default {
  id: "N8N016",
  severity: "medium",
  title: "$input.first() without a guard",
  message: "Code node reads $input.first() with no empty-input guard.",
  fix: "Check `$input.all().length` first, or use optional chaining: `$input.first()?.json`.",
  why: "When the previous node returns zero items, $input.first() is undefined and the Code node throws, killing the run.",
  bad: "const id = $input.first().json.id;",
  good: "const first = $input.first(); if (!first) return [];",
  check(wf) {
    return activeNodes(wf)
      .filter((n) => typeIs(n, ".code"))
      .filter((n) => {
        const code = String(n.parameters?.jsCode || "");
        return /\$input\.first\(\)\s*\./.test(code) && !GUARD.test(code);
      })
      .map((n) => ({ node: n.name }));
  },
};
