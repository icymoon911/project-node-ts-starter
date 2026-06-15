import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services';
import { controllerHandler } from '../../../common/shared';

/**
 * Typed interface for the JWT payload attached to the request by the
 * authentication middleware.
 */
interface IAuthenticatedRequest extends Request {
  payload?: { aud?: string };
}

class UserController {
  static createUser = controllerHandler(
    (req: Request, _res: Response, _next: NextFunction) =>
      UserService.create(req.body),
    201,
  );

  static getAllUsers = controllerHandler(
    (req: Request, _res: Response, _next: NextFunction) =>
      UserService.findAll(req.query),
  );

  static getUserById = controllerHandler(
    (req: Request, _res: Response, _next: NextFunction) =>
      UserService.findOne({ _id: req.params.id }),
  );

  static getCurrentUser = controllerHandler(
    (req: Request, _res: Response, _next: NextFunction) => {
      const userId = (req as IAuthenticatedRequest).payload?.aud;
      return UserService.getProfile(userId);
    },
  );
}

export default UserController;
