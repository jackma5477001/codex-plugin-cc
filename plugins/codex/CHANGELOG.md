# Changelog

## 1.0.9

- Tracked the Codex catalog bump to GPT-6.2: the `sol` alias now resolves to `gpt-6.2-sol` and `astra` to `gpt-6.2-astra`, matching the model Codex itself defaults to.
- Added pinned aliases for older generations so existing scripts keep working: `sol61` → `gpt-6.1-sol`, `sol6` → `gpt-6-sol`, `astra6` → `gpt-6-astra`. `terra` stays on `gpt-6.1-terra` and `luna`/`spark` on `gpt-6-luna`.
- Added a test that asserts every alias target, so a future catalog bump cannot silently leave an alias pointing at a retired generation.

## 1.0.8

- Added `/codex:usage` to read the plan, rate limits, reset credits, and lifetime token usage from the Codex app server.
- Added `/codex:image` to generate images through Codex's built-in image tool and save them into the workspace.
- Added `--approval <never|auto>`. `auto` maps to `approvalPolicy: "on-request"` plus `approvalsReviewer: "auto_review"`, so Codex reviews its own approval requests instead of prompting. `on-request` and `untrusted` are rejected because the plugin has no interactive approval channel yet.
- `/codex:rescue` now calls the companion script directly instead of routing through the `Agent` tool and the `codex:codex-rescue` subagent. This removes one model turn and one subagent session per rescue run, which matters most in the desktop app.
- The companion script now resolves implicit resume itself, so a follow-up prompt continues the latest thread without an `AskUserQuestion` round trip.
- `/codex:rescue` defaults implementation requests to a write-capable run and keeps review, investigation, and diagnosis read-only. `--write` and `--read-only` force either mode.
- `/codex:review` and `/codex:adversarial-review` accept `--effort`.
- `/codex:review --background` now really runs detached: the script queues a `review-worker` and returns the job id instead of waiting for the review to finish.
- `/codex:review` skips the size estimate and confirmation prompt when `--wait` or `--background` is already given, saving a model turn.
- Write-mode inference for `/codex:rescue` is conservative: only clearly implementation-shaped requests run write-capable. Blanket "do not change anything" phrasing stays read-only, while partial limits such as "do not run tests" or "without adding dependencies" do not downgrade an explicit fix request.
- Test suite now isolates the environment variables a host Claude Code session injects, so it passes when run from inside an installed plugin session.

## 1.0.7

- Updated the Codex model aliases to the current catalog: `sol` → `gpt-6.1-sol`, `terra` → `gpt-6.1-terra`, `luna` → `gpt-6-luna`, `astra` → `gpt-6-astra`. The legacy alias `spark` now maps to `gpt-6-luna`.
- Added Codex fast mode: `--fast` / `--speed <fast|default>` on `/codex:review`, `/codex:adversarial-review`, and `/codex:rescue`. It forwards the `priority` service tier to the app server.
- When no speed mode is requested the tier is left unset, so a user's `service_tier` in `codex/config.toml` still applies instead of being overridden by an explicit null.
- Added `max` and `ultra` to the accepted `--effort` values, matching the current model catalog.
- Renamed the `gpt-5-4-prompting` skill to `gpt-6-prompting` and updated its guidance to GPT-6.

## 1.0.0

- Initial version of the Codex plugin for Claude Code
