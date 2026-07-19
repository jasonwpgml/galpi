import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { parseGp } from "./gp.ts";
import { runCheck } from "./check.ts";
import { runDoctor } from "./doctor.ts";
import { addRoute, rmRoute, setState } from "./mutate.ts";

const BOOT = `G|1|boot
K|G=version|K=kind_dict|S=state_dict|A=action_dict|C=field_dict|O=order|B=behavior|N=norm|D=domain|T=task|F=file|Y=symbol|R=route|X=dep|Z=state_view|L=links|U=status|Q=query|E=entry|P=test|V=view
S|0=done|1=wip|2=plan|3=exp|4=dead|5=stale|h=hot|l=lock
A|0=skip_default|1=read_first|2=plan_only|3=verify|4=deny|5=code_check
`;

function write(root: string, relPath: string, content: string): void {
  const full = path.join(root, relPath);
  mkdirSync(path.dirname(full), { recursive: true });
  writeFileSync(full, content, "utf8");
}

function makeFixture(): string {
  const root = mkdtempSync(path.join(tmpdir(), "galpi-test-"));
  write(root, ".galpi/BOOT.gp", BOOT);
  write(
    root,
    ".galpi/source.gp",
    `G|1|source
D|a|0|src/auth|a=0
D|lg|4|src/legacy|a=4
D|b|2|-|a=2
T|a.login|0|q=login|a=0
R|login|a.login
`,
  );
  write(root, ".galpi/MAP.gp", "G|1|gen\nR|login|a.login\n");
  write(
    root,
    ".galpi/v/t/a.login.gp",
    `G|1|manual
T|a.login|0|q=login|f=f1|a=0
F|f1|src/auth/auth.command.login.ts
Y|y1|login|f1
`,
  );
  write(root, "src/auth/auth.command.login.ts", "export function login() {}\n");
  write(root, "src/auth/index.ts", "export { login } from './auth.command.login.ts';\n");
  write(root, "src/legacy/legacy.service.csv-import.ts", "export function parseLegacyRoster() {}\n");
  write(root, "src/legacy/index.ts", "export {};\n");
  return root;
}

test("parseGp splits records and reports non-record lines", () => {
  const parsed = parseGp("G|1|boot\nnot a record\nT|a.b|0\n", "x.gp");
  assert.equal(parsed.records.length, 2);
  assert.equal(parsed.issues.length, 1);
  assert.deepEqual(parsed.records[1]?.fields, ["a.b", "0"]);
});

test("clean fixture passes check", () => {
  const root = makeFixture();
  try {
    assert.deepEqual(runCheck(root, { git: false }), []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("check reports duplicate ids, bad states, and broken refs", () => {
  const root = makeFixture();
  try {
    write(
      root,
      ".galpi/source.gp",
      `G|1|source
D|a|0|src/auth|a=0
D|a|9|src/missing|a=7
T|zz.x|0
R|login|a.login
R|login|zz.x
`,
    );
    const kinds = runCheck(root, { git: false }).map((error) => error.kind);
    for (const expected of ["dup_id", "bad_state", "bad_action", "missing_path", "missing_ref"]) {
      assert.ok(kinds.includes(expected), `expected ${expected} in ${kinds.join(",")}`);
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("check reports view state desync and map desync", () => {
  const root = makeFixture();
  try {
    write(root, ".galpi/MAP.gp", "G|1|gen\nR|signin|a.login\n");
    write(
      root,
      ".galpi/v/t/a.login.gp",
      `G|1|manual
T|a.login|1h|q=login|f=f1|a=0
F|f1|src/auth/auth.command.login.ts
`,
    );
    const kinds = runCheck(root, { git: false }).map((error) => error.kind);
    assert.ok(kinds.includes("view_state_desync"));
    assert.ok(kinds.filter((kind) => kind === "map_desync").length === 2); // missing + extra
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("check reports dead imports and plan code", () => {
  const root = makeFixture();
  try {
    write(
      root,
      "src/auth/auth.command.login.ts",
      "import { parseLegacyRoster } from '../legacy/index.ts';\nexport function login() { parseLegacyRoster(); }\n",
    );
    write(root, "src/billing/invoice.ts", "export const x = 1;\n");
    write(
      root,
      ".galpi/source.gp",
      `G|1|source
D|a|0|src/auth|a=0
D|lg|4|src/legacy|a=4
D|b|2|src/billing|a=2
T|a.login|0|q=login|a=0
R|login|a.login
`,
    );
    const kinds = runCheck(root, { git: false }).map((error) => error.kind);
    assert.ok(kinds.includes("dead_import"));
    assert.ok(kinds.includes("plan_has_code"));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("set-state updates source and resyncs views; bad target rolls back", () => {
  const root = makeFixture();
  try {
    const ok = setState(root, "a.login", "1h");
    assert.ok(ok.ok, ok.message);
    assert.match(readFileSync(path.join(root, ".galpi/source.gp"), "utf8"), /T\|a\.login\|1h\|/);
    assert.match(
      readFileSync(path.join(root, ".galpi/v/t/a.login.gp"), "utf8"),
      /T\|a\.login\|1h\|/,
    );
    const missing = setState(root, "nope", "0");
    assert.equal(missing.ok, false);
    const invalid = setState(root, "a.login", "9");
    assert.equal(invalid.ok, false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("add-route syncs MAP and rejects broken task refs", () => {
  const root = makeFixture();
  try {
    const ok = addRoute(root, "signin", "a.login");
    assert.ok(ok.ok, ok.message);
    assert.match(readFileSync(path.join(root, ".galpi/MAP.gp"), "utf8"), /R\|signin\|a\.login/);
    const broken = addRoute(root, "ghost", "zz.missing");
    assert.equal(broken.ok, false);
    assert.doesNotMatch(readFileSync(path.join(root, ".galpi/source.gp"), "utf8"), /ghost/);
    const removed = rmRoute(root, "signin");
    assert.ok(removed.ok);
    assert.doesNotMatch(readFileSync(path.join(root, ".galpi/MAP.gp"), "utf8"), /signin/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("doctor flags ambiguous names, deep imports, and far tests", () => {
  const root = makeFixture();
  try {
    write(root, "src/auth/utils.ts", "export const util = 1;\n");
    write(
      root,
      "src/lesson/lesson.service.enroll.ts",
      "import { login } from '../auth/auth.command.login.ts';\nexport const enroll = login;\n",
    );
    write(root, "src/lesson/index.ts", "export {};\n");
    write(
      root,
      "src/shared/far.test.ts",
      "import { login } from '../auth/index.ts';\nlogin();\n",
    );
    write(root, "src/shared/index.ts", "export {};\n");
    const kinds = runDoctor(root).map((finding) => finding.kind);
    assert.ok(kinds.includes("ambiguous_name"));
    assert.ok(kinds.includes("deep_import"));
    assert.ok(kinds.includes("test_far_from_code"));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
