/**
 * Types for AuthService method parameters.
 * These correspond to the Joi validation schemas in validators/auth.ts.
 */

export interface IRegisterPayload {
  firstname: string;
  lastname: string;
  email: string;
  password: string;
  profilePhoto?: string;
}

export interface IVerifyAccountPayload {
  email: string;
  code: string;
}

export interface ILoginWithPasswordPayload {
  email: string;
  password: string;
}

export interface ILoginWithOtpPayload {
  email: string;
  code: string;
}

export interface IResetPasswordPayload {
  email: string;
  code: string;
  newPassword: string;
}

export interface ILogoutPayload {
  accessToken: string;
  refreshToken: string;
}

export interface IRefreshPayload {
  refreshToken: string;
}

export interface ITokenPair {
  access: string;
  refresh: string;
}

export interface ILoginResult {
  token: ITokenPair;
  user: import('../../users/types').IUserModel;
}

export interface IRegisterResult {
  user: import('../../users/types').IUserModel;
  otp: import('../types/otp').IOTPModel;
}
