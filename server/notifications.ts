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
    const [notification] = await db.insert(notifications).values(notificationData).returning();

    console.log(`Created notification: ${JSON.stringify(notification, null, 2)}`);

    // Emit real-time notification
    emitNotification(notificationData.recipientId, notification);

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

      // For booking-related notifications, only show to relevant profiles
      if (notification.type === 'booking_confirmed' || notification.type === 'booking_declined') {
        // Only show booking confirmations and declines to artist profiles (who made the original request)
        return activeProfileType === 'artist';
      }

      // For post-related notifications, show based on profile type
      if (notification.type === 'post_like' || notification.type === 'post_comment') {
        // Only show post notifications for artist and venue profiles (not audience)
        return activeProfileType === 'artist' || activeProfileType === 'venue';
      }

      // For photo comment, photo tag, and comment tag notifications, show for all profile types
      if (notification.type === 'photo_comment' || notification.type === 'photo_tag' || notification.type === 'comment_tag') {
        return true;
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

    // Apply filtering based on profile type and notification relevance
    const filteredNotifications = allNotifications.filter(notification => {
      // For booking requests, ONLY count them when venue profile is active
      if (notification.type === 'booking_request') {
        return activeProfileType === 'venue';
      }

      // For booking responses, ONLY count them when artist profile is active
      if (notification.type === 'booking_response') {
        return activeProfileType === 'artist';
      }

      // For friend requests, only count them for the specific target profile
      if (notification.type === 'friend_request') {
        const data = notification.data as any;
        if (data?.targetProfileId) {
          return data.targetProfileId === activeProfileId;
        }
        return false;
      }

      // For friend accepted notifications, only count for the profile that made the original request
      if (notification.type === 'friend_accepted') {
        const data = notification.data as any;
        if (data?.senderProfileId) {
          return data.senderProfileId === activeProfileId;
        }
        return true; // Legacy support
      }

      // For booking-related notifications, only count for relevant profiles
      if (notification.type === 'booking_confirmed' || notification.type === 'booking_declined') {
        return activeProfileType === 'artist';
      }

      // For post-related notifications, count based on profile type
      if (notification.type === 'post_like' || notification.type === 'post_comment') {
        return activeProfileType === 'artist' || activeProfileType === 'venue';
      }

      // For photo comment, photo tag, and comment tag notifications, count for all profile types
      if (notification.type === 'photo_comment' || notification.type === 'photo_tag' || notification.type === 'comment_tag') {
        return true;
      }

      // For other notification types, count for all profiles
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

  async notifyBookingRequest(venueUserId: number, artistUserId: number, artistName: string, artistProfileName: string, bookingId?: number) {
    await this.createNotification({
      recipientId: venueUserId,
      senderId: artistUserId,
      type: 'booking_request',
      title: 'New Booking Request',
      message: `${artistName} (${artistProfileName}) wants to book your venue`,
      data: { 
        artistUserId, 
        artistName, 
        artistProfileName, 
        bookingId,
        bookingRequestId: bookingId, // Add this for consistency
        id: bookingId // Add this as fallback
      }
    });
  }

  async notifyBookingResponse(venueUserId: number, artistUserId: number, venueName: string, venueProfileName: string, status: string) {
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

  async notifyPhotoComment(recipientId: number, senderId: number, senderName: string, photoId: number, commentContent?: string, photoUrl?: string): Promise<void> {
    await this.createNotification({
      recipientId,
      senderId,
      type: "photo_comment",
      title: "New Photo Comment",
      message: `${senderName} commented on your photo`,
      data: { 
        photoId, 
        senderId, 
        commentContent: commentContent || "",
        photoUrl: photoUrl || ""
      },
    });
  }

  async notifyPhotoTag(recipientId: number, senderId: number, senderName: string, photoId: number, photoCaption?: string, photoUrl?: string): Promise<void> {
    await this.createNotification({
      recipientId,
      senderId,
      type: "photo_tag",
      title: "Tagged in Photo",
      message: `${senderName} tagged you in ${photoCaption}`,
      data: { 
        photoId, 
        senderId, 
        photoCaption: photoCaption || "",
        photoUrl: photoUrl || ""
      },
    });
  }

  async notifyCommentTag(recipientId: number, senderId: number, senderName: string, photoId: number, commentContent?: string, photoUrl?: string): Promise<void> {
    await this.createNotification({
      recipientId,
      senderId,
      type: "comment_tag",
      title: "Tagged in Comment",
      message: `${senderName} tagged you in a comment`,
      data: { 
        photoId, 
        senderId, 
        commentContent: commentContent || "",
        photoUrl: photoUrl || ""
      },
    });
  }

  async notifyMessage(recipientId: number, senderId: number, senderName: string, conversationId: number, message: string): Promise<void> {
    await this.createNotification({
      recipientId,
      senderId,
      type: 'message',
      title: 'New message',
      message: `${senderName}: ${message}`,
      data: { conversationId, messagePreview: message.substring(0, 100) }
    });
  }

  async notifyBookingConfirmed(venueUserId: number, artistUserId: number, venueName: string, venueProfileName: string, eventDate: string) {
    console.log(`Creating booking confirmed notification for user ${artistUserId}`);

    await this.createNotification({
      recipientId: artistUserId,
      senderId: venueUserId,
      type: 'booking_confirmed',
      title: 'Booking Confirmed! 🎉',
      message: `${venueName} (${venueProfileName}) has confirmed your booking for ${eventDate}`,
      data: { venueUserId, venueName, venueProfileName, eventDate }
    });
  }

  async notifyBookingDeclined(artistUserId: number, venueUserId: number, venueName: string, venueProfileName: string, declineMessage?: string | null) {
    console.log('Creating booking declined notification with decline message:', declineMessage);
    
    const message = declineMessage && declineMessage.trim()
      ? `${venueName} (${venueProfileName}) has declined your booking request`
      : `${venueName} (${venueProfileName}) has declined your booking request`;
    
    await this.createNotification({
      recipientId: artistUserId,
      senderId: venueUserId,
      type: 'booking_declined',
      title: 'Booking Declined',
      message,
      data: { 
        venueUserId, 
        venueName, 
        venueProfileName, 
        declineMessage: declineMessage && declineMessage.trim() ? declineMessage.trim() : null 
      }
    });
  }

  async notifyContractProposal(recipientId: number, senderId: number, senderName: string, venueName: string, contractTitle: string) {
    const settings = await this.getUserNotificationSettings(recipientId);
    if (!settings.contract_proposal?.inApp) return;

    const data = {
      senderId,
      senderName,
      venueName,
      contractTitle
    };

    await this.createNotification({
      recipientId,
      senderId,
      type: 'contract_proposal',
      title: 'Contract Proposal',
      message: `${venueName} has sent you a contract proposal: ${contractTitle}`,
      data
    });
  }

  async notifyContractAccepted(recipientId: number, senderId: number, senderName: string, contractTitle: string) {
    const settings = await this.getUserNotificationSettings(recipientId);
    if (!settings.contract_accepted?.inApp) return;

    const data = {
      senderId,
      senderName,
      contractTitle
    };

    await this.createNotification({
      recipientId,
      senderId,
      type: 'contract_accepted',
      title: 'Contract Accepted',
      message: `${senderName} has accepted your contract proposal: ${contractTitle}`,
      data
    });
  }

  async notifyContractRejected(recipientId: number, senderId: number, senderName: string, contractTitle: string) {
    const settings = await this.getUserNotificationSettings(recipientId);
    if (!settings.contract_rejected?.inApp) return;

    const data = {
      senderId,
      senderName,
      contractTitle
    };

    await this.createNotification({
      recipientId,
      senderId,
      type: 'contract_rejected',
      title: 'Contract Rejected',
      message: `${senderName} has rejected your contract proposal: ${contractTitle}`,
      data
    });
  }

  async notifyContractNegotiation(recipientId: number, senderId: number, senderName: string, contractTitle: string) {
    await this.createNotification({
      recipientId,
      senderId,
      type: 'contract_negotiation',
      title: 'Contract Negotiation Update',
      message: `${senderName} added a negotiation message to "${contractTitle}"`,
      data: {
        senderId,
        senderName,
        contractTitle
      }
    });
  }

  async notifyTicketTransfer(recipientId: number, senderId: number, senderName: string, eventName: string, transferType: string, salePrice?: number) {
    const message = transferType === 'sale' 
      ? `${senderName} wants to sell you a ticket to "${eventName}" for $${salePrice}`
      : `${senderName} wants to transfer a ticket to "${eventName}" to you`;

    await this.createNotification({
      recipientId,
      senderId,
      type: 'ticket_transfer',
      title: 'Ticket Transfer',
      message,
      data: {
        senderId,
        senderName,
        eventName,
        transferType,
        salePrice
      }
    });
  }

  async notifyTransferAccepted(recipientId: number, senderId: number, senderName: string, ticketId: number) {
    await this.createNotification({
      recipientId,
      senderId,
      type: 'transfer_accepted',
      title: 'Ticket Transfer Accepted',
      message: `${senderName} accepted your ticket transfer`,
      data: {
        senderId,
        senderName,
        ticketId
      }
    });
  }
}

// Dummy emitNotification function - replace with your actual WebSocket emission logic
function emitNotification(userId: number, notification: any) {
  console.log(`Emitting notification to user ${userId}:`, notification);
  // Add your WebSocket emission logic here (e.g., using Socket.io)
}

export const notificationService = new NotificationService();