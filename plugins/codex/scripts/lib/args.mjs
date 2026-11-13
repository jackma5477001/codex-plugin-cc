export function parseArgs(argv, config = {}) {
  const valueOptions = new Set(config.valueOptions ?? []);
  const booleanOptions = new Set(config.booleanOptions ?? []);
  const aliasMap = config.aliasMap ?? {};
  const options = {};
  const positionals = [];
  let passthrough = false;

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (passthrough) {
      positionals.push(token);
      continue;
    }

    if (token === "--") {
      passthrough = true;
      continue;
    }

    if (!token.startsWith("-") || token === "-") {
      positionals.push(token);
      continue;
    }

    if (token.startsWith("--")) {
      const [rawKey, inlineValue] = token.slice(2).split("=", 2);
      const key = aliasMap[rawKey] ?? rawKey;

      if (booleanOptions.has(key)) {
        options[key] = inlineValue === undefined ? true : inlineValue !== "false";
        continue;
      }

      if (valueOptions.has(key)) {
        const nextValue = inlineValue ?? argv[index + 1];
        if (nextValue === undefined) {
          throw new Error(`Missing value for --${rawKey}`);
        }
        options[key] = nextValue;
        if (inlineValue === undefined) {
          index += 1;
        }
        continue;
      }

      positionals.push(token);
      continue;
    }

    const shortKey = token.slice(1);
    const key = aliasMap[shortKey] ?? shortKey;

    if (booleanOptions.has(key)) {
      options[key] = true;
      continue;
    }

    if (valueOptions.has(key)) {
      const nextValue = argv[index + 1];
      if (nextValue === undefined) {
        throw new Error(`Missing value for -${shortKey}`);
      }
      options[key] = nextValue;
      index += 1;
      continue;
    }

    positionals.push(token);
  }

  return { options, positionals };
}

/** Characters a backslash may escape outside quotes. */
const ESCAPABLE = new Set(["\\", "\"", "'"]);

/**
 * True when the single quote at `index` should be read as an apostrophe rather
 * than as the start of a quoted span.
 *
 * Two signals, either is enough:
 * - it sits between two word characters (`it's`, `don't`, `O'Brien`);
 * - there is no matching unescaped single quote later, so it cannot be a
 *   delimiter (`users' files`).
 *
 * This is what lets `docs/'task prompt.md'` and `/tmp/'my repo'` splice while
 * `O'Brien --read-only` keeps its apostrophe and does not swallow the flag.
 */
function isApostrophe(characters, index) {
  const previous = characters[index - 1];
  const next = characters[index + 1];
  if (/[A-Za-z0-9]/.test(previous ?? "") && /[A-Za-z0-9]/.test(next ?? "")) {
    return true;
  }
  return !hasClosingSingleQuote(characters, index);
}

function hasClosingSingleQuote(characters, startIndex) {
  for (let index = startIndex + 1; index < characters.length; index += 1) {
    if (characters[index] === "\\") {
      index += 1; // skip the escaped character
      continue;
    }
    if (characters[index] === "'") {
      return true;
    }
  }
  return false;
}

/**
 * Splits a raw slash-command argument string into tokens.
 *
 * The rules below are driven by real regressions; keep them in sync with
 * tests/args.test.mjs before changing any of them.
 *
 * Backslashes outside quotes: only consumed when escaping a quote, a space, or
 * another backslash. Treating every backslash as an escape corrupts Windows
 * paths and regular expressions (`C:\repo\src\x.js` -> `C:reposrcx.js`,
 * `\d+` -> `d+`), so everything else is kept verbatim.
 *
 * Backslashes inside single quotes: only `\'` is special, so it cannot close
 * the span early. Every other backslash is literal, which keeps a UNC prefix
 * (`'\\server\share'`) intact.
 *
 * Quotes: a double quote always opens a span, so partial splicing such as
 * `--cwd /tmp/"my repo"` and inline `--model="sol"` work. A single quote opens
 * one unless it reads as an apostrophe (see isApostrophe). Inline
 * `--write="false"` must keep parsing as false: it is a write-permission
 * boundary.
 */
export function splitRawArgumentString(raw) {
  const tokens = [];
  let current = "";
  let quote = null;
  const characters = [...raw];

  for (let index = 0; index < characters.length; index += 1) {
    const character = characters[index];

    if (quote === "'") {
      // Only \' is special inside single quotes; \d, \\server etc. stay literal.
      if (character === "\\" && characters[index + 1] === "'") {
        current += "'";
        index += 1;
        continue;
      }
      if (character === "'") {
        quote = null;
        continue;
      }
      current += character;
      continue;
    }

    if (quote === "\"") {
      // Only \" is special inside double quotes. Backslash is a path character
      // on Windows, so `"\\server\share"` must keep both leading backslashes.
      if (character === "\\" && characters[index + 1] === "\"") {
        current += "\"";
        index += 1;
        continue;
      }
      if (character === "\"") {
        quote = null;
        continue;
      }
      current += character;
      continue;
    }

    if (character === "\\") {
      const next = characters[index + 1];
      if (next === undefined) {
        current += character;
        continue;
      }
      if (ESCAPABLE.has(next) || /\s/.test(next)) {
        current += next;
        index += 1;
        continue;
      }
      current += character;
      continue;
    }

    if (character === "\"") {
      quote = character;
      continue;
    }

    if (character === "'") {
      if (isApostrophe(characters, index)) {
        current += character;
        continue;
      }
      quote = character;
      continue;
    }

    if (/\s/.test(character)) {
      if (current) {
        tokens.push(current);
        current = "";
      }
      continue;
    }

    current += character;
  }

  if (current) {
    tokens.push(current);
  }

  return tokens;
}
