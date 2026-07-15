import assert from "node:assert/strict";
import test from "node:test";

import { AuthenticationError, createAuthModule } from "@/auth";
import { MemoryDatabase } from "@/shared";

test("login creates a session that resolves to the current user", () => {
  const auth = createAuthModule(new MemoryDatabase());
  const registered = auth.register({
    email: "teacher@example.com",
    displayName: "Teacher Kim",
    password: "correct horse battery staple",
  });

  const session = auth.login({
    email: "TEACHER@example.com",
    password: "correct horse battery staple",
  });

  assert.equal(session.user.id, registered.id);
  assert.deepEqual(auth.currentUser(session.token), registered);
});

test("login rejects an invalid password without exposing which field failed", () => {
  const auth = createAuthModule(new MemoryDatabase());
  auth.register({
    email: "teacher@example.com",
    displayName: "Teacher Kim",
    password: "right-password",
  });

  assert.throws(
    () => auth.login({ email: "teacher@example.com", password: "wrong-password" }),
    AuthenticationError,
  );
});
