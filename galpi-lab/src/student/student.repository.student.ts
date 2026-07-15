import { MemoryTable, nextId } from "@/shared";

import type {
  CreateStudentInput,
  Student,
  UpdateStudentInput,
} from "./student.types.student";

export class StudentRepository {
  constructor(private readonly students: MemoryTable<Student>) {}

  create(input: CreateStudentInput): Student {
    const email = input.email.trim().toLowerCase();
    if (this.students.find((student) => student.email === email)) {
      throw new Error(`Student already exists: ${email}`);
    }

    return this.students.insert({
      id: nextId("student"),
      name: input.name.trim(),
      email,
      createdAt: new Date().toISOString(),
    });
  }

  get(id: string): Student | undefined {
    return this.students.get(id);
  }

  list(): Student[] {
    return this.students.list();
  }

  update(id: string, input: UpdateStudentInput): Student {
    return this.students.update(id, (student) => ({
      ...student,
      ...(input.name === undefined ? {} : { name: input.name.trim() }),
      ...(input.email === undefined
        ? {}
        : { email: input.email.trim().toLowerCase() }),
    }));
  }

  remove(id: string): boolean {
    return this.students.delete(id);
  }
}
