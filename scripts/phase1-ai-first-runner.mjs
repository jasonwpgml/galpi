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
    label: "AI-first Galpi",
    branch: "phase1-ai/fixture-c",
    commit: "1469da75f7b46e0499f3faa792cead19973c3629",
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
    repeats: 3,
    conditions: Object.keys(CONDITIONS),
    scenarios: Object.keys(SCENARIOS),
    validateOnly: false,
    keepWorktrees: false,
    reanalyze: null,
    runId: new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-"),
  };

  for (const argument of argv) {
    if (argument === "--validate-only") options.validateOnly = true;
    else if (argument === "--keep-worktrees") options.keepWorktrees = true;
    else if (argument.startsWith("--repeats=")) {
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
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }

  if (!Number.isInteger(options.repeats) || options.repeats < 1) {
    throw new Error("--repeats must be a positive integer");
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

async function validateFixture() {
  if (!CODEX_CLI || !existsSync(CODEX_CLI)) {
    throw new Error("CODEX_MANAGED_PACKAGE_ROOT/bin/codex.js is unavailable");
  }
  if (!existsSync(TSX_CLI)) throw new Error(`tsx CLI unavailable: ${TSX_CLI}`);

  const sourceHashes = new Map();
  for (const [condition, config] of Object.entries(CONDITIONS)) {
    const resolved = runSync("git", ["rev-parse", config.commit]).stdout.trim();
    if (resolved !== config.commit) {
      throw new Error(`${condition} commit mismatch: ${resolved}`);
    }
    const tree = runSync("git", ["ls-tree", "-r", config.commit, "src", "docs/plans", "package.json", "package-lock.json", "tsconfig.json"]).stdout;
    sourceHashes.set(condition, tree);
  }
  if (new Set(sourceHashes.values()).size !== 1) {
    throw new Error("A/B/C application trees differ");
  }

  const aFiles = runSync("git", ["ls-tree", "-r", "--name-only", CONDITIONS.A.commit]).stdout;
  if (/(^|\n)(AGENTS\.md|\.galpi\/)/.test(aFiles)) {
    throw new Error("Condition A unexpectedly contains Galpi instructions");
  }
  const bFiles = runSync("git", ["ls-tree", "-r", "--name-only", CONDITIONS.B.commit]).stdout;
  if (!bFiles.includes(".galpi/MAP.yaml") || !bFiles.includes(".galpi/view/")) {
    throw new Error("Condition B human-readable runtime is incomplete");
  }
  const cFiles = runSync("git", ["ls-tree", "-r", "--name-only", CONDITIONS.C.commit]).stdout;
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
  const finalAnswer = messages.at(-1) ?? "";
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
    usage: {
      ...usage,
      total_tokens: (usage.input_tokens ?? 0) + (usage.output_tokens ?? 0),
      noncached_tokens:
        (usage.input_tokens ?? 0) -
        (usage.cached_input_tokens ?? 0) +
        (usage.output_tokens ?? 0),
    },
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

function allowedChange(file, scenario) {
  return scenario.allowedPrefixes.some(
    (prefix) => file === prefix || file.startsWith(prefix),
  );
}

function semanticEvaluation(scenarioId, finalAnswer, changed) {
  const text = finalAnswer.toLowerCase();
  if (scenarioId === "billing") {
    const checks = {
      noImplementation:
        /not implemented|planning[- ]only|no (?:billing )?implementation/.test(text),
      evidencePath: text.includes("docs/plans/billing.md"),
      plannedScope:
        ["draft", "line item", "minor unit", "issued", "paid", "void"].filter(
          (term) => text.includes(term),
        ).length >= 3,
      refundOrCredit: /refund|credit/.test(text),
      invoiceNumber: /invoice[- ]number|invoice number/.test(text),
      taxAndDiscount: text.includes("tax") && text.includes("discount"),
      prerequisite:
        /\bwip\b|work[- ]in[- ]progress|in progress/.test(text) &&
        /public api|event/.test(text),
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

function executeCodex(runDir, prompt) {
  return new Promise((resolve) => {
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
    const child = spawn(process.execPath, args, {
      cwd: ROOT,
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
    }, TIMEOUT_MS);
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
  const protocolContext = await countTokenFiles(
    runDir,
    config.bootstrapFiles,
    encoder,
  );
  const queryResult = await countTokenFiles(
    runDir,
    scenario.queryFiles[condition] ?? [],
    encoder,
  );
  const codex = await executeCodex(runDir, scenario.prompt);
  await writeFile(path.join(logsDir, `${runName}.jsonl`), codex.stdout, "utf8");
  await writeFile(path.join(logsDir, `${runName}.stderr.txt`), codex.stderr, "utf8");

  const events = parseEvents(codex.stdout);
  const trace = collectTrace(events, scenario);
  const changed = changedPaths(runDir);
  const wrongChanges = changed.filter((file) => !allowedChange(file, scenario));
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
    codexExitCode: codex.exitCode,
    timedOut: codex.timedOut,
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

function aggregateResults(results) {
  const byCondition = {};
  const byScenario = {};
  for (const condition of Object.keys(CONDITIONS)) {
    const rows = results.filter((result) => result.condition === condition);
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
      averageDurationMs: average(rows.map((row) => row.durationMs)),
      deadCodeReadRate: rate(rows.map((row) => row.deadCodeReads.length > 0)),
      deadCodeChangeRate: rate(rows.map((row) => row.deadCodeChanges.length > 0)),
    };
  }

  for (const scenario of Object.keys(SCENARIOS)) {
    byScenario[scenario] = {};
    for (const condition of Object.keys(CONDITIONS)) {
      const rows = results.filter(
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
        evaluationDelta: c.evaluationPassRate - b.evaluationPassRate,
        routeSelectionDelta: c.routeSelectionRate - b.routeSelectionRate,
        stateComplianceDelta: c.stateComplianceRate - b.stateComplianceRate,
        acceptsC:
          c.evaluationPassRate >= b.evaluationPassRate &&
          c.stateComplianceRate >= b.stateComplianceRate &&
          c.averageProtocolComponentTokenProxy <
            b.averageProtocolComponentTokenProxy &&
          c.averageTotalTokens < b.averageTotalTokens &&
          c.averageFirstRelevantCommand <= b.averageFirstRelevantCommand &&
          c.averageUnrelatedReads <= b.averageUnrelatedReads &&
          c.wholeRepositorySearchRate <= b.wholeRepositorySearchRate,
      }
    : null;

  return { byCondition, byScenario, comparison };
}

async function reanalyzeExisting(outputRoot) {
  const resultsPath = path.join(outputRoot, "results.json");
  const aggregatePath = path.join(outputRoot, "aggregate.json");
  const metadataPath = path.join(outputRoot, "metadata.json");
  const previous = JSON.parse(await readFile(resultsPath, "utf8"));
  const metadata = JSON.parse(await readFile(metadataPath, "utf8"));
  const revised = [];

  for (const old of previous) {
    const scenario = SCENARIOS[old.scenario];
    const raw = await readFile(
      path.join(outputRoot, "logs", `${old.runName}.jsonl`),
      "utf8",
    );
    const events = parseEvents(raw);
    const trace = collectTrace(events, scenario);
    const changed = old.changedPaths.map(normalizePath);
    const wrongChanges = changed.filter((file) => !allowedChange(file, scenario));
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

  const aggregate = aggregateResults(revised);
  metadata.reanalyzedAt = new Date().toISOString();
  metadata.reanalysis = [
    "accept WIP and work-in-progress as equivalent prerequisite wording",
    "collapse duplicate Windows path separators before route/read metrics",
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

async function main() {
  const options = parseArguments(process.argv.slice(2));
  await validateFixture();
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
    model: MODEL,
    reasoningEffort: REASONING_EFFORT,
    timeoutMs: TIMEOUT_MS,
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

  const aggregate = aggregateResults(results);
  metadata.finishedAt = new Date().toISOString();
  metadata.completedRuns = results.length;
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
