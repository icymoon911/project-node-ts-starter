import {
  ErrorResponse,
  ErrorResponseType,
  JwtService,
  MailServiceUtilities,
  SuccessResponseType,
  handleServiceOperation,
  isSuccessResponse,
} from '../../../common/shared';
import { config } from '../../../core/config';
import { IUserModel } from '../../users';
import {
  ILoginResult,
  ILoginWithOtpPayload,
  ILoginWithPasswordPayload,
  IOTPModel,
  IRegisterPayload,
  IRegisterResult,
  IResetPasswordPayload,
  IVerifyAccountPayload,
} from '../types';

/**
 * Interface describing the UserService methods that AuthService depends on.
 * Enables dependency injection for testing.
 */
export interface IUserServiceDependency {
  findOne(
    query: Record<string, unknown>,
  ): Promise<SuccessResponseType<IUserModel> | ErrorResponseType>;
  create(
    input: Partial<IUserModel>,
  ): Promise<SuccessResponseType<IUserModel> | ErrorResponseType>;
  markAsVerified(
    email: string,
  ): Promise<SuccessResponseType<IUserModel> | ErrorResponseType>;
  isValidPassword(
    userId: string,
    password: string,
  ): Promise<SuccessResponseType<{ isValid: boolean }> | ErrorResponseType>;
  updatePassword(
    userId: string,
    newPassword: string,
  ): Promise<SuccessResponseType<IUserModel> | ErrorResponseType>;
}

/**
 * Interface describing the OTPService methods that AuthService depends on.
 * Enables dependency injection for testing.
 */
export interface IOTPServiceDependency {
  generate(
    email: string,
    purpose: string,
  ): Promise<SuccessResponseType<IOTPModel> | ErrorResponseType>;
  validate(
    email: string,
    code: string,
    purpose: string,
  ): Promise<SuccessResponseType<null> | ErrorResponseType>;
}

class AuthService {
  private userService?: IUserServiceDependency;
  private otpService?: IOTPServiceDependency;

  constructor(
    userService?: IUserServiceDependency,
    otpService?: IOTPServiceDependency,
  ) {
    if (userService) this.userService = userService;
    if (otpService) this.otpService = otpService;
  }

  private getUserService(): IUserServiceDependency {
    if (!this.userService) {
      // Lazy-load to avoid circular dependency issues at module init time
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { UserService } = require('../../users');
      this.userService = UserService as IUserServiceDependency;
    }
    return this.userService;
  }

  private getOTPService(): IOTPServiceDependency {
    if (!this.otpService) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { OTPService } = require('.');
      this.otpService = OTPService as IOTPServiceDependency;
    }
    return this.otpService;
  }

  async register(
    payload: IRegisterPayload,
  ): Promise<SuccessResponseType<IRegisterResult> | ErrorResponseType> {
    return handleServiceOperation<IRegisterResult>(async () => {
      const { email } = payload;
      const userResponse = await this.getUserService().findOne({ email });

      if (isSuccessResponse(userResponse) && userResponse.document) {
        throw new ErrorResponse(
          'UNIQUE_FIELD_ERROR',
          'The entered email is already registered.',
        );
      }

      const createUserResponse = await this.getUserService().create(
        payload as Partial<IUserModel>,
      );

      if (
        !isSuccessResponse(createUserResponse) ||
        !createUserResponse.document
      ) {
        throw createUserResponse.error;
      }

      await MailServiceUtilities.sendAccountCreationEmail({
        to: email,
        firstname: createUserResponse.document.firstname,
      });

      const otpResponse = await this.getOTPService().generate(
        email,
        config.otp.purposes.ACCOUNT_VERIFICATION.code,
      );

      if (!isSuccessResponse(otpResponse) || !otpResponse.document) {
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
    payload: IVerifyAccountPayload,
  ): Promise<SuccessResponseType<null> | ErrorResponseType> {
    return handleServiceOperation<null>(async () => {
      const { email, code } = payload;
      const userResponse = await this.getUserService().findOne({ email });

      if (!isSuccessResponse(userResponse) || !userResponse.document) {
        throw new ErrorResponse('NOT_FOUND_ERROR', 'User not found.');
      }

      if (userResponse.document.verified) {
        return { success: true };
      }

      const validateOtpResponse = await this.getOTPService().validate(
        email,
        code,
        config.otp.purposes.ACCOUNT_VERIFICATION.code,
      );

      if (!isSuccessResponse(validateOtpResponse)) {
        throw validateOtpResponse.error;
      }

      const verifyUserResponse =
        await this.getUserService().markAsVerified(email);

      if (!isSuccessResponse(verifyUserResponse)) {
        throw verifyUserResponse.error;
      }

      return { success: true };
    });
  }

  async generateLoginOtp(
    email: string,
  ): Promise<SuccessResponseType<IOTPModel> | ErrorResponseType> {
    return handleServiceOperation<IOTPModel>(async () => {
      const userResponse = await this.getUserService().findOne({ email });

      if (!isSuccessResponse(userResponse) || !userResponse.document) {
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

      const otpResponse = await this.getOTPService().generate(
        email,
        config.otp.purposes.LOGIN_CONFIRMATION.code,
      );

      if (!isSuccessResponse(otpResponse)) {
        throw otpResponse.error;
      }

      return otpResponse as SuccessResponseType<IOTPModel>;
    });
  }

  async loginWithPassword(
    payload: ILoginWithPasswordPayload,
  ): Promise<SuccessResponseType<ILoginResult> | ErrorResponseType> {
    return handleServiceOperation<ILoginResult>(async () => {
      const { email, password } = payload;
      const userResponse = await this.getUserService().findOne({ email });

      if (!isSuccessResponse(userResponse) || !userResponse.document) {
        throw new ErrorResponse('UNAUTHORIZED', 'Invalid credentials.');
      }

      const user = userResponse.document;
      const isValidPasswordResponse =
        await this.getUserService().isValidPassword(user.id, password);

      if (
        !isSuccessResponse(isValidPasswordResponse) ||
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

      const accessToken = await JwtService.signAccessToken(user.id);
      const refreshToken = await JwtService.signRefreshToken(user.id);

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
    payload: ILoginWithOtpPayload,
  ): Promise<SuccessResponseType<ILoginResult> | ErrorResponseType> {
    return handleServiceOperation<ILoginResult>(async () => {
      const { email, code } = payload;
      const userResponse = await this.getUserService().findOne({ email });

      if (!isSuccessResponse(userResponse) || !userResponse.document) {
        throw new ErrorResponse('UNAUTHORIZED', 'Invalid credentials.');
      }

      const user = userResponse.document;

      const validateOtpResponse = await this.getOTPService().validate(
        email,
        code,
        config.otp.purposes.LOGIN_CONFIRMATION.code,
      );

      if (!isSuccessResponse(validateOtpResponse)) {
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

      const accessToken = await JwtService.signAccessToken(user.id);
      const refreshToken = await JwtService.signRefreshToken(user.id);

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
  ): Promise<
    | SuccessResponseType<{ token: { access: string; refresh: string } }>
    | ErrorResponseType
  > {
    return handleServiceOperation<{
      token: { access: string; refresh: string };
    }>(async () => {
      if (!refreshToken) {
        throw new ErrorResponse('BAD_REQUEST', 'Refresh token is required.');
      }

      const userId = await JwtService.verifyRefreshToken(refreshToken);
      const accessToken = await JwtService.signAccessToken(userId);
      const newRefreshToken = await JwtService.signRefreshToken(userId);

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
    return handleServiceOperation<null>(async () => {
      if (!refreshToken || !accessToken) {
        throw new ErrorResponse(
          'BAD_REQUEST',
          'Refresh and access token are required.',
        );
      }

      const { userId: userIdFromRefresh } =
        await JwtService.checkRefreshToken(refreshToken);
      const { userId: userIdFromAccess } =
        await JwtService.checkAccessToken(accessToken);

      if (userIdFromRefresh !== userIdFromAccess) {
        throw new ErrorResponse(
          'UNAUTHORIZED',
          'Access token does not match refresh token.',
        );
      }

      await JwtService.blacklistToken(accessToken);
      await JwtService.removeFromRedis(userIdFromRefresh);

      return { success: true };
    });
  }

  async forgotPassword(
    email: string,
  ): Promise<SuccessResponseType<null> | ErrorResponseType> {
    return handleServiceOperation<null>(async () => {
      if (!email) {
        throw new ErrorResponse('BAD_REQUEST', 'Email should be provided.');
      }

      const userResponse = await this.getUserService().findOne({ email });

      if (!isSuccessResponse(userResponse) || !userResponse.document) {
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

      const otpResponse = await this.getOTPService().generate(
        email,
        config.otp.purposes.FORGOT_PASSWORD.code,
      );

      if (!isSuccessResponse(otpResponse)) {
        throw otpResponse.error;
      }

      return { success: true };
    });
  }

  async resetPassword(
    payload: IResetPasswordPayload,
  ): Promise<SuccessResponseType<null> | ErrorResponseType> {
    return handleServiceOperation<null>(async () => {
      const { email, code, newPassword } = payload;

      const userResponse = await this.getUserService().findOne({ email });

      if (!isSuccessResponse(userResponse) || !userResponse.document) {
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

      const validateOtpResponse = await this.getOTPService().validate(
        email,
        code,
        config.otp.purposes.FORGOT_PASSWORD.code,
      );

      if (!isSuccessResponse(validateOtpResponse)) {
        throw validateOtpResponse.error;
      }

      const updatePasswordResponse = await this.getUserService().updatePassword(
        user.id,
        newPassword,
      );

      if (!isSuccessResponse(updatePasswordResponse)) {
        throw updatePasswordResponse.error;
      }

      return { success: true };
    });
  }
}

// Default singleton instance with lazy-loaded dependencies (backward-compatible)
const instance = new AuthService();
export default instance;
