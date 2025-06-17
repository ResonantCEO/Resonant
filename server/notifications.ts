import { db } from "./db";
import { 
  notifications, 
  userNotificationSettings, 
  users,
  profiles,
  type InsertNotification,
  type InsertUserNotificationSettings,
  type Notification
} from "@shared/schema";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { emailService } from "./email";
import { friendships } from "@shared/schema";

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
  async getUserNotifications(userId: number, limit = 20, offset = 0, activeProfileId?: number, activeProfileType?: string, excludeFriendRequests = false): Promise<any[]> {
    let whereConditions = [eq(notifications.recipientId, userId)];

    // Exclude friend requests if requested (for notifications page)
    if (excludeFriendRequests) {
      whereConditions.push(sql`${notifications.type} != 'friend_request'`);
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

    // Strict filtering for profile-specific notifications
    const filteredNotifications = userNotifications.filter(notification => {
      // For booking requests, ONLY show them when venue profile is active
      if (notification.type === 'booking_request') {
        return activeProfileType === 'venue';
      }
      
      // For booking responses, ONLY show them when artist profile is active
      if (notification.type === 'booking_response') {
        return activeProfileType === 'artist';
      }
      
      // For friend requests, only show them for the specific target profile
      if (notification.type === 'friend_request') {
        const data = notification.data as any;
        if (data?.targetProfileId) {
          return data.targetProfileId === activeProfileId;
        }
        // Legacy support: if no targetProfileId but has friendshipId, check if this profile is the addressee
        if (data?.friendshipId && activeProfileId) {
          // We would need to query the friendship table here, but for now just return false
          // This will be handled by the sync script above
          return false;
        }
        return false;
      }
      
      // For friend accepted notifications, only show to the profile that made the original request
      if (notification.type === 'friend_accepted') {
        const data = notification.data as any;
        if (data?.senderProfileId) {
          return data.senderProfileId === activeProfileId;
        }
        // Legacy support: if no senderProfileId, show to all profiles (but this shouldn't happen with new notifications)
        return true;
      }
      
      // For post-related notifications, show based on profile type
      if (notification.type === 'post_like' || notification.type === 'post_comment') {
        // Only show post notifications for artist and venue profiles (not audience)
        return activeProfileType === 'artist' || activeProfileType === 'venue';
      }
      
      // For other notification types, show to all profiles
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
  async getUnreadCount(userId: number, activeProfileId?: number, activeProfileType?: string, excludeFriendRequests = false): Promise<number> {
    let whereConditions = [
      eq(notifications.recipientId, userId),
      eq(notifications.read, false)
    ];

    // Exclude friend requests if requested (for notifications page)
    if (excludeFriendRequests) {
      whereConditions.push(sql`${notifications.type} != 'friend_request'`);
    }

    const allNotifications = await db
      .select({
        id: notifications.id,
        type: notifications.type,
        data: notifications.data,
      })
      .from(notifications)
      .where(and(...whereConditions));

    console.log(`Getting unread count for user ${userId}, profile ${activeProfileId} (${activeProfileType})`);
    console.log(`Total unread notifications: ${allNotifications.length}`);

    // Apply the same strict filtering as getUserNotifications
    const filteredNotifications = allNotifications.filter(notification => {
      // For booking requests, ONLY count them when venue profile is active
      if (notification.type === 'booking_request') {
        const shouldInclude = activeProfileType === 'venue';
        console.log(`Booking request notification ${notification.id}: ${shouldInclude ? 'included' : 'excluded'} for ${activeProfileType} profile`);
        return shouldInclude;
      }
      
      // For booking responses, ONLY count them when artist profile is active
      if (notification.type === 'booking_response') {
        const shouldInclude = activeProfileType === 'artist';
        console.log(`Booking response notification ${notification.id}: ${shouldInclude ? 'included' : 'excluded'} for ${activeProfileType} profile`);
        return shouldInclude;
      }
      
      // For friend requests, only count them for the specific target profile
      if (notification.type === 'friend_request') {
        const data = notification.data as any;
        if (data?.targetProfileId) {
          const shouldInclude = data.targetProfileId === activeProfileId;
          console.log(`Friend request notification ${notification.id}: ${shouldInclude ? 'included' : 'excluded'} (target: ${data.targetProfileId}, active: ${activeProfileId})`);
          return shouldInclude;
        }
        // If no targetProfileId, don't count it
        console.log(`Friend request notification ${notification.id}: excluded (no targetProfileId)`);
        return false;
      }
      
      // For friend accepted notifications, only count for the profile that made the original request
      if (notification.type === 'friend_accepted') {
        const data = notification.data as any;
        if (data?.senderProfileId) {
          const shouldInclude = data.senderProfileId === activeProfileId;
          console.log(`Friend accepted notification ${notification.id}: ${shouldInclude ? 'included' : 'excluded'} (sender profile: ${data.senderProfileId}, active: ${activeProfileId})`);
          return shouldInclude;
        }
        // Legacy support: if no senderProfileId, count for all profiles
        console.log(`Friend accepted notification ${notification.id}: included for all profiles (legacy)`);
        return true;
      }
      
      // For post-related notifications, count based on profile type
      if (notification.type === 'post_like' || notification.type === 'post_comment') {
        // Only count post notifications for artist and venue profiles (not audience)
        const shouldInclude = activeProfileType === 'artist' || activeProfileType === 'venue';
        console.log(`Post notification ${notification.id}: ${shouldInclude ? 'included' : 'excluded'} for ${activeProfileType} profile`);
        return shouldInclude;
      }
      
      // For other notification types, count for all profiles
      console.log(`Other notification ${notification.id} (${notification.type}): included for all profiles`);
      return true;
    });

    console.log(`Filtered notifications for profile ${activeProfileId}: ${filteredNotifications.length}`);
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
  async notifyFriendRequest(recipientId: number, senderId: number, senderName: string, friendshipId?: number, targetProfileId?: number, senderProfileId?: number): Promise<void> {
    // Get sender profile details if senderProfileId is provided
    let senderProfileData = null;
    let primaryImageUrl = null;
    
    if (senderProfileId) {
      const senderProfile = await db
        .select({
          id: profiles.id,
          name: profiles.name,
          profileImageUrl: profiles.profileImageUrl,
          type: profiles.type,
        })
        .from(profiles)
        .where(eq(profiles.id, senderProfileId))
        .limit(1);
      
      if (senderProfile.length > 0) {
        senderProfileData = senderProfile[0];
        // Profile image takes priority
        primaryImageUrl = senderProfileData.profileImageUrl;
      }
    }

    // Also get the sender's user data for fallback
    const senderUser = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        profileImageUrl: users.profileImageUrl,
      })
      .from(users)
      .where(eq(users.id, senderId))
      .limit(1);

    const senderUserData = senderUser.length > 0 ? senderUser[0] : null;
    
    // If no profile image, use user image as fallback
    if (!primaryImageUrl && senderUserData?.profileImageUrl) {
      primaryImageUrl = senderUserData.profileImageUrl;
    }

    console.log(`Creating friend request notification:`, {
      senderProfileId,
      senderProfileImageUrl: senderProfileData?.profileImageUrl,
      senderUserImageUrl: senderUserData?.profileImageUrl,
      finalPrimaryImageUrl: primaryImageUrl
    });

    await this.createNotification({
      recipientId,
      senderId,
      type: "friend_request",
      title: "New Friend Request",
      message: `${senderName} sent you a friend request`,
      data: { 
        senderId, 
        friendshipId, 
        targetProfileId, 
        senderProfileName: senderName,
        senderProfile: senderProfileData,
        senderUser: senderUserData,
        primaryImageUrl: primaryImageUrl
      },
    });
  }

  async notifyFriendAccepted(recipientId: number, senderId: number, senderName: string, senderProfileId?: number): Promise<void> {
    await this.createNotification({
      recipientId,
      senderId,
      type: "friend_accepted",
      title: "Friend Request Accepted",
      message: `${senderName} accepted your friend request`,
      data: { senderId, senderProfileId },
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