import { readFileSync } from "node:fs";
import path from "node:path";

import { keyValues, recordsOf } from "./gp.ts";
import { loadRuntime, relFromRoot } from "./model.ts";
import { listSourceFiles, scanImports } from "./imports.ts";

export interface DoctorFinding {
  kind: string;
  data: Record<string, string>;
  file: string;
}

// Generic basenames that force a reader to open the file to learn its role.
const AMBIGUOUS_NAMES = new Set([
  "utils",
  "util",
  "helpers",
  "helper",
  "misc",
  "common",
  "manager",
  "handler",
  "stuff",
  "temp",
  "data",
  "core",
  "lib",
]);

const LARGE_FILE_LINES = 300;

export function runDoctor(root: string): DoctorFinding[] {
  const findings: DoctorFinding[] = [];
  const files = listSourceFiles(root);
  const edges = scanImports(root, files);

  for (const file of files) {
    const relPath = relFromRoot(root, file);
    const base = path.basename(file).replace(/\.(test|spec)\./, ".").replace(/\.[^.]+$/, "");
    const nameParts = base.split(".");
    const lastPart = nameParts[nameParts.length - 1] ?? base;
    if (AMBIGUOUS_NAMES.has(base.toLowerCase()) || AMBIGUOUS_NAMES.has(lastPart.toLowerCase())) {
      findings.push({ kind: "ambiguous_name", data: { name: base }, file: relPath });
    }

    const text = readFileSync(file, "utf8");
    const lines = text.split("\n").length;
    if (lines > LARGE_FILE_LINES) {
      const outgoingDomains = new Set(
        edges
          .filter((edge) => edge.file === relPath && edge.toDomain && edge.toDomain !== edge.fromDomain)
          .map((edge) => edge.toDomain as string),
      );
      findings.push({
        kind: outgoingDomains.size >= 2 ? "large_mixed_file" : "large_file",
        data: {
          lines: String(lines),
          ...(outgoingDomains.size > 0 ? { imports: [...outgoingDomains].join(",") } : {}),
        },
        file: relPath,
      });
    }
  }

  // Cross-domain imports that bypass the target domain's index barrel.
  for (const edge of edges) {
    if (!edge.toDomain || !edge.fromDomain || edge.toDomain === edge.fromDomain) continue;
    if (!edge.viaIndex) {
      findings.push({
        kind: "deep_import",
        data: { to: edge.resolved ?? edge.specifier, line: String(edge.line) },
        file: edge.file,
      });
    }
  }

  // A test that imports nothing from its own directory exercises code that
  // lives elsewhere — the test is placed far from its subject. Importing
  // other domains *in addition* to local code is normal fixture wiring.
  for (const file of files) {
    const relPath = relFromRoot(root, file);
    if (!/\.(test|spec)\./.test(path.basename(file))) continue;
    const testDir = path.posix.dirname(relPath);
    const srcImports = edges.filter(
      (edge) => edge.file === relPath && edge.resolved?.startsWith("src/"),
    );
    const localImports = srcImports.filter((edge) =>
      (edge.resolved as string).startsWith(`${testDir}/`),
    );
    if (srcImports.length > 0 && localImports.length === 0) {
      findings.push({
        kind: "test_far_from_code",
        data: { imports: srcImports.map((edge) => edge.resolved as string).join(",") },
        file: relPath,
      });
    }
  }

  // A constraint declared in the Galpi layer should be visible next to the
  // code as an AIDEV anchor in at least one of the task's implementation
  // files; report at task level when none of them carries one.
  const runtime = loadRuntime(root);
  for (const view of runtime.views) {
    const constraint = recordsOf(view, "L")
      .map((record) => keyValues(record.fields).get("constraint"))
      .find((value) => value !== undefined);
    if (!constraint) continue;
    const taskRecord = recordsOf(view, "T")[0];
    const taskFiles = new Set((keyValues(taskRecord?.fields.slice(2) ?? []).get("f") ?? "").split(","));
    const implementationPaths = recordsOf(view, "F")
      .filter((record) => taskFiles.has(record.fields[0] ?? ""))
      .map((record) => record.fields[1] ?? "")
      .filter((filePath) => filePath.startsWith("src/") && !/\.test\./.test(filePath));
    if (implementationPaths.length === 0) continue;
    const anchored = implementationPaths.some((filePath) => {
      try {
        return readFileSync(path.join(root, filePath), "utf8").includes("AIDEV-");
      } catch {
        return false; // missing files are check's concern, not doctor's
      }
    });
    if (!anchored) {
      findings.push({
        kind: "missing_anchor",
        data: { constraint, files: implementationPaths.join(",") },
        file: `.galpi task ${taskRecord?.fields[0] ?? "-"}`,
      });
    }
  }

  return findings;
}

export function formatDoctorAi(findings: DoctorFinding[]): string {
  if (findings.length === 0) return "OK|findings=0";
  return findings
    .map((finding) => {
      const pairs = Object.entries(finding.data).map(([key, value]) => `${key}=${value}`);
      return ["DOC", finding.kind, `file=${finding.file}`, ...pairs].join("|");
    })
    .join("\n");
}

const HUMAN_MESSAGES: Record<string, string> = {
  ambiguous_name: "이름만으로 역할을 알 수 없는 파일입니다 — 도메인·역할이 드러나게 개명 권장",
  large_file: "큰 파일입니다 — 독립적으로 변경되는 단위로 분리 검토",
  large_mixed_file: "크고 여러 도메인을 import하는 파일입니다 — 책임 분리 검토",
  deep_import: "다른 도메인의 내부 파일을 직접 import합니다 — index 공개 API 경유 권장",
  test_far_from_code: "테스트가 자신의 디렉토리 밖 구현을 검증합니다 — 코드 옆 배치 검토",
  missing_anchor: "Galpi 제약이 코드 옆에 없습니다 — 해당 파일에 AIDEV-NOTE 추가 권장",
};

export function formatDoctorHuman(findings: DoctorFinding[]): string {
  if (findings.length === 0) return "진단 소견 없음 (findings=0)";
  return findings
    .map((finding) => {
      const detail = Object.entries(finding.data)
        .map(([key, value]) => `${key}=${value}`)
        .join(", ");
      const message = HUMAN_MESSAGES[finding.kind] ?? finding.kind;
      return `[${finding.kind}] ${message} — ${finding.file}${detail ? ` (${detail})` : ""}`;
    })
    .join("\n");
}
