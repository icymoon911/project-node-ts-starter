import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services';
import { controllerHandler } from '../../../common/shared';

class AuthController {
  static register = controllerHandler(
    (req: Request, _res: Response, _next: NextFunction) =>
      AuthService.register(req.body),
    201,
  );

  static verifyAccount = controllerHandler(
    (req: Request, _res: Response, _next: NextFunction) =>
      AuthService.verifyAccount(req.body),
  );

  static loginWithPassword = controllerHandler(
    (req: Request, _res: Response, _next: NextFunction) =>
      AuthService.loginWithPassword(req.body),
  );

  static generateLoginOtp = controllerHandler(
    (req: Request, _res: Response, _next: NextFunction) =>
      AuthService.generateLoginOtp(req.body.email),
  );

  static loginWithOtp = controllerHandler(
    (req: Request, _res: Response, _next: NextFunction) =>
      AuthService.loginWithOtp(req.body),
  );

  static refreshToken = controllerHandler(
    (req: Request, _res: Response, _next: NextFunction) =>
      AuthService.refresh(req.body.refreshToken),
  );

  static logout = controllerHandler(
    (req: Request, _res: Response, _next: NextFunction) => {
      const { accessToken, refreshToken } = req.body;
      return AuthService.logout(accessToken, refreshToken);
    },
    202,
  );

  static forgotPassword = controllerHandler(
    (req: Request, _res: Response, _next: NextFunction) =>
      AuthService.forgotPassword(req.body.email),
  );

  static resetPassword = controllerHandler(
    (req: Request, _res: Response, _next: NextFunction) =>
      AuthService.resetPassword(req.body),
  );
}

export default AuthController;
