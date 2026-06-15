import bcrypt from 'bcrypt';
import {
  ErrorResponse,
  ErrorResponseType,
  SuccessResponseType,
} from '../../../common/shared';
import { IUserModel } from '../types';
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
    try {
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
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof ErrorResponse
            ? error
            : new ErrorResponse('UNKNOWN_ERROR', (error as Error).message),
      };
    }
  }

  async updatePassword(
    userId: string,
    newPassword: string,
  ): Promise<SuccessResponseType<IUserModel> | ErrorResponseType> {
    try {
      // Fetch the actual Mongoose document so we can use .save()
      // which triggers the pre('save') hook for exactly-once password hashing.
      // Previously this method manually hashed with bcrypt then called this.update()
      // (which uses findOneAndUpdate), risking double-hashing if the pre('save')
      // hook also fired — leaving the user unable to log in.
      const user = await this.repository.findOne({ _id: userId });
      if (!user) {
        throw new ErrorResponse('NOT_FOUND_ERROR', 'User not found.');
      }

      // Set plain-text password; the pre('save') hook on the User schema
      // will detect the modified password field and hash it exactly once.
      user.password = newPassword;
      const updatedUser = await user.save();

      return {
        success: true,
        document: updatedUser,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof ErrorResponse
            ? error
            : new ErrorResponse('UNKNOWN_ERROR', (error as Error).message),
      };
    }
  }

  async isVerified(
    email: string,
  ): Promise<SuccessResponseType<{ verified: boolean }> | ErrorResponseType> {
    try {
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
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof ErrorResponse
            ? error
            : new ErrorResponse('UNKNOWN_ERROR', (error as Error).message),
      };
    }
  }

  async markAsVerified(
    email: string,
  ): Promise<SuccessResponseType<IUserModel> | ErrorResponseType> {
    try {
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
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof ErrorResponse
            ? error
            : new ErrorResponse('UNKNOWN_ERROR', (error as Error).message),
      };
    }
  }

  async getProfile(
    userId?: string | undefined,
  ): Promise<SuccessResponseType<IUserModel> | ErrorResponseType> {
    try {
      if (!userId) {
        throw new ErrorResponse('BAD_REQUEST', 'User ID is required.');
      }

      const user = (await this.findOne({
        _id: userId,
      })) as SuccessResponseType<IUserModel>;

      if (!user.success || !user.document) {
        throw new ErrorResponse('NOT_FOUND_ERROR', 'User not found.');
      }

      return {
        success: true,
        document: {
          firstname: user.document.firstname,
          lastname: user.document.lastname,
          email: user.document.email,
          verified: user.document.verified,
          active: user.document.active,
          role: user.document.role,
        } as any, // As we are not sending user password, we need to mention any here to avoid type check error
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof ErrorResponse
            ? error
            : new ErrorResponse(
                'INTERNAL_SERVER_ERROR',
                (error as Error).message,
              ),
      };
    }
  }
}

export default new UserService();
