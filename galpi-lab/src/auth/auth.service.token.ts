import { randomBytes } from "node:crypto";

export class TokenService {
  private readonly userIdsByToken = new Map<string, string>();

  issue(userId: string): string {
    const token = randomBytes(24).toString("base64url");
    this.userIdsByToken.set(token, userId);
    return token;
  }

  resolve(token: string): string | undefined {
    return this.userIdsByToken.get(token);
  }
}
