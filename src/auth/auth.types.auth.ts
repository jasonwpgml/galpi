export interface UserRecord {
  id: string;
  email: string;
  displayName: string;
  passwordHash: string;
}

export type PublicUser = Omit<UserRecord, "passwordHash">;

export interface AuthSession {
  token: string;
  user: PublicUser;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterUserInput {
  email: string;
  displayName: string;
  password: string;
}
