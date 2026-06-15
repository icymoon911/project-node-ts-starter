import {
  ErrorResponse,
  ErrorResponseType,
  JwtService,
  MailServiceUtilities,
  SuccessResponseType,
  withServiceErrorHandling,
} from '../../../common/shared';
import { config } from '../../../core/config';
import { IUserModel, UserService } from '../../users';
import { IOTPModel } from '../types';
import {
  LoginWithOtpPayload,
  LoginWithPasswordPayload,
  RegisterPayload,
  ResetPasswordPayload,
  VerifyAccountPayload,
} from '../types';

// ---------------------------------------------------------------------------
// Dependency injection types
// ---------------------------------------------------------------------------

/**
 * Minimal shape of the dependencies AuthService needs.
 * Using `typeof Singleton` preserves the exact method signatures while still
 * letting tests inject mocks that satisfy the same shape.
 */
export interface IAuthServiceDeps {
  userService: typeof UserService;
  otpService: {
    generate(
      email: string,
      purpose: string,
    ): Promise<SuccessResponseType<IOTPModel> | ErrorResponseType>;
    validate(
      email: string,
      code: string,
      purpose: string,
    ): Promise<SuccessResponseType<null> | ErrorResponseType>;
  };
  jwtService: typeof JwtService;
  mailService: typeof MailServiceUtilities;
}

// ---------------------------------------------------------------------------
// Response document shapes (typed instead of `any`)
// ---------------------------------------------------------------------------

export interface IAuthTokens {
  access: string;
  refresh: string;
}

export interface ILoginDocument {
  token: IAuthTokens;
  user: IUserModel;
}

export interface IRegisterDocument {
  user: IUserModel;
  otp: IOTPModel;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class AuthService {
  private readonly deps: IAuthServiceDeps;

  constructor(deps?: Partial<IAuthServiceDeps>) {
    // Lazy-load OTPService to avoid circular import at module init time.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { default: defaultOtpService } = require('./otp.service');
    this.deps = {
      userService: deps?.userService ?? UserService,
      otpService: deps?.otpService ?? defaultOtpService,
      jwtService: deps?.jwtService ?? JwtService,
      mailService: deps?.mailService ?? MailServiceUtilities,
    };
  }

  async register(
    payload: RegisterPayload,
  ): Promise<SuccessResponseType<IRegisterDocument> | ErrorResponseType> {
    return withServiceErrorHandling(async () => {
      const { email } = payload;
      const userResponse = (await this.deps.userService.findOne({
        email,
      })) as SuccessResponseType<IUserModel>;

      if (userResponse.success && userResponse.document) {
        throw new ErrorResponse(
          'UNIQUE_FIELD_ERROR',
          'The entered email is already registered.',
        );
      }

      const createUserResponse = (await this.deps.userService.create(
        payload,
      )) as SuccessResponseType<IUserModel>;

      if (!createUserResponse.success || !createUserResponse.document) {
        throw createUserResponse.error;
      }

      await this.deps.mailService.sendAccountCreationEmail({
        to: email,
        firstname: createUserResponse.document.firstname,
      });

      const otpResponse = (await this.deps.otpService.generate(
        email,
        config.otp.purposes.ACCOUNT_VERIFICATION.code,
      )) as SuccessResponseType<IOTPModel>;

      if (!otpResponse.success || !otpResponse.document) {
        throw otpResponse.error;
      }

      return {
        success: true,
        document: {
          user: createUserResponse.document,
          otp: otpResponse.document,
        },
      };
    });
  }

  async verifyAccount(
    payload: VerifyAccountPayload,
  ): Promise<SuccessResponseType<null> | ErrorResponseType> {
    return withServiceErrorHandling(async () => {
      const { email, code } = payload;
      const userResponse = (await this.deps.userService.findOne({
        email,
      })) as SuccessResponseType<IUserModel>;

      if (!userResponse.success || !userResponse.document) {
        throw new ErrorResponse('NOT_FOUND_ERROR', 'User not found.');
      }

      if (userResponse.document.verified) {
        return { success: true };
      }

      const validateOtpResponse = await this.deps.otpService.validate(
        email,
        code,
        config.otp.purposes.ACCOUNT_VERIFICATION.code,
      );

      if (!validateOtpResponse.success) {
        throw validateOtpResponse.error;
      }

      const verifyUserResponse =
        await this.deps.userService.markAsVerified(email);

      if (!verifyUserResponse.success) {
        throw verifyUserResponse.error;
      }

      return { success: true };
    });
  }

  async generateLoginOtp(
    email: string,
  ): Promise<SuccessResponseType<IOTPModel> | ErrorResponseType> {
    return withServiceErrorHandling(async () => {
      const userResponse = (await this.deps.userService.findOne({
        email,
      })) as SuccessResponseType<IUserModel>;

      if (!userResponse.success || !userResponse.document) {
        throw new ErrorResponse('NOT_FOUND_ERROR', 'User not found.');
      }

      const user = userResponse.document;

      if (!user.verified) {
        throw new ErrorResponse('UNAUTHORIZED', 'Unverified account.');
      }

      if (!user.active) {
        throw new ErrorResponse(
          'FORBIDDEN',
          'Inactive account, please contact admins.',
        );
      }

      const otpResponse = await this.deps.otpService.generate(
        email,
        config.otp.purposes.LOGIN_CONFIRMATION.code,
      );

      if (!otpResponse.success) {
        throw otpResponse.error;
      }

      return otpResponse;
    });
  }

  async loginWithPassword(
    payload: LoginWithPasswordPayload,
  ): Promise<SuccessResponseType<ILoginDocument> | ErrorResponseType> {
    return withServiceErrorHandling(async () => {
      const { email, password } = payload;
      const userResponse = (await this.deps.userService.findOne({
        email,
      })) as SuccessResponseType<IUserModel>;

      if (!userResponse.success || !userResponse.document) {
        throw new ErrorResponse('UNAUTHORIZED', 'Invalid credentials.');
      }

      const user = userResponse.document;
      const isValidPasswordResponse =
        (await this.deps.userService.isValidPassword(
          user.id,
          password,
        )) as SuccessResponseType<{ isValid: boolean }>;

      if (
        !isValidPasswordResponse.success ||
        !isValidPasswordResponse.document?.isValid
      ) {
        throw new ErrorResponse('UNAUTHORIZED', 'Invalid credentials.');
      }

      if (!user.verified) {
        throw new ErrorResponse('UNAUTHORIZED', 'Unverified account.');
      }

      if (!user.active) {
        throw new ErrorResponse(
          'FORBIDDEN',
          'Inactive account, please contact admins.',
        );
      }

      const accessToken = await this.deps.jwtService.signAccessToken(user.id);
      const refreshToken = await this.deps.jwtService.signRefreshToken(user.id);

      return {
        success: true,
        document: {
          token: { access: accessToken, refresh: refreshToken },
          user,
        },
      };
    });
  }

  async loginWithOtp(
    payload: LoginWithOtpPayload,
  ): Promise<SuccessResponseType<ILoginDocument> | ErrorResponseType> {
    return withServiceErrorHandling(async () => {
      const { email, code } = payload;
      const userResponse = (await this.deps.userService.findOne({
        email,
      })) as SuccessResponseType<IUserModel>;

      if (!userResponse.success || !userResponse.document) {
        throw new ErrorResponse('UNAUTHORIZED', 'Invalid credentials.');
      }

      const user = userResponse.document;

      const validateOtpResponse = await this.deps.otpService.validate(
        email,
        code,
        config.otp.purposes.LOGIN_CONFIRMATION.code,
      );

      if (!validateOtpResponse.success) {
        throw validateOtpResponse.error;
      }

      if (!user.verified) {
        throw new ErrorResponse('UNAUTHORIZED', 'Unverified account.');
      }

      if (!user.active) {
        throw new ErrorResponse(
          'FORBIDDEN',
          'Inactive account, please contact admins.',
        );
      }

      const accessToken = await this.deps.jwtService.signAccessToken(user.id);
      const refreshToken = await this.deps.jwtService.signRefreshToken(user.id);

      return {
        success: true,
        document: {
          token: { access: accessToken, refresh: refreshToken },
          user,
        },
      };
    });
  }

  async refresh(
    refreshToken: string,
  ): Promise<SuccessResponseType<{ token: IAuthTokens }> | ErrorResponseType> {
    return withServiceErrorHandling(async () => {
      if (!refreshToken) {
        throw new ErrorResponse('BAD_REQUEST', 'Refresh token is required.');
      }

      const userId =
        await this.deps.jwtService.verifyRefreshToken(refreshToken);
      const accessToken = await this.deps.jwtService.signAccessToken(userId);
      const newRefreshToken =
        await this.deps.jwtService.signRefreshToken(userId);

      return {
        success: true,
        document: {
          token: { access: accessToken, refresh: newRefreshToken },
        },
      };
    });
  }

  async logout(
    accessToken: string,
    refreshToken: string,
  ): Promise<SuccessResponseType<null> | ErrorResponseType> {
    return withServiceErrorHandling(async () => {
      if (!refreshToken || !accessToken) {
        throw new ErrorResponse(
          'BAD_REQUEST',
          'Refresh and access token are required.',
        );
      }

      const { userId: userIdFromRefresh } =
        await this.deps.jwtService.checkRefreshToken(refreshToken);
      const { userId: userIdFromAccess } =
        await this.deps.jwtService.checkAccessToken(accessToken);

      if (userIdFromRefresh !== userIdFromAccess) {
        throw new ErrorResponse(
          'UNAUTHORIZED',
          'Access token does not match refresh token.',
        );
      }

      await this.deps.jwtService.blacklistToken(accessToken);
      await this.deps.jwtService.removeFromRedis(userIdFromRefresh);

      return { success: true };
    });
  }

  async forgotPassword(
    email: string,
  ): Promise<SuccessResponseType<null> | ErrorResponseType> {
    return withServiceErrorHandling(async () => {
      if (!email) {
        throw new ErrorResponse('BAD_REQUEST', 'Email should be provided.');
      }

      const userResponse = (await this.deps.userService.findOne({
        email,
      })) as SuccessResponseType<IUserModel>;

      if (!userResponse.success || !userResponse.document) {
        throw new ErrorResponse('NOT_FOUND_ERROR', 'User not found.');
      }

      const user = userResponse.document;

      if (!user.verified) {
        throw new ErrorResponse('UNAUTHORIZED', 'Unverified account.');
      }

      if (!user.active) {
        throw new ErrorResponse(
          'FORBIDDEN',
          'Inactive account, please contact admins.',
        );
      }

      const otpResponse = await this.deps.otpService.generate(
        email,
        config.otp.purposes.FORGOT_PASSWORD.code,
      );

      if (!otpResponse.success) {
        throw otpResponse.error;
      }

      return { success: true };
    });
  }

  async resetPassword(
    payload: ResetPasswordPayload,
  ): Promise<SuccessResponseType<null> | ErrorResponseType> {
    return withServiceErrorHandling(async () => {
      const { email, code, newPassword } = payload;

      const userResponse = (await this.deps.userService.findOne({
        email,
      })) as SuccessResponseType<IUserModel>;

      if (!userResponse.success || !userResponse.document) {
        throw new ErrorResponse('NOT_FOUND_ERROR', 'User not found.');
      }

      const user = userResponse.document;

      if (!user.verified) {
        throw new ErrorResponse('UNAUTHORIZED', 'Unverified account.');
      }

      if (!user.active) {
        throw new ErrorResponse(
          'FORBIDDEN',
          'Inactive account, please contact admins.',
        );
      }

      const validateOtpResponse = await this.deps.otpService.validate(
        email,
        code,
        config.otp.purposes.FORGOT_PASSWORD.code,
      );

      if (!validateOtpResponse.success) {
        throw validateOtpResponse.error;
      }

      const updatePasswordResponse = await this.deps.userService.updatePassword(
        user.id,
        newPassword,
      );

      if (!updatePasswordResponse.success) {
        throw updatePasswordResponse.error;
      }

      return { success: true };
    });
  }
}

export default new AuthService();
