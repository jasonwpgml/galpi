import type { StudentRepository } from "./student.repository.student";
import type {
  CreateStudentInput,
  Student,
  UpdateStudentInput,
} from "./student.types.student";

export function createStudent(
  input: CreateStudentInput,
  students: StudentRepository,
): Student {
  if (!input.name.trim() || !input.email.includes("@")) {
    throw new Error("A student needs a name and a valid email");
  }

  return students.create(input);
}

export function updateStudent(
  id: string,
  input: UpdateStudentInput,
  students: StudentRepository,
): Student {
  if (input.name !== undefined && !input.name.trim()) {
    throw new Error("Student name cannot be empty");
  }
  if (input.email !== undefined && !input.email.includes("@")) {
    throw new Error("Student email is invalid");
  }

  return students.update(id, input);
}

export function removeStudent(id: string, students: StudentRepository): boolean {
  return students.remove(id);
}
