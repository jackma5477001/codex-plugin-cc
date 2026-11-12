# Changelog

## 1.0.7

- Updated the Codex model aliases to the current catalog: `sol` → `gpt-6.1-sol`, `terra` → `gpt-6.1-terra`, `luna` → `gpt-6-luna`, `astra` → `gpt-6-astra`. The legacy alias `spark` now maps to `gpt-6-luna`.
- Added Codex fast mode: `--fast` / `--speed <fast|default>` on `/codex:review`, `/codex:adversarial-review`, and `/codex:rescue`. It forwards the `priority` service tier to the app server.
- When no speed mode is requested the tier is left unset, so a user's `service_tier` in `codex/config.toml` still applies instead of being overridden by an explicit null.
- Added `max` and `ultra` to the accepted `--effort` values, matching the current model catalog.
- Renamed the `gpt-5-4-prompting` skill to `gpt-6-prompting` and updated its guidance to GPT-6.

## 1.0.0

- Initial version of the Codex plugin for Claude Code
