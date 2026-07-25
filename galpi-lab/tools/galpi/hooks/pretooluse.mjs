// Claude Code PreToolUse hook: physically enforce Galpi state rules on file
// edits instead of relying on prompt compliance (Phase 2 hook gating).
// stdin: {tool_name, tool_input, ...}; exit 2 blocks the call, stderr goes to
// the model as feedback. Plain node without dependencies so the hook stays fast.

import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

function readStdin() {
  try {
    return readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

function deny(packet, hint) {
  process.stderr.write(`${packet}\n${hint}\n`);
  process.exit(2);
}

const GATED_TOOLS = new Set(["Write", "Edit", "NotebookEdit"]);

let payload;
try {
  payload = JSON.parse(readStdin() || "{}");
} catch {
  process.exit(0); // malformed input is not this hook's problem
}

const toolName = payload.tool_name ?? "";
if (!GATED_TOOLS.has(toolName)) process.exit(0);

const target = payload.tool_input?.file_path ?? payload.tool_input?.notebook_path;
if (!target) process.exit(0);

const root = process.cwd();
const rel = path.relative(root, path.resolve(root, target)).replaceAll("\\", "/");
if (rel.startsWith("..")) process.exit(0); // outside this project

// AIDEV-NOTE: on case-insensitive filesystems `SRC/LEGACY/x.ts` and `src/legacy/x.ts`
// are the same file, so a case-sensitive compare here is a gate bypass. Fold both
// sides for matching only; DENY packets keep the caller's original spelling.
const caseInsensitiveFs = process.platform === "win32" || process.platform === "darwin";
const fold = (value) => (caseInsensitiveFs ? value.toLowerCase() : value);
const relKey = fold(rel);

// Derived runtime artifacts are never edited directly (N|MAP_manifest_v=derived_no_edit).
if (
  relKey === fold(".galpi/MAP.gp") ||
  relKey === fold(".galpi/manifest.gp") ||
  relKey.startsWith(fold(".galpi/v/"))
) {
  deny(
    `DENY|derived|path=${rel}`,
    "Derived Galpi artifact. Edit .galpi/source.gp via `npm run galpi -- <command>`; MAP/views are regenerated.",
  );
}

const sourcePath = path.join(root, ".galpi", "source.gp");
if (!existsSync(sourcePath)) process.exit(0);

const domains = readFileSync(sourcePath, "utf8")
  .split(/\r?\n/)
  .filter((line) => line.startsWith("D|"))
  .map((line) => {
    const [, id, state, domainPath] = line.split("|");
    return { id: id ?? "", state: state ?? "", path: domainPath ?? "" };
  })
  .filter((domain) => domain.path && domain.path !== "-");

for (const domain of domains) {
  const domainKey = fold(domain.path);
  const inside = relKey === domainKey || relKey.startsWith(`${domainKey}/`);
  if (!inside) continue;
  if (domain.state.startsWith("4")) {
    deny(
      `DENY|dead|d=${domain.id}|path=${rel}`,
      "DEAD(4) domain: never modify or reuse. Follow the replacement link in its task view for new work.",
    );
  }
  if (domain.state.includes("l")) {
    deny(
      `DENY|lock|d=${domain.id}|path=${rel}`,
      "LOCK(l) domain: modification requires an explicit user request. Ask the user before retrying.",
    );
  }
}

process.exit(0);
