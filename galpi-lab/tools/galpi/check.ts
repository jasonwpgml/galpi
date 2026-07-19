import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

import { GpFile, keyValues, recordsOf } from "./gp.ts";
import { Runtime, loadRuntime, parseState, relFromRoot } from "./model.ts";
import { scanImports } from "./imports.ts";

export interface CheckError {
  kind: string;
  data: Record<string, string>;
  file: string;
  line?: number;
}

export interface CheckOptions {
  /** Skip git-dependent checks (verified tree hash, LOCK modification). */
  git?: boolean;
}

function err(
  errors: CheckError[],
  kind: string,
  file: string,
  data: Record<string, string>,
  line?: number,
): void {
  errors.push(line === undefined ? { kind, data, file } : { kind, data, file, line });
}

function rel(runtime: Runtime, filePath: string): string {
  return relFromRoot(runtime.root, filePath);
}

function checkParseIssues(runtime: Runtime, errors: CheckError[]): void {
  const files: GpFile[] = [
    runtime.boot,
    runtime.source,
    ...(runtime.map ? [runtime.map] : []),
    ...runtime.views,
    ...runtime.statusFiles,
  ];
  for (const file of files) {
    for (const issue of file.issues) {
      err(errors, "parse", rel(runtime, file.path), { msg: issue.message }, issue.line);
    }
    const header = file.records[0];
    if (!header || header.opcode !== "G" || header.fields[0] !== "1") {
      err(errors, "missing_header", rel(runtime, file.path), { want: "G|1" });
    }
    // AIDEV-NOTE: BOOT carries grammar template records (`D|id|state|path|...`),
    // so opcode-dictionary validation applies to every runtime file except BOOT.
    if (file !== runtime.boot && runtime.knownOpcodes.size > 0) {
      for (const record of file.records) {
        if (!runtime.knownOpcodes.has(record.opcode)) {
          err(
            errors,
            "unknown_opcode",
            rel(runtime, file.path),
            { got: record.opcode },
            record.line,
          );
        }
      }
    }
  }
}

function checkSource(runtime: Runtime, errors: CheckError[]): void {
  const sourceFile = rel(runtime, runtime.source.path);
  const domainIds = new Set<string>();
  for (const domain of runtime.domains) {
    if (domainIds.has(domain.id)) {
      err(errors, "dup_id", sourceFile, { k: "D", id: domain.id }, domain.record.line);
    }
    domainIds.add(domain.id);
    validateState(runtime, errors, sourceFile, "D", domain.id, domain.state, domain.record.line);
    validateAction(runtime, errors, sourceFile, domain.id, domain.kv.get("a"), domain.record.line);
    if (domain.path !== "-" && !existsSync(path.join(runtime.root, domain.path))) {
      err(errors, "missing_path", sourceFile, { d: domain.id, path: domain.path }, domain.record.line);
    }
    for (const key of ["g", "u"] as const) {
      const target = domain.kv.get(key);
      if (target && !existsSync(path.join(runtime.root, resolveGalpiRef(target)))) {
        err(errors, "missing_ref", sourceFile, { d: domain.id, [key]: target }, domain.record.line);
      }
    }
  }

  const taskIds = new Set<string>();
  for (const task of runtime.tasks) {
    if (taskIds.has(task.id)) {
      err(errors, "dup_id", sourceFile, { k: "T", id: task.id }, task.record.line);
    }
    taskIds.add(task.id);
    validateState(runtime, errors, sourceFile, "T", task.id, task.state, task.record.line);
    validateAction(runtime, errors, sourceFile, task.id, task.kv.get("a"), task.record.line);
    const domainId = task.id.split(".")[0] ?? "";
    if (!domainIds.has(domainId)) {
      err(errors, "missing_ref", sourceFile, { t: task.id, d: domainId }, task.record.line);
    }
    const guide = task.kv.get("g");
    if (guide && !existsSync(path.join(runtime.root, guide))) {
      err(errors, "missing_ref", sourceFile, { t: task.id, g: guide }, task.record.line);
    }
  }

  const aliases = new Set<string>();
  for (const route of runtime.routes) {
    if (aliases.has(route.alias)) {
      err(errors, "dup_id", sourceFile, { k: "R", alias: route.alias }, route.record.line);
    }
    aliases.add(route.alias);
    if (!taskIds.has(route.task)) {
      err(errors, "missing_ref", sourceFile, { alias: route.alias, t: route.task }, route.record.line);
    }
  }
}

/** `.galpi`-relative references like `status/st.gp` live inside the runtime dir. */
function resolveGalpiRef(target: string): string {
  if (target.startsWith(".galpi/") || target.startsWith("docs/") || target.startsWith("src/")) {
    return target;
  }
  return path.posix.join(".galpi", target);
}

function validateState(
  runtime: Runtime,
  errors: CheckError[],
  file: string,
  kind: string,
  id: string,
  state: string,
  line: number,
): void {
  const parsed = parseState(state);
  if (!parsed || (runtime.stateCodes.size > 0 && !runtime.stateCodes.has(parsed.code))) {
    err(errors, "bad_state", file, { k: kind, id, got: state }, line);
  }
}

function validateAction(
  runtime: Runtime,
  errors: CheckError[],
  file: string,
  id: string,
  action: string | undefined,
  line: number,
): void {
  if (action === undefined) return;
  if (runtime.actionCodes.size > 0 && !runtime.actionCodes.has(action)) {
    err(errors, "bad_action", file, { id, got: action }, line);
  }
}

function checkViews(runtime: Runtime, errors: CheckError[]): void {
  const sourceTaskState = new Map(runtime.tasks.map((task) => [task.id, task.state]));
  const sourceDomainState = new Map(runtime.domains.map((domain) => [domain.id, domain.state]));
  for (const view of [...runtime.views, ...runtime.statusFiles]) {
    const viewFile = rel(runtime, view.path);
    const fileIds = new Set(recordsOf(view, "F").map((record) => record.fields[0] ?? ""));
    for (const record of recordsOf(view, "F")) {
      const filePath = record.fields[1] ?? "";
      if (!existsSync(path.join(runtime.root, filePath))) {
        err(errors, "missing_file", viewFile, { f: record.fields[0] ?? "", path: filePath }, record.line);
      }
    }
    for (const record of recordsOf(view, "Y")) {
      const fileId = record.fields[2] ?? "";
      if (!fileIds.has(fileId)) {
        err(errors, "missing_ref", viewFile, { y: record.fields[0] ?? "", f: fileId }, record.line);
      }
    }
    for (const record of recordsOf(view, "T")) {
      const id = record.fields[0] ?? "";
      const state = record.fields[1] ?? "";
      const sourceState = sourceTaskState.get(id);
      if (sourceState === undefined) {
        err(errors, "missing_ref", viewFile, { t: id, source: "absent" }, record.line);
      } else if (sourceState !== state) {
        err(errors, "view_state_desync", viewFile, { t: id, view: state, source: sourceState }, record.line);
      }
    }
    for (const record of recordsOf(view, "D")) {
      const id = record.fields[0] ?? "";
      const state = record.fields[1] ?? "";
      const sourceState = sourceDomainState.get(id);
      if (sourceState !== undefined && sourceState !== state) {
        err(errors, "view_state_desync", viewFile, { d: id, view: state, source: sourceState }, record.line);
      }
    }
    for (const record of recordsOf(view, "L")) {
      const replacement = keyValues(record.fields).get("replacement");
      if (!replacement) continue;
      for (const target of replacement.split(",")) {
        if (!existsSync(path.join(runtime.root, target))) {
          err(errors, "missing_ref", viewFile, { replacement: target }, record.line);
        }
      }
    }
  }
}

function checkMap(runtime: Runtime, errors: CheckError[]): void {
  if (!runtime.map) return;
  const mapFile = rel(runtime, runtime.map.path);
  const sourceRoutes = new Set(runtime.routes.map((route) => `${route.alias}|${route.task}`));
  const mapRoutes = new Set(
    recordsOf(runtime.map, "R").map((record) => `${record.fields[0]}|${record.fields[1]}`),
  );
  for (const entry of sourceRoutes) {
    if (!mapRoutes.has(entry)) err(errors, "map_desync", mapFile, { missing: entry });
  }
  for (const entry of mapRoutes) {
    if (!sourceRoutes.has(entry)) err(errors, "map_desync", mapFile, { extra: entry });
  }
}

function checkPlanAndDead(runtime: Runtime, errors: CheckError[]): void {
  const sourceFile = rel(runtime, runtime.source.path);
  const deadDomains = runtime.domains.filter((domain) => parseState(domain.state)?.code === "4");

  for (const domain of runtime.domains) {
    if (parseState(domain.state)?.code !== "2" || domain.path === "-") continue;
    const dir = path.join(runtime.root, domain.path);
    if (existsSync(dir) && readdirSync(dir).some((entry) => statSync(path.join(dir, entry)).isFile())) {
      err(errors, "plan_has_code", sourceFile, { d: domain.id, path: domain.path }, domain.record.line);
    }
  }

  if (deadDomains.length === 0) return;
  const edges = scanImports(runtime.root);
  for (const edge of edges) {
    if (!edge.toDomain || edge.fromDomain === edge.toDomain) continue;
    const dead = deadDomains.find((domain) => domain.path === `src/${edge.toDomain}`);
    if (dead) {
      err(errors, "dead_import", edge.file, { from: edge.fromDomain ?? "-", to: dead.id }, edge.line);
    }
  }
}

function git(runtime: Runtime, args: string[]): { ok: boolean; stdout: string } {
  const result = spawnSync("git", args, {
    cwd: runtime.root,
    encoding: "utf8",
    windowsHide: true,
  });
  return { ok: result.status === 0, stdout: result.stdout ?? "" };
}

function checkGitState(runtime: Runtime, errors: CheckError[]): void {
  const sourceFile = rel(runtime, runtime.source.path);
  for (const domain of runtime.domains) {
    if (domain.path === "-") continue;
    const flags = parseState(domain.state)?.flags ?? [];
    const verified = domain.kv.get("verified");
    if (verified) {
      const dirty = git(runtime, ["status", "--porcelain", "--", domain.path]);
      const head = git(runtime, ["rev-parse", `HEAD:${domain.path}`]);
      const current = dirty.stdout.trim() !== "" ? "dirty" : head.stdout.trim();
      if (!head.ok || current !== verified) {
        // AIDEV-NOTE: a verified-hash mismatch demotes the domain to STALE (5) at
        // runtime per the roadmap; check reports it, consumers apply the demotion.
        err(errors, "stale", sourceFile, { d: domain.id, want: verified, got: current || "?" }, domain.record.line);
      }
    }
    if (flags.includes("l")) {
      const dirty = git(runtime, ["status", "--porcelain", "--", domain.path]);
      for (const line of dirty.stdout.split("\n")) {
        const file = line.slice(3).trim();
        if (file) err(errors, "lock_modified", sourceFile, { d: domain.id, path: file });
      }
    }
  }
}

export function runCheck(root: string, options: CheckOptions = {}): CheckError[] {
  const runtime = loadRuntime(root);
  const errors: CheckError[] = [];
  checkParseIssues(runtime, errors);
  checkSource(runtime, errors);
  checkViews(runtime, errors);
  checkMap(runtime, errors);
  checkPlanAndDead(runtime, errors);
  if (options.git !== false) checkGitState(runtime, errors);
  return errors;
}

export function formatAi(errors: CheckError[]): string {
  if (errors.length === 0) return "OK|errors=0";
  return errors
    .map((error) => {
      const pairs = Object.entries(error.data).map(([key, value]) => `${key}=${value}`);
      const location = error.line === undefined ? error.file : `${error.file}:${error.line}`;
      return ["ERR", error.kind, ...pairs, `at=${location}`].join("|");
    })
    .join("\n");
}

const HUMAN_MESSAGES: Record<string, string> = {
  parse: "레코드 형식이 아닌 줄이 있습니다",
  missing_header: "파일 첫 레코드는 G|1 이어야 합니다",
  unknown_opcode: "BOOT K 사전에 없는 opcode입니다",
  dup_id: "중복 선언된 ID입니다",
  bad_state: "BOOT S 사전에 없는 상태 코드입니다",
  bad_action: "BOOT A 사전에 없는 행동 코드입니다",
  missing_path: "선언된 경로가 존재하지 않습니다",
  missing_ref: "참조 대상이 존재하지 않습니다",
  missing_file: "View가 가리키는 파일이 없습니다",
  view_state_desync: "View 상태가 source.gp와 다릅니다 (source가 원본)",
  map_desync: "MAP.gp가 source.gp의 route와 다릅니다 (재생성 필요)",
  plan_has_code: "PLAN(2) 도메인에 구현 코드가 있습니다",
  dead_import: "DEAD(4) 도메인을 외부에서 import했습니다",
  stale: "verified tree hash가 현재 코드와 다릅니다 — 런타임에서 STALE(5)로 취급하세요",
  lock_modified: "LOCK(l) 경로가 수정되었습니다",
};

export function formatHuman(errors: CheckError[]): string {
  if (errors.length === 0) return "문제 없음 (errors=0)";
  return errors
    .map((error) => {
      const location = error.line === undefined ? error.file : `${error.file}:${error.line}`;
      const detail = Object.entries(error.data)
        .map(([key, value]) => `${key}=${value}`)
        .join(", ");
      const message = HUMAN_MESSAGES[error.kind] ?? error.kind;
      return `[${error.kind}] ${message} — ${detail} (${location})`;
    })
    .join("\n");
}
