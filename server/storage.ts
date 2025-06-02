import {
  users,
  profiles,
  posts,
  postLikes,
  comments,
  friendships,
  notifications,
  userNotificationSettings,
  profileInvitations,
  profileMemberships,
  type User,
  type Profile,
  type Post,
  type Comment,
  type PostLike,
  type Friendship,
  type Notification,
  type InsertNotification,
  type ProfileInvitation,
  type InsertProfileInvitation,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, asc, and, or, sql, inArray, isNotNull, isNull, lt } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<InsertUser>): Promise<User>;

  // Profile operations
  getProfile(id: number): Promise<Profile | undefined>;
  getProfilesByUserId(userId: number): Promise<Profile[]>;
  getActiveProfile(userId: number): Promise<Profile | undefined>;
  createProfile(profile: InsertProfile): Promise<Profile>;
  updateProfile(id: number, updates: Partial<InsertProfile>): Promise<Profile>;
  deleteProfile(id: number, deletedBy?: number, reason?: string): Promise<void>;
  restoreProfile(id: number, restoredBy: number): Promise<Profile>;
  permanentlyDeleteProfile(id: number): Promise<void>;
  getDeletedProfiles(userId?: number): Promise<Profile[]>;
  cleanupExpiredProfiles(): Promise<number>;
  setActiveProfile(userId: number, profileId: number): Promise<void>;
  searchProfiles(query: string, limit?: number): Promise<Profile[]>;

  // Shared profile operations
  getProfileMemberships(profileId: number): Promise<{ membership: ProfileMembership; user: User }[]>;
  getUserMemberships(userId: number): Promise<{ membership: ProfileMembership; profile: Profile }[]>;
  getUserProfileRole(userId: number, profileId: number): Promise<ProfileMembership | undefined>;
  createProfileMembership(membership: InsertProfileMembership): Promise<ProfileMembership>;
  updateProfileMembership(id: number, updates: Partial<InsertProfileMembership>): Promise<ProfileMembership>;
  removeProfileMembership(id: number): Promise<void>;
  checkProfilePermission(userId: number, profileId: number, permission: string): Promise<boolean>;

  // Profile invitation operations
  createProfileInvitation(invitation: InsertProfileInvitation): Promise<ProfileInvitation>;
  getProfileInvitations(profileId: number): Promise<ProfileInvitation[]>;
  getInvitationByToken(token: string): Promise<ProfileInvitation | undefined>;
  getInvitationById(id: number): Promise<ProfileInvitation | undefined>;
  acceptProfileInvitation(token: string, userId: number): Promise<ProfileMembership>;
  declineProfileInvitation(token: string): Promise<void>;
  deleteProfileInvitation(id: number): Promise<void>;

  // Friendship operations
  getFriends(profileId: number): Promise<Profile[]>;
  getFriendRequests(profileId: number): Promise<{ profile: Profile; friendship: Friendship }[]>;
  getSentFriendRequests(profileId: number): Promise<{ profile: Profile; friendship: Friendship }[]>;
  sendFriendRequest(requesterId: number, addresseeId: number): Promise<Friendship>;
  acceptFriendRequest(friendshipId: number): Promise<Friendship>;
  rejectFriendRequest(friendshipId: number): Promise<Friendship>;
  getFriendshipStatus(profileId1: number, profileId2: number): Promise<Friendship | undefined>;
  areFriends(profileId1: number, profileId2: number): Promise<boolean>;

  // Post operations
  getPosts(profileId: number, viewerProfileId?: number): Promise<Post[]>;
  getFeedPosts(profileId: number, limit?: number): Promise<Post[]>;
  createPost(post: InsertPost): Promise<Post>;
  updatePost(id: number, updates: Partial<InsertPost>): Promise<Post>;
  deletePost(id: number): Promise<void>;
  likePost(postId: number, profileId: number): Promise<PostLike>;
  unlikePost(postId: number, profileId: number): Promise<void>;
  isPostLikedByProfile(postId: number, profileId: number): Promise<boolean>;

  // Comment operations
  getComments(postId: number): Promise<{ comment: Comment; profile: Profile }[]>;
  createComment(comment: InsertComment): Promise<Comment>;
  deleteComment(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select({
      id: users.id,
      email: users.email,
      password: users.password,
      firstName: users.firstName,
      lastName: users.lastName,
      profileImageUrl: users.profileImageUrl,
      coverImageUrl: users.coverImageUrl,
      profileBackground: users.profileBackground,
      showOnlineStatus: users.showOnlineStatus,
      allowFriendRequests: users.allowFriendRequests,
      showActivityStatus: users.showActivityStatus,
      emailNotifications: users.emailNotifications,
      notifyFriendRequests: users.notifyFriendRequests,
      notifyMessages: users.notifyMessages,
      notifyPostLikes: users.notifyPostLikes,
      notifyComments: users.notifyComments,
      theme: users.theme,
      language: users.language,
      compactMode: users.compactMode,
      autoplayVideos: users.autoplayVideos,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    }).from(users).where(eq(users.id, id));
    console.log("Storage getUser result:", JSON.stringify(user, null, 2));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select({
      id: users.id,
      email: users.email,
      password: users.password,
      firstName: users.firstName,
      lastName: users.lastName,
      profileImageUrl: users.profileImageUrl,
      coverImageUrl: users.coverImageUrl,
      profileBackground: users.profileBackground,
      showOnlineStatus: users.showOnlineStatus,
      allowFriendRequests: users.allowFriendRequests,
      showActivityStatus: users.showActivityStatus,
      emailNotifications: users.emailNotifications,
      notifyFriendRequests: users.notifyFriendRequests,
      notifyMessages: users.notifyMessages,
      notifyPostLikes: users.notifyPostLikes,
      notifyComments: users.notifyComments,
      theme: users.theme,
      language: users.language,
      compactMode: users.compactMode,
      autoplayVideos: users.autoplayVideos,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    }).from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .returning();
    return user;
  }

  async updateUser(id: number, data: Partial<typeof users.$inferInsert>) {
    console.log("Updating user with data:", data);
    const [updatedUser] = await db
      .update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        profileImageUrl: users.profileImageUrl,
        coverImageUrl: users.coverImageUrl,
        profileBackground: users.profileBackground,
        showOnlineStatus: users.showOnlineStatus,
        allowFriendRequests: users.allowFriendRequests,
        showActivityStatus: users.showActivityStatus,
        emailNotifications: users.emailNotifications,
        notifyFriendRequests: users.notifyFriendRequests,
        notifyMessages: users.notifyMessages,
        notifyPostLikes: users.notifyPostLikes,
        notifyComments: users.notifyComments,
        theme: users.theme,
        language: users.language,
        compactMode: users.compactMode,
        autoplayVideos: users.autoplayVideos,
      });

    console.log("Updated user result:", updatedUser);
    return updatedUser;
  }

  // Profile operations
  async getProfile(id: number): Promise<Profile | undefined> {
    const [profile] = await db.select().from(profiles).where(eq(profiles.id, id));
    return profile;
  }

  async getProfilesByUserId(userId: number): Promise<Profile[]> {
    return db.select().from(profiles).where(
      and(
        eq(profiles.userId, userId),
        isNull(profiles.deletedAt)
      )
    ).orderBy(desc(profiles.createdAt));
  }

  async getActiveProfile(userId: number): Promise<Profile | undefined> {
    const [profile] = await db
      .select()
      .from(profiles)
      .where(and(
        eq(profiles.userId, userId), 
        eq(profiles.isActive, true),
        isNull(profiles.deletedAt)
      ));
    return profile;
  }

  async createProfile(profile: InsertProfile): Promise<Profile> {
    // If this is the first profile for the user, make it active
    const existingProfiles = await this.getProfilesByUserId(profile.userId);
    const isFirstProfile = existingProfiles.length === 0;

    const [newProfile] = await db
      .insert(profiles)
      .values({
        ...profile,
        isActive: isFirstProfile,
      })
      .returning();

    // If this is a shared profile (artist/venue), create owner membership
    if ((profile.type === 'artist' || profile.type === 'venue') && profile.userId) {
      await db.insert(profileMemberships).values({
        profileId: newProfile.id,
        userId: profile.userId,
        role: 'owner',
        permissions: ['manage_profile', 'manage_members', 'manage_posts', 'manage_events', 'manage_bookings', 'view_analytics', 'moderate_content'],
        status: 'active',
        invitedBy: profile.userId,
      });
    }

    return newProfile;
  }

  async updateProfile(id: number, updates: Partial<InsertProfile>): Promise<Profile> {
    const [profile] = await db
      .update(profiles)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(profiles.id, id))
      .returning();
    return profile;
  }

  async setActiveProfile(userId: number, profileId: number): Promise<void> {
    // Deactivate all profiles for the user
    await db
      .update(profiles)
      .set({ isActive: false })
      .where(eq(profiles.userId, userId));

    // Activate the selected profile
    await db
      .update(profiles)
      .set({ isActive: true })
      .where(eq(profiles.id, profileId));
  }

  async deleteProfile(id: number, deletedBy?: number, reason?: string): Promise<void> {
    console.log(`Attempting to soft delete profile with id: ${id}`);

    try {
      // Get the profile to delete
      const profile = await this.getProfile(id);
      if (!profile) {
        throw new Error(`Profile with id ${id} not found`);
      }

      // Check if already soft deleted
      if (profile.deletedAt) {
        throw new Error(`Profile with id ${id} is already deleted`);
      }

      // Create backup data
      const backupData = await this.createProfileBackup(id);

      // Get all members for email notifications
      const members = await this.getProfileMemberships(id);

      // Get the user who deleted the profile for notification
      const deletedByUser = deletedBy ? await this.getUser(deletedBy) : null;
      const deletedByName = deletedByUser ? `${deletedByUser.firstName} ${deletedByUser.lastName}` : 'System';

      // Soft delete the profile
      const deletedAt = new Date();
      const [updatedProfile] = await db
        .update(profiles)
        .set({
          deletedAt,
          deletedBy,
          deletionReason: reason,
          backupData,
          isActive: false, // Deactivate the profile
          updatedAt: deletedAt
        })
        .where(eq(profiles.id, id))
        .returning();

      if (!updatedProfile) {
        throw new Error(`Failed to soft delete profile with id ${id}`);
      }

      console.log(`Successfully soft deleted profile ${id}`);

      // Send email notifications to all members (async, don't wait)
      this.sendDeletionNotifications(profile, members, deletedByName, deletedAt)
        .catch(error => console.error('Failed to send deletion notifications:', error));

    } catch (error) {
      console.error(`Error soft deleting profile ${id}:`, error);
      throw error;
    }
  }

  private async createProfileBackup(profileId: number): Promise<any> {
    try {
      // Get all related data
      const profile = await this.getProfile(profileId);
      const profilePosts = await db.select().from(posts).where(eq(posts.profileId, profileId));
      const memberships = await this.getProfileMemberships(profileId);
      const invitations = await this.getProfileInvitations(profileId);

      // Get friendships
      const profileFriendships = await db.select().from(friendships).where(
        or(
          eq(friendships.requesterId, profileId),
          eq(friendships.addresseeId, profileId)
        )
      );

      // Get comments for all posts
      const postIds = profilePosts.map(p => p.id);
      const comments = postIds.length > 0 
        ? await db.select().from(comments).where(inArray(comments.postId, postIds))
        : [];

      // Get likes for all posts
      const likes = postIds.length > 0
        ? await db.select().from(postLikes).where(inArray(postLikes.postId, postIds))
        : [];

      return {
        profile,
        posts: profilePosts,
        memberships: memberships.map(m => m.membership),
        invitations,
        friendships: profileFriendships,
        comments,
        likes,
        backedUpAt: new Date(),
        version: '1.0'
      };
    } catch (error) {
      console.error(`Error creating backup for profile ${profileId}:`, error);
      throw error;
    }
  }

  private async sendDeletionNotifications(
    profile: Profile, 
    members: { membership: ProfileMembership; user: User }[],
    deletedByName: string,
    deletedAt: Date
  ): Promise<void> {
    const { notificationService } = await import('./notifications');

    // Calculate restoration deadline (30 days from deletion)
    const restorationDeadline = new Date(deletedAt);
    restorationDeadline.setDate(restorationDeadline.getDate() + 30);

    // Collect all user IDs to notify
    const userIdsToNotify: number[] = [];

    // Add all members
    for (const member of members) {
      userIdsToNotify.push(member.user.id);
    }

    // Also notify profile owner if it's an individual profile and not already in members
    if (profile.userId && !userIdsToNotify.includes(profile.userId)) {
      userIdsToNotify.push(profile.userId);
    }

    // Send notifications to all users
    try {
      await notificationService.notifyProfileDeleted(
        userIdsToNotify,
        profile.name,
        deletedByName
      );
      console.log(`Profile deletion notifications sent to ${userIdsToNotify.length} users`);
    } catch (error) {
      console.error(`Failed to send profile deletion notifications:`, error);
    }
  }

  async restoreProfile(id: number, restoredBy: number): Promise<Profile> {
    console.log(`Attempting to restore profile with id: ${id}`);

    try {
      const profile = await this.getProfile(id);
      if (!profile) {
        throw new Error(`Profile with id ${id} not found`);
      }

      if (!profile.deletedAt) {
        throw new Error(`Profile with id ${id} is not deleted`);
      }

      // Check if within restoration period (30 days)
      const deletionDate = new Date(profile.deletedAt);
      const restorationDeadline = new Date(deletionDate);
      restorationDeadline.setDate(restorationDeadline.getDate() + 30);

      if (new Date() > restorationDeadline) {
        throw new Error('Restoration period has expired (30 days)');
      }

      // Restore the profile
      const [restoredProfile] = await db
        .update(profiles)
        .set({
          deletedAt: null,
          deletedBy: null,
          deletionReason: null,
          updatedAt: new Date()
          // Keep backupData for audit purposes
        })
        .where(eq(profiles.id, id))
        .returning();

      console.log(`Successfully restored profile ${id}`);
      return restoredProfile;
    } catch (error) {
      console.error(`Error restoring profile ${id}:`, error);
      throw error;
    }
  }

  async permanentlyDeleteProfile(id: number): Promise<void> {
    console.log(`Attempting to permanently delete profile with id: ${id}`);

    try {
      const profile = await this.getProfile(id);
      if (!profile) {
        throw new Error(`Profile with id ${id} not found`);
      }

      if (!profile.deletedAt) {
        throw new Error(`Profile with id ${id} is not soft deleted`);
      }

      // First delete any related posts (which will cascade to comments and likes)
      const profilePosts = await db.select().from(posts).where(eq(posts.profileId, id));
      for (const post of profilePosts) {
        await this.deletePost(post.id);
      }

      // Delete any friendships involving this profile
      await db.delete(friendships).where(
        or(
          eq(friendships.requesterId, id),
          eq(friendships.addresseeId, id)
        )
      );

      // Delete profile memberships
      await db.delete(profileMemberships).where(eq(profileMemberships.profileId, id));

      // Delete profile invitations
      await db.delete(profileInvitations).where(eq(profileInvitations.profileId, id));

      // Finally delete the profile
      const result = await db.delete(profiles).where(eq(profiles.id, id));

      if (result.rowCount === 0) {
        throw new Error(`Profile with id ${id} not found or already deleted`);
      }

      console.log(`Successfully permanently deleted profile ${id}`);
    } catch (error) {
      console.error(`Error permanently deleting profile ${id}:`, error);
      throw error;
    }
  }

  async getDeletedProfiles(userId?: number): Promise<Profile[]> {
    const query = db
      .select()
      .from(profiles)
      .where(isNotNull(profiles.deletedAt));

    if (userId) {
      query.where(eq(profiles.userId, userId));
    }

    return query.orderBy(desc(profiles.deletedAt));
  }

  async cleanupExpiredProfiles(): Promise<number> {
    console.log('Starting cleanup of expired soft-deleted profiles');

    try {
      // Find profiles deleted more than 30 days ago
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const expiredProfiles = await db
        .select()
        .from(profiles)
        .where(
          and(
            isNotNull(profiles.deletedAt),
            lt(profiles.deletedAt, thirtyDaysAgo)
          )
        );

      let deletedCount = 0;
      for (const profile of expiredProfiles) {
        try {
          await this.permanentlyDeleteProfile(profile.id);
          deletedCount++;
        } catch (error) {
          console.error(`Failed to permanently delete expired profile ${profile.id}:`, error);
        }
      }

      console.log(`Cleanup completed: ${deletedCount} expired profiles permanently deleted`);
      return deletedCount;
    } catch (error) {
      console.error('Error during profile cleanup:', error);
      throw error;
    }
  }

  async searchProfiles(query: string, limit = 20): Promise<Profile[]> {
    return db
      .select()
      .from(profiles)
      .where(sql`${profiles.name} ILIKE ${`%${query}%`}`)
      .limit(limit);
  }

  // Friendship operations
  async getFriends(profileId: number): Promise<Profile[]> {
    const friendshipResults = await db
      .select({
        profile: profiles,
      })
      .from(friendships)
      .innerJoin(
        profiles,
        or(
          and(eq(friendships.requesterId, profileId), eq(profiles.id, friendships.addresseeId)),
          and(eq(friendships.addresseeId, profileId), eq(profiles.id, friendships.requesterId))
        )
      )
      .where(eq(friendships.status, "accepted"));

    return friendshipResults.map(f => f.profile);
  }

  async getFriendRequests(profileId: number): Promise<{ profile: Profile; friendship: Friendship }[]> {
    const requests = await db
      .select({
        profile: profiles,
        friendship: friendships,
      })
      .from(friendships)
      .innerJoin(profiles, eq(profiles.id, friendships.requesterId))
      .where(and(eq(friendships.addresseeId, profileId), eq(friendships.status, "pending")));

    return requests;
  }

  async getSentFriendRequests(profileId: number): Promise<{ profile: Profile; friendship: Friendship }[]> {
    const requests = await db
      .select({
        profile: profiles,
        friendship: friendships,
      })
      .from(friendships)
      .innerJoin(profiles, eq(profiles.id, friendships.addresseeId))
      .where(and(eq(friendships.requesterId, profileId), eq(friendships.status, "pending")));

    return requests;
  }

  async sendFriendRequest(requesterId: number, addresseeId: number): Promise<Friendship> {
    const [friendship] = await db
      .insert(friendships)
      .values({ requesterId, addresseeId })
      .returning();
    return friendship;
  }

  async acceptFriendRequest(friendshipId: number): Promise<Friendship> {
    const [friendship] = await db
      .update(friendships)
      .set({ status: "accepted", updatedAt: new Date() })
      .where(eq(friendships.id, friendshipId))
      .returning();
    return friendship;
  }

  async rejectFriendRequest(friendshipId: number): Promise<Friendship> {
    const [friendship] = await db
      .update(friendships)
      .set({ status: "rejected", updatedAt: new Date() })
      .where(eq(friendships.id, friendshipId))
      .returning();
    return friendship;
  }

  async getFriendshipStatus(profileId1: number, profileId2: number): Promise<Friendship | undefined> {
    const [friendship] = await db
      .select()
      .from(friendships)
      .where(
        or(
          and(eq(friendships.requesterId, profileId1), eq(friendships.addresseeId, profileId2)),
          and(eq(friendships.requesterId, profileId2), eq(friendships.addresseeId, profileId1))
        )
      );
    return friendship;
  }

  async areFriends(profileId1: number, profileId2: number): Promise<boolean> {
    const friendship = await this.getFriendshipStatus(profileId1, profileId2);
    return friendship?.status === "accepted";
  }

  // Post operations
  async getPosts(profileId: number, viewerProfileId?: number): Promise<Post[]> {
    // Get posts with profile information joined, including user profile image
    const query = db
      .select({
        id: posts.id,
        profileId: posts.profileId,
        content: posts.content,
        imageUrl: posts.imageUrl,
        visibility: posts.visibility,
        likesCount: posts.likesCount,
        commentsCount: posts.commentsCount,
        createdAt: posts.createdAt,
        updatedAt: posts.updatedAt,
        profile: {
          id: profiles.id,
          name: sql`CONCAT(${users.firstName}, ' ', ${users.lastName})`, // Use first and last name
          profileImageUrl: users.profileImageUrl, // Get from users table
          type: profiles.type,
        }
      })
      .from(posts)
      .innerJoin(profiles, eq(posts.profileId, profiles.id))
      .innerJoin(users, eq(profiles.userId, users.id))
      .where(eq(posts.profileId, profileId))
      .orderBy(desc(posts.createdAt));

    const allPosts = await query;

    if (!viewerProfileId || viewerProfileId === profileId) {
      // Owner can see all their posts
      return allPosts;
    }

    // Filter based on visibility and friendship status
    const areFriends = await this.areFriends(profileId, viewerProfileId);

    return allPosts.filter(post => {
      if (post.visibility === "public") return true;
      if (post.visibility === "friends" && areFriends) return true;
      return false;
    });
  }

  async getFeedPosts(profileId: number, limit = 20): Promise<Post[]> {
    // Get posts from friends and own posts
    const friends = await this.getFriends(profileId);
    const friendIds = friends.map(f => f.id);
    friendIds.push(profileId); // Include own posts

    const feedPosts = await db
      .select({
        id: posts.id,
        profileId: posts.profileId,
        content: posts.content,
        imageUrl: posts.imageUrl,
        visibility: posts.visibility,
        likesCount: posts.likesCount,
        commentsCount: posts.commentsCount,
        createdAt: posts.createdAt,
        updatedAt: posts.updatedAt,
        // Flattened profile data for better compatibility
        profileName: sql`CONCAT(${users.firstName}, ' ', ${users.lastName})`, // Use first and last name
        profileImageUrl: users.profileImageUrl, // Get from users table
        profileType: profiles.type,
        // Also include nested profile object
        profile: {
          id: profiles.id,
          name: sql`CONCAT(${users.firstName}, ' ', ${users.lastName})`, // Use first and last name
          profileImageUrl: users.profileImageUrl, // Get from users table
          type: profiles.type,
        }
      })
      .from(posts)
      .innerJoin(profiles, eq(posts.profileId, profiles.id))
      .innerJoin(users, eq(profiles.userId, users.id))
      .where(
        and(
          inArray(posts.profileId, friendIds),
          or(
            eq(posts.visibility, "public"),
            eq(posts.visibility, "friends")
          )
        )
      )
      .orderBy(desc(posts.createdAt))
      .limit(limit);

    return feedPosts;
  }

  async createPost(post: InsertPost): Promise<Post> {
    const [newPost] = await db.insert(posts).values(post).returning();
    return newPost;
  }

  async updatePost(id: number, updates: Partial<InsertPost>): Promise<Post> {
    const [post] = await db
      .update(posts)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(posts.id, id))
      .returning();
    return post;
  }

  async deletePost(id: number): Promise<void> {
    console.log(`Attempting to delete post with id: ${id}`);

    try {
      // First delete any related post likes
      const likesResult = await db.delete(postLikes).where(eq(postLikes.postId, id));
      console.log(`Deleted ${likesResult.rowCount || 0} likes`);

      // Then delete any comments
      const commentsResult = await db.delete(comments).where(eq(comments.postId, id));
      console.log(`Deleted ${commentsResult.rowCount || 0} comments`);

      // Finally delete the post
      const postResult = await db.delete(posts).where(eq(posts.id, id));
      console.log(`Deleted ${postResult.rowCount || 0} posts`);

      if (postResult.rowCount === 0) {
        throw new Error(`Post with id ${id} not found or already deleted`);
      }

      console.log(`Successfully deleted post ${id}`);
    } catch (error) {
      console.error(`Error deleting post ${id}:`, error);
      throw error;
    }
  }

  async likePost(postId: number, profileId: number): Promise<PostLike> {
    const [like] = await db
      .insert(postLikes)
      .values({ postId, profileId })
      .returning();

    // Update like count
    await db
      .update(posts)
      .set({ 
        likesCount: sql`${posts.likesCount} + 1`,
        updatedAt: new Date()
      })
      .where(eq(posts.id, postId));

    return like;
  }

  async unlikePost(postId: number, profileId: number): Promise<void> {
    await db
      .delete(postLikes)
      .where(and(eq(postLikes.postId, postId), eq(postLikes.profileId, profileId)));

    // Update like count
    await db
      .update(posts)
      .set({ 
        likesCount: sql`${posts.likesCount} - 1`,
        updatedAt: new Date()
      })
      .where(eq(posts.id, postId));
  }

  async isPostLikedByProfile(postId: number, profileId: number): Promise<boolean> {
    const [like] = await db
      .select()
      .from(postLikes)
      .where(and(eq(postLikes.postId, postId), eq(postLikes.profileId, profileId)));
    return !!like;
  }

  // Comment operations
  async getComments(postId: number): Promise<{ comment: Comment; profile: Profile }[]> {
    const commentsWithProfiles = await db
      .select({
        comment: comments,
        profile: profiles,
      })
      .from(comments)
      .innerJoin(profiles, eq(profiles.id, comments.profileId))
      .where(eq(comments.postId, postId))
      .orderBy(desc(comments.createdAt));

    return commentsWithProfiles;
  }

  async createComment(comment: InsertComment): Promise<Comment> {
    const [newComment] = await db.insert(comments).values(comment).returning();

    // Update comment count
    await db
      .update(posts)
      .set({ 
        commentsCount: sql`${posts.commentsCount} + 1`,
        updatedAt: new Date()
      })
      .where(eq(posts.id, comment.postId));

    return newComment;
  }

  async deleteComment(id: number): Promise<void> {
    const [comment] = await db.select().from(comments).where(eq(comments.id, id));
    if (comment) {
      await db.delete(comments).where(eq(comments.id, id));

      // Update comment count
      await db
        .update(posts)
        .set({ 
          commentsCount: sql`${posts.commentsCount} - 1`,
          updatedAt: new Date()
        })
        .where(eq(posts.id, comment.postId));
    }
  }

  // Shared profile operations
  async getProfileMemberships(profileId: number): Promise<{ membership: ProfileMembership; user: User }[]> {
    try {
      console.log(`Getting memberships for profile ${profileId}`);

      // First get the profile to identify the owner
      const profile = await this.getProfile(profileId);
      if (!profile) {
        return [];
      }

      // Get actual memberships
      const memberships = await db
        .select({
          membership: {
            id: profileMemberships.id,
            profileId: profileMemberships.profileId,
            userId: profileMemberships.userId,
            role: profileMemberships.role,
            permissions: profileMemberships.permissions,
            status: profileMemberships.status,
            joinedAt: profileMemberships.joinedAt,
          },
          user: {
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email,
            profileImageUrl: users.profileImageUrl,
          },
        })
        .from(profileMemberships)
        .innerJoin(users, eq(profileMemberships.userId, users.id))
        .where(eq(profileMemberships.profileId, profileId));

      console.log("Actual memberships found:", JSON.stringify(memberships, null, 2));

      // Always add the profile creator as owner if not already in memberships
      const ownerMembership = memberships.find(m => m.membership.userId === profile.userId && m.membership.role === "owner");
      
      if (!ownerMembership) {
        const owner = await this.getUser(profile.userId);
        if (owner) {
          console.log("Adding profile creator as owner");
          const ownerEntry = {
            membership: {
              id: -1, // Special ID for profile owner
              profileId: profileId,
              userId: profile.userId,
              role: "owner" as const,
              permissions: [] as string[],
              status: "active" as const,
              joinedAt: profile.createdAt,
            },
            user: {
              id: owner.id,
              firstName: owner.firstName,
              lastName: owner.lastName,
              email: owner.email,
              profileImageUrl: owner.profileImageUrl,
            },
          };
          
          // Add owner at the beginning of the list
          return [ownerEntry, ...memberships];
        }
      }

      return memberships;
    } catch (error) {
      console.error("Error in getProfileMemberships:", error);
      throw error;
    }
  }

  async getUserMemberships(userId: number): Promise<{ membership: ProfileMembership; profile: Profile }[]> {
    const memberships = await db
      .select({
        membership: profileMemberships,
        profile: profiles,
      })
      .from(profileMemberships)
      .innerJoin(profiles, eq(profileMemberships.profileId, profiles.id))
      .where(eq(profileMemberships.userId, userId))
      .orderBy(profileMemberships.joinedAt);

    return memberships;
  }

  async getUserProfileRole(userId: number, profileId: number): Promise<ProfileMembership | undefined> {
    const [membership] = await db
      .select()
      .from(profileMemberships)
      .where(
        and(
          eq(profileMemberships.userId, userId),
          eq(profileMemberships.profileId, profileId),
          eq(profileMemberships.status, "active")
        )
      );

    return membership;
  }

  async createProfileMembership(membership: InsertProfileMembership): Promise<ProfileMembership> {
    const [newMembership] = await db
      .insert(profileMemberships)
      .values(membership)
      .returning();

    return newMembership;
  }

  async updateProfileMembership(id: number, updates: Partial<InsertProfileMembership>): Promise<ProfileMembership> {
    const [membership] = await db
      .update(profileMemberships)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(profileMemberships.id, id))
      .returning();

    return membership;
  }

  async removeProfileMembership(id: number): Promise<void> {
    await db.delete(profileMemberships).where(eq(profileMemberships.id, id));
  }

  async checkProfilePermission(userId: number, profileId: number, permission: string): Promise<boolean> {
    const membership = await this.getUserProfileRole(userId, profileId);
    if (!membership) return false;

    // Check if user has the specific permission
    if (membership.permissions?.includes(permission)) return true;

    // Owner and admin roles have all permissions
    if (membership.role === "owner" || membership.role === "admin") return true;

    // Manager role has most permissions except member management
    if (membership.role === "manager" && permission !== "manage_members") return true;

    return false;
  }

  // Profile invitation operations
  async createProfileInvitation(invitation: InsertProfileInvitation): Promise<ProfileInvitation> {
    // Generate unique token
    const token = require('crypto').randomBytes(32).toString('hex');

    const [newInvitation] = await db
      .insert(profileInvitations)
      .values({
        ...invitation,
        token,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      })
      .returning();

    return newInvitation;
  }

  async getProfileInvitations(profileId: number): Promise<ProfileInvitation[]> {
    const invitations = await db
      .select()
      .from(profileInvitations)
      .where(
        and(
          eq(profileInvitations.profileId, profileId),
          eq(profileInvitations.status, "pending")
        )
      )
      .orderBy(profileInvitations.createdAt);

    return invitations;
  }

  async getInvitationByToken(token: string): Promise<ProfileInvitation | undefined> {
    const [invitation] = await db
      .select()
      .from(profileInvitations)
      .where(eq(profileInvitations.token, token));

    return invitation;
  }

  async acceptProfileInvitation(token: string, userId: number): Promise<ProfileMembership> {
    const invitation = await this.getInvitationByToken(token);
    if (!invitation || invitation.status !== "pending" || invitation.expiresAt < new Date()) {
      throw new Error("Invalid or expired invitation");
    }

    // Create membership
    const membership = await this.createProfileMembership({
      profileId: invitation.profileId,
      userId,
      role: invitation.role,
      permissions: invitation.permissions || [],
      invitedBy: invitation.invitedBy,
    });

    // Update invitation status
    await db
      .update(profileInvitations)
      .set({ status: "accepted", updatedAt: new Date() })
      .where(eq(profileInvitations.id, invitation.id));

    return membership;
  }

  async declineProfileInvitation(token: string): Promise<void> {
    await db
      .update(profileInvitations)
      .set({ status: "declined", updatedAt: new Date() })
      .where(eq(profileInvitations.token, token));
  }

  async getInvitationById(id: number): Promise<ProfileInvitation | undefined> {
    const [invitation] = await db
      .select()
      .from(profileInvitations)
      .where(eq(profileInvitations.id, id));
    return invitation;
  }

  async deleteProfileInvitation(id: number): Promise<void> {
    await db
      .delete(profileInvitations)
      .where(eq(profileInvitations.id, id));
  }
}

export const storage = new DatabaseStorage();