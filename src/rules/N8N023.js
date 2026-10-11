import { estimate } from "../cost.js";

export default {
  id: "N8N023",
  severity: "low",
  title: "High estimated monthly LLM token cost",
  message: "Estimated monthly token cost exceeds the budget threshold.",
  fix: "Lower maxIterations, route simple steps to a cheaper model, or add a spend cap at the provider. Tune with --runs-per-day and --cost-threshold.",
  why: "Agent loops multiply calls. The estimate is a deliberate upper bound (every agent uses its full iteration budget) so you see worst-case exposure before production does.",
  bad: "AI Agent, maxIterations 10, claude-3-opus, 100 runs/day",
  good: "AI Agent, maxIterations 4, gpt-4o-mini",
  check(wf, ctx) {
    const threshold = ctx.opts.costThreshold ?? 100;
    const est = estimate(wf, {
      runsPerDay: ctx.opts.runsPerDay ?? 100,
      now: ctx.now,
    });
    if (est.monthlyUsd < threshold) return [];
    const top = [...est.rows].sort((a, b) => b.perRunUsd - a.perRunUsd)[0];
    return [
      {
        node: top.node,
        message: `Upper-bound estimate ~$${est.monthlyUsd.toFixed(0)}/month at ${est.runsPerDay} runs/day (prices dated ${est.pricesDate}); largest: "${top.node}" on ${top.model}.`,
      },
    ];
  },
};
