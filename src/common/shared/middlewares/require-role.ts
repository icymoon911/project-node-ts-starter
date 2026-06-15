import { Request, Response, NextFunction } from 'express';
import { ApiResponse, ErrorResponse } from '../utils';
const requireRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as any).user;

    if (!user) {
      const errorResponse = new ErrorResponse(
        'UNAUTHORIZED',
        'User context not loaded. Ensure loadAuthenticatedUser middleware is applied.',
      );
      ApiResponse.error(res, { success: false, error: errorResponse });
      return;
    }

    if (!allowedRoles.includes(user.role)) {
      const errorResponse = new ErrorResponse(
        'FORBIDDEN',
        'Insufficient permissions',
        [
          `This action requires one of the following roles: ${allowedRoles.join(', ')}`,
        ],
      );
      ApiResponse.error(res, { success: false, error: errorResponse });
      return;
    }

    next();
  };
};

export default requireRole;
