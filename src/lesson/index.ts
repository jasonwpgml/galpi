import { MemoryDatabase } from "@/shared";
import type { StudentModule } from "@/student";

import { enrollStudent } from "./lesson.command.enroll";
import {
  createLesson,
  removeLesson,
  updateLesson,
} from "./lesson.command.manage";
import { getLesson, listLessons } from "./lesson.query.lessons";
import { LessonRepository } from "./lesson.repository.lesson";
import type {
  CreateLessonInput,
  Lesson,
  UpdateLessonInput,
} from "./lesson.types.lesson";

export interface LessonModule {
  create(input: CreateLessonInput): Lesson;
  get(id: string): Lesson | undefined;
  list(): Lesson[];
  update(id: string, input: UpdateLessonInput): Lesson;
  remove(id: string): boolean;
  enroll(lessonId: string, studentId: string): Lesson;
}

export function createLessonModule(
  database: MemoryDatabase,
  students: Pick<StudentModule, "get">,
): LessonModule {
  const lessons = new LessonRepository(database.table<Lesson>("lesson.lessons"));

  return {
    create: (input) => createLesson(input, lessons),
    get: (id) => getLesson(id, lessons),
    list: () => listLessons(lessons),
    update: (id, input) => updateLesson(id, input, lessons),
    remove: (id) => removeLesson(id, lessons),
    enroll: (lessonId, studentId) =>
      enrollStudent(lessonId, studentId, lessons, students),
  };
}

export type { CreateLessonInput, Lesson, UpdateLessonInput };
