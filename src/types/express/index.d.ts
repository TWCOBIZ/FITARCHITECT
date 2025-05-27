import 'express';
import { User } from '../user';

export type Admin = User & { isAdmin: true };

declare module 'express-serve-static-core' {
  interface Request {
    user?: User;
    admin?: Admin;
  }
} 