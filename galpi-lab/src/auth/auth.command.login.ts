import { verifyPassword } from "./auth.service.password";
import type { TokenService } from "./auth.service.token";
import type { LoginInput, AuthSession, PublicUser } from "./auth.types.auth";
import type { UserRepository } from "./auth.repository.user";

export class AuthenticationError extends Error {
  constructor() {
    super("Invalid email or password");
    this.name = "AuthenticationError";
  }
}

export function login(
  input: LoginInput,
  users: UserRepository,
  tokens: TokenService,
): AuthSession {
  const user = users.findByEmail(input.email);
  if (!user || !verifyPassword(input.password, user.passwordHash)) {
    throw new AuthenticationError();
  }

  const { passwordHash: _passwordHash, ...publicUser } = user;
  return {
    token: tokens.issue(user.id),
    user: publicUser satisfies PublicUser,
  };
}
