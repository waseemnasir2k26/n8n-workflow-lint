import fs from "node:fs";
import path from "node:path";

export class ParseError extends Error {}

/** Parse text into a list of workflow objects. Accepts a workflow, an array, or {data:[...]}. */
export function parseWorkflows(text, file = "<input>") {
  let json;
  try {
    json = JSON.parse(text.replace(/^﻿/, ""));
  } catch (e) {
    throw new ParseError(`${file}: invalid JSON (${e.message})`);
  }
  const candidates = Array.isArray(json)
    ? json
    : Array.isArray(json?.data)
      ? json.data
      : [json];
  const wfs = candidates.filter(
    (w) => w && typeof w === "object" && Array.isArray(w.nodes),
  );
  if (!wfs.length)
    throw new ParseError(`${file}: not an n8n workflow (no "nodes" array)`);
  return wfs;
}

/** Naive 1-based line lookup of a node by name in the raw text. */
export function lineOf(text, nodeName) {
  if (!nodeName) return 1;
  const needle = JSON.stringify(nodeName);
  for (const re of [`"name": ${needle}`, `"name":${needle}`]) {
    const i = text.indexOf(re);
    if (i >= 0) return text.slice(0, i).split("\n").length;
  }
  const i = text.indexOf(needle);
  return i >= 0 ? text.slice(0, i).split("\n").length : 1;
}

const SKIP = new Set(["node_modules", ".git"]);
function walk(dir, out) {
  for (const e of fs
    .readdirSync(dir, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name))) {
    if (SKIP.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.toLowerCase().endsWith(".json")) out.push(p);
  }
}

function globToRegex(g) {
  let r = "^";
  for (let i = 0; i < g.length; i++) {
    const c = g[i];
    if (c === "*") {
      if (g[i + 1] === "*") {
        i++;
        if (g[i + 1] === "/") {
          i++;
          r += "(?:.*/)?";
        } else r += ".*";
      } else r += "[^/]*";
    } else if (c === "?") r += "[^/]";
    else r += c.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(r + "$");
}

/** Expand file / directory / glob args. Explicit files must parse as workflows; dir/glob hits that are not workflows are skipped. */
export function expandInputs(args) {
  const items = [];
  const seen = new Set();
  const push = (file, explicit) => {
    const k = path.resolve(file);
    if (!seen.has(k)) {
      seen.add(k);
      items.push({ file, explicit });
    }
  };
  for (const arg of args) {
    const a = arg.replace(/\\/g, "/");
    if (!/[*?]/.test(a)) {
      if (!fs.existsSync(arg))
        throw new ParseError(`${arg}: no such file or directory`);
      if (fs.statSync(arg).isDirectory()) {
        const l = [];
        walk(arg, l);
        l.forEach((f) => push(f, false));
      } else push(arg, true);
      continue;
    }
    const firstGlob = a.search(/[*?]/);
    const base = a.slice(0, a.lastIndexOf("/", firstGlob) + 1) || ".";
    if (!fs.existsSync(base))
      throw new ParseError(`${arg}: base directory not found`);
    const re = globToRegex(a.replace(/^\.\//, ""));
    const l = [];
    walk(base, l);
    for (const f of l)
      if (re.test(f.replace(/\\/g, "/").replace(/^\.\//, ""))) push(f, false);
  }
  return items;
}
