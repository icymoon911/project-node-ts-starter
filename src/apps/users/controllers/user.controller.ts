import { UserService } from '../services';
import { controllerWrapper, HTTP_STATUS } from '../../../common/shared';

class UserController {
  static createUser = controllerWrapper(
    (req) => UserService.create(req.body),
    HTTP_STATUS.CREATED,
  );

  static getAllUsers = controllerWrapper((req) =>
    UserService.findAll(req.query),
  );

  static getUserById = controllerWrapper((req) =>
    UserService.findOne({ _id: req.params.id }),
  );

  static getCurrentUser = controllerWrapper((req) => {
    const userId = req.payload?.aud as string | undefined;
    return UserService.getProfile(userId);
  });
}

export default UserController;
