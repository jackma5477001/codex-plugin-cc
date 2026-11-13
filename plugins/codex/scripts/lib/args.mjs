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

/** Characters a backslash may escape inside the raw argument string. */
const ESCAPABLE = new Set(["\\", "\"", "'"]);

/**
 * Splits a raw slash-command argument string into tokens.
 *
 * The rules below are driven by real regressions; keep them in sync with
 * tests/args.test.mjs before changing any of them.
 *
 * Backslashes: only consumed when escaping a quote, a space, or another
 * backslash. Treating every backslash as an escape corrupts Windows paths and
 * regular expressions (`fix C:\repo\src\parser.js` -> `fix C:reposrcparser.js`,
 * `\d+` -> `d+`). Everything else is kept verbatim.
 *
 * Quotes: a double quote always opens a quoted span, so partial splicing such
 * as `--cwd /tmp/"my repo"` and inline values such as `--model="sol"` work.
 * A single quote only opens one at a token boundary or right after `=`, which
 * keeps apostrophes in `it's` and `don't` literal. Inline `--write="false"`
 * must keep parsing as false; it is a write-permission boundary.
 */
export function splitRawArgumentString(raw) {
  const tokens = [];
  let current = "";
  let quote = null;
  const characters = [...raw];

  for (let index = 0; index < characters.length; index += 1) {
    const character = characters[index];

    if (character === "\\") {
      const next = characters[index + 1];
      // Inside single quotes a backslash is literal (POSIX shell behavior).
      if (quote === "'" || next === undefined) {
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

    if (quote) {
      if (character === quote) {
        quote = null;
      } else {
        current += character;
      }
      continue;
    }

    if (character === "'" || character === "\"") {
      // Double quotes always open a quoted span, so partial quoting such as
      // `docs/"task prompt.md"` and `--model="sol"` keep working.
      //
      // Single quotes are different: an apostrophe inside a word ("it's",
      // "don't") must stay literal. So a single quote only opens a quoted
      // span at a token boundary or right after `=`.
      const atTokenStart = current === "";
      const afterEquals = current.endsWith("=");
      if (character === "\"" || atTokenStart || afterEquals) {
        quote = character;
        continue;
      }
      current += character;
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
