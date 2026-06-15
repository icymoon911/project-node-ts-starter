/* eslint-disable @typescript-eslint/no-unused-vars */
import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services';
import {
  ApiResponse,
  ErrorResponseType,
  SuccessResponseType,
} from '../../../common/shared';
import { IUserModel } from '../types';

class UserController {
  /**
   * Strip the password field from a user document before sending it to the client.
   * This prevents password hashes from leaking in API responses while leaving
   * internal service calls (e.g. login flow) unaffected.
   */
  private static sanitizeUser(doc: any): any {
    if (!doc) return doc;
    const obj =
      typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
    delete obj.password;
    return obj;
  }

  static async createUser(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const response = await UserService.create(req.body);
      if (response.success) {
        const successResponse = response as SuccessResponseType<IUserModel>;
        // Strip password hash from the response for security
        if (successResponse.document) {
          successResponse.document = UserController.sanitizeUser(
            successResponse.document,
          );
        }
        ApiResponse.success(res, successResponse, 201);
      } else {
        throw response;
      }
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
      const response = await UserService.findAll(req.query);
      if (response.success) {
        const successResponse = response as SuccessResponseType<IUserModel>;
        // Strip password hash from every user in the list
        if (successResponse.documents) {
          successResponse.documents = successResponse.documents.map(
            (doc: any) => UserController.sanitizeUser(doc),
          );
        }
        ApiResponse.success(res, successResponse);
      } else {
        throw response;
      }
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
      const userId = req.params.id;
      const response = await UserService.findOne({
        _id: userId,
      });

      if (response.success) {
        const successResponse = response as SuccessResponseType<IUserModel>;
        // Strip password hash from the response for security
        if (successResponse.document) {
          successResponse.document = UserController.sanitizeUser(
            successResponse.document,
          );
        }
        ApiResponse.success(res, successResponse);
      } else {
        throw response;
      }
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
}

export default UserController;
