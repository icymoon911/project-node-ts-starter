import { Router } from 'express';
import {
  AppRoutes,
  AuditLogRoutes,
  AuthRoutes,
  OTPRoutes,
  UserRoutes,
} from '../../apps';

const router = Router();

router.use('/', AppRoutes);
router.use('/users', UserRoutes);
router.use('/audit-logs', AuditLogRoutes);
router.use('/otp', OTPRoutes);
router.use('/auth', AuthRoutes);

export default router;
