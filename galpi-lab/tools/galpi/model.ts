import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

import { GpFile, GpRecord, dictionary, firstRecord, keyValues, parseGp, recordsOf } from "./gp.ts";

export interface DomainDecl {
  id: string;
  state: string;
  path: string;
  kv: Map<string, string>;
  record: GpRecord;
}

export interface TaskDecl {
  id: string;
  state: string;
  kv: Map<string, string>;
  record: GpRecord;
}

export interface RouteDecl {
  alias: string;
  task: string;
  record: GpRecord;
}

export interface Runtime {
  root: string;
  galpiDir: string;
  boot: GpFile;
  source: GpFile;
  map: GpFile | null;
  manifest: GpFile | null;
  views: GpFile[];
  statusFiles: GpFile[];
  stateCodes: Set<string>;
  actionCodes: Set<string>;
  knownOpcodes: Set<string>;
  domains: DomainDecl[];
  tasks: TaskDecl[];
  routes: RouteDecl[];
}

export function loadGpFile(filePath: string): GpFile {
  return parseGp(readFileSync(filePath, "utf8"), filePath);
}

function collectGpFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const found: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) found.push(...collectGpFiles(full));
    else if (entry.endsWith(".gp")) found.push(full);
  }
  return found;
}

export function loadRuntime(root: string): Runtime {
  const galpiDir = path.join(root, ".galpi");
  const boot = loadGpFile(path.join(galpiDir, "BOOT.gp"));
  const source = loadGpFile(path.join(galpiDir, "source.gp"));
  const mapPath = path.join(galpiDir, "MAP.gp");
  const map = existsSync(mapPath) ? loadGpFile(mapPath) : null;
  const manifestPath = path.join(galpiDir, "manifest.gp");
  const manifest = existsSync(manifestPath) ? loadGpFile(manifestPath) : null;
  const views = collectGpFiles(path.join(galpiDir, "v")).map(loadGpFile);
  const statusFiles = collectGpFiles(path.join(galpiDir, "status")).map(loadGpFile);

  const stateRecord = firstRecord(boot, "S");
  const actionRecord = firstRecord(boot, "A");
  const kindRecord = firstRecord(boot, "K");
  const stateCodes = new Set(stateRecord ? [...dictionary(stateRecord).keys()] : []);
  const actionCodes = new Set(actionRecord ? [...dictionary(actionRecord).keys()] : []);
  const knownOpcodes = new Set(kindRecord ? [...dictionary(kindRecord).keys()] : []);

  const domains: DomainDecl[] = recordsOf(source, "D").map((record) => ({
    id: record.fields[0] ?? "",
    state: record.fields[1] ?? "",
    path: record.fields[2] ?? "",
    kv: keyValues(record.fields.slice(3)),
    record,
  }));
  const tasks: TaskDecl[] = recordsOf(source, "T").map((record) => ({
    id: record.fields[0] ?? "",
    state: record.fields[1] ?? "",
    kv: keyValues(record.fields.slice(2)),
    record,
  }));
  const routes: RouteDecl[] = recordsOf(source, "R").map((record) => ({
    alias: record.fields[0] ?? "",
    task: record.fields[1] ?? "",
    record,
  }));

  return {
    root,
    galpiDir,
    boot,
    source,
    map,
    manifest,
    views,
    statusFiles,
    stateCodes,
    actionCodes,
    knownOpcodes,
    domains,
    tasks,
    routes,
  };
}

/** State syntax: one digit code plus optional h/l flags, e.g. `0`, `1h`, `2hl`. */
export function parseState(state: string): { code: string; flags: string[] } | null {
  const match = /^([0-9])([hl]{0,2})$/.exec(state);
  if (!match) return null;
  const flags = [...(match[2] ?? "")];
  if (new Set(flags).size !== flags.length) return null;
  return { code: match[1] ?? "", flags };
}

export function relFromRoot(root: string, filePath: string): string {
  return path.relative(root, filePath).replaceAll("\\", "/");
}
