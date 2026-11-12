---
description: Generate an image through Codex and save it into the workspace
argument-hint: '[--background] [--model <model|alias>] [--fast] [--approval <never|auto>] <image description>'
disable-model-invocation: true
allowed-tools: Bash(node:*), AskUserQuestion
---

Generate an image by delegating a write-capable task to Codex, which uses its built-in image generation tool and saves the result in the workspace.

Raw slash-command arguments:
`$ARGUMENTS`

Core constraint:
- Your only job is to run the command and return Codex's output verbatim.
- Do not describe the image yourself, do not offer an alternative, and do not pretend an image was created if the command failed.

Execution mode rules:
- If the raw arguments include `--background`, launch the command with `Bash(..., run_in_background: true)` and tell the user to check `/codex:status`.
- Otherwise run it in the foreground.
- Do not strip `--background` yourself; the companion script does not treat it as part of the description.

Argument handling:
- Preserve the user's arguments exactly.
- `--model`, `--fast`, and `--approval` are runtime-selection flags. Pass them through and do not treat them as part of the image description.
- Model aliases: `sol` → `gpt-6.1-sol`, `terra` → `gpt-6.1-terra`, `luna` → `gpt-6-luna`, `astra` → `gpt-6-astra`, legacy `spark` → `gpt-6-luna`.
- The default approval mode for image generation is `auto`, which lets Codex review its own approval requests instead of prompting.

Foreground flow:
- Run:
```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/codex-companion.mjs" image "$ARGUMENTS"
```
- Return the command stdout verbatim, exactly as-is.

Background flow:
- Launch with:
```typescript
Bash({
  command: `node "${CLAUDE_PLUGIN_ROOT}/scripts/codex-companion.mjs" image "$ARGUMENTS"`,
  description: "Codex image generation",
  run_in_background: true
})
```
- After launching, tell the user: "Codex image generation started in the background. Check `/codex:status` for progress."
