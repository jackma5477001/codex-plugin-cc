# Changelog

## 1.0.8

- Added `/codex:usage` to read the plan, rate limits, reset credits, and lifetime token usage from the Codex app server.
- Added `/codex:image` to generate images through Codex's built-in image tool and save them into the workspace.
- Added `--approval <never|on-request|untrusted|auto>`. `auto` maps to `approvalPolicy: "on-request"` plus `approvalsReviewer: "auto_review"`, so Codex reviews its own approval requests instead of prompting.
- `/codex:rescue` now calls the companion script directly instead of routing through the `Agent` tool and the `codex:codex-rescue` subagent. This removes one model turn and one subagent session per rescue run, which matters most in the desktop app.
- The companion script now resolves implicit resume itself, so a follow-up prompt continues the latest thread without an `AskUserQuestion` round trip.
- `/codex:review` and `/codex:adversarial-review` accept `--effort`.

## 1.0.7

- Updated the Codex model aliases to the current catalog: `sol` → `gpt-6.1-sol`, `terra` → `gpt-6.1-terra`, `luna` → `gpt-6-luna`, `astra` → `gpt-6-astra`. The legacy alias `spark` now maps to `gpt-6-luna`.
- Added Codex fast mode: `--fast` / `--speed <fast|default>` on `/codex:review`, `/codex:adversarial-review`, and `/codex:rescue`. It forwards the `priority` service tier to the app server.
- When no speed mode is requested the tier is left unset, so a user's `service_tier` in `codex/config.toml` still applies instead of being overridden by an explicit null.
- Added `max` and `ultra` to the accepted `--effort` values, matching the current model catalog.
- Renamed the `gpt-5-4-prompting` skill to `gpt-6-prompting` and updated its guidance to GPT-6.

## 1.0.0

- Initial version of the Codex plugin for Claude Code
