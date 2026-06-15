/**
 * Centralized HTTP status codes used by controllers.
 *
 * Using named constants instead of raw numbers keeps status codes consistent
 * across the project and makes controller intent obvious at a glance.
 */
export const HTTP_STATUS = {
  /** 200 - Standard success. */
  OK: 200,
  /** 201 - Resource created (e.g. register, create user, generate OTP). */
  CREATED: 201,
  /** 202 - Request accepted for processing (e.g. logout). */
  ACCEPTED: 202,
  /** 204 - Success with no body. */
  NO_CONTENT: 204,
  /** 400 - Bad request / validation failure. */
  BAD_REQUEST: 400,
  /** 401 - Authentication required or failed. */
  UNAUTHORIZED: 401,
  /** 403 - Authenticated but not allowed. */
  FORBIDDEN: 403,
  /** 404 - Resource not found. */
  NOT_FOUND: 404,
  /** 409 - Conflict (e.g. duplicate unique field). */
  CONFLICT: 409,
  /** 500 - Internal server error. */
  INTERNAL_SERVER_ERROR: 500,
} as const;

export type HttpStatus = (typeof HTTP_STATUS)[keyof typeof HTTP_STATUS];

export default HTTP_STATUS;
