---
description: Run a Codex code review against local git state
argument-hint: '[--wait|--background] [--base <ref>] [--scope auto|working-tree|branch] [--model <model|sol|terra|luna|astra|spark>] [--effort <none|minimal|low|medium|high|xhigh|max|ultra>] [--fast]'
disable-model-invocation: true
allowed-tools: Read, Glob, Grep, Bash(node:*), Bash(git:*), AskUserQuestion
---

Run a Codex review through the built-in reviewer. This command is review-only: do not fix issues,
apply patches, or suggest that you are about to make changes. Your only job is to run the review
and return Codex's output verbatim to the user.

Raw slash-command arguments:

`$ARGUMENTS`

## Fast path — explicit execution mode

If the raw arguments already contain `--wait` or `--background`, do not ask anything. Run:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/codex-companion.mjs" review "$ARGUMENTS"
```

`--background` is handled by the script itself: it queues a detached `review-worker` and returns
the job id immediately, so this single call never blocks. Return the command stdout verbatim,
exactly as-is.

## Slow path — no execution mode chosen

Only when neither flag is present, estimate the size once, then ask once.

Size estimate:

- Working-tree review: `git status --short --untracked-files=all`, plus `git diff --shortstat --cached` and `git diff --shortstat`.
- Base-branch review: `git diff --shortstat <base>...HEAD`.
- Treat untracked files as reviewable work even when `--shortstat` is empty.
- Only conclude there is nothing to review when the scoped status or diff is genuinely empty.
- Recommend waiting only when the review is clearly tiny: roughly 1-2 files and no sign of a directory-sized change.
- In every other case, including unclear size, recommend background.
- When in doubt, run the review instead of declaring that there is nothing to review.

Then use `AskUserQuestion` exactly once, with the recommended option first and `(Recommended)` on
its label:

- `Wait for results`
- `Run in background`

Run the command with the chosen flag appended, then return its stdout verbatim.

## Argument rules

- Preserve the user's arguments exactly; do not rewrite the user's intent.
- `--model` selects the Codex model, `--effort` sets its reasoning level, `--fast` enables Codex
  fast mode. Pass all three through unchanged and never treat them as review focus text.
- Model aliases: `sol` → `gpt-6.2-sol`, `astra` → `gpt-6.2-astra`, `terra` → `gpt-6.1-terra`,
  `luna` → `gpt-6-luna`, legacy `spark` → `gpt-6-luna`; pinned generations `sol61` → `gpt-6.1-sol`, `sol6` → `gpt-6-sol`, `astra6` → `gpt-6-astra`.
- `/codex:review` is native-review only. It does not support staged-only review, unstaged-only
  review, or extra focus text.
- If the user needs custom review instructions or more adversarial framing, point them at
  `/codex:adversarial-review`.
- Do not paraphrase, summarize, rewrite, or add commentary around the command output.
