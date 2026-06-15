/* eslint-disable @typescript-eslint/no-unused-vars */
import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services';
import { ApiResponse, ErrorResponseType } from '../../../common/shared';

class UserController {
  static async createUser(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const response = await UserService.create(req.body);
      if (response.success) {
        ApiResponse.success(res, response, 201);
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
        // Strip password hashes from all returned documents
        if ('documents' in response && Array.isArray(response.documents)) {
          response.documents = response.documents.map((doc: any) => {
            const obj = doc.toObject ? doc.toObject() : { ...doc };
            delete obj.password;
            return obj;
          });
        }
        ApiResponse.success(res, response);
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
        // Strip password hash from the returned document
        if ('document' in response && response.document) {
          const doc = response.document as any;
          const obj = doc.toObject ? doc.toObject() : { ...doc };
          delete obj.password;
          (response as any).document = obj;
        }
        ApiResponse.success(res, response);
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
