import { JwtPayload } from 'jsonwebtoken';

declare module 'express-serve-static-core' {
  interface Request {
    payload?: JwtPayload;
    user?: {
      _id: string;
      id: string;
      firstname: string;
      lastname: string;
      email: string;
      role: string;
      active: boolean;
      verified: boolean;
      [key: string]: any;
    };
    mongooseOptions?: Record<string, any>;
  }
}
