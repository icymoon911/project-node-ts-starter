import { generateRandomOTP } from '../../../helpers';
import {
  ErrorResponse,
  ErrorResponseType,
  MailServiceUtilities,
  SuccessResponseType,
  withServiceErrorHandling,
} from '../../../common/shared';
import { IUserModel, UserService } from '../../users';
import { OTPModel } from '../models';
import { IOTPModel, TOTPPurpose } from '../types';
import { config } from '../../../core/config';
import { BaseService } from '../../../core/engine';
import { OTPRepository } from '../repositories';

// ---------------------------------------------------------------------------
// Dependency injection
// ---------------------------------------------------------------------------

export interface IOTPServiceDeps {
  userService: typeof UserService;
  mailService: typeof MailServiceUtilities;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class OTPService extends BaseService<IOTPModel, OTPRepository> {
  private readonly deps: IOTPServiceDeps;

  constructor(deps?: Partial<IOTPServiceDeps>) {
    const otpRepo = new OTPRepository(OTPModel);
    super(otpRepo, false);
    this.deps = {
      userService: deps?.userService ?? UserService,
      mailService: deps?.mailService ?? MailServiceUtilities,
    };
  }

  async generate(
    email: string,
    purpose: TOTPPurpose,
  ): Promise<SuccessResponseType<IOTPModel> | ErrorResponseType> {
    return withServiceErrorHandling(async () => {
      const userResponse = (await this.deps.userService.findOne({
        email,
      })) as SuccessResponseType<IUserModel>;
      if (!userResponse.success || !userResponse.document) {
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

      const mailResponse = await this.deps.mailService.sendOtp({
        to: user.email,
        code: otp.code,
        purpose,
      });

      if (!mailResponse.success) {
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
    return withServiceErrorHandling(async () => {
      const userResponse = (await this.deps.userService.findOne({
        email,
      })) as SuccessResponseType<IUserModel>;
      if (!userResponse.success || !userResponse.document) {
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

export default new OTPService();
