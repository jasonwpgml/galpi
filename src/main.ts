import { createAuthModule } from "@/auth";
import { createLessonModule } from "@/lesson";
import { MemoryDatabase } from "@/shared";
import { createStudentModule } from "@/student";

const database = new MemoryDatabase();
const auth = createAuthModule(database);
const students = createStudentModule(database);
const lessons = createLessonModule(database, students);

auth.register({
  email: "teacher@galpi.local",
  displayName: "Galpi Teacher",
  password: "phase-zero-demo",
});

const session = auth.login({
  email: "teacher@galpi.local",
  password: "phase-zero-demo",
});
const student = students.create({ name: "Mina", email: "mina@example.com" });
const lesson = lessons.create({ title: "Finding Your Bearings", capacity: 12 });
const enrollment = lessons.enroll(lesson.id, student.id);

console.log(
  JSON.stringify(
    {
      signedInAs: session.user,
      student,
      lesson: enrollment,
    },
    null,
    2,
  ),
);
