import { config } from '../../../core/config';
import bcrypt from 'bcrypt';
import {
  ErrorResponse,
  ErrorResponseType,
  SuccessResponseType,
  withServiceErrorHandling,
} from '../../../common/shared';
import { IUserModel, IUserProfile } from '../types';
import { UserModel } from '../models';
import { UserRepository } from '../repositories';
import { BaseService } from '../../../core/engine';

export class UserService extends BaseService<IUserModel, UserRepository> {
  constructor() {
    const userRepo = new UserRepository(UserModel);
    super(userRepo, true /*, ['profilePicture']*/);
    this.searchFields = ['firstName', 'lastName', 'email'];
  }

  async isValidPassword(
    userId: string,
    password: string,
  ): Promise<SuccessResponseType<{ isValid: boolean }> | ErrorResponseType> {
    return withServiceErrorHandling(async () => {
      const response = (await this.findOne({
        _id: userId,
      })) as SuccessResponseType<IUserModel>;
      if (!response.success || !response.document) {
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
    return withServiceErrorHandling(async () => {
      const response = (await this.findOne({
        _id: userId,
      })) as SuccessResponseType<IUserModel>;
      if (!response.success || !response.document) {
        throw response.error;
      }

      const hashedPassword = await bcrypt.hash(
        newPassword,
        config.bcrypt.saltRounds,
      );
      const updateResponse = (await this.update(
        { _id: userId },
        { password: hashedPassword },
      )) as SuccessResponseType<IUserModel>;

      if (!updateResponse.success) {
        throw updateResponse.error;
      }

      return {
        success: true,
        document: updateResponse.document,
      };
    });
  }

  async isVerified(
    email: string,
  ): Promise<SuccessResponseType<{ verified: boolean }> | ErrorResponseType> {
    return withServiceErrorHandling(async () => {
      const response = (await this.findOne({
        email,
      })) as SuccessResponseType<IUserModel>;
      if (!response.success || !response.document) {
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
    return withServiceErrorHandling(async () => {
      const response = (await this.findOne({
        email,
      })) as SuccessResponseType<IUserModel>;
      if (!response.success || !response.document) {
        throw response.error;
      }

      const updateResponse = (await this.update(
        { _id: response.document._id },
        { verified: true },
      )) as SuccessResponseType<IUserModel>;

      if (!updateResponse.success) {
        throw updateResponse.error;
      }

      return {
        success: true,
        document: updateResponse.document,
      };
    });
  }

  async getProfile(
    userId?: string,
  ): Promise<SuccessResponseType<IUserProfile> | ErrorResponseType> {
    return withServiceErrorHandling(async () => {
      if (!userId) {
        throw new ErrorResponse('BAD_REQUEST', 'User ID is required.');
      }

      const user = (await this.findOne({
        _id: userId,
      })) as SuccessResponseType<IUserModel>;

      if (!user.success || !user.document) {
        throw new ErrorResponse('NOT_FOUND_ERROR', 'User not found.');
      }

      const doc = user.document;

      const profile: IUserProfile = {
        firstname: doc.firstname,
        lastname: doc.lastname,
        email: doc.email,
        role: doc.role,
        profilePhoto: doc.profilePhoto,
        verified: doc.verified,
        active: doc.active,
      };

      return {
        success: true,
        document: profile,
      };
    });
  }
}

export default new UserService();
