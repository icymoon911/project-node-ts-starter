// src/apps/users/types/user.ts

import { Document } from 'mongoose';
import { IBaseModel } from '../../../core/engine'; // Importer IBaseModel pour l'extension

export type TUserRole = 'admin' | 'user' | 'guest';

export interface IUser extends IBaseModel {
  firstname: string;
  lastname: string;
  email: string;
  password: string;
  role: TUserRole;
  profilePhoto?: string;
  verified: boolean;
  active: boolean;
}

export interface IUserModel extends IUser, IBaseModel, Document {}

/**
 * Safe user profile returned to clients — excludes sensitive fields like
 * `password` so callers don't have to cast through `any`.
 */
export type IUserProfile = Omit<IUser, 'password'>;
