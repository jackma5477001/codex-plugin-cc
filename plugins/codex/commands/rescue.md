---
description: Delegate investigation, an explicit fix request, or follow-up rescue work to Codex
argument-hint: "[--background|--wait] [--resume|--fresh] [--write|--read-only] [--model <model|sol|terra|luna|astra|spark>] [--effort <none|minimal|low|medium|high|xhigh|max|ultra>] [--fast] [--approval <never|auto>] [what Codex should investigate, solve, or continue]"
allowed-tools: Bash(node:*)
---

Run Codex through the companion script. The companion script is the only worker: do not call the
`Agent` tool, do not invoke `Skill(codex:codex-rescue)`, and do not do the work yourself.

Raw user request:

`$ARGUMENTS`

## Step 1 — decide the write mode, and always pass it explicitly

Codex runs read-only by default, but a resumed thread inherits its previous write mode. So you
must always pass a mode flag explicitly; never omit it.

- Pass `--write` when the request asks for a change to the code: fixing, implementing,
  refactoring, adding, updating, or deleting code, config, or docs.
- Pass `--read-only` for review, investigation, diagnosis, explanation, research, or planning, and
  whenever the user says not to modify anything. This is required even though read-only is the
  default, because it stops a resumed write-capable thread from silently writing again.

Do not try to encode this from keywords. Judge the request the way a colleague would: a request
that only restricts one side activity ("do not run tests", "without adding dependencies") still
wants the code change. A request that names a concrete fix plus an unrelated prohibition
("fix the parser, do not delete any files") is still a write request. A request that forbids
changing anything at all ("do not fix anything yet", "just investigate") is read-only.

If the user already passed `--write` or `--read-only`, do not add a second mode flag.

## Step 2 — run it

Put the mode flag into the argument string, and **wrap the user's raw text in double quotes** so a
sentences mention of `--write` or `--read-only` stays prose instead of turning into a flag:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/codex-companion.mjs" task "--write \"$ARGUMENTS\""
```

Use `--read-only` in place of `--write` for read-only requests.

Rules for building that command:

- The mode flag goes outside the quotes; the user's text goes inside them.
- The script only splits a single argument string, so everything must be one quoted argument.
- If the user's text itself contains a double quote, switch that span to single quotes instead.
- Do not escape or rewrite the user's text otherwise.

When the request contains `--background`, launch it detached instead:

```typescript
Bash({
  command: `node "${CLAUDE_PLUGIN_ROOT}/scripts/codex-companion.mjs" task "--write $ARGUMENTS"`,
  description: "Codex rescue",
  run_in_background: true
})
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
- `--wait` is a Claude-side execution flag. Strip it before calling the script.
- Model aliases: `sol` → `gpt-6.1-sol`, `terra` → `gpt-6.1-terra`, `luna` → `gpt-6-luna`,
  `astra` → `gpt-6-astra`, legacy `spark` → `gpt-6-luna`.
- Leave `--effort`, `--model`, `--fast`, and `--approval` unset unless the user asked for them.
- Do not paraphrase, summarize, rewrite, or add commentary around the command output.
- If the companion script reports that Codex is missing or unauthenticated, tell the user to run
  `/codex:setup`.
- If the user supplied no request at all, ask what Codex should investigate or fix.
