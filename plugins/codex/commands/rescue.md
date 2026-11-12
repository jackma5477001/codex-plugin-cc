---
description: Delegate investigation, an explicit fix request, or follow-up rescue work to Codex
argument-hint: "[--background|--wait] [--resume|--fresh] [--model <model|sol|terra|luna|astra|spark>] [--effort <none|minimal|low|medium|high|xhigh|max|ultra>] [--fast] [--approval <never|on-request|untrusted|auto>] [what Codex should investigate, solve, or continue]"
allowed-tools: Bash(node:*)
---

Run Codex through the companion script. The companion script is the only worker: do not call the
`Agent` tool, do not invoke `Skill(codex:codex-rescue)`, and do not do the work yourself.

Raw user request:

`$ARGUMENTS`

## Fast path — no confirmation needed

If the request includes `--background`, or it does not need a resume decision, run it directly:

- When the raw request contains `--background`, launch it detached and report the job id:

```typescript
Bash({
  command: `node "${CLAUDE_PLUGIN_ROOT}/scripts/codex-companion.mjs" task "$ARGUMENTS"`,
  description: "Codex rescue",
  run_in_background: true
})
```

- Otherwise run it in the foreground:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/codex-companion.mjs" task "$ARGUMENTS"
```

Return that command's stdout verbatim, exactly as-is, with no commentary before or after it.

The companion script resolves model aliases, speed mode, effort, approval mode, and implicit
resume on its own. Do not ask the user about resuming and do not add `--resume` or `--fresh`
yourself: the script already continues the latest thread for follow-up phrasing such as
"continue", "keep going", "apply the top fix", or "dig deeper", and starts a new thread when no
previous task exists.

## Argument rules

- Preserve the user's raw arguments exactly. Do not strip, reorder, or rewrite flags.
- `--model`, `--effort`, `--fast`, and `--approval` are runtime-selection flags. Pass them through
  unchanged and never treat them as part of the natural-language task text.
- Model aliases: `sol` → `gpt-6.1-sol`, `terra` → `gpt-6.1-terra`, `luna` → `gpt-6-luna`,
  `astra` → `gpt-6-astra`, legacy `spark` → `gpt-6-luna`.
- Leave `--effort`, `--model`, `--fast`, and `--approval` unset unless the user asked for them.
- Do not paraphrase, summarize, rewrite, or add commentary around the command output.
- If the companion script reports that Codex is missing or unauthenticated, tell the user to run
  `/codex:setup`.
- If the user supplied no request at all, ask what Codex should investigate or fix.
