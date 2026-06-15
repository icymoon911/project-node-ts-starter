import { Request, Response, NextFunction } from 'express';
import { ErrorResponseType, SuccessResponseType } from '../../types';
import { ApiResponse } from './api-reponse';

/**
 * A function that extracts the necessary input from an Express `Request`
 * and invokes a service method, returning the standard service response union.
 */
export type ServiceHandler<T = unknown> = (
  req: Request,
) => Promise<SuccessResponseType<T> | ErrorResponseType>;

/**
 * Wraps a service invocation with standardized controller boilerplate:
 * - calls the handler with the request
 * - on success: formats via `ApiResponse.success` with the given status code
 * - on failure (service returned `{ success: false }` or threw): formats via `ApiResponse.error`
 *
 * Controller methods become a single line:
 *
 * @example
 * class AuthController {
 *   static register = controllerWrapper(
 *     (req) => AuthService.register(req.body),
 *     HTTP_STATUS.CREATED,
 *   );
 * }
 */
export function controllerWrapper<T = unknown>(
  handler: ServiceHandler<T>,
  successStatusCode = 200,
): (req: Request, res: Response, next: NextFunction) => Promise<void> {
  return async (req: Request, res: Response, _next: NextFunction) => {
    try {
      const response = await handler(req);
      if (response.success) {
        ApiResponse.success(res, response, successStatusCode);
      } else {
        throw response;
      }
    } catch (error) {
      ApiResponse.error(res, error as ErrorResponseType);
    }
  };
}

export default controllerWrapper;
