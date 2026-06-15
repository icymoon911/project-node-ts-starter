import { Router } from 'express';
import {
  authenticateAndAttachUserContext,
  loadAuthenticatedUser,
  requireRole,
} from '../../../common/shared';
import { AuditLogController } from '../controllers';

const router = Router();

// GET /audit-logs - View audit logs (admin only)
router.get(
  '/',
  authenticateAndAttachUserContext,
  loadAuthenticatedUser,
  requireRole(['admin']),
  AuditLogController.getAuditLogs,
);

export default router;
