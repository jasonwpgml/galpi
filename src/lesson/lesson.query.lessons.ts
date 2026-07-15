import type { LessonRepository } from "./lesson.repository.lesson";
import type { Lesson } from "./lesson.types.lesson";

export function getLesson(id: string, lessons: LessonRepository): Lesson | undefined {
  return lessons.get(id);
}

export function listLessons(lessons: LessonRepository): Lesson[] {
  return lessons.list();
}
