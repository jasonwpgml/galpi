import type { StudentRepository } from "./student.repository.student";
import type { ListStudentsOptions, Student } from "./student.types.student";

export function getStudent(
  id: string,
  students: StudentRepository,
): Student | undefined {
  return students.get(id);
}

// AIDEV-NOTE: calls without options must return the repository order unchanged;
// the existing GET list API depends on that default (see .galpi/status/st.gp).
export function listStudents(
  students: StudentRepository,
  options?: ListStudentsOptions,
): Student[] {
  const listed = students.list();
  if (!options) {
    return listed;
  }

  const direction = options.direction === "desc" ? -1 : 1;
  return [...listed].sort((a, b) => {
    const left = a[options.sortBy];
    const right = b[options.sortBy];
    if (left === right) {
      return 0;
    }
    return left < right ? -direction : direction;
  });
}
