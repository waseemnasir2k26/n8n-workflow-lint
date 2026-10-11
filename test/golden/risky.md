# n8n workflow lint report

**Overall score: 0/100 (F)** | 1 workflow(s) | 14 finding(s)

| Critical | High | Medium | Low | Info |
|---:|---:|---:|---:|---:|
| 1 | 5 | 5 | 3 | 0 |

## Lead intake agent (risky)

File: `examples/risky-workflow.json` | Score: **0/100 (F)**

| Severity | Rule | Node | Finding | Fix |
|---|---|---|---|---|
| critical | N8N001 | HTTP Request | Bearer token at headerParameters.parameters[0].value (Bear...(38 chars)). | Move the value into an n8n credential or an environment variable and reference it by expression; rotate the exposed secret. |
| high | N8N002 | - | pinData present on 1 node(s) (1 item(s)): Webhook. | Unpin data in the editor (or delete the "pinData" key) before sharing or committing the workflow. |
| high | N8N003 | Webhook | Webhook node accepts unauthenticated requests. | Set Authentication to Header Auth / Basic Auth / JWT on the Webhook node, or verify a signature in the first node. |
| high | N8N010 | - | No Error Workflow is configured and there is no Error Trigger. | Set Settings -> Error Workflow to a workflow that starts with an Error Trigger and alerts you (Slack, email). |
| high | N8N021 | AI Agent | Cycle through "AI Agent" -> "Code" -> "HTTP Request1" re-enters an LLM node with no ceiling. | Break the cycle: cap attempts with a counter and an IF, or use node-level Retry On Fail (bounded by maxTries) instead of wiring a loop. |
| high | N8N022 | HTTP Request1 | Error output of "HTTP Request1" reaches AI Agent "AI Agent". | Send the error output to an alert/stop path (Stop and Error, Slack), not back into the agent. Cap agent iterations (N8N020). |
| medium | N8N005 | HTTP Request | HTTP Request ignores invalid TLS certificates. | Turn off "Ignore SSL Issues" and install the correct CA certificate or fix the endpoint certificate. |
| medium | N8N011 | HTTP Request | HTTP Request is missing retryOnFail and timeout. | Enable "Retry On Fail" (3 tries, 2-5 s wait) and set Options -> Timeout (e.g. 30000 ms). |
| medium | N8N011 | HTTP Request1 | HTTP Request is missing retryOnFail and timeout. | Enable "Retry On Fail" (3 tries, 2-5 s wait) and set Options -> Timeout (e.g. 30000 ms). |
| medium | N8N016 | Code | Code node reads $input.first() with no empty-input guard. | Check `$input.all().length` first, or use optional chaining: `$input.first()?.json`. |
| medium | N8N020 | AI Agent | AI Agent relies on the default iteration limit (no explicit maxIterations). | Set Options -> Max Iterations to a small number (3-5 for most agents; never above 10). |
| low | N8N014 | HTTP Request | 4 node(s) have default names: "HTTP Request", "AI Agent", "Code", "HTTP Request1". | Rename nodes to say what they do ("Fetch Orders", "Is VIP?"). Expressions that reference them become readable. |
| low | N8N015 | HTTP Request | typeVersion 1 is older than 4 for n8n-nodes-base.httpRequest. | Re-add the node from the node panel (or open and re-save it in a current n8n) so it picks up the current version. |
| low | N8N023 | AI Agent | Upper-bound estimate ~$2025/month at 100 runs/day (prices dated 2026-10-12); largest: "AI Agent" on claude-3-opus. | Lower maxIterations, route simple steps to a cheaper model, or add a spend cap at the provider. Tune with --runs-per-day and --cost-threshold. |

Estimated LLM cost (upper bound): ~$2025.00/month at 100 runs/day, prices dated 2026-10-12.

---

Production-readiness lint by SkynetLabs
