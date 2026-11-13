import assert from "node:assert/strict";
import test from "node:test";

import { parseArgs, splitRawArgumentString } from "../plugins/codex/scripts/lib/args.mjs";

const BACKSLASH = String.fromCharCode(92);

const VALUE_OPTIONS = new Set(["model", "effort", "cwd", "prompt-file", "speed", "approval", "timeout-ms"]);
const BOOLEAN_OPTIONS = new Set([
  "write",
  "read-only",
  "fast",
  "background",
  "wait",
  "resume",
  "fresh",
  "json",
  "all"
]);

function parse(raw) {
  return parseArgs(splitRawArgumentString(raw, { valueOptions: VALUE_OPTIONS }), {
    valueOptions: VALUE_OPTIONS,
    booleanOptions: BOOLEAN_OPTIONS
  });
}

test("flags are recognized before and after positional arguments", () => {
  assert.equal(parse("--write fix it").options.write, true);
  const after = parse("task-live --wait --timeout-ms 25 --json");
  assert.deepEqual(after.options, { wait: true, "timeout-ms": "25", json: true });
  assert.deepEqual(after.positionals, ["task-live"]);
});

test("quoted prompt text is never reparsed as flags", () => {
  // The command document wraps the user's text in quotes for exactly this reason.
  const { options, positionals } = parse('--write "inspect O\'Brien --read-only"');
  assert.equal(options.write, true);
  assert.equal(options["read-only"], undefined);
  assert.deepEqual(positionals, ["inspect O'Brien --read-only"]);
});

test("an unclosed quote cannot leak a flag out of the prompt", () => {
  for (const raw of ["--write=false 'explain --write here", '--write=false "explain --write here']) {
    const { options, positionals } = parse(raw);
    assert.equal(options.write, false, raw);
    assert.deepEqual(positionals, ["explain --write here"], raw);
  }
});

test("apostrophes in names and possessives stay literal", () => {
  assert.deepEqual(parse("it's fine, don't worry").positionals, ["it's", "fine,", "don't", "worry"]);
  assert.deepEqual(parse("--write inspect O'Brien").positionals, ["inspect", "O'Brien"]);
  assert.deepEqual(parse("--write inspect users' files").positionals, ["inspect", "users'", "files"]);
});

test("Windows paths and regular expressions survive verbatim", () => {
  const path = `C:${BACKSLASH}repo${BACKSLASH}src${BACKSLASH}parser.js`;
  assert.deepEqual(parse(`--write fix ${path}`).positionals, ["fix", path]);
  assert.deepEqual(parse(`--write fix the regex ${BACKSLASH}d+`).positionals, [
    "fix",
    "the",
    "regex",
    `${BACKSLASH}d+`
  ]);
});

test("quoted paths and UNC prefixes keep their separators", () => {
  const unc = `${BACKSLASH}${BACKSLASH}server${BACKSLASH}my repo`;
  assert.equal(parse(`--cwd '${unc}' fix`).options.cwd, unc);
  assert.equal(parse(`--cwd "${unc}" fix`).options.cwd, unc);
  assert.equal(parse(`--cwd "C:${BACKSLASH}my repo" fix`).options.cwd, `C:${BACKSLASH}my repo`);
});

test("partial single-quote splicing still works", () => {
  assert.equal(parse("--cwd /tmp/'my repo' fix").options.cwd, "/tmp/my repo");
  assert.equal(parse("--prompt-file docs/'task prompt.md' fix").options["prompt-file"], "docs/task prompt.md");
});

test("inline boolean values still parse correctly", () => {
  assert.equal(parse('--write="false" fix it').options.write, false);
  assert.equal(parse('--write="true" fix it').options.write, true);
});

test("value options consume the next token even when it looks like prose", () => {
  const { options, positionals } = parse("--model sol fix it");
  assert.equal(options.model, "sol");
  assert.deepEqual(positionals, ["fix", "it"]);
});

test("an escaped quote inside a single-quoted span stays in the prose", () => {
  const { options, positionals } = parse(`--write=false 'explain don${BACKSLASH}'t use --write here'`);
  assert.equal(options.write, false);
  assert.deepEqual(positionals, ["explain don't use --write here"]);
});

test("empty input yields no tokens", () => {
  assert.deepEqual(splitRawArgumentString(""), []);
  assert.deepEqual(splitRawArgumentString("   "), []);
});
