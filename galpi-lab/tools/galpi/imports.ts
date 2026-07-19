import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

import { relFromRoot } from "./model.ts";

export interface ImportEdge {
  file: string;
  specifier: string;
  resolved: string | null;
  fromDomain: string | null;
  toDomain: string | null;
  viaIndex: boolean;
  line: number;
}

const IMPORT_PATTERN =
  /(?:import|export)\s+(?:[\s\S]*?from\s+)?["']([^"']+)["']|require\(\s*["']([^"']+)["']\s*\)/g;

export function listSourceFiles(root: string, srcDir = "src"): string[] {
  const base = path.join(root, srcDir);
  if (!existsSync(base)) return [];
  const found: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const full = path.join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.(ts|tsx|js|mjs)$/.test(entry)) found.push(full);
    }
  };
  walk(base);
  return found;
}

export function domainOf(root: string, filePath: string, srcDir = "src"): string | null {
  const rel = relFromRoot(root, filePath);
  const match = new RegExp(`^${srcDir}/([^/]+)/`).exec(rel);
  return match ? (match[1] ?? null) : null;
}

function resolveSpecifier(root: string, file: string, specifier: string): string | null {
  let base: string;
  if (specifier.startsWith("@/")) base = path.join(root, "src", specifier.slice(2));
  else if (specifier.startsWith(".")) base = path.resolve(path.dirname(file), specifier);
  else return null; // bare package import
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.js`,
    path.join(base, "index.ts"),
    path.join(base, "index.js"),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

export function scanImports(root: string, files?: string[]): ImportEdge[] {
  const edges: ImportEdge[] = [];
  for (const file of files ?? listSourceFiles(root)) {
    const text = readFileSync(file, "utf8");
    const fromDomain = domainOf(root, file);
    for (const match of text.matchAll(IMPORT_PATTERN)) {
      const specifier = match[1] ?? match[2];
      if (!specifier) continue;
      const line = text.slice(0, match.index ?? 0).split("\n").length;
      const resolved = resolveSpecifier(root, file, specifier);
      const toDomain = resolved ? domainOf(root, resolved) : null;
      const viaIndex = resolved
        ? /(^|[\\/])index\.(ts|js)$/.test(resolved)
        : false;
      edges.push({
        file: relFromRoot(root, file),
        specifier,
        resolved: resolved ? relFromRoot(root, resolved) : null,
        fromDomain,
        toDomain,
        viaIndex,
        line,
      });
    }
  }
  return edges;
}
