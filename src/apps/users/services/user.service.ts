import { config } from '../../../core/config';
import bcrypt from 'bcrypt';
import {
  ErrorResponse,
  ErrorResponseType,
  JwtService,
  SuccessResponseType,
} from '../../../common/shared';
import { IUserModel, TUserRole } from '../types';
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

  sanitizeUser(user: any): Record<string, any> {
    if (!user) return user;
    const userObj = user.toObject ? user.toObject() : { ...user };
    delete userObj.password;
    return userObj;
  }

  sanitizeUsers(users: any[]): Record<string, any>[] {
    return users.map((user) => this.sanitizeUser(user));
  }

  async updateRole(
    targetUserId: string,
    newRole: TUserRole,
    adminUserId: string,
  ): Promise<SuccessResponseType<IUserModel> | ErrorResponseType> {
    try {
      if (targetUserId === adminUserId) {
        throw new ErrorResponse(
          'FORBIDDEN',
          'Admins cannot modify their own role.',
        );
      }

      const targetUser = (await this.findOne({
        _id: targetUserId,
      })) as SuccessResponseType<IUserModel>;

      if (!targetUser.success || !targetUser.document) {
        throw new ErrorResponse('NOT_FOUND_ERROR', 'Target user not found.');
      }

      const oldRole = targetUser.document.role;

      const updateResponse = (await this.update(
        { _id: targetUserId },
        { role: newRole },
      )) as SuccessResponseType<IUserModel>;

      if (!updateResponse.success) {
        throw updateResponse.error;
      }

      return {
        success: true,
        document: {
          ...this.sanitizeUser(updateResponse.document),
          _previousRole: oldRole,
        } as any,
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

  async deactivateUser(
    userId: string,
    adminUserId: string,
  ): Promise<SuccessResponseType<IUserModel> | ErrorResponseType> {
    try {
      if (userId === adminUserId) {
        throw new ErrorResponse(
          'FORBIDDEN',
          'Admins cannot deactivate themselves.',
        );
      }

      const user = (await this.findOne({
        _id: userId,
      })) as SuccessResponseType<IUserModel>;

      if (!user.success || !user.document) {
        throw new ErrorResponse('NOT_FOUND_ERROR', 'User not found.');
      }

      const updateResponse = (await this.update(
        { _id: userId },
        { active: false },
      )) as SuccessResponseType<IUserModel>;

      if (!updateResponse.success) {
        throw updateResponse.error;
      }

      // Invalidate all sessions for the deactivated user
      await JwtService.invalidateUserSessions(userId);

      return {
        success: true,
        document: this.sanitizeUser(updateResponse.document) as any,
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

  async deleteUser(
    userId: string,
    adminUserId: string,
  ): Promise<SuccessResponseType<IUserModel> | ErrorResponseType> {
    try {
      if (userId === adminUserId) {
        throw new ErrorResponse(
          'FORBIDDEN',
          'Admins cannot delete themselves.',
        );
      }

      const user = (await this.findOne({
        _id: userId,
      })) as SuccessResponseType<IUserModel>;

      if (!user.success || !user.document) {
        throw new ErrorResponse('NOT_FOUND_ERROR', 'User not found.');
      }

      const deleteResponse = (await this.delete(
        { _id: userId },
        true,
      )) as SuccessResponseType<IUserModel>;

      if (!deleteResponse.success) {
        throw deleteResponse.error;
      }

      // Invalidate all sessions for the deleted user
      await JwtService.invalidateUserSessions(userId);

      return {
        success: true,
        document: this.sanitizeUser(deleteResponse.document) as any,
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

  async createUserByAdmin(
    input: Partial<IUserModel>,
    _adminUserId: string,
  ): Promise<SuccessResponseType<IUserModel> | ErrorResponseType> {
    try {
      // Prevent creating a user with admin role that could be used for self-demotion workaround
      // Also ensure admin can't accidentally set role to guest for themselves (not applicable here since creating new user)
      const response = (await this.create(
        input,
      )) as SuccessResponseType<IUserModel>;
      if (!response.success || !response.document) {
        throw response.error;
      }

      return {
        success: true,
        document: this.sanitizeUser(response.document) as any,
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
