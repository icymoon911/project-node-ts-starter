import { Model } from 'mongoose';
import { IAuditLogModel } from '../types';
import { BaseRepository } from '../../../core/engine';

export class AuditLogRepository extends BaseRepository<IAuditLogModel> {
  constructor(model: Model<IAuditLogModel>) {
    super(model);
  }
}

export default AuditLogRepository;
