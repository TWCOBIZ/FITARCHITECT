import { User } from '../../src/types/User'; // Adjust path as needed
import { Admin } from '../../src/types/Admin'; // Adjust path as needed

declare global {
  namespace Express {
    interface Request {
      user?: User;
      admin?: Admin;
    }
  }
} 