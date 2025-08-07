import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../db/prisma';
import { logger } from '../utils/logger';
import { AuthenticatedRequest } from '../auth';
import { EmailService } from '../services/emailService';

const router = Router();

// In-memory store for reset tokens (in production, use Redis)
const resetTokens = new Map<string, { 
  email: string; 
  expires: number; 
  attempts: number;
  createdAt: number;
}>();

// Clean up expired tokens every hour
setInterval(() => {
  const now = Date.now();
  for (const [token, data] of resetTokens.entries()) {
    if (now > data.expires) {
      resetTokens.delete(token);
    }
  }
}, 60 * 60 * 1000);

/**
 * Request password reset
 * Public endpoint - no authentication required
 */
router.post('/request',
  [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required')
  ],
  async (req: any, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Invalid input',
          details: errors.array()
        });
      }

      const { email } = req.body;

      logger.info('Password reset requested', {
        operation: 'password_reset_request',
        component: 'auth',
        metadata: { email }
      });

      // Check rate limiting (5 requests per hour per email)
      const existingRequests = Array.from(resetTokens.values())
        .filter(data => data.email === email && Date.now() - data.createdAt < 60 * 60 * 1000);
      
      if (existingRequests.length >= 5) {
        logger.warn('Password reset rate limit exceeded', {
          operation: 'password_reset_rate_limit',
          component: 'auth',
          metadata: { email, attempts: existingRequests.length }
        });
        
        // Still return success to prevent email enumeration
        return res.json({
          message: 'If the email exists, a reset link has been sent'
        });
      }

      // Check if user exists
      const user = await prisma.userProfile.findUnique({
        where: { email }
      });

      if (!user) {
        logger.info('Password reset requested for non-existent email', {
          operation: 'password_reset_email_not_found',
          component: 'auth',
          metadata: { email }
        });
        
        // Return success to prevent email enumeration
        return res.json({
          message: 'If the email exists, a reset link has been sent'
        });
      }

      // Generate secure reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const expires = Date.now() + (15 * 60 * 1000); // 15 minutes

      // Store reset token
      resetTokens.set(resetToken, {
        email: user.email,
        expires,
        attempts: 0,
        createdAt: Date.now()
      });

      // Generate reset link
      const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
      
      // Send email
      const emailSent = await EmailService.sendPasswordResetEmail({
        email: user.email,
        resetLink,
        userName: user.name,
        expiresInMinutes: 15
      });

      if (!emailSent) {
        // Log the link for development if email fails
        logger.warn('Email sending failed, logging reset link for development', {
          operation: 'password_reset_email_fallback',
          component: 'auth',
          metadata: { email, resetLink }
        });
        console.log(`🔗 Password Reset Link (Email failed): ${resetLink}`);
      }
      
      logger.info('Password reset token generated', {
        operation: 'password_reset_token_generated',
        component: 'auth',
        userId: user.id,
        metadata: { 
          email,
          emailSent,
          expiresAt: new Date(expires).toISOString()
        }
      });

      res.json({
        message: 'If the email exists, a reset link has been sent'
      });
    } catch (error) {
      logger.error('Password reset request failed', {
        operation: 'password_reset_request_error',
        component: 'auth'
      }, error as Error);

      res.status(500).json({
        error: 'Failed to process password reset request'
      });
    }
  }
);

/**
 * Verify reset token validity
 */
router.get('/verify/:token',
  async (req: any, res: Response) => {
    try {
      const { token } = req.params;

      if (!token) {
        return res.status(400).json({
          error: 'Reset token is required'
        });
      }

      const resetData = resetTokens.get(token);
      
      if (!resetData) {
        logger.warn('Invalid password reset token used', {
          operation: 'password_reset_invalid_token',
          component: 'auth',
          metadata: { token: token.substring(0, 8) + '...' }
        });
        
        return res.status(400).json({
          error: 'Invalid or expired reset token'
        });
      }

      if (Date.now() > resetData.expires) {
        resetTokens.delete(token);
        logger.warn('Expired password reset token used', {
          operation: 'password_reset_expired_token',
          component: 'auth',
          metadata: { email: resetData.email }
        });
        
        return res.status(400).json({
          error: 'Reset token has expired'
        });
      }

      logger.info('Password reset token verified', {
        operation: 'password_reset_token_verified',
        component: 'auth',
        metadata: { email: resetData.email }
      });

      res.json({
        valid: true,
        email: resetData.email
      });
    } catch (error) {
      logger.error('Password reset token verification failed', {
        operation: 'password_reset_verify_error',
        component: 'auth'
      }, error as Error);

      res.status(500).json({
        error: 'Failed to verify reset token'
      });
    }
  }
);

/**
 * Reset password with token
 */
router.post('/reset',
  [
    body('token')
      .notEmpty()
      .withMessage('Reset token is required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number')
  ],
  async (req: any, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Invalid input',
          details: errors.array()
        });
      }

      const { token, password } = req.body;

      const resetData = resetTokens.get(token);
      
      if (!resetData) {
        logger.warn('Password reset attempted with invalid token', {
          operation: 'password_reset_invalid_token_attempt',
          component: 'auth',
          metadata: { token: token.substring(0, 8) + '...' }
        });
        
        return res.status(400).json({
          error: 'Invalid or expired reset token'
        });
      }

      if (Date.now() > resetData.expires) {
        resetTokens.delete(token);
        logger.warn('Password reset attempted with expired token', {
          operation: 'password_reset_expired_token_attempt',
          component: 'auth',
          metadata: { email: resetData.email }
        });
        
        return res.status(400).json({
          error: 'Reset token has expired'
        });
      }

      // Increment attempt counter
      resetData.attempts++;
      
      // Limit attempts per token (prevent brute force)
      if (resetData.attempts > 3) {
        resetTokens.delete(token);
        logger.warn('Too many password reset attempts', {
          operation: 'password_reset_too_many_attempts',
          component: 'auth',
          metadata: { email: resetData.email, attempts: resetData.attempts }
        });
        
        return res.status(429).json({
          error: 'Too many attempts. Please request a new reset link'
        });
      }

      // Find user
      const user = await prisma.userProfile.findUnique({
        where: { email: resetData.email }
      });

      if (!user) {
        resetTokens.delete(token);
        logger.error('User not found during password reset', {
          operation: 'password_reset_user_not_found',
          component: 'auth',
          metadata: { email: resetData.email }
        });
        
        return res.status(400).json({
          error: 'User not found'
        });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(password, 12);

      // Update password
      await prisma.userProfile.update({
        where: { id: user.id },
        data: { 
          password: hashedPassword,
          updatedAt: new Date()
        }
      });

      // Remove used token
      resetTokens.delete(token);

      logger.info('Password reset completed successfully', {
        operation: 'password_reset_success',
        component: 'auth',
        userId: user.id,
        metadata: { email: user.email }
      });

      res.json({
        message: 'Password has been reset successfully'
      });
    } catch (error) {
      logger.error('Password reset failed', {
        operation: 'password_reset_error',
        component: 'auth'
      }, error as Error);

      res.status(500).json({
        error: 'Failed to reset password'
      });
    }
  }
);

/**
 * Change password (for authenticated users)
 */
router.post('/change',
  // This would need authentication middleware if implemented
  [
    body('currentPassword')
      .notEmpty()
      .withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number')
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Invalid input',
          details: errors.array()
        });
      }

      const { currentPassword, newPassword } = req.body;
      
      // This endpoint would need authentication middleware
      // For now, return not implemented
      res.status(501).json({
        error: 'Password change functionality not implemented yet'
      });
    } catch (error) {
      logger.error('Password change failed', {
        operation: 'password_change_error',
        component: 'auth'
      }, error as Error);

      res.status(500).json({
        error: 'Failed to change password'
      });
    }
  }
);

export default router;