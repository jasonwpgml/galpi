import assert from "node:assert/strict";
import test from "node:test";

import { createLessonModule } from "@/lesson";
import { MemoryDatabase } from "@/shared";
import { createStudentModule } from "@/student";

test("a known student can enroll once while lesson capacity is enforced", () => {
  const database = new MemoryDatabase();
  const students = createStudentModule(database);
  const lessons = createLessonModule(database, students);
  const mina = students.create({ name: "Mina", email: "mina@example.com" });
  const joon = students.create({ name: "Joon", email: "joon@example.com" });
  const lesson = lessons.create({ title: "TypeScript Basics", capacity: 1 });

  const enrolled = lessons.enroll(lesson.id, mina.id);
  assert.deepEqual(enrolled.enrolledStudentIds, [mina.id]);
  assert.deepEqual(lessons.enroll(lesson.id, mina.id), enrolled);
  assert.throws(() => lessons.enroll(lesson.id, joon.id), /Lesson is full/);
});
