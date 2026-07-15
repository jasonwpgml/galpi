import type { StudentModule } from "@/student";

import type { LessonRepository } from "./lesson.repository.lesson";
import type { Lesson } from "./lesson.types.lesson";

export function enrollStudent(
  lessonId: string,
  studentId: string,
  lessons: LessonRepository,
  students: Pick<StudentModule, "get">,
): Lesson {
  const lesson = lessons.get(lessonId);
  if (!lesson) {
    throw new Error(`Unknown lesson: ${lessonId}`);
  }
  if (!students.get(studentId)) {
    throw new Error(`Unknown student: ${studentId}`);
  }
  if (lesson.enrolledStudentIds.includes(studentId)) {
    return lesson;
  }
  if (lesson.enrolledStudentIds.length >= lesson.capacity) {
    throw new Error(`Lesson is full: ${lessonId}`);
  }

  return lessons.enroll(lessonId, studentId);
}
