---
description: Show the Codex plan, remaining rate limits, reset credits, and token usage
argument-hint: '[--json] [--no-usage]'
disable-model-invocation: true
allowed-tools: Bash(node:*)
---

Run:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/codex-companion.mjs" usage $ARGUMENTS
```

Return the command stdout verbatim, exactly as-is. Do not paraphrase, summarize, or add commentary before or after it.

Notes:
- This command is read-only. It only reads the account's quota and token usage from the Codex app server.
- `--json` returns the raw normalized payload instead of the rendered report.
- `--no-usage` skips the token-usage query and reports rate limits only.
- If the command fails because Codex is missing or unauthenticated, tell the user to run `/codex:setup`.
