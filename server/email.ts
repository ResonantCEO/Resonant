import nodemailer from 'nodemailer';

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    // Configure with environment variables or default settings
    const config: EmailConfig = {
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.EMAIL_USER || '',
        pass: process.env.EMAIL_PASS || ''
      }
    };

    this.transporter = nodemailer.createTransport(config);
  }

  async sendProfileDeletionNotification(
    recipientEmail: string,
    recipientName: string,
    profileName: string,
    profileType: string,
    deletedBy: string,
    restorationDeadline: Date
  ) {
    const subject = `Profile "${profileName}" has been deleted`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Profile Deletion Notice</h2>

        <p>Dear ${recipientName},</p>

        <p>We're writing to inform you that the ${profileType} profile "<strong>${profileName}</strong>" has been deleted by ${deletedBy}.</p>

        <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <h3 style="color: #dc2626; margin-top: 0;">Important Information:</h3>
          <ul style="margin: 0;">
            <li>This profile will be permanently deleted on <strong>${restorationDeadline.toLocaleDateString()}</strong></li>
            <li>All associated posts, comments, and data are currently backed up</li>
            <li>You can request restoration within the next 30 days</li>
          </ul>
        </div>

        <p>If you believe this deletion was made in error or if you would like to restore the profile, please contact our support team immediately.</p>

        <p>Best regards,<br>The Resonant Team</p>

        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="font-size: 12px; color: #6b7280;">This is an automated message. Please do not reply to this email.</p>
      </div>
    `;

    try {
      await this.sendEmail(recipientEmail, subject, html);
      console.log(`Profile deletion notification sent to ${recipientEmail}`);
    } catch (error) {
      console.error(`Failed to send profile deletion notification to ${recipientEmail}:`, error);
      throw error;
    }
  }

  async sendNotificationEmail(
    recipientEmail: string,
    recipientName: string,
    title: string,
    message: string,
    type: string,
    data?: any
  ) {
    const subject = title;

    let actionButton = '';
    if (type === 'friend_request') {
      actionButton = `
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/friends" 
             style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            View Friend Requests
          </a>
        </div>
      `;
    } else if (type === 'post_like' || type === 'post_comment') {
      actionButton = `
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/profile/${data?.senderId}" 
             style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            View Post
          </a>
        </div>
      `;
    } else if (type === 'profile_invite') {
      actionButton = `
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/notifications" 
             style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            View Invitation
          </a>
        </div>
      `;
    }

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1f2937;">${title}</h2>

        <p>Dear ${recipientName},</p>

        <p>${message}</p>

        ${actionButton}

        <p>You can manage your notification preferences in your account settings.</p>

        <p>Best regards,<br>The Resonant Team</p>

        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="font-size: 12px; color: #6b7280;">
          This is an automated message. Please do not reply to this email.
        </p>
      </div>
    `;

    const text = `
Profile Deletion Notice

Dear ${recipientName},

The ${profileType} profile "${profileName}" has been deleted by ${deletedBy}.

Important Information:
- This profile will be permanently deleted on ${restorationDeadline.toLocaleDateString()}
- All associated posts, comments, and data are currently backed up
- You can request restoration within the next 30 days

If you believe this deletion was made in error or if you would like to restore the profile, please contact our support team immediately.

Best regards,
The Resonant Team
    `;

    try {
      const info = await this.transporter.sendMail({
        from: process.env.EMAIL_FROM || 'noreply@resonant.com',
        to: recipientEmail,
        subject,
        text,
        html
      });

      console.log('Email sent successfully:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Failed to send email:', error);
      return { success: false, error: error.message };
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      console.log('Email service connection verified');
      return true;
    } catch (error) {
      console.error('Email service connection failed:', error);
      return false;
    }
  }

  async sendEmail(recipientEmail: string, subject: string, html: string) {
    try {
      const info = await this.transporter.sendMail({
        from: process.env.EMAIL_FROM || 'noreply@resonant.com',
        to: recipientEmail,
        subject,
        html,
      });

      console.log('Email sent successfully:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Failed to send email:', error);
      return { success: false, error: error.message };
    }
  }
}

export const emailService = new EmailService();