export interface Student {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface CreateStudentInput {
  name: string;
  email: string;
}

export interface UpdateStudentInput {
  name?: string;
  email?: string;
}

export type StudentSortField = "name" | "createdAt";

export type StudentSortDirection = "asc" | "desc";

export interface ListStudentsOptions {
  sortBy: StudentSortField;
  direction?: StudentSortDirection;
}
