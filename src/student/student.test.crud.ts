import assert from "node:assert/strict";
import test from "node:test";

import { MemoryDatabase } from "@/shared";
import { createStudentModule } from "@/student";

test("student CRUD keeps the public module boundary", () => {
  const students = createStudentModule(new MemoryDatabase());
  const created = students.create({ name: "  Mina  ", email: "MINA@example.com" });

  assert.equal(created.name, "Mina");
  assert.equal(created.email, "mina@example.com");
  assert.deepEqual(students.get(created.id), created);

  const updated = students.update(created.id, { name: "Min-ah" });
  assert.equal(updated.name, "Min-ah");
  assert.equal(students.list().length, 1);

  assert.equal(students.remove(created.id), true);
  assert.equal(students.get(created.id), undefined);
});
