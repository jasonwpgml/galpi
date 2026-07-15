import { MemoryDatabase } from "@/shared";

import { AuthenticationError, login } from "./auth.command.login";
import { currentUser } from "./auth.query.current-user";
import { UserRepository } from "./auth.repository.user";
import { TokenService } from "./auth.service.token";
import type {
  AuthSession,
  LoginInput,
  PublicUser,
  RegisterUserInput,
  UserRecord,
} from "./auth.types.auth";

export interface AuthModule {
  register(input: RegisterUserInput): PublicUser;
  login(input: LoginInput): AuthSession;
  currentUser(token: string): PublicUser | undefined;
}

export function createAuthModule(database: MemoryDatabase): AuthModule {
  const users = new UserRepository(database.table<UserRecord>("auth.users"));
  const tokens = new TokenService();

  return {
    register(input) {
      const { passwordHash: _passwordHash, ...user } = users.create(input);
      return user;
    },
    login: (input) => login(input, users, tokens),
    currentUser: (token) => currentUser(token, users, tokens),
  };
}

export { AuthenticationError };
export type { AuthSession, LoginInput, PublicUser, RegisterUserInput };
