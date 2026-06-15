import { Request, Response, NextFunction } from 'express';
import { OTPService } from '../services';
import { controllerHandler } from '../../../common/shared';

class OTPController {
  static generateOTP = controllerHandler(
    (req: Request, _res: Response, _next: NextFunction) => {
      const { email, purpose } = req.body;
      return OTPService.generate(email, purpose);
    },
    201,
  );

  static validateOTP = controllerHandler(
    (req: Request, _res: Response, _next: NextFunction) => {
      const { email, code, purpose } = req.body;
      return OTPService.validate(email, code, purpose);
    },
  );
}

export default OTPController;
