/* eslint-disable @typescript-eslint/no-unused-vars */
import { Request, Response, NextFunction } from 'express';
import { AuditLogService } from '../services';
import { ApiResponse, ErrorResponseType } from '../../../common/shared';

class AuditLogController {
  static async getAuditLogs(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const response = await AuditLogService.findAll(req.query);
      if (response.success) {
        ApiResponse.success(res, response);
      } else {
        throw response;
      }
    } catch (error) {
      ApiResponse.error(res, error as ErrorResponseType);
    }
  }
}

export default AuditLogController;
