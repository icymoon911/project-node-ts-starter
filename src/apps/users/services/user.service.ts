import { config } from '../../../core/config';
import bcrypt from 'bcrypt';
import {
  ErrorResponse,
  ErrorResponseType,
  SuccessResponseType,
  handleServiceOperation,
  isSuccessResponse,
} from '../../../common/shared';
import { IUserModel, IUserProfile } from '../types';
import { UserModel } from '../models';
import { UserRepository } from '../repositories';
import { BaseService } from '../../../core/engine';

class UserService extends BaseService<IUserModel, UserRepository> {
  constructor() {
    const userRepo = new UserRepository(UserModel);
    super(userRepo, true /*, ['profilePicture']*/);
    this.searchFields = ['firstName', 'lastName', 'email'];
  }

  async isValidPassword(
    userId: string,
    password: string,
  ): Promise<SuccessResponseType<{ isValid: boolean }> | ErrorResponseType> {
    return handleServiceOperation<{ isValid: boolean }>(async () => {
      const response = await this.findOne({ _id: userId });
      if (!isSuccessResponse(response) || !response.document) {
        throw response.error;
      }

      const isValid = await bcrypt.compare(
        password,
        response.document.password,
      );
      return { success: true, document: { isValid } };
    });
  }

  async updatePassword(
    userId: string,
    newPassword: string,
  ): Promise<SuccessResponseType<IUserModel> | ErrorResponseType> {
    return handleServiceOperation<IUserModel>(async () => {
      const response = await this.findOne({ _id: userId });
      if (!isSuccessResponse(response) || !response.document) {
        throw response.error;
      }

      const hashedPassword = await bcrypt.hash(
        newPassword,
        config.bcrypt.saltRounds,
      );
      const updateResponse = await this.update(
        { _id: userId },
        { password: hashedPassword },
      );

      if (!isSuccessResponse(updateResponse)) {
        throw updateResponse.error;
      }

      return {
        success: true,
        document: updateResponse.document,
      } as SuccessResponseType<IUserModel>;
    });
  }

  async isVerified(
    email: string,
  ): Promise<SuccessResponseType<{ verified: boolean }> | ErrorResponseType> {
    return handleServiceOperation<{ verified: boolean }>(async () => {
      const response = await this.findOne({ email });
      if (!isSuccessResponse(response) || !response.document) {
        throw response.error;
      }

      return {
        success: true,
        document: { verified: response.document.verified },
      };
    });
  }

  async markAsVerified(
    email: string,
  ): Promise<SuccessResponseType<IUserModel> | ErrorResponseType> {
    return handleServiceOperation<IUserModel>(async () => {
      const response = await this.findOne({ email });
      if (!isSuccessResponse(response) || !response.document) {
        throw response.error;
      }

      const updateResponse = await this.update(
        { _id: response.document._id },
        { verified: true },
      );

      if (!isSuccessResponse(updateResponse)) {
        throw updateResponse.error;
      }

      return {
        success: true,
        document: updateResponse.document,
      } as SuccessResponseType<IUserModel>;
    });
  }

  async getProfile(
    userId?: string,
  ): Promise<SuccessResponseType<IUserProfile> | ErrorResponseType> {
    return handleServiceOperation<IUserProfile>(async () => {
      if (!userId) {
        throw new ErrorResponse('BAD_REQUEST', 'User ID is required.');
      }

      const user = await this.findOne({ _id: userId });

      if (!isSuccessResponse(user) || !user.document) {
        throw new ErrorResponse('NOT_FOUND_ERROR', 'User not found.');
      }

      const profile: IUserProfile = {
        firstname: user.document.firstname,
        lastname: user.document.lastname,
        email: user.document.email,
        verified: user.document.verified,
        active: user.document.active,
        role: user.document.role,
        profilePhoto: user.document.profilePhoto,
      };

      return {
        success: true,
        document: profile,
      };
    });
  }
}

export default new UserService();
