# Changelog

## 1.0.0

Initial release.

- CLI: `n8n-workflow-lint <file|dir|glob>` with `--format text|json|sarif|md|html`, `--fail-on`, `--min-score`, `--rules`, `--disable`, `--config`, `--runs-per-day`, `--cost-threshold`, `--badge`, `--list-rules`.
- 19 documented rules (security, reliability, AI cost), one source file and one doc page each.
- Scorecard 0-100 with weighted severities and a letter grade.
- Upper-bound monthly LLM token-cost estimate from a bundled, dated price table (warns after 90 days).
- SARIF 2.1.0 output and a composite GitHub Action that uploads it to code scanning.
- Inline suppression via `n8n-lint-disable <RULE>` in a node's Notes.
- Zero runtime dependencies, Node 20+, ESM.
- Tests: fixtures (good/bad), SARIF shape test, golden-file test for the markdown report, CLI exit-code tests.
