import { Document, Schema } from 'mongoose';
import { IBaseModel } from '../../../core/engine';

export type TAuditAction =
  | 'USER_CREATED'
  | 'ROLE_CHANGED'
  | 'USER_DEACTIVATED'
  | 'USER_DELETED';

export interface IAuditLog extends IBaseModel {
  action: TAuditAction;
  performedBy: Schema.Types.ObjectId;
  targetUserId: Schema.Types.ObjectId;
  details?: Record<string, any>;
  timestamp: Date;
}

export interface IAuditLogModel extends IAuditLog, IBaseModel, Document {}
