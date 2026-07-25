import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { CheckError, runCheck } from "./check.ts";
import { loadRuntime, parseState } from "./model.ts";

export interface MutationResult {
  ok: boolean;
  errors: CheckError[];
  message: string;
}

// AIDEV-NOTE: contract -- mutations never leave a half-written runtime: the edit
// is applied in memory, re-validated via runCheck against the real tree only
// after writing, and rolled back byte-for-byte when new errors appear.
// AIDEV-NOTE: rollback must cover every derived file, not just source.gp -- syncMap,
// syncViewStates and runCheck all write or parse after the source write, so a throw
// there would otherwise strand a mutated source with unsynced MAP/views. The snapshot
// is taken before the first write and restored on both validation failure and throw.
function applySourceEdit(
  root: string,
  describe: string,
  edit: (lines: string[]) => string[] | string,
): MutationResult {
  const sourcePath = path.join(root, ".galpi", "source.gp");
  const before = readFileSync(sourcePath, "utf8");
  const newline = before.includes("\r\n") ? "\r\n" : "\n";
  const lines = before.split(/\r?\n/);
  const edited = edit(lines);
  if (typeof edited === "string") {
    return { ok: false, errors: [], message: edited };
  }
  const baseline = runCheck(root, { git: false });
  const baselineKeys = new Set(baseline.map(errorKey));
  const snapshot = snapshotRuntimeFiles(root);
  try {
    writeFileSync(sourcePath, edited.join(newline), "utf8");
    syncMap(root);
    syncViewStates(root);
    const after = runCheck(root, { git: false }).filter(
      (error) => !baselineKeys.has(errorKey(error)),
    );
    if (after.length > 0) {
      restoreSnapshot(snapshot);
      return { ok: false, errors: after, message: `${describe}: rolled back (validation failed)` };
    }
    return { ok: true, errors: [], message: describe };
  } catch (error) {
    restoreSnapshot(snapshot);
    throw error;
  }
}

/** Byte snapshot of every file a mutation can write: source, MAP, views, status files. */
function snapshotRuntimeFiles(root: string): Map<string, string> {
  const snapshot = new Map<string, string>();
  const add = (file: string): void => {
    if (!snapshot.has(file) && existsSync(file)) snapshot.set(file, readFileSync(file, "utf8"));
  };
  add(path.join(root, ".galpi", "source.gp"));
  add(path.join(root, ".galpi", "MAP.gp"));
  try {
    const runtime = loadRuntime(root);
    for (const view of [...runtime.views, ...runtime.statusFiles]) add(view.path);
  } catch {
    // An unloadable runtime still gets source/MAP protection; nothing else is writable.
  }
  return snapshot;
}

function restoreSnapshot(snapshot: Map<string, string>): void {
  for (const [file, content] of snapshot) writeFileSync(file, content, "utf8");
}

function errorKey(error: CheckError): string {
  return `${error.kind}|${error.file}|${JSON.stringify(error.data)}`;
}

/** MAP.gp is derived: header + the source route lines, nothing else. */
export function syncMap(root: string): void {
  const runtime = loadRuntime(root);
  const mapPath = path.join(root, ".galpi", "MAP.gp");
  const lines = ["G|1|gen", ...runtime.routes.map((route) => `R|${route.alias}|${route.task}`)];
  writeFileSync(mapPath, `${lines.join("\n")}\n`, "utf8");
}

/** Task/domain state fields inside views follow source.gp (single source of truth). */
export function syncViewStates(root: string): void {
  const runtime = loadRuntime(root);
  const taskState = new Map(runtime.tasks.map((task) => [task.id, task.state]));
  const domainState = new Map(runtime.domains.map((domain) => [domain.id, domain.state]));
  for (const view of [...runtime.views, ...runtime.statusFiles]) {
    const text = readFileSync(view.path, "utf8");
    const newline = text.includes("\r\n") ? "\r\n" : "\n";
    const lines = text.split(/\r?\n/);
    let changed = false;
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index] ?? "";
      const parts = line.split("|");
      const opcode = parts[0];
      const id = parts[1] ?? "";
      const known =
        opcode === "T" ? taskState.get(id) : opcode === "D" ? domainState.get(id) : undefined;
      if (known !== undefined && parts[2] !== undefined && parts[2] !== known) {
        parts[2] = known;
        lines[index] = parts.join("|");
        changed = true;
      }
    }
    if (changed) writeFileSync(view.path, lines.join(newline), "utf8");
  }
}

export function setState(root: string, id: string, state: string): MutationResult {
  if (!parseState(state)) {
    return { ok: false, errors: [], message: `invalid state: ${state}` };
  }
  return applySourceEdit(root, `set-state ${id} ${state}`, (lines) => {
    let found = false;
    const next = lines.map((line) => {
      const parts = line.split("|");
      if ((parts[0] === "D" || parts[0] === "T") && parts[1] === id) {
        found = true;
        parts[2] = state;
        return parts.join("|");
      }
      return line;
    });
    return found ? next : `no D or T record with id ${id}`;
  });
}

export function addRoute(root: string, alias: string, task: string): MutationResult {
  return applySourceEdit(root, `add-route ${alias} ${task}`, (lines) => {
    if (lines.some((line) => line.startsWith(`R|${alias}|`))) {
      return `route alias already exists: ${alias}`;
    }
    const lastRoute = lines.reduce(
      (last, line, index) => (line.startsWith("R|") ? index : last),
      lines.length - 1,
    );
    const next = [...lines];
    next.splice(lastRoute + 1, 0, `R|${alias}|${task}`);
    return next;
  });
}

export function rmRoute(root: string, alias: string): MutationResult {
  return applySourceEdit(root, `rm-route ${alias}`, (lines) => {
    const next = lines.filter((line) => !line.startsWith(`R|${alias}|`));
    return next.length === lines.length ? `no route with alias ${alias}` : next;
  });
}

export function addTask(root: string, id: string, state: string, extras: string[]): MutationResult {
  if (!parseState(state)) return { ok: false, errors: [], message: `invalid state: ${state}` };
  return applySourceEdit(root, `add-task ${id} ${state}`, (lines) => {
    if (lines.some((line) => line.startsWith(`T|${id}|`))) return `task already exists: ${id}`;
    const lastTask = lines.reduce(
      (last, line, index) => (line.startsWith("T|") ? index : last),
      -1,
    );
    const insertAt = lastTask >= 0 ? lastTask + 1 : lines.length;
    const next = [...lines];
    next.splice(insertAt, 0, ["T", id, state, ...extras].join("|"));
    return next;
  });
}

export function addDomain(
  root: string,
  id: string,
  state: string,
  domainPath: string,
  extras: string[],
): MutationResult {
  if (!parseState(state)) return { ok: false, errors: [], message: `invalid state: ${state}` };
  return applySourceEdit(root, `add-domain ${id} ${state}`, (lines) => {
    if (lines.some((line) => line.startsWith(`D|${id}|`))) return `domain already exists: ${id}`;
    const lastDomain = lines.reduce(
      (last, line, index) => (line.startsWith("D|") ? index : last),
      -1,
    );
    const insertAt = lastDomain >= 0 ? lastDomain + 1 : lines.length;
    const next = [...lines];
    next.splice(insertAt, 0, ["D", id, state, domainPath, ...extras].join("|"));
    return next;
  });
}
