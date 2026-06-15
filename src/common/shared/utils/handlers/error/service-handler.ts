import ErrorResponse from './response';
import { ErrorResponseType, SuccessResponseType } from '../../../types';

/**
 * Wraps an async service function with standardized error handling.
 *
 * Any `ErrorResponse` thrown is returned as-is inside an `ErrorResponseType`.
 * Any other error is wrapped in an `INTERNAL_SERVER_ERROR` `ErrorResponse`.
 *
 * Service methods only need to focus on business logic and `throw` on failure.
 *
 * @example
 * async register(payload: RegisterPayload) {
 *   return withServiceErrorHandling(async () => {
 *     // business logic that may throw
 *     return { success: true, document: result };
 *   });
 * }
 */
export async function withServiceErrorHandling<T>(
  fn: () => Promise<SuccessResponseType<T> | ErrorResponseType>,
): Promise<SuccessResponseType<T> | ErrorResponseType> {
  try {
    return await fn();
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof ErrorResponse
          ? error
          : new ErrorResponse(
              'INTERNAL_SERVER_ERROR',
              (error as Error).message,
            ),
    };
  }
}

export default withServiceErrorHandling;
