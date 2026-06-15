/* eslint-disable @typescript-eslint/no-unused-vars */
import { Request, Response, NextFunction } from 'express';
import { AuditLogService, UserService } from '../services';
import {
  ApiResponse,
  ErrorResponseType,
  SuccessResponseType,
} from '../../../common/shared';
import { IUserModel } from '../types';

class UserController {
  static async createUser(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const adminUser = req.user!;
      const response = (await UserService.createUserByAdmin(
        req.body,
        adminUser._id || adminUser.id,
      )) as SuccessResponseType<IUserModel>;
      if (!response.success) {
        throw response;
      }
      // Log audit
      await AuditLogService.logAction(
        'USER_CREATED',
        adminUser._id || adminUser.id,
        (response.document as any)?._id || (response.document as any)?.id || '',
        { email: req.body.email, role: req.body.role || 'user' },
      );
      ApiResponse.success(res, response, 201);
    } catch (error) {
      ApiResponse.error(res, error as ErrorResponseType);
    }
  }

  static async getAllUsers(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const response = (await UserService.findAll(
        req.query,
      )) as SuccessResponseType<IUserModel>;
      if (!response.success) {
        throw response;
      }
      // Strip password from all users in the list
      if (response.documents) {
        response.documents = UserService.sanitizeUsers(
          response.documents,
        ) as any;
      }
      ApiResponse.success(res, response);
    } catch (error) {
      ApiResponse.error(res, error as ErrorResponseType);
    }
  }

  static async getUserById(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const requestedUserId = req.params.id;
      const currentUser = req.user!;
      const currentUserId = currentUser._id || currentUser.id;

      // Non-admin users can only view their own profile
      if (currentUser.role !== 'admin' && requestedUserId !== currentUserId) {
        ApiResponse.error(res, {
          success: false,
          error: {
            statusCode: 403,
            message: 'Forbidden',
            suggestions: ['You can only view your own profile.'],
          } as any,
        });
        return;
      }

      const response = (await UserService.findOne({
        _id: requestedUserId,
      })) as SuccessResponseType<IUserModel>;

      if (!response.success) {
        throw response;
      }

      // Strip password from the response
      if (response.document) {
        response.document = UserService.sanitizeUser(response.document) as any;
      }
      ApiResponse.success(res, response);
    } catch (error) {
      ApiResponse.error(res, error as ErrorResponseType);
    }
  }

  static async getCurrentUser(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const userId = (req as any).payload?.aud as string;
      const response = await UserService.getProfile(userId);

      if (response.success) {
        ApiResponse.success(res, response);
      } else {
        throw response;
      }
    } catch (error) {
      ApiResponse.error(res, error as ErrorResponseType);
    }
  }

  static async updateUserRole(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const adminUser = req.user!;
      const adminUserId = adminUser._id || adminUser.id;
      const targetUserId = req.params.id;
      const { role } = req.body;

      const response = (await UserService.updateRole(
        targetUserId,
        role,
        adminUserId,
      )) as SuccessResponseType<IUserModel>;

      if (!response.success) {
        throw response;
      }

      const previousRole = (response.document as any)?._previousRole;
      // Clean up the temporary _previousRole field from response
      if (response.document && (response.document as any)._previousRole) {
        delete (response.document as any)._previousRole;
      }

      // Log audit
      await AuditLogService.logAction(
        'ROLE_CHANGED',
        adminUserId,
        targetUserId,
        { oldRole: previousRole, newRole: role },
      );

      ApiResponse.success(res, response);
    } catch (error) {
      ApiResponse.error(res, error as ErrorResponseType);
    }
  }

  static async deactivateUser(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const adminUser = req.user!;
      const adminUserId = adminUser._id || adminUser.id;
      const targetUserId = req.params.id;

      const response = (await UserService.deactivateUser(
        targetUserId,
        adminUserId,
      )) as SuccessResponseType<IUserModel>;

      if (!response.success) {
        throw response;
      }

      // Log audit
      await AuditLogService.logAction(
        'USER_DEACTIVATED',
        adminUserId,
        targetUserId,
        { email: (response.document as any)?.email },
      );

      ApiResponse.success(res, response);
    } catch (error) {
      ApiResponse.error(res, error as ErrorResponseType);
    }
  }

  static async deleteUser(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const adminUser = req.user!;
      const adminUserId = adminUser._id || adminUser.id;
      const targetUserId = req.params.id;

      const response = (await UserService.deleteUser(
        targetUserId,
        adminUserId,
      )) as SuccessResponseType<IUserModel>;

      if (!response.success) {
        throw response;
      }

      // Log audit
      await AuditLogService.logAction(
        'USER_DELETED',
        adminUserId,
        targetUserId,
        { email: (response.document as any)?.email },
      );

      ApiResponse.success(res, response);
    } catch (error) {
      ApiResponse.error(res, error as ErrorResponseType);
    }
  }
}

export default UserController;
