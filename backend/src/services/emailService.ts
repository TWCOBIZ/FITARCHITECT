import { Resend } from 'resend';
import { logger } from '../utils/logger';

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

// Email configuration
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@fitarchitect.com';
const FROM_NAME = process.env.FROM_NAME || 'FitArchitect';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

interface PasswordResetEmailData {
  email: string;
  resetLink: string;
  userName?: string;
  expiresInMinutes?: number;
}

export class EmailService {
  /**
   * Send a generic email
   */
  static async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      const { data, error } = await resend.emails.send({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        replyTo: options.replyTo,
      });

      if (error) {
        logger.error('Failed to send email', {
          operation: 'email_send_error',
          component: 'email',
          metadata: { 
            error: error.message, 
            to: options.to,
            subject: options.subject 
          }
        });
        return false;
      }

      logger.info('Email sent successfully', {
        operation: 'email_sent',
        component: 'email',
        metadata: { 
          id: data?.id,
          to: options.to,
          subject: options.subject 
        }
      });

      return true;
    } catch (error: any) {
      logger.error('Email service error', {
        operation: 'email_service_error',
        component: 'email',
        metadata: { 
          error: error.message,
          to: options.to 
        }
      });
      return false;
    }
  }

  /**
   * Send password reset email
   */
  static async sendPasswordResetEmail(data: PasswordResetEmailData): Promise<boolean> {
    const { email, resetLink, userName, expiresInMinutes = 15 } = data;
    
    const subject = 'Reset Your FitArchitect Password';
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Your Password</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 0;
              background-color: #f4f4f4;
            }
            .container {
              background-color: #ffffff;
              margin: 20px auto;
              padding: 0;
              border-radius: 8px;
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
              overflow: hidden;
            }
            .header {
              background-color: #000000;
              color: #ffffff;
              padding: 30px;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 28px;
              font-weight: 600;
            }
            .content {
              padding: 40px 30px;
            }
            .button {
              display: inline-block;
              padding: 14px 30px;
              background-color: #3B82F6;
              color: #ffffff;
              text-decoration: none;
              border-radius: 6px;
              font-weight: 600;
              margin: 20px 0;
            }
            .button:hover {
              background-color: #2563EB;
            }
            .footer {
              background-color: #f8f9fa;
              padding: 20px 30px;
              text-align: center;
              font-size: 14px;
              color: #666;
            }
            .warning {
              background-color: #FEF3C7;
              border: 1px solid #F59E0B;
              border-radius: 6px;
              padding: 15px;
              margin: 20px 0;
              font-size: 14px;
            }
            .link-text {
              word-break: break-all;
              font-size: 12px;
              color: #666;
              margin-top: 10px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🏋️ FitArchitect</h1>
            </div>
            <div class="content">
              <h2>Password Reset Request</h2>
              <p>Hi${userName ? ` ${userName}` : ''},</p>
              <p>We received a request to reset your password for your FitArchitect account. Click the button below to create a new password:</p>
              
              <div style="text-align: center;">
                <a href="${resetLink}" class="button">Reset Password</a>
              </div>
              
              <div class="warning">
                <strong>⏰ This link expires in ${expiresInMinutes} minutes</strong><br>
                For security reasons, this password reset link will expire soon. If you didn't request this reset, you can safely ignore this email.
              </div>
              
              <p>If the button doesn't work, copy and paste this link into your browser:</p>
              <p class="link-text">${resetLink}</p>
              
              <p>Need help? Contact our support team at support@fitarchitect.com</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} FitArchitect. All rights reserved.</p>
              <p>You received this email because a password reset was requested for your account.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
Password Reset Request

Hi${userName ? ` ${userName}` : ''},

We received a request to reset your password for your FitArchitect account.

To reset your password, visit this link:
${resetLink}

This link expires in ${expiresInMinutes} minutes.

If you didn't request this reset, you can safely ignore this email.

Need help? Contact our support team at support@fitarchitect.com

© ${new Date().getFullYear()} FitArchitect. All rights reserved.
    `.trim();

    return await this.sendEmail({
      to: email,
      subject,
      html,
      text
    });
  }

  /**
   * Send welcome email (for future use)
   */
  static async sendWelcomeEmail(email: string, userName?: string): Promise<boolean> {
    const subject = 'Welcome to FitArchitect! 🎉';
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to FitArchitect</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 0;
              background-color: #f4f4f4;
            }
            .container {
              background-color: #ffffff;
              margin: 20px auto;
              padding: 0;
              border-radius: 8px;
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
              overflow: hidden;
            }
            .header {
              background-color: #000000;
              color: #ffffff;
              padding: 30px;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 28px;
              font-weight: 600;
            }
            .content {
              padding: 40px 30px;
            }
            .button {
              display: inline-block;
              padding: 14px 30px;
              background-color: #3B82F6;
              color: #ffffff;
              text-decoration: none;
              border-radius: 6px;
              font-weight: 600;
              margin: 20px 0;
            }
            .feature {
              margin: 20px 0;
              padding: 15px;
              background-color: #f8f9fa;
              border-radius: 6px;
            }
            .footer {
              background-color: #f8f9fa;
              padding: 20px 30px;
              text-align: center;
              font-size: 14px;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🏋️ FitArchitect</h1>
            </div>
            <div class="content">
              <h2>Welcome to Your Fitness Journey!</h2>
              <p>Hi${userName ? ` ${userName}` : ''},</p>
              <p>Thank you for joining FitArchitect! We're excited to help you achieve your fitness goals with AI-powered workouts and personalized nutrition plans.</p>
              
              <div class="feature">
                <h3>🎯 Get Started:</h3>
                <ul>
                  <li>Complete your health assessment (PAR-Q)</li>
                  <li>Set up your fitness profile</li>
                  <li>Generate your first AI workout plan</li>
                  <li>Track your nutrition and progress</li>
                </ul>
              </div>
              
              <div style="text-align: center;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard" class="button">Go to Dashboard</a>
              </div>
              
              <p>Questions? Check out our help center or reply to this email.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} FitArchitect. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
Welcome to FitArchitect!

Hi${userName ? ` ${userName}` : ''},

Thank you for joining FitArchitect! We're excited to help you achieve your fitness goals with AI-powered workouts and personalized nutrition plans.

Get Started:
- Complete your health assessment (PAR-Q)
- Set up your fitness profile
- Generate your first AI workout plan
- Track your nutrition and progress

Visit your dashboard: ${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard

Questions? Check out our help center or reply to this email.

© ${new Date().getFullYear()} FitArchitect. All rights reserved.
    `.trim();

    return await this.sendEmail({
      to: email,
      subject,
      html,
      text
    });
  }
}

export default EmailService;