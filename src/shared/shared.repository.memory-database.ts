export interface Entity {
  id: string;
}

export class MemoryTable<T extends Entity> {
  constructor(private readonly rows: Map<string, T>) {}

  insert(row: T): T {
    if (this.rows.has(row.id)) {
      throw new Error(`Duplicate id: ${row.id}`);
    }

    this.rows.set(row.id, structuredClone(row));
    return structuredClone(row);
  }

  get(id: string): T | undefined {
    const row = this.rows.get(id);
    return row ? structuredClone(row) : undefined;
  }

  find(predicate: (row: T) => boolean): T | undefined {
    const row = [...this.rows.values()].find(predicate);
    return row ? structuredClone(row) : undefined;
  }

  list(): T[] {
    return [...this.rows.values()].map((row) => structuredClone(row));
  }

  update(id: string, update: (current: T) => T): T {
    const current = this.rows.get(id);
    if (!current) {
      throw new Error(`Unknown id: ${id}`);
    }

    const next = update(structuredClone(current));
    if (next.id !== id) {
      throw new Error("Entity ids cannot be changed");
    }

    this.rows.set(id, structuredClone(next));
    return structuredClone(next);
  }

  delete(id: string): boolean {
    return this.rows.delete(id);
  }
}

export class MemoryDatabase {
  private readonly tables = new Map<string, Map<string, Entity>>();

  table<T extends Entity>(name: string): MemoryTable<T> {
    let rows = this.tables.get(name);
    if (!rows) {
      rows = new Map<string, Entity>();
      this.tables.set(name, rows);
    }

    return new MemoryTable<T>(rows as Map<string, T>);
  }
}
