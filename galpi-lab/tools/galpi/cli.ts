import path from "node:path";
import { fileURLToPath } from "node:url";

import { formatAi, formatHuman, runCheck } from "./check.ts";
import { formatDoctorAi, formatDoctorHuman, runDoctor } from "./doctor.ts";
import { addDomain, addRoute, addTask, rmRoute, setState } from "./mutate.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

function main(argv: string[]): number {
  const [command, ...rest] = argv;
  const flags = new Set(rest.filter((arg) => arg.startsWith("--")));
  const args = rest.filter((arg) => !arg.startsWith("--"));
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
    case "set-state":
    case "add-route":
    case "rm-route":
    case "add-task":
    case "add-domain": {
      const result = runMutation(command, args);
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
          "usage: galpi <command> [args] [--ai|--human] [--no-git]",
          "  check                              validate runtime vs code",
          "  doctor                             read-only structure diagnosis",
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

function runMutation(command: string, args: string[]) {
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
