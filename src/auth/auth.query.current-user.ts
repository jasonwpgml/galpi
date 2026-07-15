import type { TokenService } from "./auth.service.token";
import type { PublicUser } from "./auth.types.auth";
import type { UserRepository } from "./auth.repository.user";

export function currentUser(
  token: string,
  users: UserRepository,
  tokens: TokenService,
): PublicUser | undefined {
  const userId = tokens.resolve(token);
  if (!userId) {
    return undefined;
  }

  const user = users.findById(userId);
  if (!user) {
    return undefined;
  }

  const { passwordHash: _passwordHash, ...publicUser } = user;
  return publicUser;
}
