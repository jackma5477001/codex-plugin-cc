import assert from "node:assert/strict";
import test from "node:test";

import { parseArgs, splitRawArgumentString } from "../plugins/codex/scripts/lib/args.mjs";

const BACKSLASH = String.fromCharCode(92);

test("splitRawArgumentString keeps Windows paths intact", () => {
  const raw = `--write fix C:${BACKSLASH}repo${BACKSLASH}src${BACKSLASH}parser.js`;
  assert.deepEqual(splitRawArgumentString(raw), [
    "--write",
    "fix",
    `C:${BACKSLASH}repo${BACKSLASH}src${BACKSLASH}parser.js`
  ]);
});

test("splitRawArgumentString keeps regular expression escapes intact", () => {
  const raw = `--write fix the regex ${BACKSLASH}d+`;
  assert.deepEqual(splitRawArgumentString(raw), ["--write", "fix", "the", "regex", `${BACKSLASH}d+`]);
});

test("splitRawArgumentString still honors real quoting and escaping", () => {
  assert.deepEqual(splitRawArgumentString('a "b c" d'), ["a", "b c", "d"]);
  assert.deepEqual(splitRawArgumentString(`say ${BACKSLASH}"hi${BACKSLASH}"`), ["say", '"hi"']);
  assert.deepEqual(splitRawArgumentString(`fix it ${BACKSLASH}`), ["fix", "it", BACKSLASH]);
});

test("splitRawArgumentString keeps apostrophes inside words", () => {
  assert.deepEqual(splitRawArgumentString("it's fine, don't worry"), ["it's", "fine,", "don't", "worry"]);
});

test("splitRawArgumentString keeps inline quoted option values intact", () => {
  assert.deepEqual(splitRawArgumentString('--model="sol" fix it'), ["--model=sol", "fix", "it"]);
  assert.deepEqual(splitRawArgumentString('--cwd="/tmp/my repo" fix it'), [
    "--cwd=/tmp/my repo",
    "fix",
    "it"
  ]);
});

test("an inline --write=false must not become a write run", () => {
  const { options } = parseArgs(splitRawArgumentString('--write="false" fix it'), {
    booleanOptions: ["write", "read-only"]
  });
  assert.equal(options.write, false);
});

test("splitRawArgumentString parses a combined mode flag with other options", () => {
  assert.deepEqual(splitRawArgumentString("--write --model sol --fast fix the parser"), [
    "--write",
    "--model",
    "sol",
    "--fast",
    "fix",
    "the",
    "parser"
  ]);
});
