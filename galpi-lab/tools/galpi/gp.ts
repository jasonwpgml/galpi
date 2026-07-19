// GALPI/1 line-oriented record format: `OPCODE|field|field|key=value`.
// Blank lines are ignored; there are no comments in runtime files.

export interface GpRecord {
  opcode: string;
  fields: string[];
  line: number;
  raw: string;
}

export interface GpParseIssue {
  line: number;
  message: string;
  raw: string;
}

export interface GpFile {
  path: string;
  records: GpRecord[];
  issues: GpParseIssue[];
}

const RECORD_PATTERN = /^[A-Z]\|/;

export function parseGp(text: string, path: string): GpFile {
  const records: GpRecord[] = [];
  const issues: GpParseIssue[] = [];
  const lines = text.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const raw = lines[index] ?? "";
    if (raw.trim() === "") continue;
    const line = index + 1;
    if (!RECORD_PATTERN.test(raw)) {
      issues.push({ line, message: "line is not an OPCODE|... record", raw });
      continue;
    }
    const parts = raw.split("|");
    const opcode = parts[0] ?? "";
    records.push({ opcode, fields: parts.slice(1), line, raw });
  }
  return { path, records, issues };
}

export function serializeRecord(record: Pick<GpRecord, "opcode" | "fields">): string {
  return [record.opcode, ...record.fields].join("|");
}

/** Parse `key=value` pairs from a record's trailing fields; bare fields are skipped. */
export function keyValues(fields: string[]): Map<string, string> {
  const result = new Map<string, string>();
  for (const field of fields) {
    const eq = field.indexOf("=");
    if (eq <= 0) continue;
    result.set(field.slice(0, eq), field.slice(eq + 1));
  }
  return result;
}

/** Parse a dictionary record like `S|0=done|1=wip` into code -> label. */
export function dictionary(record: GpRecord): Map<string, string> {
  return keyValues(record.fields);
}

export function firstRecord(file: GpFile, opcode: string): GpRecord | undefined {
  return file.records.find((record) => record.opcode === opcode);
}

export function recordsOf(file: GpFile, opcode: string): GpRecord[] {
  return file.records.filter((record) => record.opcode === opcode);
}
