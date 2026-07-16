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

test("student list sorting is optional and keeps the default order intact", () => {
  const students = createStudentModule(new MemoryDatabase());
  const cara = students.create({ name: "Cara", email: "cara@example.com" });
  const abel = students.create({ name: "Abel", email: "abel@example.com" });
  const bona = students.create({ name: "Bona", email: "bona@example.com" });

  assert.deepEqual(
    students.list().map((student) => student.id),
    [cara.id, abel.id, bona.id],
  );

  assert.deepEqual(
    students.list({ sortBy: "name" }).map((student) => student.name),
    ["Abel", "Bona", "Cara"],
  );
  assert.deepEqual(
    students
      .list({ sortBy: "name", direction: "desc" })
      .map((student) => student.name),
    ["Cara", "Bona", "Abel"],
  );

  const createdAts = students.list().map((student) => student.createdAt);
  assert.deepEqual(
    students.list({ sortBy: "createdAt" }).map((student) => student.createdAt),
    [...createdAts].sort(),
  );
  assert.deepEqual(
    students
      .list({ sortBy: "createdAt", direction: "desc" })
      .map((student) => student.createdAt),
    [...createdAts].sort().reverse(),
  );

  assert.deepEqual(
    students.list().map((student) => student.id),
    [cara.id, abel.id, bona.id],
  );
});
