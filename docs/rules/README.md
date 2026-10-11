# Rule catalogue

| Rule | Severity | Category | What it catches |
|---|---|---|---|
| [N8N001](N8N001.md) | critical | Security | Hardcoded secret in Code or HTTP node |
| [N8N002](N8N002.md) | high | Security | pinData leaked in the export |
| [N8N003](N8N003.md) | high | Security | Webhook with no authentication |
| [N8N004](N8N004.md) | info | Security | Credential referenced by instance id/name, not placeholder |
| [N8N005](N8N005.md) | medium | Security | TLS certificate validation disabled |
| [N8N010](N8N010.md) | high | Reliability | No error workflow |
| [N8N011](N8N011.md) | medium | Reliability | HTTP Request without retry or timeout |
| [N8N012](N8N012.md) | medium | Reliability | Loop with no exit branch |
| [N8N013](N8N013.md) | low | Reliability | Orphan or disconnected node |
| [N8N014](N8N014.md) | low | Reliability | Default node names |
| [N8N015](N8N015.md) | low | Reliability | Deprecated node typeVersion |
| [N8N016](N8N016.md) | medium | Reliability | $input.first() without a guard |
| [N8N017](N8N017.md) | medium | Reliability | No trigger node |
| [N8N018](N8N018.md) | info | Reliability | Disabled nodes left in workflow |
| [N8N019](N8N019.md) | medium | Reliability | Execute Command node |
| [N8N020](N8N020.md) | high | AI cost | AI Agent without a sane iteration cap |
| [N8N021](N8N021.md) | high | AI cost | Retry path loops back into an LLM node |
| [N8N022](N8N022.md) | high | AI cost | HTTP error output wired back into an agent |
| [N8N023](N8N023.md) | low | AI cost | High estimated monthly LLM token cost |
