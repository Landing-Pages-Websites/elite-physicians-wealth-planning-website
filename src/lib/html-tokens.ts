/**
 * Dependency-free HTML tokenizer and tree builder copied from site-starter.
 * Dropped elements never reach the tree; verbatim regions are lexed first.
 * Malformed input is bounded. Keep the current starter adversarial tests green.
 */

import {
  CLOSED_BY,
  DROPPED_TAGS,
  RAW_TEXT_TAGS,
  VOID_TAGS,
  lookup,
  roleFor,
} from "./html-tags";

const NAMED_ENTITIES: Readonly<Record<string, string>> = lookup<string>({
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ndash: "–",
  mdash: "—",
  hellip: "…",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
  bull: "•",
  middot: "·",
  deg: "°",
  copy: "©",
  reg: "®",
  trade: "™",
  times: "×",
  frac12: "½",
  laquo: "«",
  raquo: "»",
});

const ENTITY = /&(#[xX][0-9a-fA-F]{1,6}|#[0-9]{1,7}|[a-zA-Z][a-zA-Z0-9]{1,31});/g;

export function decodeEntities(text: string): string {
  if (!text.includes("&")) return text;
  return text.replace(ENTITY, (match, body: string) => {
    if (body.startsWith("#")) {
      const code =
        body[1] === "x" || body[1] === "X"
          ? Number.parseInt(body.slice(2), 16)
          : Number.parseInt(body.slice(1), 10);
      if (!Number.isFinite(code) || code <= 0 || code > 0x10ffff) return match;
      if (code >= 0xd800 && code <= 0xdfff) return match;
      try {
        return String.fromCodePoint(code);
      } catch {
        return match;
      }
    }
    return NAMED_ENTITIES[body] ?? match;
  });
}

const WHITESPACE_RUN = /\s+/g;

export function collapseAndDecode(value: string): string {
  return decodeEntities(value.replace(WHITESPACE_RUN, " "));
}

export type Token =
  | { type: "text"; value: string }
  
  | { type: "verbatim"; block: boolean; text: string; source: string }
  | { type: "open"; tag: string; attrs: Record<string, string>; selfClosing: boolean }
  | { type: "close"; tag: string };

const NAME_START = /[a-zA-Z]/;
const NAME_CHAR = /[a-zA-Z0-9:_.-]/;
const SPACE = /\s/;
const SPACE_OR_GT = /[\s>]/;

function readName(html: string, at: number): { name: string; end: number } | null {
  if (!NAME_START.test(html[at] ?? "")) return null;
  let end = at + 1;
  while (end < html.length && NAME_CHAR.test(html[end])) end += 1;
  return { name: html.slice(at, end).toLowerCase(), end };
}

function boundedValueEnd(html: string, from: number): number {
  const next = html.indexOf("<", from);
  return next === -1 ? html.length : next;
}

function readAttributes(
  html: string,
  from: number,
): { attrs: Record<string, string>; selfClosing: boolean; end: number } {
  const attrs: Record<string, string> = {};
  let index = from;
  let selfClosing = false;
  while (index < html.length) {
    while (index < html.length && SPACE.test(html[index])) index += 1;
    if (index >= html.length) break;
    if (html[index] === ">") {
      index += 1;
      break;
    }
    if (html[index] === "<") break;
    if (html[index] === "/") {
      selfClosing = true;
      index += 1;
      continue;
    }
    const name = readName(html, index);
    if (name === null) {
      index += 1;
      continue;
    }
    index = name.end;
    while (index < html.length && SPACE.test(html[index])) index += 1;
    if (html[index] !== "=") {
      attrs[name.name] = "";
      continue;
    }
    index += 1;
    while (index < html.length && SPACE.test(html[index])) index += 1;
    const quote = html[index];
    if (quote === '"' || quote === "'") {
      const close = html.indexOf(quote, index + 1);
      const end = close === -1 ? boundedValueEnd(html, index + 1) : close;
      attrs[name.name] = decodeEntities(html.slice(index + 1, end));
      index = close === -1 ? end : end + 1;
      continue;
    }
    let end = index;
    while (end < html.length && !SPACE_OR_GT.test(html[end])) end += 1;
    attrs[name.name] = decodeEntities(html.slice(index, end));
    index = end;
  }
  return { attrs, selfClosing, end: index };
}

type Construct =
  | { kind: "comment"; end: number }
  | { kind: "declaration"; end: number }
  | { kind: "close"; name: string; end: number }
  | {
      kind: "open";
      name: string;
      attrs: Record<string, string>;
      selfClosing: boolean;
      end: number;
    };

function readConstruct(html: string, at: number): Construct | null {
  if (html.startsWith("<!--", at)) {
    const close = html.indexOf("-->", at + 4);
    return { kind: "comment", end: close === -1 ? html.length : close + 3 };
  }
  if (html[at + 1] === "!" || html[at + 1] === "?") {
    const gt = html.indexOf(">", at);
    return { kind: "declaration", end: gt === -1 ? html.length : gt + 1 };
  }
  const closing = html[at + 1] === "/";
  const name = readName(html, closing ? at + 2 : at + 1);
  if (name === null) return null;
  if (closing) {
    const gt = html.indexOf(">", name.end);
    return { kind: "close", name: name.name, end: gt === -1 ? html.length : gt + 1 };
  }
  const { attrs, selfClosing, end } = readAttributes(html, name.end);
  return { kind: "open", name: name.name, attrs, selfClosing, end };
}

function blankLineAfter(html: string, from: number): number {
  let newline = html.indexOf("\n", from);
  while (newline !== -1) {
    let index = newline + 1;
    while (html[index] === " " || html[index] === "\t") index += 1;
    if (html[index] === "\n") return newline;
    newline = html.indexOf("\n", index);
  }
  return html.length;
}

interface Skipped {
  end: number;
  
  terminated: boolean;
}

function skipRawText(html: string, from: number, tag: string, limit: number): Skipped {
  const scanner = new RegExp(`</${tag}(?![a-zA-Z0-9:_.-])`, "gi");
  scanner.lastIndex = from;
  const match = scanner.exec(html);
  if (match === null || match.index >= limit) return { end: limit, terminated: false };
  const gt = html.indexOf(">", match.index);
  return gt === -1 ? { end: limit, terminated: false } : { end: gt + 1, terminated: true };
}

function skipDropped(html: string, from: number, tag: string, limit: number): Skipped {
  if (RAW_TEXT_TAGS.has(tag)) return skipRawText(html, from, tag, limit);

  let index = from;
  let depth = 1;
  while (index < limit) {
    const lt = html.indexOf("<", index);
    if (lt === -1) break;
    const construct = readConstruct(html, lt);
    if (construct === null) {
      index = lt + 1;
      continue;
    }
    if (construct.kind === "close" && construct.name === tag) {
      depth -= 1;
      if (depth === 0) return { end: construct.end, terminated: true };
    } else if (construct.kind === "open") {
      if (construct.name === tag) {
        if (!construct.selfClosing) depth += 1;
      } else if (DROPPED_TAGS.has(construct.name)) {
        index = skipDropped(html, construct.end, construct.name, limit).end;
        continue;
      }
    }
    index = construct.end;
  }
  return { end: limit, terminated: false };
}

function skipDroppedContent(html: string, from: number, tag: string): number {
  return skipDropped(html, from, tag, html.length).end;
}

const FENCE = "```";

function opensALine(html: string, at: number): boolean {
  let index = at - 1;
  while (index >= 0 && (html[index] === " " || html[index] === "\t")) index -= 1;
  return index < 0 || html[index] === "\n";
}

interface Verbatim {
  block: boolean;
  
  text: string;
  
  source: string;
  end: number;
}

function indexOfInText(
  html: string,
  character: string,
  from: number,
  mayHoldDropped: boolean,
  limit: number,
): number {
  let index = from;
  let next = html.indexOf(character, from);
  let lt = html.indexOf("<", from);
  while (index < limit) {
    if (next !== -1 && next < index) next = html.indexOf(character, index);
    if (next === -1 || next >= limit) return -1;
    if (lt !== -1 && lt < index) lt = html.indexOf("<", index);
    if (lt === -1 || next < lt) return next;
    const construct = readConstruct(html, lt);
    if (construct === null) {
      index = lt + 1;
      continue;
    }
    if (
      construct.kind !== "open" ||
      !DROPPED_TAGS.has(construct.name) ||
      VOID_TAGS.has(construct.name)
    ) {
      index = construct.end;
      continue;
    }
    const skipped = skipDropped(html, construct.end, construct.name, limit);
    if (!skipped.terminated) {
      index = construct.end;
      continue;
    }
    if (!mayHoldDropped) return -1;
    index = skipped.end;
  }
  return -1;
}

function readFence(html: string, at: number): Verbatim {
  const opened = html.indexOf("\n", at);
  if (opened === -1) {
    return { block: true, text: "", source: html.slice(at), end: html.length };
  }
  const from = opened + 1;
  let index = from;
  while (index < html.length) {
    const tick = indexOfInText(html, "`", index, true, html.length);
    if (tick === -1) break;
    if (html.startsWith(FENCE, tick) && opensALine(html, tick)) {
      const newline = html.indexOf("\n", tick);
      const end = newline === -1 ? html.length : newline + 1;
      return {
        block: true,
        text: html.slice(from, tick).replace(/\n[ \t]*$/, ""),
        source: html.slice(at, end),
        end,
      };
    }
    index = tick + 1;
  }
  return { block: true, text: html.slice(from), source: html.slice(at), end: html.length };
}

function readCodeSpan(html: string, at: number, blockEnd: number): Verbatim | null {
  const close = indexOfInText(html, "`", at + 1, false, blockEnd);
  if (close === -1 || close === at + 1) return null;
  return {
    block: false,
    text: html.slice(at + 1, close),
    source: html.slice(at, close + 1),
    end: close + 1,
  };
}

function readVerbatim(html: string, at: number, blockEnd: number): Verbatim | null {
  return html.startsWith(FENCE, at) && opensALine(html, at)
    ? readFence(html, at)
    : readCodeSpan(html, at, blockEnd);
}

const LINE_ENDINGS = /\r\n?/g;

function normalizeLines(source: string): string {
  return source.includes("\r") ? source.replace(LINE_ENDINGS, "\n") : source;
}

export function tokenize(source: string): Token[] {
  const html = normalizeLines(source);
  const tokens: Token[] = [];
  let textStart = 0;
  let index = 0;
  let tick = html.indexOf("`");
  let lt = html.indexOf("<");
  let preDepth = 0;
  let blank = blankLineAfter(html, 0);

  const flushText = (until: number): void => {
    if (until > textStart) tokens.push({ type: "text", value: html.slice(textStart, until) });
  };

  while (index < html.length) {
    if (lt !== -1 && lt < index) lt = html.indexOf("<", index);
    if (tick !== -1 && tick < index) tick = html.indexOf("`", index);
    if (tick !== -1 && (lt === -1 || tick < lt)) {
      if (blank !== html.length && blank < tick) blank = blankLineAfter(html, tick);
      const verbatim = preDepth > 0 ? null : readVerbatim(html, tick, blank);
      if (verbatim === null) {
        tick = html.indexOf("`", tick + 1);
        continue;
      }
      flushText(tick);
      tokens.push({
        type: "verbatim",
        block: verbatim.block,
        text: verbatim.text,
        source: verbatim.source,
      });
      index = verbatim.end;
      textStart = index;
      continue;
    }
    if (lt === -1) break;
    const construct = readConstruct(html, lt);
    if (construct === null) {
      index = lt + 1;
      continue;
    }
    flushText(lt);
    switch (construct.kind) {
      case "comment":
      case "declaration":
        index = construct.end;
        break;
      case "close":
        if (construct.name === "pre" && preDepth > 0) preDepth -= 1;
        tokens.push({ type: "close", tag: construct.name });
        index = construct.end;
        break;
      default: {
        const dropped = DROPPED_TAGS.has(construct.name);
        if (construct.name === "pre" && !dropped && !construct.selfClosing) preDepth += 1;
        tokens.push({
          type: "open",
          tag: construct.name,
          attrs: construct.attrs,
          selfClosing: dropped || construct.selfClosing,
        });
        index =
          dropped && !VOID_TAGS.has(construct.name)
            ? skipDroppedContent(html, construct.end, construct.name)
            : construct.end;
        break;
      }
    }
    textStart = index;
  }

  flushText(html.length);
  return tokens;
}

export interface ElementNode {
  type: "element";
  tag: string;
  attrs: Record<string, string>;
  children: HtmlNode[];
}

export interface TextNode {
  type: "text";
  value: string;
}

export interface VerbatimNode {
  type: "verbatim";
  block: boolean;
  text: string;
  
  source: string;
}

export type HtmlNode = ElementNode | TextNode | VerbatimNode;

export function verbatimSource(node: VerbatimNode): string {
  return node.source;
}

export function buildTree(tokens: Token[]): ElementNode {
  const root: ElementNode = { type: "element", tag: "#root", attrs: {}, children: [] };
  const stack: ElementNode[] = [root];

  for (const token of tokens) {
    const parent = stack[stack.length - 1];
    if (token.type === "text") {
      parent.children.push({ type: "text", value: token.value });
      continue;
    }
    if (token.type === "verbatim") {
      parent.children.push({
        type: "verbatim",
        block: token.block,
        text: token.text,
        source: token.source,
      });
      continue;
    }
    if (token.type === "close") {
      for (let depth = stack.length - 1; depth > 0; depth -= 1) {
        if (stack[depth].tag === token.tag) {
          stack.length = depth;
          break;
        }
      }
      continue;
    }
    while (stack.length > 1 && CLOSED_BY[stack[stack.length - 1].tag]?.has(token.tag)) {
      stack.pop();
    }
    const node: ElementNode = {
      type: "element",
      tag: token.tag,
      attrs: token.attrs,
      children: [],
    };
    const dropped = roleFor(token.tag).flow === "drop";
    if (!dropped) stack[stack.length - 1].children.push(node);
    if (!dropped && !token.selfClosing && !VOID_TAGS.has(token.tag)) stack.push(node);
  }

  return root;
}
