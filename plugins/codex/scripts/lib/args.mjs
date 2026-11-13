/**
 * Parses CLI arguments.
 *
 * A token is an option when it starts with `-`, is not quoted, and is not inside
 * a prose span that already started. This keeps the two patterns users expect:
 *
 * - flags anywhere: `task-live --wait --json` and `--write fix it` both work.
 * - prose stays literal once text has begun: in `--write inspect O'Brien
 *   --read-only`, the trailing `--read-only` reads as prose only when it is
 *   quoted. Unquoted, it is a flag, which is why the rescue command document
 *   tells the model to quote the user's text.
 *
 * Quoting is the tool that disambiguates: anything inside quotes is text, never
 * an option. `--` ends option parsing entirely.
 */
export function parseArgs(argv, config = {}) {
  const valueOptions = new Set(config.valueOptions ?? []);
  const booleanOptions = new Set(config.booleanOptions ?? []);
  const aliasMap = config.aliasMap ?? {};
  const options = {};
  const positionals = [];
  let optionsEnded = false;

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (optionsEnded) {
      positionals.push(token);
      continue;
    }

    if (token === "--") {
      optionsEnded = true;
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

      // Unknown flags are prose so a typo does not silently change behavior.
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
 * Reads one whitespace-delimited token starting at `start`, honoring quotes.
 *
 * Double quotes follow POSIX: `\"` and `\\` are escapes, any other backslash is
 * literal (so `"C:\my repo"` keeps its path separators).
 *
 * Single quotes are literal, with exactly one escape: `\'` yields an apostrophe
 * and does not close the span. That keeps both a UNC prefix
 * (`'\\server\share'`) and `'don\'t'` intact.
 *
 * A single quote that sits between two word characters and has no closing
 * partner is an apostrophe, not a quote delimiter, so `O'Brien` and
 * `users' files` stay whole.
 */
function readToken(text, start) {
  let token = "";
  let index = start;
  let quoted = false;

  while (index < text.length && !/\s/.test(text[index])) {
    const character = text[index];

    if (character === "\"") {
      quoted = true;
      index += 1;
      while (index < text.length && text[index] !== "\"") {
        // Inside double quotes only \" escapes the quote. Backslash is a path
        // character, so `"\\server\share"` keeps both leading backslashes.
        if (text[index] === "\\" && text[index + 1] === "\"") {
          token += "\"";
          index += 2;
          continue;
        }
        token += text[index];
        index += 1;
      }
      index += 1; // closing quote
      continue;
    }

    if (character === "'") {
      if (isApostrophe(text, index)) {
        token += character;
        index += 1;
        continue;
      }
      quoted = true;
      index += 1;
      let closed = false;
      while (index < text.length) {
        if (text[index] === "\\" && text[index + 1] === "'") {
          token += "'";
          index += 2;
          continue;
        }
        if (text[index] === "'") {
          closed = true;
          index += 1;
          break;
        }
        token += text[index];
        index += 1;
      }
      // An unterminated quote keeps consuming to the end of the input, so the
      // text inside it can never be reinterpreted as a flag.
      if (!closed) {
        break;
      }
      continue;
    }

    if (character === "\\") {
      const next = text[index + 1];
      if (next === undefined) {
        token += character;
        index += 1;
        continue;
      }
      // Outside quotes, a backslash escapes a quote or another backslash.
      // Spaces are NOT escaped: backslash is a Windows path separator, and
      // `C:\repo\ --read-only` must not swallow the flag that follows.
      // A doubled backslash at the start of a token is a UNC prefix and is
      // kept as-is (`\\server\share`); anywhere else it collapses to one.
      const atTokenStart = token === "";
      if (next === "\\") {
        if (atTokenStart) {
          token += "\\\\";
          index += 2;
          continue;
        }
        token += "\\";
        index += 2;
        continue;
      }
      if (next === "\"" || next === "'") {
        token += next;
        index += 2;
        continue;
      }
      token += character;
      index += 1;
      continue;
    }

    token += character;
    index += 1;
  }

  return { token, end: index, quoted };
}

/**
 * True when the single quote at `index` is an apostrophe, not a delimiter.
 *
 * A preceding letter (any script, so `René's` counts) makes it an apostrophe.
 * With no preceding letter it always opens a span, so an unclosed leading
 * quote cannot expose the text inside it to option parsing.
 */
function isApostrophe(text, index) {
  const previous = text[index - 1] ?? "";
  if (!/[\p{L}\p{N}]/u.test(previous)) {
    return false;
  }
  const next = text[index + 1] ?? "";
  if (/[\p{L}\p{N}]/u.test(next)) {
    return true; // O'Brien, René's, don't
  }
  // users' / admins' -- possessive at a word end with nothing to pair with.
  for (let cursor = index + 1; cursor < text.length; cursor += 1) {
    if (text[cursor] === "\\") {
      cursor += 1;
      continue;
    }
    if (text[cursor] === "'") {
      return false;
    }
  }
  return true;
}

/**
 * Splits a raw slash-command argument string into tokens for `parseArgs`.
 *
 * Option-looking tokens (`-x`, `--flag`) are kept as flags wherever they appear,
 * so `task-live --wait --json` and `--write fix it` both work. Quoted text is
 * always literal: a token whose leading character was inside quotes is emitted
 * as prose, which is how a prompt that mentions `--read-only` stays inert. The
 * rescue command document therefore quotes the user's raw text.
 *
 * `valueOptions` is needed so `--model sol` keeps `sol` attached to the flag.
 */
export function splitRawArgumentString(raw, options = {}) {
  const valueOptions = options.valueOptions ?? new Set();
  const aliasMap = options.aliasMap ?? {};
  const text = String(raw ?? "");
  const tokens = [];
  let index = 0;

  while (index < text.length) {
    while (index < text.length && /\s/.test(text[index])) {
      index += 1;
    }
    if (index >= text.length) {
      break;
    }

    const startedQuoted = text[index] === "'" || text[index] === "\"";
    const { token, end } = readToken(text, index);
    index = end;

    const looksLikeFlag = !startedQuoted && (token.startsWith("-") || token.startsWith("--"));
    if (!looksLikeFlag) {
      tokens.push(token);
      continue;
    }

    tokens.push(token);

    // `--model sol` and `-m sol` consume the next token as the option value.
    const isLongFlag = token.startsWith("--") && !token.includes("=");
    const isShortFlag = !token.startsWith("--") && token.length === 2;
    const rawKey = isLongFlag ? token.slice(2) : isShortFlag ? token.slice(1) : null;
    const key = rawKey === null ? null : aliasMap[rawKey] ?? rawKey;
    if (key && valueOptions.has(key)) {
      while (index < text.length && /\s/.test(text[index])) {
        index += 1;
      }
      if (index < text.length) {
        const next = readToken(text, index);
        tokens.push(next.token);
        index = next.end;
      }
    }
  }

  return tokens;
}
