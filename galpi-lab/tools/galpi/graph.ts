import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import ts from "typescript";

import { listSourceFiles, scanImports } from "./imports.ts";
import { Runtime, loadRuntime, parseState, relFromRoot } from "./model.ts";

export interface GraphSymbol {
  id: string;
  name: string;
  file: string;
  startLine: number;
  endLine: number;
}

export interface GraphFile {
  id: string;
  path: string;
  domain: string | null;
  test: boolean;
}

export interface GraphEdge {
  id: string;
  from: string;
  to: string;
  line: number;
}

export interface CodeGraph {
  files: GraphFile[];
  symbols: GraphSymbol[];
  edges: GraphEdge[];
}

export interface BuildResult {
  graph: CodeGraph;
  manifest: string;
  changed: boolean;
}

export interface QueryResult {
  task: string | null;
  state: string;
  guide: string | null;
  files: GraphFile[];
  symbols: GraphSymbol[];
  edges: GraphEdge[];
  packet: string;
}

function normalize(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase().replaceAll(/[^\p{L}\p{N}]+/gu, "");
}

function words(value: string): string[] {
  const splitCamel = value.replaceAll(/([a-z0-9])([A-Z])/g, "$1 $2");
  return splitCamel
    .normalize("NFKC")
    .toLocaleLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word.length >= 3);
}

function isExported(node: ts.Node): boolean {
  if (!ts.canHaveModifiers(node)) return false;
  return (ts.getModifiers(node) ?? []).some(
    (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
  );
}

function declarationNames(node: ts.Node): Array<{ name: string; node: ts.Node }> {
  if (
    (ts.isFunctionDeclaration(node) ||
      ts.isClassDeclaration(node) ||
      ts.isInterfaceDeclaration(node) ||
      ts.isTypeAliasDeclaration(node) ||
      ts.isEnumDeclaration(node)) &&
    node.name &&
    isExported(node)
  ) {
    return [{ name: node.name.text, node }];
  }
  if (ts.isVariableStatement(node) && isExported(node)) {
    return node.declarationList.declarations.flatMap((declaration) =>
      ts.isIdentifier(declaration.name)
        ? [{ name: declaration.name.text, node: declaration }]
        : [],
    );
  }
  if (ts.isExportDeclaration(node) && node.exportClause && ts.isNamedExports(node.exportClause)) {
    return node.exportClause.elements.map((element) => ({
      name: element.name.text,
      node: element,
    }));
  }
  if (ts.isExportAssignment(node)) return [{ name: "default", node }];
  return [];
}

function sourceKind(filePath: string): ts.ScriptKind {
  if (filePath.endsWith(".tsx")) return ts.ScriptKind.TSX;
  if (filePath.endsWith(".js") || filePath.endsWith(".mjs")) return ts.ScriptKind.JS;
  return ts.ScriptKind.TS;
}

function domainFor(runtime: Runtime, filePath: string): string | null {
  const match = runtime.domains
    .filter((domain) => domain.path !== "-")
    .sort((left, right) => right.path.length - left.path.length)
    .find((domain) => filePath === domain.path || filePath.startsWith(`${domain.path}/`));
  return match?.id ?? null;
}

export function buildCodeGraph(root: string, runtime = loadRuntime(root)): CodeGraph {
  const paths = listSourceFiles(root).map((file) => relFromRoot(root, file)).sort();
  const files: GraphFile[] = paths.map((filePath, index) => ({
    id: `f${index + 1}`,
    path: filePath,
    domain: domainFor(runtime, filePath),
    test: /(?:^|\.)(?:test|spec)(?:\.|$)/.test(path.basename(filePath)),
  }));
  const fileByPath = new Map(files.map((file) => [file.path, file]));
  const symbols: GraphSymbol[] = [];

  for (const file of files) {
    const text = readFileSync(path.join(root, file.path), "utf8");
    const source = ts.createSourceFile(
      file.path,
      text,
      ts.ScriptTarget.Latest,
      true,
      sourceKind(file.path),
    );
    for (const statement of source.statements) {
      for (const declaration of declarationNames(statement)) {
        const start = source.getLineAndCharacterOfPosition(declaration.node.getStart(source)).line + 1;
        const end = source.getLineAndCharacterOfPosition(declaration.node.getEnd()).line + 1;
        symbols.push({
          id: `y${symbols.length + 1}`,
          name: declaration.name,
          file: file.id,
          startLine: start,
          endLine: end,
        });
      }
    }
  }

  const edges: GraphEdge[] = [];
  for (const edge of scanImports(root, paths.map((file) => path.join(root, file)))) {
    const from = fileByPath.get(edge.file);
    const to = edge.resolved ? fileByPath.get(edge.resolved) : undefined;
    if (!from || !to) continue;
    edges.push({ id: `x${edges.length + 1}`, from: from.id, to: to.id, line: edge.line });
  }

  return { files, symbols, edges };
}

export function serializeManifest(graph: CodeGraph): string {
  const lines = [
    "G|1|gen",
    `V|code_graph|f=${graph.files.length}|y=${graph.symbols.length}|x=${graph.edges.length}`,
    ...graph.files.map(
      (file) => `F|${file.id}|${file.path}|d=${file.domain ?? "-"}|test=${file.test ? "1" : "0"}`,
    ),
    ...graph.symbols.map(
      (symbol) =>
        `Y|${symbol.id}|${symbol.name}|${symbol.file}|line=${symbol.startLine}-${symbol.endLine}`,
    ),
    ...graph.edges.map(
      (edge) => `X|${edge.id}|from=${edge.from}|to=${edge.to}|line=${edge.line}`,
    ),
    ...graph.files
      .filter((file) => file.test)
      .map((file) => {
        const targets = graph.edges
          .filter((edge) => edge.from === file.id)
          .map((edge) => edge.to)
          .join(",");
        return `P|${file.id}|to=${targets || "-"}`;
      }),
  ];
  return `${lines.join("\n")}\n`;
}

export function buildManifest(root: string, options: { check?: boolean } = {}): BuildResult {
  const graph = buildCodeGraph(root);
  const manifest = serializeManifest(graph);
  const manifestPath = path.join(root, ".galpi", "manifest.gp");
  let before: string | null = null;
  try {
    before = readFileSync(manifestPath, "utf8");
  } catch {
    // Missing derived output is stale and will be created unless this is --check.
  }
  const changed = before !== manifest;
  if (changed && !options.check) writeFileSync(manifestPath, manifest, "utf8");
  return { graph, manifest, changed };
}

function taskForQuery(runtime: Runtime, query: string): string | null {
  const normalizedQuery = normalize(query);
  const route = [...runtime.routes]
    .filter((candidate) => normalizedQuery.includes(normalize(candidate.alias)))
    .sort((left, right) => normalize(right.alias).length - normalize(left.alias).length)[0];
  if (route) return route.task;

  let best: { id: string; score: number } | null = null;
  for (const task of runtime.tasks) {
    const aliases = runtime.routes.filter((routeDecl) => routeDecl.task === task.id).map((item) => item.alias);
    const terms = words([task.id, task.kv.get("q") ?? "", ...aliases].join(" "));
    const score = terms.reduce(
      (total, term) => total + (normalizedQuery.includes(normalize(term)) ? term.length : 0),
      0,
    );
    if (score > 0 && (!best || score > best.score)) best = { id: task.id, score };
  }
  return best?.id ?? null;
}

function selectTaskFiles(runtime: Runtime, graph: CodeGraph, taskId: string): GraphFile[] {
  const task = runtime.tasks.find((candidate) => candidate.id === taskId);
  if (!task) return [];
  const state = parseState(task.state)?.code;
  if (state === "2" || state === "4") return [];

  const domain = taskId.split(".")[0] ?? "";
  const leaf = taskId.split(".").slice(1).join(" ");
  const domainDecl = runtime.domains.find((candidate) => candidate.id === domain);
  const domainName = domainDecl?.path.split("/").at(-1) ?? "";
  const taskTerms = new Set(words([leaf, task.kv.get("q") ?? ""].join(" ")));
  taskTerms.delete(normalize(domainName));
  const symbolsByFile = new Map<string, GraphSymbol[]>();
  for (const symbol of graph.symbols) {
    const bucket = symbolsByFile.get(symbol.file) ?? [];
    bucket.push(symbol);
    symbolsByFile.set(symbol.file, bucket);
  }

  // AIDEV-NOTE: Semantic terms only choose deterministic seed nodes; imports and tests
  // determine the final file set so fuzzy matching never becomes structural authority.
  const scores = graph.files
    .filter(
      (file) => file.domain === domain && !file.test && path.basename(file.path) !== "index.ts",
    )
    .map((file) => {
      const pathText = normalize(file.path);
      const symbolText = normalize(
        (symbolsByFile.get(file.id) ?? []).map((symbol) => symbol.name).join(" "),
      );
      let score = 0;
      if (leaf && pathText.includes(normalize(leaf))) score += 40;
      else if (leaf && symbolText.includes(normalize(leaf))) score += 20;
      for (const term of taskTerms) {
        if (pathText.includes(normalize(term))) score += term.length * 2;
        else if (symbolText.includes(normalize(term))) score += term.length;
      }
      if (score > 0 && /\.(?:command|query)\./.test(path.basename(file.path))) score += 15;
      return { file, score };
    });
  const maxScore = Math.max(0, ...scores.map((entry) => entry.score));
  const selected = new Set(
    scores.filter((entry) => entry.score === maxScore && entry.score > 0).map((entry) => entry.file.id),
  );

  const fileById = new Map(graph.files.map((file) => [file.id, file]));
  let expanded = true;
  while (expanded) {
    expanded = false;
    for (const edge of graph.edges) {
      if (!selected.has(edge.from) || selected.has(edge.to)) continue;
      const target = fileById.get(edge.to);
      if (!target || (target.domain !== domain && path.basename(target.path) !== "index.ts")) continue;
      selected.add(edge.to);
      expanded = true;
    }
  }

  const domainIndex = graph.files.find(
    (file) => file.domain === domain && file.path === `${domainDecl?.path ?? ""}/index.ts`,
  );
  if (domainIndex) selected.add(domainIndex.id);

  for (const file of graph.files.filter((candidate) => candidate.test && candidate.domain === domain)) {
    if (graph.edges.some((edge) => edge.from === file.id && selected.has(edge.to))) selected.add(file.id);
  }

  return graph.files.filter((file) => selected.has(file.id));
}

export function queryGraph(root: string, query: string): QueryResult {
  const runtime = loadRuntime(root);
  const graph = buildCodeGraph(root, runtime);
  const taskId = taskForQuery(runtime, query);
  if (!taskId) {
    const packet = `G|1|query\nQ|-|5|b=.galpi/BOOT.gp|q=${normalize(query)}|reason=route_miss\n`;
    return { task: null, state: "5", guide: null, files: [], symbols: [], edges: [], packet };
  }

  const task = runtime.tasks.find((candidate) => candidate.id === taskId);
  if (!task) throw new Error(`resolved task is missing: ${taskId}`);
  const files = selectTaskFiles(runtime, graph, taskId);
  const fileIds = new Set(files.map((file) => file.id));
  const symbols = graph.symbols.filter((symbol) => fileIds.has(symbol.file));
  const edges = graph.edges.filter((edge) => fileIds.has(edge.from) && fileIds.has(edge.to));
  const guide = task.kv.get("g") ?? null;
  const lines = [
    "G|1|query",
    `Q|${taskId}|${task.state}|b=.galpi/BOOT.gp|q=${task.kv.get("q") ?? "-"}${guide ? `|g=${guide}` : ""}`,
    ...files.map((file) => `F|${file.id}|${file.path}`),
    ...symbols.map(
      (symbol) =>
        `Y|${symbol.id}|${symbol.name}|${symbol.file}|line=${symbol.startLine}-${symbol.endLine}`,
    ),
    ...edges.map((edge) => `X|${edge.id}|from=${edge.from}|to=${edge.to}`),
    ...files.filter((file) => file.test).map((file) => `P|${file.id}`),
  ];
  return {
    task: taskId,
    state: task.state,
    guide,
    files,
    symbols,
    edges,
    packet: `${lines.join("\n")}\n`,
  };
}

export function formatQueryHuman(result: QueryResult): string {
  if (!result.task) return "경로를 찾지 못했습니다. route 별칭을 추가하거나 검색어를 구체화하세요.";
  const lines = [`task: ${result.task} (state ${result.state})`];
  if (result.guide) lines.push(`guide: ${result.guide}`);
  for (const file of result.files) {
    const spans = result.symbols
      .filter((symbol) => symbol.file === file.id)
      .map((symbol) => `${symbol.name}:${symbol.startLine}-${symbol.endLine}`)
      .join(", ");
    lines.push(`- ${file.path}${spans ? ` — ${spans}` : ""}`);
  }
  return lines.join("\n");
}
