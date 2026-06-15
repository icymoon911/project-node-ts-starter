import { Schema } from 'mongoose';
import { IAuditLogModel } from '../types';
import { BaseModel, createBaseSchema } from '../../../core/engine';

const AUDIT_LOG_MODEL_NAME = 'AuditLog';

const AuditLogSchema = createBaseSchema<IAuditLogModel>(
  {
    action: {
      type: String,
      required: true,
      enum: [
        'USER_CREATED',
        'ROLE_CHANGED',
        'USER_DEACTIVATED',
        'USER_DELETED',
      ],
    },
    performedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    targetUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    details: { type: Schema.Types.Mixed },
    timestamp: { type: Date, default: Date.now },
  },
  {
    modelName: AUDIT_LOG_MODEL_NAME,
  },
);

const AuditLogModel = new BaseModel<IAuditLogModel>(
  AUDIT_LOG_MODEL_NAME,
  AuditLogSchema,
).getModel();

export default AuditLogModel;
