import path from "node:path";
import { fileURLToPath } from "node:url";

import { formatAi, formatHuman, runCheck } from "./check.ts";
import { formatDoctorAi, formatDoctorHuman, runDoctor } from "./doctor.ts";
import { buildManifest, formatQueryHuman, queryGraph } from "./graph.ts";
import { addDomain, addRoute, addTask, rmRoute, setState } from "./mutate.ts";

const SELF_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

// AIDEV-NOTE: `--root <path>` lets the CLI inspect a tree other than its own checkout,
// which Phase 3.5 needs to run doctor against the messy fixtures. Without it galpi can
// only ever diagnose the repository it ships in.
function resolveRoot(rest: string[]): string {
  const index = rest.indexOf("--root");
  const value = index >= 0 ? rest[index + 1] : process.env.GALPI_ROOT;
  return value ? path.resolve(value) : SELF_ROOT;
}

function main(argv: string[]): number {
  const [command, ...rest] = argv;
  const ROOT = resolveRoot(rest);
  const rootIndex = rest.indexOf("--root");
  const positional = rootIndex >= 0 ? rest.filter((_, i) => i !== rootIndex && i !== rootIndex + 1) : rest;
  const flags = new Set(positional.filter((arg) => arg.startsWith("--")));
  const args = positional.filter((arg) => !arg.startsWith("--"));
  const human = flags.has("--human");

  switch (command) {
    case "check": {
      const errors = runCheck(ROOT, { git: !flags.has("--no-git") });
      console.log(human ? formatHuman(errors) : formatAi(errors));
      return errors.length === 0 ? 0 : 1;
    }
    case "doctor": {
      const findings = runDoctor(ROOT);
      console.log(human ? formatDoctorHuman(findings) : formatDoctorAi(findings));
      return 0; // diagnosis is advisory, never a gate
    }
    case "build": {
      const result = buildManifest(ROOT, { check: flags.has("--check") });
      const stats = result.graph;
      if (flags.has("--check") && result.changed) {
        console.error("ERR|build|stale=1|at=.galpi/manifest.gp");
        return 1;
      }
      console.log(
        `OK|build|files=${stats.files.length}|symbols=${stats.symbols.length}|edges=${stats.edges.length}|changed=${result.changed ? "1" : "0"}`,
      );
      return 0;
    }
    case "query": {
      const query = args.join(" ").trim();
      if (!query) {
        console.error("ERR|query|msg=missing_query");
        return 2;
      }
      const result = queryGraph(ROOT, query);
      console.log(human ? formatQueryHuman(result) : result.packet.trimEnd());
      return result.task ? 0 : 1;
    }
    case "set-state":
    case "add-route":
    case "rm-route":
    case "add-task":
    case "add-domain": {
      const result = runMutation(ROOT, command, args);
      if (result.ok) {
        console.log(`OK|${result.message.replaceAll(" ", "_")}`);
        return 0;
      }
      console.error(formatAi(result.errors) || `ERR|${command}|msg=${result.message.replaceAll(" ", "_")}`);
      return 1;
    }
    default:
      console.error(
        [
          "usage: galpi <command> [args] [--root <path>] [--ai|--human] [--no-git]",
          "  check                              validate runtime vs code",
          "  doctor                             read-only structure diagnosis",
          "  build [--check]                    derive code graph manifest",
          "  query <text>                       route to a minimal code subgraph",
          "  set-state <id> <state>             change a D/T state in source.gp",
          "  add-route <alias> <task-id>        add a route",
          "  rm-route <alias>                   remove a route",
          "  add-task <id> <state> [k=v...]     add a task",
          "  add-domain <id> <state> <path> [k=v...]",
        ].join("\n"),
      );
      return 2;
  }
}

function runMutation(ROOT: string, command: string, args: string[]) {
  switch (command) {
    case "set-state":
      return setState(ROOT, args[0] ?? "", args[1] ?? "");
    case "add-route":
      return addRoute(ROOT, args[0] ?? "", args[1] ?? "");
    case "rm-route":
      return rmRoute(ROOT, args[0] ?? "");
    case "add-task":
      return addTask(ROOT, args[0] ?? "", args[1] ?? "", args.slice(2));
    default:
      return addDomain(ROOT, args[0] ?? "", args[1] ?? "", args[2] ?? "", args.slice(3));
  }
}

process.exit(main(process.argv.slice(2)));
