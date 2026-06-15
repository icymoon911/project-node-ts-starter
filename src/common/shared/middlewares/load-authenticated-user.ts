import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { ApiResponse, ErrorResponse } from '../utils';

const loadAuthenticatedUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = (req as any).payload?.aud as string;
    if (!userId) {
      const errorResponse = new ErrorResponse('UNAUTHORIZED', 'Unauthorized');
      ApiResponse.error(res, { success: false, error: errorResponse });
      return;
    }

    const User = mongoose.model('User');
    const user = await User.findById(userId).select('-password');

    if (!user) {
      const errorResponse = new ErrorResponse('UNAUTHORIZED', 'User not found');
      ApiResponse.error(res, { success: false, error: errorResponse });
      return;
    }

    if (!(user as any).active) {
      const errorResponse = new ErrorResponse(
        'FORBIDDEN',
        'Account is deactivated',
      );
      ApiResponse.error(res, { success: false, error: errorResponse });
      return;
    }

    (req as any).user = user;
    next();
  } catch (error) {
    const errorResponse = new ErrorResponse(
      'INTERNAL_SERVER_ERROR',
      (error as Error).message,
    );
    ApiResponse.error(res, { success: false, error: errorResponse });
  }
};

export default loadAuthenticatedUser;
