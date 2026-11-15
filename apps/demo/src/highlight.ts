/**
 * YAML as a code editor colours it, for the demo's "View YAML" panel. The text comes from the docs' own writer
 * (`tools/docs/src/yaml.ts`: block style, plain or quoted scalars, empty `[]` and `{}`), so the grammar is known and
 * small: a line is its indentation, a list's dashes, then a key and its colon, a value, or a comment. Each line is cut
 * into pieces that join back into it exactly; nothing is dropped, nothing added.
 */

/** What a piece of a line is, as the panel colours it. */
export type YamlKind =
  'key' | 'string' | 'number' | 'bool' | 'null' | 'dash' | 'punct' | 'comment' | 'space';

export interface YamlPiece {
  readonly kind: YamlKind;
  readonly text: string;
}

/** YAML 1.1's booleans, in any case (Home Assistant's loader reads `on` and `yes` as true). */
const BOOL = /^(?:y|n|yes|no|on|off|true|false)$/i;
const NULL = /^(?:~|null)$/i;
/** A number: an integer, a decimal or one with an exponent, signed or not; YAML's infinities and its not-a-number. */
const NUMBER =
  /^(?:[-+]?(?:\d[\d_]*(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?|[-+]?\.(?:inf|Inf|INF)|\.(?:nan|NaN|NAN))$/;

/** Where a quoted scalar that opens at `from` closes (after its closing quote); the end of the text if it never does. */
function quotedEnd(text: string, from: number): number {
  const quote = text[from];
  for (let at = from + 1; at < text.length; at += 1) {
    if (quote === '"' && text[at] === '\\') at += 1;
    else if (text[at] === quote) {
      // a single quote doubled is one quote inside the string
      if (quote === "'" && text[at + 1] === "'") at += 1;
      else return at + 1;
    }
  }
  return text.length;
}

/** A colon that ends a key: one followed by a space or the end of the line. */
const endsKey = (text: string, at: number): boolean =>
  text[at] === ':' && (at + 1 === text.length || text[at + 1] === ' ');

/** A hash that starts a comment: one at the start or after a space. */
const startsComment = (text: string, at: number): boolean =>
  text[at] === '#' && (at === 0 || text[at - 1] === ' ');

/** A plain scalar by what YAML reads it as. */
const kindOf = (scalar: string): YamlKind =>
  NULL.test(scalar)
    ? 'null'
    : BOOL.test(scalar)
      ? 'bool'
      : NUMBER.test(scalar)
        ? 'number'
        : 'string';

/** A value and whatever follows it on its line (spaces, a comment). */
function value(text: string, out: YamlPiece[]): void {
  const push = (kind: YamlKind, piece: string): void => {
    if (piece) out.push({ kind, text: piece });
  };
  const lead = /^ */.exec(text)?.[0] ?? '';
  push('space', lead);
  let rest = text.slice(lead.length);
  if (!rest) return;
  if (rest.startsWith('#')) {
    push('comment', rest);
    return;
  }
  let end: number;
  if (rest[0] === "'" || rest[0] === '"') {
    end = quotedEnd(rest, 0);
    push('string', rest.slice(0, end));
  } else if (rest.startsWith('[]') || rest.startsWith('{}')) {
    end = 2;
    push('punct', rest.slice(0, end));
  } else {
    end = rest.length;
    for (let at = 1; at < rest.length; at += 1)
      if (startsComment(rest, at)) {
        end = at;
        break;
      }
    const scalar = rest.slice(0, end);
    const trimmed = scalar.trimEnd();
    push(kindOf(trimmed), trimmed);
    push('space', scalar.slice(trimmed.length));
  }
  rest = rest.slice(end);
  const gap = /^ */.exec(rest)?.[0] ?? '';
  push('space', gap);
  rest = rest.slice(gap.length);
  // what is left is a comment, or text the writer never makes, kept as a string so the line stays whole
  push(rest.startsWith('#') ? 'comment' : 'string', rest);
}

/** One line of YAML in pieces. */
export function highlightLine(line: string): YamlPiece[] {
  const out: YamlPiece[] = [];
  const push = (kind: YamlKind, piece: string): void => {
    if (piece) out.push({ kind, text: piece });
  };
  const indent = /^ */.exec(line)?.[0] ?? '';
  push('space', indent);
  let rest = line.slice(indent.length);
  // a list's dashes, as many as nest on the line ("- - a"); `-5` is a number, not a dash
  for (let dash = /^-( +|$)/.exec(rest); dash; dash = /^-( +|$)/.exec(rest)) {
    push('dash', '-');
    push('space', dash[1] ?? '');
    rest = rest.slice(dash[0].length);
  }
  if (rest.startsWith('#')) {
    push('comment', rest);
    return out;
  }
  // a key: a quoted one, or plain words up to the colon that ends it (never past a comment)
  let key = -1;
  if (rest[0] === "'" || rest[0] === '"') {
    const end = quotedEnd(rest, 0);
    if (endsKey(rest, end)) key = end;
  } else
    for (let at = 0; at < rest.length && !startsComment(rest, at); at += 1)
      if (endsKey(rest, at)) {
        key = at;
        break;
      }
  if (key > 0) {
    push('key', rest.slice(0, key));
    push('punct', ':');
    rest = rest.slice(key + 1);
  }
  value(rest, out);
  return out;
}

/** A YAML text in pieces, a line each. */
export const highlightYaml = (text: string): YamlPiece[][] => text.split('\n').map(highlightLine);
