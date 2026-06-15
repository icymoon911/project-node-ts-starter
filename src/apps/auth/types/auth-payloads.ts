/**
 * Strongly typed payloads for every auth action.
 *
 * Each interface mirrors the corresponding Joi schema in
 * `src/apps/auth/validators/auth.ts` so that service methods get full
 * TypeScript protection instead of `any`.
 */

export interface RegisterPayload {
  firstname: string;
  lastname: string;
  email: string;
  password: string;
  profilePhoto?: string;
}

export interface VerifyAccountPayload {
  email: string;
  code: string;
}

export interface GenerateLoginOtpPayload {
  email: string;
}

export interface LoginWithPasswordPayload {
  email: string;
  password: string;
}

export interface LoginWithOtpPayload {
  email: string;
  code: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  email: string;
  code: string;
  newPassword: string;
}

export interface RefreshPayload {
  refreshToken: string;
}

export interface LogoutPayload {
  accessToken: string;
  refreshToken: string;
}
