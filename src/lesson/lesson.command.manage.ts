import type { LessonRepository } from "./lesson.repository.lesson";
import type {
  CreateLessonInput,
  Lesson,
  UpdateLessonInput,
} from "./lesson.types.lesson";

export function createLesson(
  input: CreateLessonInput,
  lessons: LessonRepository,
): Lesson {
  if (!input.title.trim() || !Number.isInteger(input.capacity) || input.capacity < 1) {
    throw new Error("A lesson needs a title and a positive integer capacity");
  }
  return lessons.create(input);
}

export function updateLesson(
  id: string,
  input: UpdateLessonInput,
  lessons: LessonRepository,
): Lesson {
  const existing = lessons.get(id);
  if (!existing) {
    throw new Error(`Unknown lesson: ${id}`);
  }

  if (input.title !== undefined && !input.title.trim()) {
    throw new Error("Lesson title cannot be empty");
  }
  if (
    input.capacity !== undefined &&
    (!Number.isInteger(input.capacity) || input.capacity < existing.enrolledStudentIds.length)
  ) {
    throw new Error("Capacity cannot be lower than current enrollment");
  }

  return lessons.update(id, input);
}

export function removeLesson(id: string, lessons: LessonRepository): boolean {
  return lessons.remove(id);
}
