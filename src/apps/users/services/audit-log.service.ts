import { IAuditLogModel, TAuditAction } from '../types';
import { AuditLogModel } from '../models';
import { AuditLogRepository } from '../repositories';
import { BaseService } from '../../../core/engine';

class AuditLogService extends BaseService<IAuditLogModel, AuditLogRepository> {
  constructor() {
    const auditLogRepo = new AuditLogRepository(AuditLogModel);
    super(auditLogRepo);
  }

  async logAction(
    action: TAuditAction,
    performedBy: string,
    targetUserId: string,
    details?: Record<string, any>,
  ): Promise<void> {
    try {
      await this.create({
        action,
        performedBy,
        targetUserId,
        details,
        timestamp: new Date(),
      } as any);
    } catch (error) {
      // Audit logging should not break the main flow
      // Just log the error
      console.error('Failed to create audit log:', error);
    }
  }
}

export default new AuditLogService();
