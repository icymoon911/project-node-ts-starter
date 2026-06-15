import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from './api-reponse';
import { ErrorResponseType } from '../../types';

/**
 * Wraps an async controller handler with standardized error handling
 * and response formatting.
 *
 * Controller methods only need to call the service and return the result;
 * this wrapper handles success/error response formatting and HTTP status codes.
 *
 * @param handler - The async function that performs the controller logic
 * @param statusCode - HTTP status code for successful responses (default: 200)
 */
export function controllerHandler(
  handler: (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => Promise<{ success: boolean; [key: string]: unknown }>,
  statusCode = 200,
): (req: Request, res: Response, next: NextFunction) => Promise<void> {
  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const response = await handler(req, res, next);
      // If headers already sent (e.g. streaming), skip response formatting
      if (res.headersSent) return;

      if (response.success) {
        ApiResponse.success(
          res,
          response as Parameters<typeof ApiResponse.success>[1],
          statusCode,
        );
      } else {
        ApiResponse.error(res, response as unknown as ErrorResponseType);
      }
    } catch (error) {
      if (res.headersSent) return;
      ApiResponse.error(res, error as ErrorResponseType);
    }
  };
}
