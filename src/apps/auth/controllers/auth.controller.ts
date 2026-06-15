import { AuthService } from '../services';
import { controllerWrapper, HTTP_STATUS } from '../../../common/shared';

class AuthController {
  static register = controllerWrapper(
    (req) => AuthService.register(req.body),
    HTTP_STATUS.CREATED,
  );

  static verifyAccount = controllerWrapper((req) =>
    AuthService.verifyAccount(req.body),
  );

  static loginWithPassword = controllerWrapper((req) =>
    AuthService.loginWithPassword(req.body),
  );

  static generateLoginOtp = controllerWrapper((req) =>
    AuthService.generateLoginOtp(req.body.email),
  );

  static loginWithOtp = controllerWrapper((req) =>
    AuthService.loginWithOtp(req.body),
  );

  static refreshToken = controllerWrapper((req) =>
    AuthService.refresh(req.body.refreshToken),
  );

  static logout = controllerWrapper((req) => {
    const { accessToken, refreshToken } = req.body;
    return AuthService.logout(accessToken, refreshToken);
  }, HTTP_STATUS.ACCEPTED);

  static forgotPassword = controllerWrapper((req) =>
    AuthService.forgotPassword(req.body.email),
  );

  static resetPassword = controllerWrapper((req) =>
    AuthService.resetPassword(req.body),
  );
}

export default AuthController;
