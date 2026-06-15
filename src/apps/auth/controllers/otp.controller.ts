import { OTPService } from '../services';
import { controllerWrapper, HTTP_STATUS } from '../../../common/shared';

class OTPController {
  static generateOTP = controllerWrapper((req) => {
    const { email, purpose } = req.body;
    return OTPService.generate(email, purpose);
  }, HTTP_STATUS.CREATED);

  static validateOTP = controllerWrapper((req) => {
    const { email, code, purpose } = req.body;
    return OTPService.validate(email, code, purpose);
  });
}

export default OTPController;
