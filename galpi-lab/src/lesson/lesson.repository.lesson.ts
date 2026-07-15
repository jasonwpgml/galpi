import { MemoryTable, nextId } from "@/shared";

import type {
  CreateLessonInput,
  Lesson,
  UpdateLessonInput,
} from "./lesson.types.lesson";

export class LessonRepository {
  constructor(private readonly lessons: MemoryTable<Lesson>) {}

  create(input: CreateLessonInput): Lesson {
    return this.lessons.insert({
      id: nextId("lesson"),
      title: input.title.trim(),
      capacity: input.capacity,
      enrolledStudentIds: [],
    });
  }

  get(id: string): Lesson | undefined {
    return this.lessons.get(id);
  }

  list(): Lesson[] {
    return this.lessons.list();
  }

  update(id: string, input: UpdateLessonInput): Lesson {
    return this.lessons.update(id, (lesson) => ({
      ...lesson,
      ...(input.title === undefined ? {} : { title: input.title.trim() }),
      ...(input.capacity === undefined ? {} : { capacity: input.capacity }),
    }));
  }

  enroll(lessonId: string, studentId: string): Lesson {
    return this.lessons.update(lessonId, (lesson) => ({
      ...lesson,
      enrolledStudentIds: [...lesson.enrolledStudentIds, studentId],
    }));
  }

  remove(id: string): boolean {
    return this.lessons.delete(id);
  }
}
