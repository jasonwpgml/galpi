import { MemoryDatabase } from "@/shared";

import {
  createStudent,
  removeStudent,
  updateStudent,
} from "./student.command.manage";
import { getStudent, listStudents } from "./student.query.students";
import { StudentRepository } from "./student.repository.student";
import type {
  CreateStudentInput,
  ListStudentsOptions,
  Student,
  StudentSortDirection,
  StudentSortField,
  UpdateStudentInput,
} from "./student.types.student";

export interface StudentModule {
  create(input: CreateStudentInput): Student;
  get(id: string): Student | undefined;
  list(options?: ListStudentsOptions): Student[];
  update(id: string, input: UpdateStudentInput): Student;
  remove(id: string): boolean;
}

export function createStudentModule(database: MemoryDatabase): StudentModule {
  const students = new StudentRepository(database.table<Student>("student.students"));

  return {
    create: (input) => createStudent(input, students),
    get: (id) => getStudent(id, students),
    list: (options) => listStudents(students, options),
    update: (id, input) => updateStudent(id, input, students),
    remove: (id) => removeStudent(id, students),
  };
}

export type {
  CreateStudentInput,
  ListStudentsOptions,
  Student,
  StudentSortDirection,
  StudentSortField,
  UpdateStudentInput,
};
