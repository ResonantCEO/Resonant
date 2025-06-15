import { eq, and, or, desc, asc, sql, like, ilike, ne, isNull, isNotNull } from "drizzle-orm";
import { db } from "./db";
import {
  users,
  profiles,
  posts,
  friendships,
  comments,
  postLikes,
  profileMemberships,
  profileInvitations,
  notifications,
  userNotificationSettings,
  bookingRequests,
  type User,
  type Profile,
  type Post,
  type Friendship,
  type Comment,
  type InsertUser,
  type InsertProfile,
  type InsertPost,
  type InsertComment,
  type InsertFriendship,
  type InsertProfileMembership,
  type InsertProfileInvitation,
  type InsertNotification,
  type InsertUserNotificationSettings,
} from "@shared/schema";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export class Storage {
  // User operations
  async createUser(userData: InsertUser): Promise<User> {
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    const [user] = await db
      .insert(users)
      .values({ ...userData, password: hashedPassword })
      .returning();

    // Create default audience profile
    await this.createProfile({
      userId: user.id,
      name: `${userData.firstName} ${userData.lastName}`,
      type: 'audience',
      bio: '',
      isActive: true,
    });

    return user;
  }

  async getUser(id: number): Promise<User | null> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || null;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User> {
    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async verifyPassword(email: string, password: string): Promise<User | null> {
    const user = await this.getUserByEmail(email);
    if (!user) return null;

    const isValid = await bcrypt.compare(password, user.password);
    return isValid ? user : null;
  }

  // Profile operations
  async createProfile(profileData: InsertProfile): Promise<Profile> {
    const [profile] = await db.insert(profiles).values(profileData).returning();
    return profile;
  }

  async getProfile(id: number): Promise<Profile | null> {
    const [profile] = await db
      .select()
      .from(profiles)
      .where(and(eq(profiles.id, id), isNull(profiles.deletedAt)));
    return profile || null;
  }

  async getProfilesByUserId(userId: number): Promise<Profile[]> {
    return await db
      .select()
      .from(profiles)
      .where(and(eq(profiles.userId, userId), isNull(profiles.deletedAt)))
      .orderBy(desc(profiles.createdAt));
  }

  async getActiveProfile(userId: number): Promise<Profile | null> {
    const [profile] = await db
      .select()
      .from(profiles)
      .where(
        and(
          eq(profiles.userId, userId),
          eq(profiles.isActive, true),
          isNull(profiles.deletedAt)
        )
      );
    return profile || null;
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
      .where(and(eq(profiles.id, profileId), eq(profiles.userId, userId)));
  }

  async updateProfile(id: number, updates: Partial<Profile>): Promise<Profile> {
    const [profile] = await db
      .update(profiles)
      .set(updates)
      .where(eq(profiles.id, id))
      .returning();
    return profile;
  }

  async deleteProfile(profileId: number, userId: number, reason?: string): Promise<void> {
    await db
      .update(profiles)
      .set({ 
        deletedAt: new Date(),
        deletionReason: reason || 'User requested deletion'
      })
      .where(and(eq(profiles.id, profileId), eq(profiles.userId, userId)));
  }

  async getDeletedProfiles(userId: number): Promise<Profile[]> {
    return await db
      .select()
      .from(profiles)
      .where(and(eq(profiles.userId, userId), isNotNull(profiles.deletedAt)))
      .orderBy(desc(profiles.deletedAt));
  }

  async restoreProfile(profileId: number, userId: number): Promise<Profile> {
    const [profile] = await db
      .update(profiles)
      .set({ 
        deletedAt: null,
        deletionReason: null
      })
      .where(and(eq(profiles.id, profileId), eq(profiles.userId, userId)))
      .returning();

    if (!profile) {
      throw new Error("Profile not found or cannot be restored");
    }

    return profile;
  }

  async cleanupExpiredProfiles(): Promise<number> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await db
      .delete(profiles)
      .where(
        and(
          isNotNull(profiles.deletedAt),
          sql`${profiles.deletedAt} < ${thirtyDaysAgo}`
        )
      );

    return result.length || 0;
  }

  // Search and discover operations
  async searchProfiles(query?: string, type?: string, location?: string, limit = 20, offset = 0): Promise<Profile[]> {
    let whereConditions: any[] = [isNull(profiles.deletedAt)];

    if (query) {
      whereConditions.push(
        or(
          ilike(profiles.name, `%${query}%`),
          ilike(profiles.bio, `%${query}%`)
        )
      );
    }

    if (type && ['artist', 'venue', 'audience'].includes(type)) {
      whereConditions.push(eq(profiles.type, type as any));
    }

    if (location) {
      whereConditions.push(ilike(profiles.location, `%${location}%`));
    }

    return await db
      .select()
      .from(profiles)
      .where(and(...whereConditions))
      .orderBy(desc(profiles.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async discoverProfiles(type?: string, location?: string, genre?: string, limit: number = 20, offset: number = 0, excludeProfileId?: number): Promise<Profile[]> {
    let whereConditions: any[] = [isNull(profiles.deletedAt)];

    if (type && ['artist', 'venue', 'audience'].includes(type)) {
      whereConditions.push(eq(profiles.type, type as any));
    }

    if (location) {
      whereConditions.push(ilike(profiles.location, `%${location}%`));
    }

    if (genre) {
      whereConditions.push(
        or(
          ilike(profiles.genre, `%${genre}%`),
          ilike(profiles.bio, `%${genre}%`)
        )
      );
    }

    if (excludeProfileId) {
      whereConditions.push(ne(profiles.id, excludeProfileId));
    }

    return await db
      .select()
      .from(profiles)
      .where(and(...whereConditions))
      .orderBy(sql`RANDOM()`)
      .limit(limit)
      .offset(offset);
  }

  // Post operations
  async createPost(postData: InsertPost): Promise<Post> {
    const [post] = await db.insert(posts).values(postData).returning();
    return post;
  }

  async getPosts(profileId: number, viewerProfileId?: number): Promise<any[]> {
    const postsQuery = db
      .select({
        id: posts.id,
        content: posts.content,
        imageUrl: posts.imageUrl,
        createdAt: posts.createdAt,
        profileId: posts.profileId,
        profile: {
          id: profiles.id,
          name: profiles.name,
          profileImageUrl: profiles.profileImageUrl,
          type: profiles.type,
        },
      })
      .from(posts)
      .innerJoin(profiles, eq(posts.profileId, profiles.id))
      .where(eq(posts.profileId, profileId))
      .orderBy(desc(posts.createdAt));

    const postsResult = await postsQuery;

    // Get like counts and viewer's like status for all posts
    const postIds = postsResult.map(p => p.id);

    if (postIds.length === 0) return [];

    const likeCounts = await db
      .select({
        postId: postLikes.postId,
        count: sql<number>`count(*)`.as('count'),
      })
      .from(postLikes)
      .where(sql`${postLikes.postId} = ANY(ARRAY[${postIds.join(',')}])`)
      .groupBy(postLikes.postId);

    const likeCountMap = new Map(likeCounts.map(lc => [lc.postId, lc.count]));

    // Get viewer's likes if authenticated
    let viewerLikes = new Set<number>();
    if (viewerProfileId) {
      const viewerLikesResult = await db
        .select({ postId: postLikes.postId })
        .from(postLikes)
        .where(
          and(
            sql`${postLikes.postId} = ANY(ARRAY[${postIds.join(',')}])`,
            eq(postLikes.profileId, viewerProfileId)
          )
        );
      viewerLikes = new Set(viewerLikesResult.map(vl => vl.postId));
    }

    return postsResult.map(post => ({
      ...post,
      likeCount: likeCountMap.get(post.id) || 0,
      isLiked: viewerLikes.has(post.id),
    }));
  }

  async getFeedPosts(profileId: number): Promise<any[]> {
    // Get friends' profile IDs
    const friendships2 = await db
      .select({
        friendId: sql<number>`CASE 
          WHEN ${friendships.requesterId} = ${profileId} THEN ${friendships.addresseeId}
          ELSE ${friendships.requesterId}
        END`.as('friendId')
      })
      .from(friendships)
      .where(
        and(
          or(
            eq(friendships.requesterId, profileId),
            eq(friendships.addresseeId, profileId)
          ),
          eq(friendships.status, 'accepted')
        )
      );

    const friendIds = friendships2.map(f => f.friendId);
    friendIds.push(profileId); // Include own posts

    if (friendIds.length === 0) return [];

    const postsQuery = db
      .select({
        id: posts.id,
        content: posts.content,
        imageUrl: posts.imageUrl,
        createdAt: posts.createdAt,
        profileId: posts.profileId,
        profile: {
          id: profiles.id,
          name: profiles.name,
          profileImageUrl: profiles.profileImageUrl,
          type: profiles.type,
        },
      })
      .from(posts)
      .innerJoin(profiles, eq(posts.profileId, profiles.id))
      .where(sql`${posts.profileId} = ANY(ARRAY[${friendIds.join(',')}])`)
      .orderBy(desc(posts.createdAt))
      .limit(50);

    const postsResult = await postsQuery;
    const postIds = postsResult.map(p => p.id);

    if (postIds.length === 0) return [];

    // Get like counts
    const likeCounts = await db
      .select({
        postId: postLikes.postId,
        count: sql<number>`count(*)`.as('count'),
      })
      .from(postLikes)
      .where(sql`${postLikes.postId} = ANY(ARRAY[${postIds.join(',')}])`)
      .groupBy(postLikes.postId);

    const likeCountMap = new Map(likeCounts.map(lc => [lc.postId, lc.count]));

    // Get viewer's likes
    const viewerLikesResult = await db
      .select({ postId: postLikes.postId })
      .from(postLikes)
      .where(
        and(
          sql`${postLikes.postId} = ANY(ARRAY[${postIds.join(',')}])`,
          eq(postLikes.profileId, profileId)
        )
      );
    const viewerLikes = new Set(viewerLikesResult.map(vl => vl.postId));

    return postsResult.map(post => ({
      ...post,
      likeCount: likeCountMap.get(post.id) || 0,
      isLiked: viewerLikes.has(post.id),
    }));
  }

  async deletePost(postId: number): Promise<void> {
    console.log(`Storage.deletePost called with postId: ${postId}`);

    try {
      // First delete all likes for this post
      console.log(`Deleting likes for post ${postId}`);
      await db.delete(postLikes).where(eq(postLikes.postId, postId));

      // Then delete all comments for this post
      console.log(`Deleting comments for post ${postId}`);
      await db.delete(comments).where(eq(comments.postId, postId));

      // Finally delete the post itself
      console.log(`Deleting post ${postId}`);
      const result = await db.delete(posts).where(eq(posts.id, postId));

      console.log(`Post deletion result:`, result);
      console.log(`Storage.deletePost completed for postId: ${postId}`);
    } catch (error) {
      console.error(`Error in Storage.deletePost for postId ${postId}:`, error);
      throw error;
    }
  }

  // Like operations
  async likePost(postId: number, profileId: number): Promise<void> {
    await db.insert(postLikes).values({ postId, profileId }).onConflictDoNothing();
  }

  async unlikePost(postId: number, profileId: number): Promise<void> {
    await db
      .delete(postLikes)
      .where(and(eq(postLikes.postId, postId), eq(postLikes.profileId, profileId)));
  }

  async isPostLikedByProfile(postId: number, profileId: number): Promise<boolean> {
    const [like] = await db
      .select()
      .from(postLikes)
      .where(and(eq(postLikes.postId, postId), eq(postLikes.profileId, profileId)));
    return !!like;
  }

  // Comment operations
  async createComment(commentData: InsertComment): Promise<any> {
    const [comment] = await db.insert(comments).values(commentData).returning();

    // Join with profile to get comment with profile info
    const [commentWithProfile] = await db
      .select({
        id: comments.id,
        content: comments.content,
        createdAt: comments.createdAt,
        postId: comments.postId,
        profileId: comments.profileId,
        profile: {
          id: profiles.id,
          name: profiles.name,
          profileImageUrl: profiles.profileImageUrl,
          type: profiles.type,
        },
      })
      .from(comments)
      .innerJoin(profiles, eq(comments.profileId, profiles.id))
      .where(eq(comments.id, comment.id));

    return commentWithProfile;
  }

  async getComments(postId: number): Promise<any[]> {
    return await db
      .select({
        id: comments.id,
        content: comments.content,
        createdAt: comments.createdAt,
        postId: comments.postId,
        profileId: comments.profileId,
        profile: {
          id: profiles.id,
          name: profiles.name,
          profileImageUrl: profiles.profileImageUrl,
          type: profiles.type,
        },
      })
      .from(comments)
      .innerJoin(profiles, eq(comments.profileId, profiles.id))
      .where(eq(comments.postId, postId))
      .orderBy(asc(comments.createdAt));
  }

  // Friend operations
  async sendFriendRequest(requesterId: number, addresseeId: number): Promise<Friendship> {
    const [friendship] = await db
      .insert(friendships)
      .values({
        requesterId,
        addresseeId,
        status: 'pending',
      })
      .returning();
    return friendship;
  }

  async getFriendRequests(profileId: number): Promise<any[]> {
    const results = await db
      .select({
        id: friendships.id,
        status: friendships.status,
        createdAt: friendships.createdAt,
        requesterId: friendships.requesterId,
        addresseeId: friendships.addresseeId,
        requester: {
          id: profiles.id,
          name: profiles.name,
          profileImageUrl: profiles.profileImageUrl,
          type: profiles.type,
        },
      })
      .from(friendships)
      .innerJoin(profiles, eq(friendships.requesterId, profiles.id))
      .where(
        and(
          eq(friendships.addresseeId, profileId),
          eq(friendships.status, 'pending')
        )
      )
      .orderBy(desc(friendships.createdAt));

    // Return results with proper friendship object structure
    return results.map(result => ({
      ...result.requester,
      friendship: {
        id: result.id,
        status: result.status,
        createdAt: result.createdAt,
        requesterId: result.requesterId,
        addresseeId: result.addresseeId
      }
    }));
  }

  async getFriends(profileId: number): Promise<any[]> {
    const result = await db
      .select({
        friendshipId: friendships.id,
        friendshipStatus: friendships.status,
        friendshipCreatedAt: friendships.createdAt,
        friendId: sql<number>`CASE 
          WHEN ${friendships.requesterId} = ${profileId} THEN ${friendships.addresseeId}
          ELSE ${friendships.requesterId}
        END`.as('friendId'),
        friendName: profiles.name,
        friendProfileImageUrl: profiles.profileImageUrl,
        friendType: profiles.type,
        friendBio: profiles.bio,
        friendLocation: profiles.location,
      })
      .from(friendships)
      .innerJoin(
        profiles,
        sql`${profiles.id} = CASE 
          WHEN ${friendships.requesterId} = ${profileId} THEN ${friendships.addresseeId}
          ELSE ${friendships.requesterId}
        END`
      )
      .where(
        and(
          or(
            eq(friendships.requesterId, profileId),
            eq(friendships.addresseeId, profileId)
          ),
          eq(friendships.status, 'accepted')
        )
      )
      .orderBy(desc(friendships.createdAt));

    // Transform the result to match the expected structure
    return result.map(row => ({
      id: row.friendId,
      name: row.friendName,
      profileImageUrl: row.friendProfileImageUrl,
      type: row.friendType,
      bio: row.friendBio,
      location: row.friendLocation,
      friendship: {
        id: row.friendshipId,
        status: row.friendshipStatus,
        createdAt: row.friendshipCreatedAt,
      }
    }));
  }

  async acceptFriendRequest(friendshipId: number): Promise<Friendship> {
    const [friendship] = await db
      .update(friendships)
      .set({ status: 'accepted' })
      .where(eq(friendships.id, friendshipId))
      .returning();

    // Clean up any friend request notifications for this friendship
    if (friendship) {
      const { notificationService } = await import('./notifications');
      await db
        .delete(notifications)
        .where(
          and(
            eq(notifications.type, 'friend_request'),
            sql`${notifications.data}->>'senderId' = ${friendship.requesterId.toString()}`
          )
        );
    }

    return friendship;
  }

  async rejectFriendRequest(friendshipId: number): Promise<Friendship> {
    const [friendship] = await db
      .update(friendships)
      .set({ status: 'rejected' })
      .where(eq(friendships.id, friendshipId))
      .returning();

    // Clean up any friend request notifications for this friendship
    if (friendship) {
      const { notificationService } = await import('./notifications');
      await db
        .delete(notifications)
        .where(
          and(
            eq(notifications.type, 'friend_request'),
            sql`${notifications.data}->>'senderId' = ${friendship.requesterId.toString()}`
          )
        );
    }

    return friendship;
  }

  async getFriendshipStatus(profileId1: number, profileId2: number): Promise<Friendship | null> {
    const [friendship] = await db
      .select()
      .from(friendships)
      .where(
        or(
          and(
            eq(friendships.requesterId, profileId1),
            eq(friendships.addresseeId, profileId2)
          ),
          and(
            eq(friendships.requesterId, profileId2),
            eq(friendships.addresseeId, profileId1)
          )
        )
      );
    return friendship || null;
  }

  async getFriendshipById(friendshipId: number): Promise<Friendship | null> {
    const [friendship] = await db
      .select()
      .from(friendships)
      .where(eq(friendships.id, friendshipId));
    return friendship || null;
  }

  async deleteFriendship(friendshipId: number): Promise<void> {
    await db
      .delete(friendships)
      .where(eq(friendships.id, friendshipId));
  }

  // Profile membership operations
  async getProfileMemberships(profileId: number): Promise<any[]> {
    return await db
      .select({
        membership: profileMemberships,
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
      .where(eq(profileMemberships.profileId, profileId))
      .orderBy(desc(profileMemberships.createdAt));
  }

  async getUserMemberships(userId: number): Promise<any[]> {
    return await db
      .select({
        membership: profileMemberships,
        profile: {
          id: profiles.id,
          name: profiles.name,
          type: profiles.type,
          profileImageUrl: profiles.profileImageUrl,
        },
      })
      .from(profileMemberships)
      .innerJoin(profiles, eq(profileMemberships.profileId, profiles.id))
      .where(eq(profileMemberships.userId, userId))
      .orderBy(desc(profileMemberships.createdAt));
  }

  async checkProfilePermission(userId: number, profileId: number, permission: string): Promise<boolean> {
    // Check if user is the profile owner
    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.id, profileId));

    if (profile?.userId === userId) {
      return true;
    }

    // Check if user has membership with the required permission
    const [membership] = await db
      .select()
      .from(profileMemberships)
      .where(
        and(
          eq(profileMemberships.userId, userId),
          eq(profileMemberships.profileId, profileId)
        )
      );

    if (!membership) {
      return false;
    }

    // Check if user has admin role or specific permission
    if (membership.role === 'admin') {
      return true;
    }

    return membership.permissions.includes(permission);
  }

  async createProfileInvitation(invitationData: any): Promise<any> {
    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    const [invitation] = await db
      .insert(profileInvitations)
      .values({
        ...invitationData,
        token,
        expiresAt,
      })
      .returning();

    return invitation;
  }

  async acceptProfileInvitation(token: string, userId: number): Promise<any> {
    const [invitation] = await db
      .select()
      .from(profileInvitations)
      .where(eq(profileInvitations.token, token));

    if (!invitation) {
      throw new Error("Invalid invitation token");
    }

    if (invitation.expiresAt < new Date()) {
      throw new Error("Invitation has expired");
    }

    if (invitation.status !== 'pending') {
      throw new Error("Invitation has already been processed");
    }

    // Check if user email matches
    const user = await this.getUser(userId);
    if (!user || user.email !== invitation.invitedEmail) {
      throw new Error("User email does not match invitation");
    }

    // Create membership
    const [membership] = await db
      .insert(profileMemberships)
      .values({
        userId,
        profileId: invitation.profileId,
        role: invitation.role,
        permissions: invitation.permissions,
        addedBy: invitation.invitedBy,
      })
      .returning();

    // Update invitation status
    await db
      .update(profileInvitations)
      .set({ status: 'accepted' })
      .where(eq(profileInvitations.id, invitation.id));

    return membership;
  }

  async declineProfileInvitation(token: string): Promise<void> {
    await db
      .update(profileInvitations)
      .set({ status: 'declined' })
      .where(eq(profileInvitations.token, token));
  }

  async getProfileInvitations(profileId: number): Promise<any[]> {
    return await db
      .select()
      .from(profileInvitations)
      .where(eq(profileInvitations.profileId, profileId))
      .orderBy(desc(profileInvitations.createdAt));
  }

  async getInvitationById(id: number): Promise<any> {
    const [invitation] = await db
      .select()
      .from(profileInvitations)
      .where(eq(profileInvitations.id, id));
    return invitation;
  }

  async deleteProfileInvitation(id: number): Promise<void> {
    await db.delete(profileInvitations).where(eq(profileInvitations.id, id));
  }

  async updateProfileMembership(membershipId: number, updates: any): Promise<any> {
    const [membership] = await db
      .update(profileMemberships)
      .set(updates)
      .where(eq(profileMemberships.id, membershipId))
      .returning();
    return membership;
  }

  async removeProfileMembership(membershipId: number): Promise<void> {
    await db.delete(profileMemberships).where(eq(profileMemberships.id, membershipId));
  }

  async getUserProfileRole(userId: number, profileId: number): Promise<any> {
    const [membership] = await db
      .select()
      .from(profileMemberships)
      .where(
        and(
          eq(profileMemberships.userId, userId),
          eq(profileMemberships.profileId, profileId)
        )
      );
    return membership;
  }

  // Booking request operations
  async createBookingRequest(bookingData: any): Promise<any> {
    const [booking] = await db
      .insert(bookingRequests)
      .values(bookingData)
      .returning();
    return booking;
  }

  async getBookingRequests(profileId: number, profileType: string): Promise<any[]> {
    if (profileType === 'artist') {
      // Get requests sent by this artist
      return await db
        .select({
          id: bookingRequests.id,
          status: bookingRequests.status,
          requestedAt: bookingRequests.requestedAt,
          venue: {
            id: profiles.id,
            name: profiles.name,
            profileImageUrl: profiles.profileImageUrl,
            location: profiles.location,
          },
        })
        .from(bookingRequests)
        .innerJoin(profiles, eq(bookingRequests.venueProfileId, profiles.id))
        .where(eq(bookingRequests.artistProfileId, profileId))
        .orderBy(desc(bookingRequests.requestedAt));
    } else if (profileType === 'venue') {
      // Get requests received by this venue
      return await db
        .select({
          id: bookingRequests.id,
          status: bookingRequests.status,
          requestedAt: bookingRequests.requestedAt,
          artist: {
            id: profiles.id,
            name: profiles.name,
            profileImageUrl: profiles.profileImageUrl,
            genre: profiles.genre,
          },
        })
        .from(bookingRequests)
        .innerJoin(profiles, eq(bookingRequests.artistProfileId, profiles.id))
        .where(eq(bookingRequests.venueProfileId, profileId))
        .orderBy(desc(bookingRequests.requestedAt));
    }

    return [];
  }

  async updateBookingRequestStatus(requestId: number, status: string, profileId: number): Promise<any> {
    const [booking] = await db
      .update(bookingRequests)
      .set({ status })
      .where(eq(bookingRequests.id, requestId))
      .returning();
    return booking;
  }

  async getBookingRequestById(requestId: number): Promise<any> {
    const [booking] = await db
      .select()
      .from(bookingRequests)
      .where(eq(bookingRequests.id, requestId));
    return booking;
  }
}

export const storage = new Storage();