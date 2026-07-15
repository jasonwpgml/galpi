import { MemoryTable, nextId } from "@/shared";

import { hashPassword } from "./auth.service.password";
import type { RegisterUserInput, UserRecord } from "./auth.types.auth";

export class UserRepository {
  constructor(private readonly users: MemoryTable<UserRecord>) {}

  create(input: RegisterUserInput): UserRecord {
    const normalizedEmail = input.email.trim().toLowerCase();
    if (this.findByEmail(normalizedEmail)) {
      throw new Error(`User already exists: ${normalizedEmail}`);
    }

    return this.users.insert({
      id: nextId("user"),
      email: normalizedEmail,
      displayName: input.displayName.trim(),
      passwordHash: hashPassword(input.password),
    });
  }

  findByEmail(email: string): UserRecord | undefined {
    const normalizedEmail = email.trim().toLowerCase();
    return this.users.find((user) => user.email === normalizedEmail);
  }

  findById(id: string): UserRecord | undefined {
    return this.users.get(id);
  }
}
