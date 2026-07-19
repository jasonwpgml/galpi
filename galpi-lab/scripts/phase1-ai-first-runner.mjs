import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import {
  mkdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { getEncoding } from "js-tiktoken";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, "..");
const CODEX_ROOT = process.env.CODEX_MANAGED_PACKAGE_ROOT;
const CODEX_CLI = CODEX_ROOT
  ? path.join(CODEX_ROOT, "bin", "codex.js")
  : undefined;
const TSX_CLI = path.join(ROOT, "node_modules", "tsx", "dist", "cli.mjs");
const MODEL = "gpt-5.6-sol";
const REASONING_EFFORT = "low";
const TIMEOUT_MS = 300_000;

const CLAUDE_CLI =
  process.env.CLAUDE_CLI_PATH ??
  path.join(process.env.USERPROFILE ?? "", ".local", "bin", "claude.exe");
const CLAUDE_MODEL = "claude-sonnet-5";
const CLAUDE_TIMEOUT_MS = 600_000;
// AIDEV-NOTE: Claude Code 2.1.x does not auto-read AGENTS.md (verified 2026-07-17),
// so B/C worktrees get an untracked CLAUDE.md bridge, mirroring how real Claude
// deployments of Galpi bootstrap (galpi-lab uses the same file). The bridge is
// counted as protocol context and excluded from change detection.
const CLAUDE_BRIDGE_FILE = "CLAUDE.md";
const CLAUDE_BRIDGE = [
  "# Project instructions",
  "",
  "Read and follow `AGENTS.md` as the single source of project and Galpi Protocol instructions.",
  "Do not duplicate or override those rules in this file.",
  "",
].join("\n");

const CONDITIONS = {
  A: {
    label: "no Galpi",
    branch: "phase1-ai/fixture-a",
    commit: "2dc7e17579eae7ebe758752c31e6dcbce4f54a53",
    bootstrapFiles: [],
  },
  B: {
    label: "human-readable Galpi",
    branch: "phase1-ai/fixture-b",
    commit: "d88113f216b99fdc0026af4b21195b9b71a4c4a9",
    bootstrapFiles: ["AGENTS.md", ".galpi/MAP.yaml"],
  },
  C: {
    label: "AI-first Galpi C3",
    branch: "phase1-ai/fixture-c3",
    commit: "3c5a28469508b7c58407bdc75f7957654d0bfaf7",
    bootstrapFiles: ["AGENTS.md", ".galpi/BOOT.gp", ".galpi/MAP.gp"],
  },
};

const COMMON_PREFIX =
  "Work independently and concisely. Inspect only relevant repository files. " +
  "Follow all repository instructions. Do not access parent directories or experiment artifacts. ";

const SCENARIOS = {
  login: {
    title: "DONE login bug fix",
    expectedTask: "a.login",
    prompt:
      COMMON_PREFIX +
      "Fix the login failure information leak: an unknown email and a wrong password must both throw the same AuthenticationError without revealing account existence. Add a regression test and run the relevant tests.",
    relevantPrefixes: ["src/auth/"],
    allowedPrefixes: ["src/auth/"],
    queryFiles: {
      A: [],
      B: [".galpi/view/by-task/auth.login.md"],
      C: [".galpi/v/t/a.login.gp"],
    },
    routeViews: {
      B: [".galpi/view/by-task/auth.login.md"],
      C: [".galpi/v/t/a.login.gp"],
    },
    hiddenEvaluator: String.raw`
import assert from "node:assert/strict";
import { AuthenticationError, createAuthModule } from "./src/auth/index.ts";
import { MemoryDatabase } from "./src/shared/index.ts";

const auth = createAuthModule(new MemoryDatabase());
auth.register({
  email: "known@example.com",
  displayName: "Known User",
  password: "right-password",
});

function capture(action: () => unknown): unknown {
  try {
    action();
  } catch (error) {
    return error;
  }
  throw new Error("Expected login to throw");
}

const unknown = capture(() =>
  auth.login({ email: "missing@example.com", password: "right-password" }),
);
const wrongPassword = capture(() =>
  auth.login({ email: "known@example.com", password: "wrong-password" }),
);

assert.ok(unknown instanceof AuthenticationError);
assert.ok(wrongPassword instanceof AuthenticationError);
assert.equal((unknown as Error).name, (wrongPassword as Error).name);
assert.equal((unknown as Error).message, (wrongPassword as Error).message);
console.log("hidden-login: PASS");
`,
  },
  sorting: {
    title: "WIP+HOT student sorting",
    expectedTask: "st.list",
    prompt:
      COMMON_PREFIX +
      "Add student list sorting with this public API: StudentModule.list(options?: StudentListOptions), where StudentListOptions has sortBy 'name' or 'createdAt' and direction 'asc' or 'desc'. Direction defaults to asc, and no options preserves insertion order. Export the public type, add regression tests, and run the relevant tests.",
    relevantPrefixes: ["src/student/"],
    allowedPrefixes: ["src/student/"],
    queryFiles: {
      A: [],
      B: [
        ".galpi/view/by-task/student.list.md",
        ".galpi/status/student.md",
      ],
      C: [".galpi/v/t/st.list.gp", ".galpi/status/st.gp"],
    },
    routeViews: {
      B: [".galpi/view/by-task/student.list.md"],
      C: [".galpi/v/t/st.list.gp"],
    },
    statusFiles: {
      B: ".galpi/status/student.md",
      C: ".galpi/status/st.gp",
    },
    hiddenEvaluator: String.raw`
import assert from "node:assert/strict";
import {
  createStudentModule,
  type Student,
  type StudentListOptions,
} from "./src/student/index.ts";
import { MemoryDatabase } from "./src/shared/index.ts";

const database = new MemoryDatabase();
database.table<Student>("student.students").insert({
  id: "student-b",
  name: "Beta",
  email: "beta@example.com",
  createdAt: "2025-02-01T00:00:00.000Z",
});
database.table<Student>("student.students").insert({
  id: "student-a",
  name: "Alpha",
  email: "alpha@example.com",
  createdAt: "2025-03-01T00:00:00.000Z",
});
database.table<Student>("student.students").insert({
  id: "student-c",
  name: "Charlie",
  email: "charlie@example.com",
  createdAt: "2025-01-01T00:00:00.000Z",
});

const students = createStudentModule(database);
const defaultDirection: StudentListOptions = { sortBy: "name" };
assert.deepEqual(students.list().map(({ id }) => id), [
  "student-b",
  "student-a",
  "student-c",
]);
assert.deepEqual(students.list(defaultDirection).map(({ id }) => id), [
  "student-a",
  "student-b",
  "student-c",
]);
assert.deepEqual(
  students.list({ sortBy: "name", direction: "desc" }).map(({ id }) => id),
  ["student-c", "student-b", "student-a"],
);
assert.deepEqual(
  students.list({ sortBy: "createdAt", direction: "asc" }).map(({ id }) => id),
  ["student-c", "student-b", "student-a"],
);
assert.deepEqual(
  students.list({ sortBy: "createdAt", direction: "desc" }).map(({ id }) => id),
  ["student-a", "student-b", "student-c"],
);
console.log("hidden-sorting: PASS");
`,
  },
  billing: {
    title: "PLAN billing question",
    expectedTask: "b.invoice",
    prompt:
      COMMON_PREFIX +
      "Determine whether billing/invoice functionality is implemented. Report the planned scope, unresolved decisions, and implementation prerequisites with evidence file paths. Do not modify files.",
    relevantPrefixes: ["docs/plans/billing.md"],
    allowedPrefixes: [],
    readOnly: true,
    queryFiles: {
      A: [],
      B: [".galpi/view/by-task/billing.invoice.md"],
      C: [".galpi/v/t/b.invoice.gp"],
    },
    routeViews: {
      B: [".galpi/view/by-task/billing.invoice.md"],
      C: [".galpi/v/t/b.invoice.gp"],
    },
  },
  roster: {
    title: "DEAD legacy-like new feature",
    expectedTask: "lg.import",
    prompt:
      COMMON_PREFIX +
      "Create a fresh synchronous student-domain function previewRoster(text: string), exported from @/student. The requested behavior is similar to the old legacy importer, so apply the repository's state rules before deciding what to inspect or reuse. For semicolon-delimited input, skip the header and blank rows, trim names and emails, normalize emails to lowercase, return Array<{ name: string; email: string }>, and throw an email-related error for invalid addresses. Add tests and run the relevant tests.",
    relevantPrefixes: ["src/student/"],
    allowedPrefixes: ["src/student/"],
    queryFiles: {
      A: [],
      B: [".galpi/view/by-task/legacy.import-roster.md"],
      C: [".galpi/v/t/lg.import.gp"],
    },
    routeViews: {
      B: [".galpi/view/by-task/legacy.import-roster.md"],
      C: [".galpi/v/t/lg.import.gp"],
    },
    hiddenEvaluator: String.raw`
import assert from "node:assert/strict";
import { previewRoster } from "./src/student/index.ts";

assert.deepEqual(
  previewRoster(
    "name;email\n  Kim Ada ; ADA@Example.COM \n\nLee Bo; bo@example.com\n",
  ),
  [
    { name: "Kim Ada", email: "ada@example.com" },
    { name: "Lee Bo", email: "bo@example.com" },
  ],
);
assert.throws(
  () => previewRoster("name;email\nBad;not-an-email"),
  /email/i,
);
console.log("hidden-roster: PASS");
`,
  },
  "session-flow": {
    title: "non-exact route expression",
    expectedTask: "a.login",
    prompt:
      COMMON_PREFIX +
      "Identify the implementation file and focused test that cover exchanging an email/password credential pair for an access artifact. Give concise path evidence and do not modify files.",
    relevantPrefixes: ["src/auth/"],
    allowedPrefixes: [],
    readOnly: true,
    queryFiles: {
      A: [],
      B: [".galpi/view/by-task/auth.login.md"],
      C: [".galpi/v/t/a.login.gp"],
    },
    routeViews: {
      B: [".galpi/view/by-task/auth.login.md"],
      C: [".galpi/v/t/a.login.gp"],
    },
  },
};

function parseArguments(argv) {
  const options = {
    agent: "codex",
    repeats: 3,
    conditions: Object.keys(CONDITIONS),
    scenarios: Object.keys(SCENARIOS),
    validateOnly: false,
    keepWorktrees: false,
    reanalyze: null,
    retryExcluded: null,
    runId: new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-"),
  };

  for (const argument of argv) {
    if (argument === "--validate-only") options.validateOnly = true;
    else if (argument === "--keep-worktrees") options.keepWorktrees = true;
    else if (argument.startsWith("--agent=")) {
      options.agent = argument.slice("--agent=".length);
    } else if (argument.startsWith("--repeats=")) {
      options.repeats = Number(argument.slice("--repeats=".length));
    } else if (argument.startsWith("--conditions=")) {
      options.conditions = argument
        .slice("--conditions=".length)
        .split(",")
        .filter(Boolean);
    } else if (argument.startsWith("--scenarios=")) {
      options.scenarios = argument
        .slice("--scenarios=".length)
        .split(",")
        .filter(Boolean);
    } else if (argument.startsWith("--run-id=")) {
      options.runId = argument.slice("--run-id=".length);
    } else if (argument.startsWith("--reanalyze=")) {
      options.reanalyze = argument.slice("--reanalyze=".length);
    } else if (argument.startsWith("--retry-excluded=")) {
      options.retryExcluded = argument.slice("--retry-excluded=".length);
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }

  if (!Number.isInteger(options.repeats) || options.repeats < 1) {
    throw new Error("--repeats must be a positive integer");
  }
  if (options.agent !== "codex" && options.agent !== "claude") {
    throw new Error(`Unknown agent: ${options.agent}`);
  }
  for (const condition of options.conditions) {
    if (!CONDITIONS[condition]) throw new Error(`Unknown condition: ${condition}`);
  }
  for (const scenario of options.scenarios) {
    if (!SCENARIOS[scenario]) throw new Error(`Unknown scenario: ${scenario}`);
  }
  return options;
}

function runSync(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? ROOT,
    encoding: "utf8",
    windowsHide: true,
    maxBuffer: 20 * 1024 * 1024,
  });
  if (result.status !== 0 && !options.allowFailure) {
    throw new Error(
      `${command} ${args.join(" ")} failed (${result.status})\n${result.stdout}\n${result.stderr}`,
    );
  }
  return {
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

async function validateFixture(agent) {
  if (agent === "codex" && (!CODEX_CLI || !existsSync(CODEX_CLI))) {
    throw new Error("CODEX_MANAGED_PACKAGE_ROOT/bin/codex.js is unavailable");
  }
  if (agent === "claude" && !existsSync(CLAUDE_CLI)) {
    throw new Error(`claude CLI unavailable: ${CLAUDE_CLI}`);
  }
  if (!existsSync(TSX_CLI)) throw new Error(`tsx CLI unavailable: ${TSX_CLI}`);

  // AIDEV-NOTE: fixture commits predate the galpi/galpi-lab monorepo restructure,
  // so their files sit at the repository root. git ls-tree resolves relative to
  // the cwd prefix; run these checks from the repository toplevel, not galpi-lab.
  const gitRoot = runSync("git", ["rev-parse", "--show-toplevel"]).stdout.trim();
  const sourceHashes = new Map();
  for (const [condition, config] of Object.entries(CONDITIONS)) {
    const resolved = runSync("git", ["rev-parse", config.commit]).stdout.trim();
    if (resolved !== config.commit) {
      throw new Error(`${condition} commit mismatch: ${resolved}`);
    }
    const tree = runSync("git", ["ls-tree", "-r", config.commit, "src", "docs/plans", "package.json", "package-lock.json", "tsconfig.json"], { cwd: gitRoot }).stdout;
    sourceHashes.set(condition, tree);
  }
  if (new Set(sourceHashes.values()).size !== 1) {
    throw new Error("A/B/C application trees differ");
  }

  const aFiles = runSync("git", ["ls-tree", "-r", "--name-only", CONDITIONS.A.commit], { cwd: gitRoot }).stdout;
  if (/(^|\n)(AGENTS\.md|\.galpi\/)/.test(aFiles)) {
    throw new Error("Condition A unexpectedly contains Galpi instructions");
  }
  const bFiles = runSync("git", ["ls-tree", "-r", "--name-only", CONDITIONS.B.commit], { cwd: gitRoot }).stdout;
  if (!bFiles.includes(".galpi/MAP.yaml") || !bFiles.includes(".galpi/view/")) {
    throw new Error("Condition B human-readable runtime is incomplete");
  }
  const cFiles = runSync("git", ["ls-tree", "-r", "--name-only", CONDITIONS.C.commit], { cwd: gitRoot }).stdout;
  if (!cFiles.includes(".galpi/BOOT.gp") || !cFiles.includes(".galpi/v/")) {
    throw new Error("Condition C AI-first runtime is incomplete");
  }
}

function normalizePath(value) {
  return value
    .replaceAll("\\", "/")
    .replace(/\/{2,}/g, "/")
    .replace(/^\.\//, "")
    .replace(/^[/]+/, "")
    .replace(/:[0-9]+(?::[0-9]+)?$/, "")
    .replace(/[),;:'"`]+$/, "");
}

function extractPaths(text) {
  const found = new Set();
  const pattern = /(?:^|[\s'"`(])((?:\.?[\\/])?(?:(?:\.galpi|src|docs)[\\/][A-Za-z0-9_.@\-\\/]+|(?:AGENTS|CLAUDE|README)\.md|package(?:-lock)?\.json|tsconfig\.json))/gim;
  for (const match of text.matchAll(pattern)) {
    const candidate = normalizePath(match[1]);
    if (/\.[A-Za-z0-9]+$/.test(candidate)) found.add(candidate);
  }
  return found;
}

function isContentCommand(command) {
  return /Get-Content|\bgc\b|\btype\b|\bcat\b|\bsed\b|\bhead\b|\btail\b|Select-String|\brg\b|\bgrep\b/i.test(
    command,
  );
}

function isContentSearch(command) {
  return /(\brg\b|\bgrep\b|Select-String)/i.test(command) && !/--files/i.test(command);
}

function isWholeRepositorySearch(command) {
  return (
    /\brg\b[^\r\n]*--files/i.test(command) ||
    /git\s+ls-files/i.test(command) ||
    /Get-ChildItem[^\r\n]*-Recurse/i.test(command) ||
    /(?:\brg\b|\bgrep\b)[^\r\n]*(?:\s|['"])\.(?:\s|['"]|$)/i.test(command)
  );
}

function parseEvents(raw) {
  const events = [];
  for (const line of raw.split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      events.push(JSON.parse(line));
    } catch {
      // Preserve the raw log; an invalid event is reflected by missing metrics.
    }
  }
  return events;
}

// AIDEV-NOTE: usage semantics are normalized across agents: input_tokens always
// includes cached reads (Codex/OpenAI convention), cached_input_tokens is the
// cache-read share. effective_tokens follows GitHub's Agentic Workflows formula
// ET = m*(1.0*I_fresh + 0.1*I_cached + 4.0*O) with m=1 (single-model batches).
function withDerivedUsage(usage) {
  const input = usage.input_tokens ?? 0;
  const cached = usage.cached_input_tokens ?? 0;
  const output = usage.output_tokens ?? 0;
  return {
    ...usage,
    total_tokens: input + output,
    noncached_tokens: input - cached + output,
    effective_tokens: input - cached + 0.1 * cached + 4.0 * output,
  };
}

function collectTrace(events, scenario) {
  const commands = [];
  const messages = [];
  let usage = {
    input_tokens: 0,
    cached_input_tokens: 0,
    output_tokens: 0,
    reasoning_output_tokens: 0,
  };

  for (const event of events) {
    if (event.type === "item.completed" && event.item?.type === "command_execution") {
      commands.push({
        index: commands.length + 1,
        command: event.item.command ?? "",
        output: event.item.aggregated_output ?? "",
        exitCode: event.item.exit_code,
        status: event.item.status,
      });
    }
    if (event.type === "item.completed" && event.item?.type === "agent_message") {
      messages.push(event.item.text ?? "");
    }
    if (event.type === "turn.completed" && event.usage) usage = event.usage;
  }

  return analyzeTrace(
    { commands, messages, finalAnswer: messages.at(-1) ?? "", usage },
    scenario,
  );
}

function relativeToRun(runDir, value) {
  if (typeof value !== "string" || !value) return "";
  const candidate = path.isAbsolute(value) ? path.relative(runDir, value) : value;
  return normalizePath(candidate);
}

function synthesizeClaudeCommand(name, input, runDir) {
  if (name === "Bash") return input?.command ?? "";
  if (name === "Read") return `cat "${relativeToRun(runDir, input?.file_path)}"`;
  if (name === "Grep") {
    const scope = input?.path
      ? relativeToRun(runDir, input.path)
      : input?.glob ?? "";
    return `rg "${input?.pattern ?? ""}" ${scope}`.trimEnd();
  }
  if (name === "Glob") {
    const pattern = input?.pattern ?? "";
    // AIDEV-NOTE: only repo-wide Glob patterns map to `rg --files` so that
    // wholeRepositorySearch stays comparable with the Codex shell heuristic in
    // isWholeRepositorySearch; directory-scoped listings are not repo scans.
    const scoped = /^(?:src|docs|\.galpi)\b/.test(pattern);
    return scoped ? `ls ${pattern}` : `rg --files ${pattern}`.trimEnd();
  }
  if (["Write", "Edit", "MultiEdit", "NotebookEdit"].includes(name)) {
    return `${name.toLowerCase()} ${relativeToRun(runDir, input?.file_path)}`;
  }
  return `tool:${name}`;
}

function toolResultText(content) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((block) =>
        typeof block === "string"
          ? block
          : block?.type === "text"
            ? block.text ?? ""
            : "",
      )
      .join("\n");
  }
  return "";
}

function claudeInfrastructureFailure(resultEvent) {
  if (!resultEvent?.is_error || typeof resultEvent.result !== "string") {
    return null;
  }
  const message = resultEvent.result.trim();
  const classifiers = [
    ["usage_limit", /(?:session|usage|rate) limit|quota|too many requests/i],
    ["authentication", /auth(?:entication)?|unauthorized|not logged in|login required/i],
    ["availability", /overloaded|service unavailable|temporarily unavailable|network error/i],
  ];
  const match = classifiers.find(([, pattern]) => pattern.test(message));
  if (!match) return null;
  return {
    provider: "claude",
    kind: match[0],
    message,
  };
}

function collectClaudeTrace(events, scenario, runDir) {
  const commands = [];
  const byToolUseId = new Map();
  const messages = [];
  let resultEvent = null;

  for (const event of events) {
    if (event.type === "assistant") {
      for (const block of event.message?.content ?? []) {
        if (block?.type === "text" && block.text) messages.push(block.text);
        if (block?.type === "tool_use") {
          const entry = {
            index: commands.length + 1,
            command: synthesizeClaudeCommand(block.name, block.input ?? {}, runDir),
            tool: block.name,
            output: "",
            exitCode: null,
            status: "completed",
          };
          commands.push(entry);
          if (block.id) byToolUseId.set(block.id, entry);
        }
      }
    } else if (event.type === "user") {
      const content = event.message?.content;
      if (!Array.isArray(content)) continue;
      for (const block of content) {
        if (block?.type !== "tool_result") continue;
        const entry = byToolUseId.get(block.tool_use_id);
        if (!entry) continue;
        entry.output = toolResultText(block.content);
        entry.exitCode = block.is_error ? 1 : 0;
      }
    } else if (event.type === "result") {
      resultEvent = event;
    }
  }

  let usage = {
    input_tokens: 0,
    cached_input_tokens: 0,
    cache_creation_input_tokens: 0,
    output_tokens: 0,
    reasoning_output_tokens: 0,
  };
  if (resultEvent) {
    // AIDEV-NOTE: modelUsage is summed across all models (main + helper calls)
    // so the accounting matches Codex sessions, which report whole-session usage.
    const models = Object.values(resultEvent.modelUsage ?? {});
    const sum = (key) =>
      models.reduce((total, model) => total + (model[key] ?? 0), 0);
    const cacheRead = sum("cacheReadInputTokens");
    const cacheCreation = sum("cacheCreationInputTokens");
    usage = {
      input_tokens: sum("inputTokens") + cacheRead + cacheCreation,
      cached_input_tokens: cacheRead,
      cache_creation_input_tokens: cacheCreation,
      output_tokens: sum("outputTokens"),
      reasoning_output_tokens: 0,
      total_cost_usd: resultEvent.total_cost_usd ?? null,
    };
  }

  const finalAnswer =
    (typeof resultEvent?.result === "string" && resultEvent.result) ||
    (messages.at(-1) ?? "");
  return analyzeTrace(
    {
      commands,
      messages,
      finalAnswer,
      usage,
      infrastructureFailure: claudeInfrastructureFailure(resultEvent),
    },
    scenario,
  );
}

function analyzeTrace(
  { commands, messages, finalAnswer, usage, infrastructureFailure = null },
  scenario,
) {
  const readFiles = new Set();
  const firstReadIndex = new Map();
  for (const item of commands) {
    if (!isContentCommand(item.command)) continue;
    const paths = extractPaths(item.command);
    if (isContentSearch(item.command)) {
      for (const file of extractPaths(item.output)) paths.add(file);
    }
    for (const file of paths) {
      readFiles.add(file);
      if (!firstReadIndex.has(file)) firstReadIndex.set(file, item.index);
    }
  }

  const relevantReads = [...readFiles].filter((file) =>
    scenario.relevantPrefixes.some(
      (prefix) => file === prefix || file.startsWith(prefix),
    ),
  );
  const firstRelevantCommand = relevantReads.length
    ? Math.min(...relevantReads.map((file) => firstReadIndex.get(file)))
    : null;
  const protocolRead = (file) =>
    file === "AGENTS.md" || file === "CLAUDE.md" || file.startsWith(".galpi/");
  const unrelatedReads = [...readFiles].filter(
    (file) => !relevantReads.includes(file) && !protocolRead(file),
  );
  const clarificationOrParseFailure =
    /unable to parse|cannot parse|can't parse|invalid (?:galpi|protocol)|need clarification|please clarify|what does .*\.gp/i.test(
      messages.join("\n"),
    );
  const successfulTestCommand = commands.some(
    ({ command, exitCode }) =>
      exitCode === 0 &&
      /(?:npm(?:\.cmd)?\s+(?:run\s+check|test)|node[^\r\n]*--test|tsx[^\r\n]*--test)/i.test(
        command,
      ),
  );

  return {
    commands,
    messages,
    finalAnswer,
    readFiles: [...readFiles].sort(),
    firstReadIndex: Object.fromEntries(firstReadIndex),
    relevantReads: relevantReads.sort(),
    unrelatedReads: unrelatedReads.sort(),
    firstRelevantCommand,
    wholeRepositorySearch: commands.some(({ command }) =>
      isWholeRepositorySearch(command),
    ),
    clarificationOrParseFailure,
    successfulTestCommand,
    infrastructureFailure,
    usage: withDerivedUsage(usage),
  };
}

function changedPaths(runDir) {
  const tracked = runSync("git", ["diff", "HEAD", "--name-only", "--"], {
    cwd: runDir,
  }).stdout;
  const untracked = runSync(
    "git",
    ["ls-files", "--others", "--exclude-standard"],
    { cwd: runDir },
  ).stdout;
  return [...new Set(`${tracked}\n${untracked}`.split(/\r?\n/).filter(Boolean))]
    .map(normalizePath)
    .sort();
}

async function capturePatch(runDir, changed) {
  const trackedPatch = runSync("git", ["diff", "HEAD", "--binary", "--"], {
    cwd: runDir,
    allowFailure: true,
  }).stdout;
  const untracked = [];
  for (const file of changed) {
    const tracked = runSync("git", ["ls-files", "--error-unmatch", "--", file], {
      cwd: runDir,
      allowFailure: true,
    }).status === 0;
    if (tracked) continue;
    const absolute = path.resolve(runDir, file);
    if (!absolute.startsWith(`${path.resolve(runDir)}${path.sep}`)) continue;
    try {
      const content = await readFile(absolute, "utf8");
      untracked.push(`\n--- UNTRACKED FILE: ${file} ---\n${content}`);
    } catch {
      // Ignore unreadable/binary untracked files; the path remains in results.
    }
  }
  return `${trackedPatch}${untracked.join("\n")}`;
}

function allowedChange(file, scenario, condition) {
  if (
    scenario.allowedPrefixes.some(
      (prefix) => file === prefix || file.startsWith(prefix),
    )
  ) {
    return true;
  }
  if (scenario === SCENARIOS.roster && file === "package.json") return true;
  // AIDEV-NOTE: both Galpi conditions (B human-readable, C compact) mandate
  // post-change state sync in .galpi/, so those edits are in-scope for B and C
  // alike; only condition A (no Galpi) treats them as wrong changes.
  if (
    !scenario.readOnly &&
    (condition === "B" || condition === "C") &&
    file.startsWith(".galpi/")
  ) {
    return true;
  }
  return false;
}

function semanticEvaluation(scenarioId, finalAnswer, changed) {
  const text = finalAnswer.toLowerCase();
  if (scenarioId === "billing") {
    const checks = {
      noImplementation:
        /not implemented|planning[- ]only|no (?:billing )?implementation|구현(?:되어 있지 않|되지 않았|되지 않)|미구현/.test(text),
      evidencePath: text.includes("docs/plans/billing.md"),
      plannedScope:
        ["draft", "line item", "minor unit", "issued", "paid", "void"].filter(
          (term) => text.includes(term),
        ).length >= 3,
      refundOrCredit: /refund|credit|환불|크레딧/.test(text),
      invoiceNumber: /invoice[- ]number|invoice number|청구서 번호/.test(text),
      taxAndDiscount: /tax|세금/.test(text) && /discount|할인/.test(text),
      prerequisite:
        /\bwip\b|work[- ]in[- ]progress|in[- ]progress|작업 중/.test(text) &&
        /public api|event|공개 api|이벤트/.test(text),
      noChanges: changed.length === 0,
    };
    return { passed: Object.values(checks).every(Boolean), checks };
  }
  if (scenarioId === "session-flow") {
    const checks = {
      implementationPath: text.includes("src/auth/auth.command.login.ts"),
      focusedTestPath: text.includes("src/auth/auth.test.login.ts"),
      noChanges: changed.length === 0,
    };
    return { passed: Object.values(checks).every(Boolean), checks };
  }
  return null;
}

async function hiddenEvaluation(runDir, scenarioId, scenario) {
  if (!scenario.hiddenEvaluator) return null;
  const evaluatorPath = path.join(runDir, `.phase1-hidden-${scenarioId}.ts`);
  await writeFile(evaluatorPath, scenario.hiddenEvaluator.trimStart(), "utf8");
  const result = runSync(process.execPath, [TSX_CLI, evaluatorPath], {
    cwd: runDir,
    allowFailure: true,
  });
  await rm(evaluatorPath, { force: true });
  return {
    passed: result.status === 0,
    exitCode: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

async function countTokenFiles(runDir, files, encoder) {
  let tokens = 0;
  const details = [];
  for (const file of files) {
    try {
      const content = await readFile(path.join(runDir, file), "utf8");
      const count = encoder.encode(content).length;
      tokens += count;
      details.push({ file, tokens: count });
    } catch {
      details.push({ file, tokens: null, missing: true });
    }
  }
  return { tokens, files: details };
}

function routeAndStateMetrics(condition, scenarioId, scenario, trace, changed) {
  if (condition === "A") {
    return {
      routeSelected: null,
      stateRuleCompliant: null,
      stateEvidence: "not applicable",
    };
  }
  const routeViews = scenario.routeViews?.[condition] ?? [];
  const routeSelected = routeViews.some((file) => trace.readFiles.includes(file));
  let stateRuleCompliant = routeSelected;
  let stateEvidence = routeSelected ? "task View read" : "task View not read";

  if (scenarioId === "sorting") {
    const statusFile = scenario.statusFiles[condition];
    const statusIndex = trace.firstReadIndex[statusFile];
    const firstCodeIndex = trace.firstRelevantCommand;
    const statusFirst =
      Number.isInteger(statusIndex) &&
      Number.isInteger(firstCodeIndex) &&
      statusIndex < firstCodeIndex;
    stateRuleCompliant = routeSelected && statusFirst;
    stateEvidence = statusFirst
      ? `${statusFile} read before student code`
      : `${statusFile} was not read before student code`;
  } else if (scenarioId === "billing") {
    const sourceReads = trace.readFiles.filter((file) => file.startsWith("src/"));
    stateRuleCompliant =
      routeSelected &&
      trace.readFiles.includes("docs/plans/billing.md") &&
      sourceReads.length === 0 &&
      changed.length === 0;
    stateEvidence = `guide=${trace.readFiles.includes("docs/plans/billing.md")}; sourceReads=${sourceReads.length}; changes=${changed.length}`;
  } else if (scenarioId === "roster") {
    const deadReads = trace.readFiles.filter((file) => file.startsWith("src/legacy/"));
    const deadChanges = changed.filter((file) => file.startsWith("src/legacy/"));
    stateRuleCompliant =
      routeSelected && deadReads.length === 0 && deadChanges.length === 0;
    stateEvidence = `legacyReads=${deadReads.length}; legacyChanges=${deadChanges.length}`;
  }
  return { routeSelected, stateRuleCompliant, stateEvidence };
}

function executeCli({ command, args, cwd, env, timeoutMs }) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd,
      env,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    const timer = setTimeout(() => {
      timedOut = true;
      if (child.pid) {
        spawnSync("taskkill", ["/pid", String(child.pid), "/t", "/f"], {
          windowsHide: true,
          encoding: "utf8",
        });
      }
    }, timeoutMs);
    child.on("error", (error) => {
      clearTimeout(timer);
      resolve({ exitCode: null, stdout, stderr: `${stderr}\n${error.stack}`, timedOut });
    });
    child.on("close", (exitCode) => {
      clearTimeout(timer);
      resolve({ exitCode, stdout, stderr, timedOut });
    });
  });
}

function executeCodex(runDir, prompt) {
  const args = [
    CODEX_CLI,
    "exec",
    "--json",
    "--ephemeral",
    "--ignore-user-config",
    "--color",
    "never",
    "--model",
    MODEL,
    "-c",
    `model_reasoning_effort=\"${REASONING_EFFORT}\"`,
    "--dangerously-bypass-approvals-and-sandbox",
    "--cd",
    runDir,
    prompt,
  ];
  const env = { ...process.env, NO_COLOR: "1", PYTHONUTF8: "1" };
  delete env.CODEX_THREAD_ID;
  return executeCli({
    command: process.execPath,
    args,
    cwd: ROOT,
    env,
    timeoutMs: TIMEOUT_MS,
  });
}

function executeClaude(runDir, prompt) {
  const args = [
    "-p",
    prompt,
    "--output-format",
    "stream-json",
    "--verbose",
    "--model",
    CLAUDE_MODEL,
    // AIDEV-NOTE: project-only setting sources keep the operator's global
    // ~/.claude/CLAUDE.md rules out of the experiment (isolation verified
    // 2026-07-17); the fixture's own CLAUDE.md bridge still loads.
    "--setting-sources",
    "project",
    "--dangerously-skip-permissions",
  ];
  // AIDEV-NOTE: worktree sessions resolve project auto-memory to the MAIN repo
  // (~/.claude/projects/C--Users-Admin-Desktop-galpi/memory), so runs shared a
  // read/write memory and contaminated each other in claude-full-1 (verified
  // 2026-07-18 via init-event memory_paths). Disable it for experiment runs.
  const env = {
    ...process.env,
    NO_COLOR: "1",
    CLAUDE_CODE_DISABLE_AUTO_MEMORY: "1",
  };
  delete env.CLAUDECODE;
  delete env.CLAUDE_CODE_ENTRYPOINT;
  delete env.CLAUDE_CODE_SSE_PORT;
  return executeCli({
    command: CLAUDE_CLI,
    args,
    cwd: runDir,
    env,
    timeoutMs: CLAUDE_TIMEOUT_MS,
  });
}

async function prepareWorktree(worktreeRoot, runName, commit) {
  const runDir = path.join(worktreeRoot, runName);
  runSync("git", ["worktree", "add", "--detach", runDir, commit]);
  return runDir;
}

async function removeWorktree(worktreeRoot, runDir) {
  const resolvedRoot = path.resolve(worktreeRoot);
  const resolvedRun = path.resolve(runDir);
  if (!resolvedRun.startsWith(`${resolvedRoot}${path.sep}`)) {
    throw new Error(`Refusing to remove worktree outside experiment root: ${resolvedRun}`);
  }
  runSync("git", ["worktree", "remove", "--force", resolvedRun], {
    allowFailure: true,
  });
}

async function runOne({
  agent,
  repeat,
  condition,
  scenarioId,
  runDir,
  logsDir,
  patchesDir,
  encoder,
}) {
  const scenario = SCENARIOS[scenarioId];
  const config = CONDITIONS[condition];
  const runName = `r${repeat}-${condition.toLowerCase()}-${scenarioId}`;
  const startedAt = new Date().toISOString();
  const started = Date.now();
  console.log(`START ${runName}`);
  const bridgeInjected =
    agent === "claude" && config.bootstrapFiles.includes("AGENTS.md");
  if (bridgeInjected) {
    await writeFile(path.join(runDir, CLAUDE_BRIDGE_FILE), CLAUDE_BRIDGE, "utf8");
  }
  const bootstrapFiles = bridgeInjected
    ? [CLAUDE_BRIDGE_FILE, ...config.bootstrapFiles]
    : config.bootstrapFiles;
  const protocolContext = await countTokenFiles(
    runDir,
    bootstrapFiles,
    encoder,
  );
  const queryResult = await countTokenFiles(
    runDir,
    scenario.queryFiles[condition] ?? [],
    encoder,
  );
  const cli =
    agent === "claude"
      ? await executeClaude(runDir, scenario.prompt)
      : await executeCodex(runDir, scenario.prompt);
  await writeFile(path.join(logsDir, `${runName}.jsonl`), cli.stdout, "utf8");
  await writeFile(path.join(logsDir, `${runName}.stderr.txt`), cli.stderr, "utf8");

  const events = parseEvents(cli.stdout);
  const trace =
    agent === "claude"
      ? collectClaudeTrace(events, scenario, runDir)
      : collectTrace(events, scenario);
  const changed = changedPaths(runDir).filter(
    (file) => !(bridgeInjected && file === CLAUDE_BRIDGE_FILE),
  );
  const wrongChanges = changed.filter(
    (file) => !allowedChange(file, scenario, condition),
  );
  const patch = await capturePatch(runDir, changed);
  await writeFile(path.join(patchesDir, `${runName}.patch.txt`), patch, "utf8");
  const hidden = await hiddenEvaluation(runDir, scenarioId, scenario);
  const semantic = semanticEvaluation(scenarioId, trace.finalAnswer, changed);
  const evaluationPassed = hidden?.passed ?? semantic?.passed ?? false;
  const routeState = routeAndStateMetrics(
    condition,
    scenarioId,
    scenario,
    trace,
    changed,
  );
  const deadCodeReads = trace.readFiles.filter((file) =>
    file.startsWith("src/legacy/"),
  );
  const deadCodeChanges = changed.filter((file) =>
    file.startsWith("src/legacy/"),
  );
  const finishedAt = new Date().toISOString();
  const result = {
    runName,
    agent,
    repeat,
    condition,
    conditionLabel: config.label,
    commit: config.commit,
    scenario: scenarioId,
    scenarioTitle: scenario.title,
    expectedTask: scenario.expectedTask,
    prompt: scenario.prompt,
    startedAt,
    finishedAt,
    durationMs: Date.now() - started,
    cliExitCode: cli.exitCode,
    claudeBridgeInjected: bridgeInjected,
    timedOut: cli.timedOut,
    infrastructureFailure: trace.infrastructureFailure,
    eventCount: events.length,
    commandCount: trace.commands.length,
    finalAnswer: trace.finalAnswer,
    usage: trace.usage,
    protocolContextTokenProxy: protocolContext,
    queryResultTokenProxy: queryResult,
    protocolComponentTokenProxy:
      protocolContext.tokens + queryResult.tokens,
    readFiles: trace.readFiles,
    relevantReads: trace.relevantReads,
    unrelatedReads: trace.unrelatedReads,
    firstRelevantCommand: trace.firstRelevantCommand,
    wholeRepositorySearch: trace.wholeRepositorySearch,
    routeSelected: routeState.routeSelected,
    stateRuleCompliant: routeState.stateRuleCompliant,
    stateEvidence: routeState.stateEvidence,
    clarificationOrParseFailure: trace.clarificationOrParseFailure,
    successfulTestCommand: trace.successfulTestCommand,
    changedPaths: changed,
    wrongChanges,
    deadCodeReads,
    deadCodeChanges,
    hiddenEvaluation: hidden,
    semanticEvaluation: semantic,
    evaluationPassed,
  };
  console.log(
    `DONE  ${runName} eval=${evaluationPassed ? "PASS" : "FAIL"} route=${String(routeState.routeSelected)} state=${String(routeState.stateRuleCompliant)} tokens=${trace.usage.total_tokens} duration=${Math.round(result.durationMs / 1000)}s`,
  );
  return result;
}

function average(values) {
  const numbers = values.filter((value) => Number.isFinite(value));
  if (!numbers.length) return null;
  return numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
}

function rate(values) {
  const booleans = values.filter((value) => typeof value === "boolean");
  if (!booleans.length) return null;
  return booleans.filter(Boolean).length / booleans.length;
}

function expectedRunCount(metadata) {
  return (
    (metadata.repeats ?? 0) *
    Object.keys(metadata.conditions ?? {}).length *
    Object.keys(metadata.scenarios ?? {}).length
  );
}

function aggregateResults(results, expectedRuns = results.length) {
  // AIDEV-NOTE: provider failures invalidate the complete A/B/C pair for that
  // repeat and scenario; keeping sibling rows would bias the paired comparison.
  const pairKey = (row) => `${row.repeat}:${row.scenario}`;
  const excludedPairKeys = new Set(
    results.filter((row) => row.infrastructureFailure).map(pairKey),
  );
  const includedResults = results.filter(
    (row) => !excludedPairKeys.has(pairKey(row)),
  );
  const excludedResults = results.filter((row) => excludedPairKeys.has(pairKey(row)));
  const validity = {
    complete: results.length === expectedRuns && excludedPairKeys.size === 0,
    expectedRuns,
    observedRuns: results.length,
    includedRuns: includedResults.length,
    excludedRuns: excludedResults.length,
    excludedPairGroups: [...excludedPairKeys].sort(),
    infrastructureFailures: results.filter((row) => row.infrastructureFailure).map(
      (row) => ({
        runName: row.runName,
        ...row.infrastructureFailure,
      }),
    ),
  };
  const byCondition = {};
  const byScenario = {};
  for (const condition of Object.keys(CONDITIONS)) {
    const rows = includedResults.filter((result) => result.condition === condition);
    if (!rows.length) continue;
    byCondition[condition] = {
      label: CONDITIONS[condition].label,
      runs: rows.length,
      evaluationPassRate: rate(rows.map((row) => row.evaluationPassed)),
      routeSelectionRate: rate(rows.map((row) => row.routeSelected)),
      stateComplianceRate: rate(rows.map((row) => row.stateRuleCompliant)),
      parseOrClarificationRate: rate(
        rows.map((row) => row.clarificationOrParseFailure),
      ),
      wholeRepositorySearchRate: rate(
        rows.map((row) => row.wholeRepositorySearch),
      ),
      wrongChangeRate: rate(rows.map((row) => row.wrongChanges.length > 0)),
      relevantTestCommandRate: rate(
        rows
          .filter((row) => !SCENARIOS[row.scenario].readOnly)
          .map((row) => row.successfulTestCommand),
      ),
      averageFirstRelevantCommand: average(
        rows.map((row) => row.firstRelevantCommand),
      ),
      averageReadFiles: average(rows.map((row) => row.readFiles.length)),
      averageUnrelatedReads: average(rows.map((row) => row.unrelatedReads.length)),
      averageProtocolContextTokenProxy: average(
        rows.map((row) => row.protocolContextTokenProxy.tokens),
      ),
      averageQueryResultTokenProxy: average(
        rows.map((row) => row.queryResultTokenProxy.tokens),
      ),
      averageProtocolComponentTokenProxy: average(
        rows.map((row) => row.protocolComponentTokenProxy),
      ),
      averageInputTokens: average(rows.map((row) => row.usage.input_tokens)),
      averageCachedInputTokens: average(
        rows.map((row) => row.usage.cached_input_tokens),
      ),
      averageOutputTokens: average(rows.map((row) => row.usage.output_tokens)),
      averageReasoningTokens: average(
        rows.map((row) => row.usage.reasoning_output_tokens),
      ),
      averageTotalTokens: average(rows.map((row) => row.usage.total_tokens)),
      totalTokens: rows.reduce((sum, row) => sum + row.usage.total_tokens, 0),
      averageEffectiveTokens: average(
        rows.map((row) => row.usage.effective_tokens),
      ),
      totalEffectiveTokens: rows.reduce(
        (sum, row) => sum + (row.usage.effective_tokens ?? 0),
        0,
      ),
      averageCostUsd: average(rows.map((row) => row.usage.total_cost_usd)),
      averageDurationMs: average(rows.map((row) => row.durationMs)),
      deadCodeReadRate: rate(rows.map((row) => row.deadCodeReads.length > 0)),
      deadCodeChangeRate: rate(rows.map((row) => row.deadCodeChanges.length > 0)),
    };
  }

  for (const scenario of Object.keys(SCENARIOS)) {
    byScenario[scenario] = {};
    for (const condition of Object.keys(CONDITIONS)) {
      const rows = includedResults.filter(
        (result) => result.scenario === scenario && result.condition === condition,
      );
      if (!rows.length) continue;
      byScenario[scenario][condition] = {
        runs: rows.length,
        evaluationPassRate: rate(rows.map((row) => row.evaluationPassed)),
        routeSelectionRate: rate(rows.map((row) => row.routeSelected)),
        stateComplianceRate: rate(rows.map((row) => row.stateRuleCompliant)),
        wholeRepositorySearchRate: rate(
          rows.map((row) => row.wholeRepositorySearch),
        ),
        averageFirstRelevantCommand: average(
          rows.map((row) => row.firstRelevantCommand),
        ),
        averageReadFiles: average(rows.map((row) => row.readFiles.length)),
        averageUnrelatedReads: average(
          rows.map((row) => row.unrelatedReads.length),
        ),
        averageProtocolComponentTokenProxy: average(
          rows.map((row) => row.protocolComponentTokenProxy),
        ),
        averageTotalTokens: average(rows.map((row) => row.usage.total_tokens)),
        averageEffectiveTokens: average(
          rows.map((row) => row.usage.effective_tokens),
        ),
        successfulTestCommandRate: rate(
          rows.map((row) => row.successfulTestCommand),
        ),
        wrongChangeRate: rate(rows.map((row) => row.wrongChanges.length > 0)),
      };
    }
  }

  const b = byCondition.B;
  const c = byCondition.C;
  const comparison = b && c
    ? {
        componentTokenReductionPercent:
          ((b.averageProtocolComponentTokenProxy -
            c.averageProtocolComponentTokenProxy) /
            b.averageProtocolComponentTokenProxy) *
          100,
        actualTotalTokenReductionPercent:
          ((b.averageTotalTokens - c.averageTotalTokens) /
            b.averageTotalTokens) *
          100,
        effectiveTokenReductionPercent:
          Number.isFinite(b.averageEffectiveTokens) &&
          Number.isFinite(c.averageEffectiveTokens) &&
          b.averageEffectiveTokens > 0
            ? ((b.averageEffectiveTokens - c.averageEffectiveTokens) /
                b.averageEffectiveTokens) *
              100
            : null,
        evaluationDelta: c.evaluationPassRate - b.evaluationPassRate,
        routeSelectionDelta: c.routeSelectionRate - b.routeSelectionRate,
        stateComplianceDelta: c.stateComplianceRate - b.stateComplianceRate,
        provisional: !validity.complete,
        acceptsC: validity.complete
          ? c.evaluationPassRate >= b.evaluationPassRate &&
            c.stateComplianceRate >= b.stateComplianceRate &&
            c.averageProtocolComponentTokenProxy <
              b.averageProtocolComponentTokenProxy &&
            c.averageTotalTokens < b.averageTotalTokens &&
            c.averageFirstRelevantCommand <= b.averageFirstRelevantCommand &&
            c.averageUnrelatedReads <= b.averageUnrelatedReads &&
            c.wholeRepositorySearchRate <= b.wholeRepositorySearchRate
          : null,
      }
    : null;

  return { validity, byCondition, byScenario, comparison };
}

async function reanalyzeExisting(outputRoot) {
  const resultsPath = path.join(outputRoot, "results.json");
  const aggregatePath = path.join(outputRoot, "aggregate.json");
  const metadataPath = path.join(outputRoot, "metadata.json");
  const previous = JSON.parse(await readFile(resultsPath, "utf8"));
  const metadata = JSON.parse(await readFile(metadataPath, "utf8"));
  const agent = metadata.agent ?? "codex";
  const revised = [];

  for (const old of previous) {
    const scenario = SCENARIOS[old.scenario];
    const raw = await readFile(
      path.join(outputRoot, "logs", `${old.runName}.jsonl`),
      "utf8",
    );
    const events = parseEvents(raw);
    const trace =
      agent === "claude"
        ? collectClaudeTrace(
            events,
            scenario,
            path.join(outputRoot, "worktrees", old.runName),
          )
        : collectTrace(events, scenario);
    const changed = old.changedPaths.map(normalizePath);
    const wrongChanges = changed.filter(
      (file) => !allowedChange(file, scenario, old.condition),
    );
    const semantic = semanticEvaluation(old.scenario, trace.finalAnswer, changed);
    const evaluationPassed =
      old.hiddenEvaluation?.passed ?? semantic?.passed ?? false;
    const routeState = routeAndStateMetrics(
      old.condition,
      old.scenario,
      scenario,
      trace,
      changed,
    );
    revised.push({
      ...old,
      eventCount: events.length,
      commandCount: trace.commands.length,
      finalAnswer: trace.finalAnswer,
      usage: trace.usage,
      readFiles: trace.readFiles,
      relevantReads: trace.relevantReads,
      unrelatedReads: trace.unrelatedReads,
      firstRelevantCommand: trace.firstRelevantCommand,
      wholeRepositorySearch: trace.wholeRepositorySearch,
      routeSelected: routeState.routeSelected,
      stateRuleCompliant: routeState.stateRuleCompliant,
      stateEvidence: routeState.stateEvidence,
      clarificationOrParseFailure: trace.clarificationOrParseFailure,
      successfulTestCommand: trace.successfulTestCommand,
      infrastructureFailure: trace.infrastructureFailure,
      changedPaths: changed,
      wrongChanges,
      deadCodeReads: trace.readFiles.filter((file) =>
        file.startsWith("src/legacy/"),
      ),
      deadCodeChanges: changed.filter((file) =>
        file.startsWith("src/legacy/"),
      ),
      semanticEvaluation: semantic,
      evaluationPassed,
    });
  }

  const aggregate = aggregateResults(revised, expectedRunCount(metadata));
  metadata.reanalyzedAt = new Date().toISOString();
  metadata.completedRuns = revised.length;
  metadata.validRuns = aggregate.validity.includedRuns;
  metadata.excludedRuns = aggregate.validity.excludedRuns;
  metadata.complete = aggregate.validity.complete;
  metadata.reanalysis = [
    "accept WIP and work-in-progress as equivalent prerequisite wording",
    "accept equivalent Korean billing-answer terminology",
    "collapse duplicate Windows path separators before route/read metrics",
    "treat a roster test-script update and B/C's required Galpi synchronization as in-scope changes",
    "exclude provider infrastructure failures and their paired A/B/C rows from acceptance metrics",
  ];
  const backupPath = path.join(outputRoot, "results.before-reanalysis.json");
  if (!existsSync(backupPath)) {
    await writeFile(backupPath, JSON.stringify(previous, null, 2), "utf8");
  }
  await Promise.all([
    writeFile(resultsPath, JSON.stringify(revised, null, 2), "utf8"),
    writeFile(aggregatePath, JSON.stringify(aggregate, null, 2), "utf8"),
    writeFile(metadataPath, JSON.stringify(metadata, null, 2), "utf8"),
  ]);
  console.log(`REANALYZED runs=${revised.length}`);
  console.log(`RESULT_ROOT=${outputRoot}`);
  console.log(JSON.stringify(aggregate.comparison));
}

async function retryExcludedRuns(outputRoot) {
  const resultsPath = path.join(outputRoot, "results.json");
  const aggregatePath = path.join(outputRoot, "aggregate.json");
  const metadataPath = path.join(outputRoot, "metadata.json");
  const previous = JSON.parse(await readFile(resultsPath, "utf8"));
  const metadata = JSON.parse(await readFile(metadataPath, "utf8"));
  const agent = metadata.agent ?? "codex";
  await validateFixture(agent);
  console.log("VALID fixture parity and condition structure");

  // AIDEV-NOTE: an infrastructure failure poisons its whole A/B/C pair group
  // (see aggregateResults), so retry replaces every row of the group — including
  // siblings that succeeded — and overwrites their logs/patches under the same
  // runName. results.before-retry.json is the only record of the replaced rows.
  const pairKey = (row) => `${row.repeat}:${row.scenario}`;
  const excludedPairKeys = new Set(
    previous.filter((row) => row.infrastructureFailure).map(pairKey),
  );
  if (!excludedPairKeys.size) {
    console.log("NO EXCLUDED PAIR GROUPS — nothing to retry");
    return;
  }

  const backupPath = path.join(outputRoot, "results.before-retry.json");
  if (!existsSync(backupPath)) {
    await writeFile(backupPath, JSON.stringify(previous, null, 2), "utf8");
  }

  const worktreeRoot = path.join(outputRoot, "worktrees");
  const logsDir = path.join(outputRoot, "logs");
  const patchesDir = path.join(outputRoot, "patches");
  await Promise.all([
    mkdir(worktreeRoot, { recursive: true }),
    mkdir(logsDir, { recursive: true }),
    mkdir(patchesDir, { recursive: true }),
  ]);

  const groups = [...excludedPairKeys].sort().map((key) => {
    const [repeat, scenarioId] = key.split(":");
    return { repeat: Number(repeat), scenarioId };
  });
  const conditions = Object.keys(metadata.conditions ?? CONDITIONS);

  const encoder = getEncoding("o200k_base");
  const results = previous.filter((row) => !excludedPairKeys.has(pairKey(row)));
  try {
    for (const { repeat, scenarioId } of groups) {
      const prepared = [];
      for (const condition of conditions) {
        const runName = `r${repeat}-${condition.toLowerCase()}-${scenarioId}`;
        await removeWorktree(worktreeRoot, path.join(worktreeRoot, runName));
        await rm(path.join(worktreeRoot, runName), {
          recursive: true,
          force: true,
        });
        const runDir = await prepareWorktree(
          worktreeRoot,
          runName,
          CONDITIONS[condition].commit,
        );
        prepared.push({ condition, runDir });
      }
      const block = await Promise.all(
        prepared.map(({ condition, runDir }) =>
          runOne({
            agent,
            repeat,
            condition,
            scenarioId,
            runDir,
            logsDir,
            patchesDir,
            encoder,
          }),
        ),
      );
      results.push(...block);
      await writeFile(
        path.join(outputRoot, "results.partial.json"),
        JSON.stringify(results, null, 2),
        "utf8",
      );
      for (const { runDir } of prepared) {
        await removeWorktree(worktreeRoot, runDir);
      }
    }
  } finally {
    if (typeof encoder.free === "function") encoder.free();
  }

  const aggregate = aggregateResults(results, expectedRunCount(metadata));
  metadata.retriedAt = new Date().toISOString();
  metadata.retriedPairGroups = [...excludedPairKeys].sort();
  metadata.completedRuns = results.length;
  metadata.validRuns = aggregate.validity.includedRuns;
  metadata.excludedRuns = aggregate.validity.excludedRuns;
  metadata.complete = aggregate.validity.complete;
  await Promise.all([
    writeFile(resultsPath, JSON.stringify(results, null, 2), "utf8"),
    writeFile(aggregatePath, JSON.stringify(aggregate, null, 2), "utf8"),
    writeFile(metadataPath, JSON.stringify(metadata, null, 2), "utf8"),
  ]);
  runSync("git", ["worktree", "prune"], { allowFailure: true });
  console.log(`RETRIED groups=${groups.length} runs=${results.length}`);
  console.log(`RESULT_ROOT=${outputRoot}`);
  console.log(JSON.stringify(aggregate.comparison));
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.retryExcluded) {
    await retryExcludedRuns(path.resolve(ROOT, options.retryExcluded));
    return;
  }
  await validateFixture(options.agent);
  console.log("VALID fixture parity and condition structure");
  if (options.reanalyze) {
    await reanalyzeExisting(path.resolve(ROOT, options.reanalyze));
    return;
  }
  if (options.validateOnly) return;

  const outputRoot = path.join(
    ROOT,
    ".experiments",
    "phase1-ai-first-runs",
    options.runId,
  );
  if (existsSync(outputRoot)) {
    throw new Error(`Output already exists: ${outputRoot}`);
  }
  const worktreeRoot = path.join(outputRoot, "worktrees");
  const logsDir = path.join(outputRoot, "logs");
  const patchesDir = path.join(outputRoot, "patches");
  await Promise.all([
    mkdir(worktreeRoot, { recursive: true }),
    mkdir(logsDir, { recursive: true }),
    mkdir(patchesDir, { recursive: true }),
  ]);
  const metadata = {
    startedAt: new Date().toISOString(),
    runId: options.runId,
    outputRoot,
    agent: options.agent,
    model: options.agent === "claude" ? CLAUDE_MODEL : MODEL,
    reasoningEffort: options.agent === "claude" ? null : REASONING_EFFORT,
    timeoutMs: options.agent === "claude" ? CLAUDE_TIMEOUT_MS : TIMEOUT_MS,
    claudeBridge: options.agent === "claude" ? CLAUDE_BRIDGE : null,
    tokenizerProxy: "o200k_base",
    repeats: options.repeats,
    conditions: Object.fromEntries(
      options.conditions.map((condition) => [condition, CONDITIONS[condition]]),
    ),
    scenarios: Object.fromEntries(
      options.scenarios.map((scenario) => [scenario, {
        title: SCENARIOS[scenario].title,
        expectedTask: SCENARIOS[scenario].expectedTask,
        prompt: SCENARIOS[scenario].prompt,
      }]),
    ),
  };
  await writeFile(
    path.join(outputRoot, "metadata.json"),
    JSON.stringify(metadata, null, 2),
    "utf8",
  );
  await writeFile(
    path.join(ROOT, ".experiments", "phase1-ai-first-latest.json"),
    JSON.stringify({ outputRoot, runId: options.runId }, null, 2),
    "utf8",
  );

  const encoder = getEncoding("o200k_base");
  const results = [];
  try {
    for (let repeat = 1; repeat <= options.repeats; repeat += 1) {
      for (const scenarioId of options.scenarios) {
        const prepared = [];
        for (const condition of options.conditions) {
          const runName = `r${repeat}-${condition.toLowerCase()}-${scenarioId}`;
          const runDir = await prepareWorktree(
            worktreeRoot,
            runName,
            CONDITIONS[condition].commit,
          );
          prepared.push({ condition, runDir });
        }
        const block = await Promise.all(
          prepared.map(({ condition, runDir }) =>
            runOne({
              agent: options.agent,
              repeat,
              condition,
              scenarioId,
              runDir,
              logsDir,
              patchesDir,
              encoder,
            }),
          ),
        );
        results.push(...block);
        await writeFile(
          path.join(outputRoot, "results.partial.json"),
          JSON.stringify(results, null, 2),
          "utf8",
        );
        if (!options.keepWorktrees) {
          for (const { runDir } of prepared) {
            await removeWorktree(worktreeRoot, runDir);
          }
        }
      }
    }
  } finally {
    if (typeof encoder.free === "function") encoder.free();
  }

  const aggregate = aggregateResults(results, expectedRunCount(metadata));
  metadata.finishedAt = new Date().toISOString();
  metadata.completedRuns = results.length;
  metadata.validRuns = aggregate.validity.includedRuns;
  metadata.excludedRuns = aggregate.validity.excludedRuns;
  metadata.complete = aggregate.validity.complete;
  await Promise.all([
    writeFile(
      path.join(outputRoot, "metadata.json"),
      JSON.stringify(metadata, null, 2),
      "utf8",
    ),
    writeFile(
      path.join(outputRoot, "results.json"),
      JSON.stringify(results, null, 2),
      "utf8",
    ),
    writeFile(
      path.join(outputRoot, "aggregate.json"),
      JSON.stringify(aggregate, null, 2),
      "utf8",
    ),
  ]);
  runSync("git", ["worktree", "prune"], { allowFailure: true });
  console.log(`COMPLETE runs=${results.length}`);
  console.log(`RESULT_ROOT=${outputRoot}`);
  console.log(JSON.stringify(aggregate.comparison));
}

main().catch((error) => {
  console.error(error.stack ?? error);
  process.exitCode = 1;
});
