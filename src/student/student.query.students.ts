import type { StudentRepository } from "./student.repository.student";
import type { Student } from "./student.types.student";

export function getStudent(
  id: string,
  students: StudentRepository,
): Student | undefined {
  return students.get(id);
}

export function listStudents(students: StudentRepository): Student[] {
  return students.list();
}
