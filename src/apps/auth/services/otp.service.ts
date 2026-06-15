import { generateRandomOTP } from '../../../helpers';
import {
  ErrorResponse,
  ErrorResponseType,
  MailServiceUtilities,
  SuccessResponseType,
  handleServiceOperation,
  isSuccessResponse,
} from '../../../common/shared';
import { IUserModel } from '../../users';
import { OTPModel } from '../models';
import { IOTPModel, TOTPPurpose } from '../types';
import { config } from '../../../core/config';
import { BaseService } from '../../../core/engine';
import { OTPRepository } from '../repositories';

/**
 * Interface describing the UserService methods that OTPService depends on.
 * Enables dependency injection for testing.
 */
export interface IUserServiceForOTP {
  findOne(
    query: Record<string, unknown>,
  ): Promise<SuccessResponseType<IUserModel> | ErrorResponseType>;
}

class OTPService extends BaseService<IOTPModel, OTPRepository> {
  private userService?: IUserServiceForOTP;

  constructor(userService?: IUserServiceForOTP) {
    const otpRepo = new OTPRepository(OTPModel);
    super(otpRepo, false);
    if (userService) this.userService = userService;
  }

  private getUserService(): IUserServiceForOTP {
    if (!this.userService) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { UserService } = require('../../users');
      this.userService = UserService as IUserServiceForOTP;
    }
    return this.userService;
  }

  async generate(
    email: string,
    purpose: TOTPPurpose,
  ): Promise<SuccessResponseType<IOTPModel> | ErrorResponseType> {
    return handleServiceOperation<IOTPModel>(async () => {
      const userResponse = await this.getUserService().findOne({ email });
      if (!isSuccessResponse(userResponse) || !userResponse.document) {
        throw userResponse.error;
      }

      const user = userResponse.document;
      await this.repository.invalidateOldCodes(user.id, purpose);

      const otp = await this.repository.create({
        code: generateRandomOTP(config.otp.length),
        expiresAt: new Date(Date.now() + config.otp.expiration),
        user: user.id,
        purpose,
      });

      const mailResponse = await MailServiceUtilities.sendOtp({
        to: user.email,
        code: otp.code,
        purpose,
      });

      if (!isSuccessResponse(mailResponse)) {
        throw mailResponse.error;
      }

      return { success: true, document: otp };
    });
  }

  async validate(
    email: string,
    code: string,
    purpose: TOTPPurpose,
  ): Promise<SuccessResponseType<null> | ErrorResponseType> {
    return handleServiceOperation<null>(async () => {
      const userResponse = await this.getUserService().findOne({ email });
      if (!isSuccessResponse(userResponse) || !userResponse.document) {
        throw new ErrorResponse('NOT_FOUND_ERROR', 'User not found.');
      }

      const user = userResponse.document;
      const otpResponse = await this.repository.findValidCodeByUser(
        code,
        user.id,
        purpose,
      );

      const invalidOtpError = new ErrorResponse(
        'UNAUTHORIZED',
        'This OTP code is invalid or has expired.',
      );

      if (!otpResponse) {
        throw invalidOtpError;
      }

      const otp = otpResponse;
      if (await this.repository.isExpired(otp)) {
        throw invalidOtpError;
      }

      await this.repository.markAsUsed(otp.id);

      return { success: true };
    });
  }
}

// Default singleton instance with lazy-loaded dependencies (backward-compatible)
const instance = new OTPService();
export default instance;
