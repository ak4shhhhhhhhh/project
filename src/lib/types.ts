export type AuthMode = "login" | "signup";

export interface AuthFormValues {
  email: string;
  password: string;
}

export interface AppError {
  message: string;
}

export type AccessStatus = "loading" | "owner" | "pending" | "denied" | "error";
