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
 * User profile type that excludes sensitive fields (password).
 * Use this when returning user data to clients.
 */
export interface IUserProfile {
  firstname: string;
  lastname: string;
  email: string;
  verified: boolean;
  active: boolean;
  role: TUserRole;
  profilePhoto?: string;
}
