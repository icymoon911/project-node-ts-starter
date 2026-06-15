import { ErrorResponse } from './error';
import { ErrorResponseType, SuccessResponseType } from '../../types';

/**
 * Type guard to discriminate between SuccessResponseType and ErrorResponseType.
 * The original types use `success: boolean` (not literal true/false),
 * so this guard properly narrows the union for TypeScript.
 */
export function isSuccessResponse<T>(
  response: SuccessResponseType<T> | ErrorResponseType,
): response is SuccessResponseType<T> {
  return response.success === true;
}

/**
 * Wraps an async service operation with standardized error handling.
 * Service methods only need to throw ErrorResponse for business errors;
 * this wrapper catches them and converts to the ErrorResponseType format.
 * Unknown errors are automatically wrapped into ErrorResponse.
 */
export async function handleServiceOperation<T>(
  operation: () => Promise<SuccessResponseType<T> | ErrorResponseType>,
): Promise<SuccessResponseType<T> | ErrorResponseType> {
  try {
    const result = await operation();
    // Handle the case where the operation returns an error response instead of throwing
    if (!result.success && result.error) {
      return result;
    }
    return result;
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
