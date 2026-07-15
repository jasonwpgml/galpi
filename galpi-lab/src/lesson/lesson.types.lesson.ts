export interface Lesson {
  id: string;
  title: string;
  capacity: number;
  enrolledStudentIds: string[];
}

export interface CreateLessonInput {
  title: string;
  capacity: number;
}

export interface UpdateLessonInput {
  title?: string;
  capacity?: number;
}
