import { Router } from 'express';
import {
  authenticateAndAttachUserContext,
  loadAuthenticatedUser,
  requireRole,
  validate,
} from '../../../common/shared';
import { createUserSchema, updateRoleSchema } from '../validators';
import { UserController } from '../controllers';

const router = Router();

// POST /users - Create user (admin only)
router.post(
  '/',
  authenticateAndAttachUserContext,
  loadAuthenticatedUser,
  requireRole(['admin']),
  validate(createUserSchema),
  UserController.createUser,
);

// GET /users - List all users (admin only)
router.get(
  '/',
  authenticateAndAttachUserContext,
  loadAuthenticatedUser,
  requireRole(['admin']),
  UserController.getAllUsers,
);

// GET /users/current - Get current user profile (any authenticated active user)
router.get(
  '/current',
  authenticateAndAttachUserContext,
  loadAuthenticatedUser,
  UserController.getCurrentUser,
);

// PATCH /users/:id/role - Update user role (admin only, cannot modify self)
router.patch(
  '/:id/role',
  authenticateAndAttachUserContext,
  loadAuthenticatedUser,
  requireRole(['admin']),
  validate(updateRoleSchema),
  UserController.updateUserRole,
);

// PATCH /users/:id/deactivate - Deactivate user (admin only, cannot deactivate self)
router.patch(
  '/:id/deactivate',
  authenticateAndAttachUserContext,
  loadAuthenticatedUser,
  requireRole(['admin']),
  UserController.deactivateUser,
);

// DELETE /users/:id - Delete user (admin only, cannot delete self)
router.delete(
  '/:id',
  authenticateAndAttachUserContext,
  loadAuthenticatedUser,
  requireRole(['admin']),
  UserController.deleteUser,
);

// GET /users/:id - Get user by ID (admin can see anyone, user can see self only)
router.get(
  '/:id',
  authenticateAndAttachUserContext,
  loadAuthenticatedUser,
  UserController.getUserById,
);

export default router;
