import { db } from "./db";
import { 
  notifications, 
  userNotificationSettings, 
  users,
  type InsertNotification,
  type InsertUserNotificationSettings,
  type Notification
} from "@shared/schema";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { emailService } from "./email";

export interface NotificationData {
  recipientId: number;
  senderId?: number;
  type: string;
  title: string;
  message: string;
  data?: any;
}

export class NotificationService {
  // Create a notification
  async createNotification(notificationData: NotificationData): Promise<Notification> {
    const [notification] = await db
      .insert(notifications)
      .values({
        recipientId: notificationData.recipientId,
        senderId: notificationData.senderId,
        type: notificationData.type,
        title: notificationData.title,
        message: notificationData.message,
        data: notificationData.data,
      })
      .returning();

    // Check if user wants email notifications for this type
    const shouldSendEmail = await this.shouldSendEmailNotification(
      notificationData.recipientId,
      notificationData.type
    );

    if (shouldSendEmail) {
      await this.sendEmailNotification(notification);
    }

    return notification;
  }

  // Get notifications for a user filtered by active profile
  async getUserNotifications(userId: number, limit = 20, offset = 0, activeProfileId?: number, activeProfileType?: string): Promise<any[]> {
    let whereConditions = [eq(notifications.recipientId, userId)];

    // Filter notifications based on active profile type
    if (activeProfileType && activeProfileId) {
      const relevantTypes = this.getRelevantNotificationTypes(activeProfileType);
      whereConditions.push(inArray(notifications.type, relevantTypes));
    }

    const userNotifications = await db
      .select({
        id: notifications.id,
        type: notifications.type,
        title: notifications.title,
        message: notifications.message,
        data: notifications.data,
        read: notifications.read,
        createdAt: notifications.createdAt,
        sender: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
        },
      })
      .from(notifications)
      .leftJoin(users, eq(notifications.senderId, users.id))
      .where(and(...whereConditions))
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
      .offset(offset);

    // Check if friendships exist in the database
    const { friendships } = await import('@shared/schema');
    const hasFriendships = await db.select({ count: sql`count(*)` }).from(friendships);
    const friendshipsExist = hasFriendships[0]?.count > 0;

    // Additional filtering for profile-specific notifications
    const filteredNotifications = userNotifications.filter(notification => {
      // Friend-related notifications should only be visible if friendships exist in database
      if (['friend_request', 'friend_accepted'].includes(notification.type)) {
        return friendshipsExist;
      }
      // For booking requests, only show them when venue profile is active
      if (notification.type === 'booking_request' && activeProfileType !== 'venue') {
        return false;
      }
      // For booking responses, only show them when artist profile is active
      if (notification.type === 'booking_response' && activeProfileType !== 'artist') {
        return false;
      }
      return true;
    });

    return filteredNotifications;
  }

  // Mark notification as read
  async markAsRead(notificationId: number, userId: number): Promise<void> {
    await db
      .update(notifications)
      .set({ read: true, updatedAt: new Date() })
      .where(and(
        eq(notifications.id, notificationId),
        eq(notifications.recipientId, userId)
      ));
  }

  // Mark all notifications as read for a user
  async markAllAsRead(userId: number): Promise<void> {
    await db
      .update(notifications)
      .set({ read: true, updatedAt: new Date() })
      .where(eq(notifications.recipientId, userId));
  }

  // Get unread notification count filtered by active profile
  async getUnreadCount(userId: number, activeProfileId?: number, activeProfileType?: string): Promise<number> {
    let whereConditions = [
      eq(notifications.recipientId, userId),
      eq(notifications.read, false)
    ];

    // Filter notifications based on active profile type
    if (activeProfileType && activeProfileId) {
      const relevantTypes = this.getRelevantNotificationTypes(activeProfileType);
      whereConditions.push(inArray(notifications.type, relevantTypes));
    }

    const allNotifications = await db
      .select({
        id: notifications.id,
        type: notifications.type,
      })
      .from(notifications)
      .where(and(...whereConditions));

    // Check if friendships exist in the database
    const { friendships } = await import('@shared/schema');
    const hasFriendships = await db.select({ count: sql`count(*)` }).from(friendships);
    const friendshipsExist = hasFriendships[0]?.count > 0;

    // Additional filtering for profile-specific notifications
    const filteredNotifications = allNotifications.filter(notification => {
      // Friend-related notifications should only be counted if friendships exist in database
      if (['friend_request', 'friend_accepted'].includes(notification.type)) {
        return friendshipsExist;
      }
      // For booking requests, only count them when venue profile is active
      if (notification.type === 'booking_request' && activeProfileType !== 'venue') {
        return false;
      }
      // For booking responses, only count them when artist profile is active
      if (notification.type === 'booking_response' && activeProfileType !== 'artist') {
        return false;
      }
      return true;
    });

    return filteredNotifications.length;
  }

  // Delete notification
  async deleteNotification(notificationId: number, userId: number): Promise<void> {
    await db
      .delete(notifications)
      .where(and(
        eq(notifications.id, notificationId),
        eq(notifications.recipientId, userId)
      ));
  }

  // Get user notification settings
  async getUserNotificationSettings(userId: number): Promise<any[]> {
    const settings = await db
      .select()
      .from(userNotificationSettings)
      .where(eq(userNotificationSettings.userId, userId));

    return settings;
  }

  // Update user notification settings
  async updateNotificationSettings(
    userId: number,
    type: string,
    settings: Partial<InsertUserNotificationSettings>
  ): Promise<void> {
    const existing = await db
      .select()
      .from(userNotificationSettings)
      .where(and(
        eq(userNotificationSettings.userId, userId),
        eq(userNotificationSettings.type, type)
      ));

    if (existing.length > 0) {
      await db
        .update(userNotificationSettings)
        .set({ ...settings, updatedAt: new Date() })
        .where(and(
          eq(userNotificationSettings.userId, userId),
          eq(userNotificationSettings.type, type)
        ));
    } else {
      await db
        .insert(userNotificationSettings)
        .values({
          userId,
          type,
          ...settings,
        });
    }
  }

  // Check if user should receive email notification
  private async shouldSendEmailNotification(userId: number, type: string): Promise<boolean> {
    // Check user's general email notification preference
    const [user] = await db
      .select({ emailNotifications: users.emailNotifications })
      .from(users)
      .where(eq(users.id, userId));

    if (!user?.emailNotifications) {
      return false;
    }

    // Check specific notification type settings
    const [setting] = await db
      .select({ email: userNotificationSettings.email })
      .from(userNotificationSettings)
      .where(and(
        eq(userNotificationSettings.userId, userId),
        eq(userNotificationSettings.type, type)
      ));

    return setting?.email ?? true; // Default to true if no specific setting
  }

  // Send email notification
  private async sendEmailNotification(notification: Notification): Promise<void> {
    try {
      const [recipient] = await db
        .select({
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
        })
        .from(users)
        .where(eq(users.id, notification.recipientId));

      if (!recipient) {
        return;
      }

      await emailService.sendNotificationEmail(
        recipient.email,
        `${recipient.firstName} ${recipient.lastName}`,
        notification.title,
        notification.message,
        notification.type,
        notification.data
      );

      // Mark email as sent
      await db
        .update(notifications)
        .set({ emailSent: true })
        .where(eq(notifications.id, notification.id));

    } catch (error) {
      console.error("Failed to send email notification:", error);
    }
  }

  // Get relevant notification types based on profile type
  private getRelevantNotificationTypes(profileType: string): string[] {
    const commonTypes = ['friend_request', 'friend_accepted', 'profile_invite', 'profile_deleted'];

    switch (profileType) {
      case 'artist':
        return [...commonTypes, 'booking_request', 'booking_response', 'post_like', 'post_comment'];
      case 'venue':
        return [...commonTypes, 'booking_request', 'booking_response', 'post_like', 'post_comment'];
      case 'audience':
        return [...commonTypes, 'post_like', 'post_comment'];
      default:
        return commonTypes;
    }
  }

  // Helper methods for common notification types
  async notifyFriendRequest(recipientId: number, senderId: number, senderName: string): Promise<void> {
    await this.createNotification({
      recipientId,
      senderId,
      type: "friend_request",
      title: "New Friend Request",
      message: `${senderName} sent you a friend request`,
      data: { senderId },
    });
  }

  async notifyFriendAccepted(recipientId: number, senderId: number, senderName: string): Promise<void> {
    await this.createNotification({
      recipientId,
      senderId,
      type: "friend_accepted",
      title: "Friend Request Accepted",
      message: `${senderName} accepted your friend request`,
      data: { senderId },
    });
  }

  async notifyPostLike(recipientId: number, senderId: number, senderName: string, postId: number): Promise<void> {
    await this.createNotification({
      recipientId,
      senderId,
      type: "post_like",
      title: "Post Liked",
      message: `${senderName} liked your post`,
      data: { postId, senderId },
    });
  }

  async notifyPostComment(recipientId: number, senderId: number, senderName: string, postId: number): Promise<void> {
    await this.createNotification({
      recipientId,
      senderId,
      type: "post_comment",
      title: "New Comment",
      message: `${senderName} commented on your post`,
      data: { postId, senderId },
    });
  }

  async notifyProfileInvite(recipientEmail: string, senderId: number, senderName: string, profileName: string) {
    // Find user by email
    const [recipient] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, recipientEmail));

    if (recipient) {
      await this.createNotification({
        recipientId: recipient.id,
        senderId,
        type: "profile_invite",
        title: "Profile Invitation",
        message: `${senderName} invited you to join ${profileName}`,
        data: { senderId, profileName },
      });
    }
  }

  async notifyProfileDeleted(recipientIds: number[], profileName: string, deletedBy: string): Promise<void> {
    // Calculate restoration deadline (30 days from now)
    const restorationDeadline = new Date();
    restorationDeadline.setDate(restorationDeadline.getDate() + 30);

    for (const recipientId of recipientIds) {
      await this.createNotification({
        recipientId,
        type: "profile_deleted",
        title: "Profile Deleted",
        message: `The profile "${profileName}" has been deleted by ${deletedBy}. It can be restored until ${restorationDeadline.toLocaleDateString()}.`,
        data: { 
          profileName, 
          deletedBy, 
          restorationDeadline: restorationDeadline.toISOString(),
          canRestore: true 
        },
      });
    }
  }

  async notifyBookingRequest(venueUserId: number, artistUserId: number, artistName: string, artistProfileName: string) {
    await this.createNotification({
      recipientId: venueUserId,
      senderId: artistUserId,
      type: 'booking_request',
      title: 'New Booking Request',
      message: `${artistName} (${artistProfileName}) wants to book your venue`,
      data: { artistUserId, artistName, artistProfileName }
    });
  }

  async notifyBookingResponse(artistUserId: number, venueUserId: number, venueName: string, venueProfileName: string, status: string) {
    const statusText = status === 'accepted' ? 'accepted' : 'declined';
    await this.createNotification({
      recipientId: artistUserId,
      senderId: venueUserId,
      type: 'booking_response',
      title: `Booking Request ${statusText.charAt(0).toUpperCase() + statusText.slice(1)}`,
      message: `${venueName} (${venueProfileName}) has ${statusText} your booking request`,
      data: { venueUserId, venueName, venueProfileName, status }
    });
  }
}

export const notificationService = new NotificationService();