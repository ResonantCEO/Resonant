import { db } from "./db";
import { 
  users, 
  profiles, 
  posts, 
  postLikes, 
  comments, 
  friendships, 
  notifications,
  profileMemberships,
  profileInvitations,
  albums,
  photos,
  photoComments,
  bookingRequests,
  conversations,
  conversationParticipants,
  messages,
  messageReads,
  profileViews
} from "@shared/schema";
import { eq, and, or, sql, desc, asc, not, isNull, inArray, ne, lt, ilike, gt, isNotNull } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { lookupZipcode, formatCityState } from "./zipcode-lookup";

export class Storage {
  // User operations
  async createUser(userData: { email: string; password: string; firstName?: string; lastName?: string; birthdate?: Date | null }): Promise<User> {
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

  async getUser(id: number) {
    console.log("Storage - getUser called with ID:", id);

    const result = await db.select().from(users).where(eq(users.id, id));
    console.log("Storage - Raw database result:", JSON.stringify(result, null, 2));

    if (result.length === 0) {
      console.log("Storage - No user found");
      return null;
    }

    const user = result[0];
    console.log("Storage - User found:", JSON.stringify(user, null, 2));
    console.log("Storage - User coverImageUrl exists:", 'coverImageUrl' in user);
    console.log("Storage - User coverImageUrl value:", user.coverImageUrl);

    // Format hometown if it's a zipcode
    if (user.hometown) {
      const zipcodeInfo = lookupZipcode(user.hometown);
      if (zipcodeInfo) {
        return {
          ...user,
          hometownDisplay: formatCityState(zipcodeInfo.city, zipcodeInfo.state),
          hometownZipcode: user.hometown
        };
      }
    }

    return user;
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
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const expiredProfiles = await db
        .select({ id: profiles.id })
        .from(profiles)
        .where(
          and(
            isNotNull(profiles.deletedAt),
            lt(profiles.deletedAt, thirtyDaysAgo)
          )
        );

      if (expiredProfiles.length === 0) {
        return 0;
      }

      const profileIds = expiredProfiles.map(p => p.id);

      // Permanently delete the profiles and their data
      await db.delete(profiles).where(inArray(profiles.id, profileIds));

      console.log(`Permanently deleted ${expiredProfiles.length} expired profiles`);
      return expiredProfiles.length;
    } catch (error) {
      console.error("Error cleaning up expired profiles:", error);
      throw error;
    }
  }

  // Search and Discovery functions
  async searchProfiles(query?: string, type?: string, location?: string, limit: number = 20, offset: number = 0): Promise<Profile[]> {
    try {
      let whereConditions = [isNull(profiles.deletedAt)];

      if (query) {
        whereConditions.push(
          or(
            ilike(profiles.name, `%${query}%`),
            ilike(profiles.bio, `%${query}%`)
          )
        );
      }

      if (type && type !== 'all') {
        whereConditions.push(eq(profiles.type, type as any));
      }

      if (location && location !== 'all-locations') {
        whereConditions.push(ilike(profiles.location, `%${location}%`));
      }

      return await db
        .select()
        .from(profiles)
        .where(and(...whereConditions))
        .orderBy(desc(profiles.createdAt))
        .limit(limit)
        .offset(offset);
    } catch (error) {
      console.error("Error searching profiles:", error);
      throw error;
    }
  }

  async discoverProfiles(type?: string, location?: string, genre?: string, limit: number = 20, offset: number = 0, excludeProfileId?: number): Promise<Profile[]> {
    try {
      let whereConditions = [isNull(profiles.deletedAt)];

      if (excludeProfileId) {
        whereConditions.push(ne(profiles.id, excludeProfileId));
      }

      if (type && type !== 'all') {
        whereConditions.push(eq(profiles.type, type as any));
      }

      if (location && location !== 'all-locations') {
        whereConditions.push(ilike(profiles.location, `%${location}%`));
      }

      // Note: Genre filtering would need to be implemented when genre support is added to profiles

      return await db
        .select()
        .from(profiles)
        .where(and(...whereConditions))
        .orderBy(desc(profiles.createdAt))
        .limit(limit)
        .offset(offset);
    } catch (error) {
      console.error("Error discovering profiles:", error);
      throw error;
    }
  }

  // Friend functions
  async getFriends(profileId: number): Promise<any[]> {
    try {
      const friendsData = await db
        .select({
          friendship: friendships,
          profile: profiles,
        })
        .from(friendships)
        .innerJoin(profiles, 
          or(
            and(eq(friendships.requesterId, profileId), eq(friendships.addresseeId, profiles.id)),
            and(eq(friendships.addresseeId, profileId), eq(friendships.requesterId, profiles.id))
          )
        )
        .where(
          and(
            eq(friendships.status, 'accepted'),
            ne(profiles.id, profileId),
            isNull(profiles.deletedAt)
          )
        )
        .orderBy(profiles.name);

      return friendsData.map(item => ({
        ...item.profile,
        friendshipId: item.friendship.id,
        friendsSince: item.friendship.createdAt,
      }));
    } catch (error) {
      console.error("Error fetching friends:", error);
      throw error;
    }
  }

  async getFriendRequests(profileId: number) {
    const requests = await db
      .select({
        friendship: {
          id: friendships.id,
          requesterId: friendships.requesterId,
          addresseeId: friendships.addresseeId,
          status: friendships.status,
          createdAt: friendships.createdAt,
        },
        // Profile data from the requester
        id: profiles.id,
        name: profiles.name,
        profileImageUrl: profiles.profileImageUrl,
        type: profiles.type,
        bio: profiles.bio,
        location: profiles.location,
        website: profiles.website,
        genre: profiles.genre,
        // Add user data as fallback
        userId: profiles.userId,
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

    console.log(`getFriendRequests: Found ${requests.length} requests for profile ${profileId}`);
    if (requests.length > 0) {
      console.log('Sample request data:', requests[0]);
    }

    return requests;
  }

  async getFriendshipStatus(profileId1: number, profileId2: number): Promise<any> {
    try {
      const [friendship] = await db
        .select()
        .from(friendships)
        .where(
          or(
            and(eq(friendships.requesterId, profileId1), eq(friendships.addresseeId, profileId2)),
            and(eq(friendships.requesterId, profileId2), eq(friendships.addresseeId, profileId1))
          )
        )
        .limit(1);

      return friendship || null;
    } catch (error) {
      console.error("Error fetching friendship status:", error);
      throw error;
    }
  }

  async getFriendshipById(friendshipId: number): Promise<any> {
    try {
      const [friendship] = await db
        .select()
        .from(friendships)
        .where(eq(friendships.id, friendshipId))
        .limit(1);

      return friendship || null;
    } catch (error) {
      console.error("Error fetching friendship by ID:", error);
      throw error;
    }
  }

  async sendFriendRequest(requesterId: number, addresseeId: number): Promise<any> {
    try {
      const [friendship] = await db
        .insert(friendships)
        .values({
          requesterId,
          addresseeId,
          status: 'pending',
        })
        .returning();

      return friendship;
    } catch (error) {
      console.error("Error sending friend request:", error);
      throw error;
    }
  }

  async acceptFriendRequest(friendshipId: number): Promise<any> {
    try {
      const [friendship] = await db
        .update(friendships)
        .set({ status: 'accepted' })
        .where(eq(friendships.id, friendshipId))
        .returning();

      return friendship;
    } catch (error) {
      console.error("Error accepting friend request:", error);
      throw error;
    }
  }

  async rejectFriendRequest(friendshipId: number): Promise<any> {
    try {
      const [friendship] = await db
        .update(friendships)
        .set({ status: 'rejected' })
        .where(eq(friendships.id, friendshipId))
        .returning();

      return friendship;
    } catch (error) {
      console.error("Error rejecting friend request:", error);
      throw error;
    }
  }

  async deleteFriendship(friendshipId: number): Promise<void> {
    try {
      await db
        .delete(friendships)
        .where(eq(friendships.id, friendshipId));
    } catch (error) {
      console.error("Error deleting friendship:", error);
      throw error;
    }
  }

  // Post functions
  async getFeedPosts(profileId: number): Promise<any[]> {
    try {
      // Get friend IDs first
      const friendIds = await db
        .select({
          friendId: sql<number>`CASE 
            WHEN ${friendships.requesterId} = ${profileId} THEN ${friendships.addresseeId}
            ELSE ${friendships.requesterId}
          END`.as('friend_id')
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

      const friendProfileIds = friendIds.map(f => f.friendId);

      // Include own profile in feed
      const feedProfileIds = [profileId, ...friendProfileIds];

      const postsData = await db
        .select({
          post: posts,
          profile: profiles,
          likeCount: sql<number>`COUNT(DISTINCT ${postLikes.id})`.as('like_count'),
          commentCount: sql<number>`COUNT(DISTINCT ${comments.id})`.as('comment_count'),
          isLiked: sql<boolean>`COUNT(CASE WHEN ${postLikes.profileId} = ${profileId} THEN 1 END) > 0`.as('is_liked'),
        })
        .from(posts)
        .innerJoin(profiles, eq(posts.profileId, profiles.id))
        .leftJoin(postLikes, eq(posts.id, postLikes.postId))
        .leftJoin(comments, eq(posts.id, comments.postId))
        .where(
          and(
            inArray(posts.profileId, feedProfileIds),
            isNull(profiles.deletedAt)
          )
        )
        .groupBy(posts.id, profiles.id)
        .orderBy(desc(posts.createdAt));

      return postsData;
    } catch (error) {
      console.error("Error fetching feed posts:", error);
      throw error;
    }
  }

  async getPosts(profileId: number, viewerProfileId?: number): Promise<any[]> {
    try {
      const postsData = await db
        .select({
          post: posts,
          profile: profiles,
          likeCount: sql<number>`COUNT(DISTINCT ${postLikes.id})`.as('like_count'),
          commentCount: sql<number>`COUNT(DISTINCT ${comments.id})`.as('comment_count'),
          isLiked: viewerProfileId 
            ? sql<boolean>`COUNT(CASE WHEN ${postLikes.profileId} = ${viewerProfileId} THEN 1 END) > 0`.as('is_liked')
            : sql<boolean>`false`.as('is_liked'),
        })
        .from(posts)
        .innerJoin(profiles, eq(posts.profileId, profiles.id))
        .leftJoin(postLikes, eq(posts.id, postLikes.postId))
        .leftJoin(comments, eq(posts.id, comments.postId))
        .where(eq(posts.profileId, profileId))
        .groupBy(posts.id, profiles.id)
        .orderBy(desc(posts.createdAt));

      return postsData;
    } catch (error) {
      console.error("Error fetching posts:", error);
      throw error;
    }
  }

  async createPost(postData: InsertPost): Promise<any> {
    try {
      const [post] = await db
        .insert(posts)
        .values(postData)
        .returning();

      // Get the post with profile info
      const [postWithProfile] = await db
        .select({
          post: posts,
          profile: profiles,
          likeCount: sql<number>`0`.as('like_count'),
          commentCount: sql<number>`0`.as('comment_count'),
          isLiked: sql<boolean>`false`.as('is_liked'),
        })
        .from(posts)
        .innerJoin(profiles, eq(posts.profileId, profiles.id))
        .where(eq(posts.id, post.id));

      return postWithProfile;
    } catch (error) {
      console.error("Error creating post:", error);
      throw error;
    }
  }

  async deletePost(postId: number): Promise<void> {
    try {
      // Delete related data first
      await db.delete(postLikes).where(eq(postLikes.postId, postId));
      await db.delete(comments).where(eq(comments.postId, postId));

      // Delete the post
      await db.delete(posts).where(eq(posts.id, postId));
    } catch (error) {
      console.error("Error deleting post:", error);
      throw error;
    }
  }

  async likePost(postId: number, profileId: number): Promise<void> {
    try {
      await db
        .insert(postLikes)
        .values({ postId, profileId })
        .onConflictDoNothing();
    } catch (error) {
      console.error("Error liking post:", error);
      throw error;
    }
  }

  async unlikePost(postId: number, profileId: number): Promise<void> {
    try {
      await db
        .delete(postLikes)
        .where(
          and(
            eq(postLikes.postId, postId),
            eq(postLikes.profileId, profileId)
          )
        );
    } catch (error) {
      console.error("Error unliking post:", error);
      throw error;
    }
  }

  async isPostLikedByProfile(postId: number, profileId: number): Promise<boolean> {
    try {
      const [like] = await db
        .select()
        .from(postLikes)
        .where(
          and(
            eq(postLikes.postId, postId),
            eq(postLikes.profileId, profileId)
          )
        )
        .limit(1);

      return !!like;
    } catch (error) {
      console.error("Error checking if post is liked:", error);
      return false;
    }
  }

  // Comment functions
  async getComments(postId: number): Promise<any[]> {
    try {
      const commentsData = await db
        .select({
          comment: comments,
          profile: profiles,
        })
        .from(comments)
        .innerJoin(profiles, eq(comments.profileId, profiles.id))
        .where(eq(comments.postId, postId))
        .orderBy(comments.createdAt);

      return commentsData;
    } catch (error) {
      console.error("Error fetching comments:", error);
      throw error;
    }
  }

  async createComment(commentData: InsertComment): Promise<any> {
    try {
      const [comment] = await db
        .insert(comments)
        .values(commentData)
        .returning();

      // Get the comment with profile info
      const [commentWithProfile] = await db
        .select({
          comment: comments,
          profile: profiles,
        })
        .from(comments)
        .innerJoin(profiles, eq(comments.profileId, profiles.id))
        .where(eq(comments.id, comment.id));

      return commentWithProfile;
    } catch (error) {
      console.error("Error creating comment:", error);
      throw error;
    }
  }

  // Profile membership functions
  async getProfileMemberships(profileId: number): Promise<any[]> {
    try {
      const memberships = await db
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
        .orderBy(profileMemberships.createdAt);

      return memberships;
    } catch (error) {
      console.error("Error fetching profile memberships:", error);
      throw error;
    }
  }

  async getUserMemberships(userId: number): Promise<any[]> {
    try {
      const memberships = await db
        .select({
          membership: profileMemberships,
          profile: profiles,
        })
        .from(profileMemberships)
        .innerJoin(profiles, eq(profileMemberships.profileId, profiles.id))
        .where(
          and(
            eq(profileMemberships.userId, userId),
            isNull(profiles.deletedAt)
          )
        )
        .orderBy(profileMemberships.createdAt);

      return memberships;
    } catch (error) {
      console.error("Error fetching user memberships:", error);
      throw error;
    }
  }

  async checkProfilePermission(userId: number, profileId: number, permission: string): Promise<boolean> {
    try {
      // Check if user is the profile owner
      const [profile] = await db
        .select()
        .from(profiles)
        .where(eq(profiles.id, profileId))
        .limit(1);

      if (profile?.userId === userId) {
        return true;
      }

      // Check membership permissions
      const [membership] = await db
        .select()
        .from(profileMemberships)
        .where(
          and(
            eq(profileMemberships.profileId, profileId),
            eq(profileMemberships.userId, userId),
            eq(profileMemberships.status, 'active')
          )
        )
        .limit(1);

      if (!membership) {
        return false;
      }

      return membership.permissions.includes(permission);
    } catch (error) {
      console.error("Error checking profile permission:", error);
      return false;
    }
  }

  async createProfileInvitation(invitationData: any): Promise<any> {
    try {
      const token = crypto.randomBytes(32).toString('hex');

      const [invitation] = await db
        .insert(profileInvitations)
        .values({
          ...invitationData,
          token,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        })
        .returning();

      return invitation;
    } catch (error) {
      console.error("Error creating profile invitation:", error);
      throw error;
    }
  }

  async acceptProfileInvitation(token: string, userId: number): Promise<any> {
    try {
      const [invitation] = await db
        .select()
        .from(profileInvitations)
        .where(
          and(
            eq(profileInvitations.token, token),
            eq(profileInvitations.status, 'pending'),
            sql`${profileInvitations.expiresAt} > NOW()`
          )
        )
        .limit(1);

      if (!invitation) {
        throw new Error("Invalid or expired invitation");
      }

      // Create membership
      const [membership] = await db
        .insert(profileMemberships)
        .values({
          profileId: invitation.profileId,
          userId,
          role: invitation.role,
          permissions: invitation.permissions,
          status: 'active',
        })
        .returning();

      // Update invitation status
      await db
        .update(profileInvitations)
        .set({ status: 'accepted' })
        .where(eq(profileInvitations.id, invitation.id));

      return membership;
    } catch (error) {
      console.error("Error accepting profile invitation:", error);
      throw error;
    }
  }

  async declineProfileInvitation(token: string): Promise<void> {
    try {
      await db
        .update(profileInvitations)
        .set({ status: 'declined' })
        .where(eq(profileInvitations.token, token));
    } catch (error) {
      console.error("Error declining profile invitation:", error);
      throw error;
    }
  }

  async getUserProfileRole(userId: number, profileId: number): Promise<any> {
    try {
      const [membership] = await db
        .select()
        .from(profileMemberships)
        .where(
          and(
            eq(profileMemberships.userId, userId),
            eq(profileMemberships.profileId, profileId)
          )
        )
        .limit(1);

      return membership || null;
    } catch (error) {
      console.error("Error fetching user profile role:", error);
      return null;
    }
  }

  async updateProfileMembership(membershipId: number, updates: any): Promise<any> {
    try {
      const [membership] = await db
        .update(profileMemberships)
        .set(updates)
        .where(eq(profileMemberships.id, membershipId))
        .returning();

      return membership;
    } catch (error) {
      console.error("Error updating profile membership:", error);
      throw error;
    }
  }

  async removeProfileMembership(membershipId: number): Promise<void> {
    try {
      await db
        .delete(profileMemberships)
        .where(eq(profileMemberships.id, membershipId));
    } catch (error) {
      console.error("Error removing profile membership:", error);
      throw error;
    }
  }

  async getProfileInvitations(profileId: number): Promise<any[]> {
    try {
      return await db
        .select()
        .from(profileInvitations)
        .where(eq(profileInvitations.profileId, profileId))
        .orderBy(desc(profileInvitations.createdAt));
    } catch (error) {
      console.error("Error fetching profile invitations:", error);
      throw error;
    }
  }

  async getInvitationById(invitationId: number): Promise<any> {
    try {
      const [invitation] = await db
        .select()
        .from(profileInvitations)
        .where(eq(profileInvitations.id, invitationId))
        .limit(1);

      return invitation || null;
    } catch (error) {
      console.error("Error fetching invitation by ID:", error);
      return null;
    }
  }

  async deleteProfileInvitation(invitationId: number): Promise<void> {
    try {
      await db
        .delete(profileInvitations)
        .where(eq(profileInvitations.id, invitationId));
    } catch (error) {
      console.error("Error deleting profile invitation:", error);
      throw error;
    }
  }

  // Booking request functions
  async createBookingRequest(requestData: any): Promise<any> {
    try {
      console.log('Storage: Creating booking request with data:', requestData);

      // Ensure all required fields are present
      const sanitizedData = {
        artistProfileId: requestData.artistProfileId,
        venueProfileId: requestData.venueProfileId,
        status: requestData.status || 'pending',
        requestedAt: requestData.requestedAt || new Date(),
        eventDate: requestData.eventDate || null,
        eventTime: requestData.eventTime || null,
        budget: requestData.budget || null,
        requirements: requestData.requirements || null,
        message: requestData.message || null
      };

      console.log('Storage: Sanitized data:', sanitizedData);

      const [request] = await db
        .insert(bookingRequests)
        .values(sanitizedData)
        .returning();

      console.log('Storage: Booking request created:', request);
      return request;
    } catch (error) {
      console.error("Storage: Error creating booking request:", error);
      throw new Error(`Failed to create booking request: ${error.message}`);
    }
  }

  async getBookingRequests(profileId: number, profileType: string): Promise<any[]> {
    try {
      let whereCondition;

      if (profileType === 'artist') {
        whereCondition = eq(bookingRequests.artistProfileId, profileId);
      } else if (profileType === 'venue') {
        whereCondition = eq(bookingRequests.venueProfileId, profileId);
      } else {
        return [];
      }

      const requests = await db
        .select({
          request: bookingRequests,
          artistProfile: sql`artist_profile`,
          venueProfile: sql`venue_profile`,
        })
        .from(bookingRequests)
        .leftJoin(
          sql`profiles artist_profile`,
          sql`${bookingRequests.artistProfileId} = artist_profile.id`
        )
        .leftJoin(
          sql`profiles venue_profile`, 
          sql`${bookingRequests.venueProfileId} = venue_profile.id`
        )
        .where(whereCondition)
        .orderBy(desc(bookingRequests.requestedAt));

      return requests;
    } catch (error) {
      console.error("Error fetching booking requests:", error);
      throw error;
    }
  }

  async updateBookingRequestStatus(requestId: number, status: string, profileId: number): Promise<any> {
    try {
      const [request] = await db
        .update(bookingRequests)
        .set({ status })
        .where(eq(bookingRequests.id, requestId))
        .returning();

      return request;
    } catch (error) {
      console.error("Error updating booking request status:", error);
      throw error;
    }
  }

  async getBookingRequestById(requestId: number): Promise<any> {
    try {
      const [request] = await db
        .select()
        .from(bookingRequests)
        .where(eq(bookingRequests.id, requestId))
        .limit(1);

      return request || null;
    } catch (error) {
      console.error("Error fetching booking request by ID:", error);
      return null;
    }
  }

  // Messaging functions
  async getConversations(profileId: number): Promise<any[]> {
    try {
      const conversationsList = await db
        .select({
          conversation: conversations,
          participant: conversationParticipants,
          lastMessage: messages,
          sender: {
            id: profiles.id,
            name: profiles.name,
            profileImageUrl: profiles.profileImageUrl,
          },
          otherParticipant: {
            id: sql<number>`other_profile.id`.as('other_profile_id'),
            name: sql<string>`other_profile.name`.as('other_profile_name'),
            profileImageUrl: sql<string>`other_profile.profile_image_url`.as('other_profile_image'),
          }
        })
        .from(conversationParticipants)
        .innerJoin(conversations, eq(conversationParticipants.conversationId, conversations.id))
        .leftJoin(messages, eq(conversations.lastMessageId, messages.id))
        .leftJoin(profiles, eq(messages.senderId, profiles.id))
        .leftJoin(
          sql`(
            SELECT DISTINCT ON (cp2.conversation_id) 
              cp2.conversation_id,
              p2.id,
              p2.name,
              p2.profile_image_url
            FROM conversation_participants cp2
            JOIN profiles p2 ON cp2.profile_id = p2.id
            WHERE cp2.profile_id != ${profileId}
            ORDER BY cp2.conversation_id, cp2.joined_at
          ) other_profile`,
          sql`other_profile.conversation_id = ${conversations.id}`
        )
        .where(
          and(
            eq(conversationParticipants.profileId, profileId),
            isNull(conversationParticipants.leftAt)
          )
        )
        .orderBy(desc(conversations.lastActivityAt));

      // Get unread counts for each conversation
      const conversationIds = conversationsList.map(c => c.conversation.id);
      const unreadCounts = await this.getUnreadCounts(profileId, conversationIds);

      return conversationsList.map(conv => {
        const isDirectMessage = conv.conversation.type === 'direct';
        const displayName = isDirectMessage 
          ? conv.otherParticipant?.name || 'Unknown User'
          : conv.conversation.name;
        const displayImage = isDirectMessage
          ? conv.otherParticipant?.profileImageUrl          : conv.conversation.imageUrl;

        return {
          id: conv.conversation.id,
          type: conv.conversation.type,
          name: displayName,
          image: displayImage,
          lastMessage: conv.lastMessage ? {
            id: conv.lastMessage.id,
            content: conv.lastMessage.content,
            senderId: conv.lastMessage.senderId,
            senderName: conv.sender?.name,
            createdAt: conv.lastMessage.createdAt,
            messageType: conv.lastMessage.messageType,
          } : null,
          unreadCount: unreadCounts[conv.conversation.id] || 0,
          lastActivityAt: conv.conversation.lastActivityAt,
          isArchived: conv.participant.isArchived,
          isMuted: conv.participant.isMuted,
          participants: isDirectMessage ? [
            { id: profileId },
            { id: conv.otherParticipant?.id, name: conv.otherParticipant?.name }
          ] : undefined,
        };
      });
    } catch (error) {
      console.error("Error fetching conversations:", error);
      throw error;
    }
  }

  async getUnreadCounts(profileId: number, conversationIds: number[]): Promise<Record<number, number>> {
    if (conversationIds.length === 0) return {};

    try {
      const unreadCounts = await db
        .select({
          conversationId: messages.conversationId,
          count: sql<number>`COUNT(*)`.as('count'),
        })
        .from(messages)
        .innerJoin(conversationParticipants, 
          and(
            eq(messages.conversationId, conversationParticipants.conversationId),
            eq(conversationParticipants.profileId, profileId)
          )
        )
        .leftJoin(messageReads, 
          and(
            eq(messages.id, messageReads.messageId),
            eq(messageReads.profileId, profileId)
          )
        )
        .where(
          and(
            inArray(messages.conversationId, conversationIds),
            gt(messages.createdAt, conversationParticipants.lastReadAt),
            isNull(messageReads.id),
            isNull(messages.deletedAt)
          )
        )
        .groupBy(messages.conversationId);

      const result: Record<number, number> = {};
      unreadCounts.forEach(item => {
        result[item.conversationId] = item.count;
      });
      return result;
    } catch (error) {
      console.error("Error getting unread counts:", error);
      return {};
    }
  }

  // Create group conversation
  async createGroupConversation(data: {
    name: string;
    description?: string;
    createdBy: number;
    isPrivate?: boolean;
    maxMembers?: number;
    participantIds: number[];
  }) {
    const { name, description, createdBy, isPrivate = false, maxMembers = 50, participantIds } = data;

    // Create the conversation
    const [conversation] = await db.insert(conversations).values({
      type: 'group',
      name,
      description,
      createdBy,
      isPrivate,
      maxMembers,
      settings: {
        canMembersInvite: !isPrivate,
        canMembersLeave: true,
        adminOnlyMessages: false,
      },
    }).returning();

    // Add participants
    const participants = participantIds.map(profileId => ({
      conversationId: conversation.id,
      profileId,
      role: profileId === createdBy ? 'admin' : 'member',
    }));

    await db.insert(conversationParticipants).values(participants);

    return conversation;
  }

  // Add member to group
  async addGroupMember(conversationId: number, profileId: number, addedBy: number, role: string = 'member') {
    // Check if conversation is a group
    const conversation = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, conversationId))
      .limit(1);

    if (!conversation[0] || conversation[0].type !== 'group') {
      throw new Error('Not a group conversation');
    }

    // Check if user is already a member
    const existingMember = await db
      .select()
      .from(conversationParticipants)
      .where(and(
        eq(conversationParticipants.conversationId, conversationId),
        eq(conversationParticipants.profileId, profileId),
        isNull(conversationParticipants.leftAt)
      ))
      .limit(1);

    if (existingMember[0]) {
      throw new Error('User is already a member of this group');
    }

    // Check group member limit
    const memberCount = await db
      .select({ count: sql`count(*)` })
      .from(conversationParticipants)
      .where(and(
        eq(conversationParticipants.conversationId, conversationId),
        isNull(conversationParticipants.leftAt)
      ));

    if (Number(memberCount[0].count) >= conversation[0].maxMembers!) {
      throw new Error('Group has reached maximum member limit');
    }

    // Add member
    await db.insert(conversationParticipants).values({
      conversationId,
      profileId,
      role,
    });

    // Send system message
    await this.sendMessage({
      conversationId,
      senderId: addedBy,
      content: `Added new member to the group`,
      messageType: 'system',
    });

    return { success: true };
  }

  // Remove member from group
  async removeGroupMember(conversationId: number, profileId: number, removedBy: number) {
    // Update participant to mark as left
    await db
      .update(conversationParticipants)
      .set({ leftAt: new Date() })
      .where(and(
        eq(conversationParticipants.conversationId, conversationId),
        eq(conversationParticipants.profileId, profileId),
        isNull(conversationParticipants.leftAt)
      ));

    // Send system message
    await this.sendMessage({
      conversationId,
      senderId: removedBy,
      content: `Member left the group`,
      messageType: 'system',
    });

    return { success: true };
  }

  // Update group info
  async updateGroupInfo(conversationId: number, updatedBy: number, updates: {
    name?: string;
    description?: string;
    imageUrl?: string;
    settings?: any;
  }) {
    // Check if user is admin
    const participant = await db
      .select()
      .from(conversationParticipants)
      .where(and(
        eq(conversationParticipants.conversationId, conversationId),
        eq(conversationParticipants.profileId, updatedBy),
        isNull(conversationParticipants.leftAt)
      ))
      .limit(1);

    if (!participant[0] || participant[0].role !== 'admin') {
      throw new Error('Only group admins can update group info');
    }

    await db
      .update(conversations)
      .set(updates)
      .where(eq(conversations.id, conversationId));

    return { success: true };
  }

  // Get group members
  async getGroupMembers(conversationId: number) {
    const members = await db
      .select({
        participant: conversationParticipants,
        profile: {
          id: profiles.id,
          name: profiles.name,
          profileImageUrl: profiles.profileImageUrl,
          type: profiles.type,
        },
      })
      .from(conversationParticipants)
      .leftJoin(profiles, eq(conversationParticipants.profileId, profiles.id))
      .where(and(
        eq(conversationParticipants.conversationId, conversationId),
        isNull(conversationParticipants.leftAt)
      ))
      .orderBy(conversationParticipants.joinedAt);

    return members;
  }

  // Get or create direct conversation
  async getOrCreateDirectConversation(profileId1: number, profileId2: number): Promise<any> {
    try {
      // Check if conversation already exists - simplified approach
      const existingConversations = await db
        .select({
          conversationId: conversationParticipants.conversationId,
          count: sql<number>`COUNT(*)`.as('count')
        })
        .from(conversationParticipants)
        .innerJoin(conversations, eq(conversations.id, conversationParticipants.conversationId))
        .where(
          and(
            eq(conversations.type, 'direct'),
            inArray(conversationParticipants.profileId, [profileId1, profileId2]),
            isNull(conversationParticipants.leftAt)
          )
        )
        .groupBy(conversationParticipants.conversationId)
        .having(sql`COUNT(*) = 2`);

      if (existingConversations.length > 0) {
        // Get the full conversation
        const [existingConversation] = await db
          .select()
          .from(conversations)
          .where(eq(conversations.id, existingConversations[0].conversationId));
        return existingConversation;
      }

      // Create new conversation
      const [newConversation] = await db
        .insert(conversations)
        .values({
          type: 'direct',
          createdBy: profileId1,
        })
        .returning();

      // Add participants
      await db.insert(conversationParticipants).values([
        {
          conversationId: newConversation.id,
          profileId: profileId1,
        },
        {
          conversationId: newConversation.id,
          profileId: profileId2,
        },
      ]);

      return newConversation;
    } catch (error) {
      console.error("Error creating/getting direct conversation:", error);
      throw error;
    }
  }

  async getMessages(conversationId: number, profileId: number, limit: number = 50, offset: number = 0): Promise<any[]> {
    try {
      // Verify user is participant
      const participant = await db
        .select()
        .from(conversationParticipants)
        .where(
          and(
            eq(conversationParticipants.conversationId, conversationId),
            eq(conversationParticipants.profileId, profileId),
            isNull(conversationParticipants.leftAt)
          )
        )
        .limit(1);

      if (participant.length === 0) {
        throw new Error("Not authorized to view this conversation");
      }

      const messageList = await db
        .select({
          message: messages,
          sender: {
            id: profiles.id,
            name: profiles.name,
            profileImageUrl: profiles.profileImageUrl,
          },
          replyTo: {
            id: sql<number>`reply_msg.id`.as('reply_id'),
            content: sql<string>`reply_msg.content`.as('reply_content'),
            senderName: sql<string>`reply_sender.name`.as('reply_sender_name'),
          }
        })
        .from(messages)
        .innerJoin(profiles, eq(messages.senderId, profiles.id))
        .leftJoin(
          sql`messages reply_msg`,
          sql`${messages.replyToId} = reply_msg.id`
        )
        .leftJoin(
          sql`profiles reply_sender`,
          sql`reply_msg.sender_id = reply_sender.id`
        )
        .where(
          and(
            eq(messages.conversationId, conversationId),
            isNull(messages.deletedAt)
          )
        )
        .orderBy(desc(messages.createdAt))
        .limit(limit)
        .offset(offset);

      // Get read receipts for these messages
      const messageIds = messageList.map(m => m.message.id);
      const readReceipts = await this.getReadReceipts(messageIds);

      return messageList.reverse().map(msg => ({
        id: msg.message.id,
        content: msg.message.content,
        messageType: msg.messageType,
        senderId: msg.message.senderId,
        senderName: msg.sender.name,
        senderImage: msg.sender.profileImageUrl,
        attachments: msg.message.attachments,
        reactions: msg.message.reactions,
        replyTo: msg.replyTo?.id ? {
          id: msg.replyTo.id,
          content: msg.replyTo.content,
          senderName: msg.replyTo.senderName,
        } : null,
        readBy: readReceipts[msg.message.id] || [],
        editedAt: msg.message.editedAt,
        createdAt: msg.message.createdAt,
        updatedAt: msg.message.updatedAt,
      }));
    } catch (error) {
      console.error("Error fetching messages:", error);
      throw error;
    }
  }

  async getReadReceipts(messageIds: number[]): Promise<Record<number, any[]>> {
    if (messageIds.length === 0) return {};

    try {
      const reads = await db
        .select({
          messageId: messageReads.messageId,
          profileId: messageReads.profileId,
          profileName: profiles.name,
          profileImage: profiles.profileImageUrl,
          readAt: messageReads.readAt,
        })
        .from(messageReads)
        .innerJoin(profiles, eq(messageReads.profileId, profiles.id))
        .where(inArray(messageReads.messageId, messageIds));

      const result: Record<number, any[]> = {};
      reads.forEach(read => {
        if (!result[read.messageId]) {
          result[read.messageId] = [];
        }
        result[read.messageId].push({
          profileId: read.profileId,
          profileName: read.profileName,
          profileImage: read.profileImage,
          readAt: read.readAt,
        });
      });

      return result;
    } catch (error) {
      console.error("Error getting read receipts:", error);
      return {};
    }
  }

  async sendMessage(data: {
    conversationId: number;
    senderId: number;
    content: string;
    messageType?: string;
    replyToId?: number;
    attachments?: any[];
  }): Promise<any> {
    try {
      // Verify sender is participant
      const participant = await db
        .select()
        .from(conversationParticipants)
        .where(
          and(
            eq(conversationParticipants.conversationId, data.conversationId),
            eq(conversationParticipants.profileId, data.senderId),
            isNull(conversationParticipants.leftAt)
          )
        )
        .limit(1);

      if (participant.length === 0) {
        throw new Error("Not authorized to send messages in this conversation");
      }

      // Create message
      const [message] = await db
        .insert(messages)
        .values({
          conversationId: data.conversationId,
          senderId: data.senderId,
          content: data.content,
          messageType: data.messageType || 'text',
          replyToId: data.replyToId,
          attachments: data.attachments || [],
        })
        .returning();

      // Update conversation last activity and last message
      await db
        .update(conversations)
        .set({
          lastMessageId: message.id,
          lastActivityAt: new Date(),
        })
        .where(eq(conversations.id, data.conversationId));

      // Mark as read for sender
      await db.insert(messageReads).values({
        messageId: message.id,
        profileId: data.senderId,
      });

      // Get sender info
      const sender = await db
        .select({
          id: profiles.id,
          name: profiles.name,
          profileImageUrl: profiles.profileImageUrl,
        })
        .from(profiles)
        .where(eq(profiles.id, data.senderId))
        .limit(1);

      return {
        id: message.id,
        content: message.content,
        messageType: message.messageType,
        senderId: data.senderId,
        senderName: sender[0]?.name,
        senderImage: sender[0]?.profileImageUrl,
        attachments: message.attachments,
        reactions: message.reactions,
        replyTo: null, // Would need to fetch if replyToId exists
        readBy: [{
          profileId: data.senderId,
          profileName: sender[0]?.name,
          profileImage: sender[0]?.profileImageUrl,
          readAt: new Date(),
        }],
        createdAt: message.createdAt,
        updatedAt: message.updatedAt,
      };
    } catch (error) {
      console.error("Error sending message:", error);
      throw error;
    }
  }

  async markMessagesAsRead(conversationId: number, profileId: number, messageIds?: number[]): Promise<void> {
    try {
      // Verify user is participant
      const participant = await db
        .select()
        .from(conversationParticipants)
        .where(
          and(
            eq(conversationParticipants.conversationId, conversationId),
            eq(conversationParticipants.profileId, profileId),
            isNull(conversationParticipants.leftAt)
          )
        )
        .limit(1);

      if (participant.length === 0) {
        throw new Error("Not authorized to mark messages as read");
      }

      if (messageIds && messageIds.length > 0) {
        // Mark specific messages as read
        const existingReads = await db
          .select({ messageId: messageReads.messageId })
          .from(messageReads)
          .where(
            and(
              inArray(messageReads.messageId, messageIds),
              eq(messageReads.profileId, profileId)
            )
          );

        const existingMessageIds = existingReads.map(r => r.messageId);
        const newMessageIds = messageIds.filter(id => !existingMessageIds.includes(id));

        if (newMessageIds.length > 0) {
          await db.insert(messageReads).values(
            newMessageIds.map(messageId => ({
              messageId,
              profileId,
            }))
          );
        }
      } else {
        // Mark all unread messages as read
        const unreadMessages = await db
          .select({ id: messages.id })
          .from(messages)
          .leftJoin(messageReads, 
            and(
              eq(messages.id, messageReads.messageId),
              eq(messageReads.profileId, profileId)
            )
          )
          .where(
            and(
              eq(messages.conversationId, conversationId),
              isNull(messageReads.id),
              isNull(messages.deletedAt)
            )
          );

        if (unreadMessages.length > 0) {
          await db.insert(messageReads).values(
            unreadMessages.map(msg => ({
              messageId: msg.id,
              profileId,
            }))
          );
        }
      }

      // Update participant's last read time
      await db
        .update(conversationParticipants)
        .set({ lastReadAt: new Date() })
        .where(
          and(
            eq(conversationParticipants.conversationId, conversationId),
            eq(conversationParticipants.profileId, profileId)
          )
        );
    } catch (error) {
      console.error("Error marking messages as read:", error);
      throw error;
    }
  }

  async deleteMessage(messageId: number, profileId: number): Promise<void> {
    try {
      // Verify user owns the message
      const message = await db
        .select()
        .from(messages)
        .where(
          and(
            eq(messages.id, messageId),
            eq(messages.senderId, profileId),
            isNull(messages.deletedAt)
          )
        )
        .limit(1);

      if (message.length === 0) {
        throw new Error("Message not found or not authorized to delete");
      }

      // Soft delete the message
      await db
        .update(messages)
        .set({ deletedAt: new Date() })
        .where(eq(messages.id, messageId));
    } catch (error) {
      console.error("Error deleting message:", error);
      throw error;
    }
  }

  async updateMessage(messageId: number, senderId: number, content: string): Promise<any> {
    try {
      const [message] = await db
        .update(messages)
        .set({
          content,
          editedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(and(
          eq(messages.id, messageId),
          eq(messages.senderId, senderId)
        ))
        .returning();

      if (!message) {
        throw new Error("Message not found or unauthorized");
      }

      return message;
    } catch (error) {
      console.error("Error updating message:", error);
      throw error;
    }
  }

  async toggleConversationArchive(conversationId: number, profileId: number): Promise<void> {
    try {
      // Update the participant's archived status
      await db
        .update(conversationParticipants)
        .set({
          isArchived: sql`NOT is_archived`
        })
        .where(and(
          eq(conversationParticipants.conversationId, conversationId),
          eq(conversationParticipants.profileId, profileId)
        ));
    } catch (error) {
      console.error("Error toggling conversation archive:", error);
      throw error;
    }
  }

  async updateConversationMute(conversationId: number, profileId: number, muted: boolean): Promise<void> {
    try {
      await db
        .update(conversationParticipants)
        .set({
          isMuted: muted
        })
        .where(and(
          eq(conversationParticipants.conversationId, conversationId),
          eq(conversationParticipants.profileId, profileId)
        ));
    } catch (error) {
      console.error("Error updating conversation mute:", error);
      throw error;
    }
  }

  async toggleMessagePin(messageId: number, profileId: number): Promise<void> {
    try {
      // Check if user has permission to pin messages in this conversation
      const message = await db
        .select({
          conversationId: messages.conversationId
        })
        .from(messages)
        .where(eq(messages.id, messageId))
        .limit(1);

      if (!message[0]) {
        throw new Error("Message not found");
      }

      // Check if user is participant in the conversation
      const participant = await db
        .select()
        .from(conversationParticipants)
        .where(and(
          eq(conversationParticipants.conversationId, message[0].conversationId),
          eq(conversationParticipants.profileId, profileId)
        ))
        .limit(1);

      if (!participant[0]) {
        throw new Error("Unauthorized");
      }

      // Toggle pin status
      await db
        .update(messages)
        .set({
          isPinned: sql`NOT COALESCE(is_pinned, false)`
        })
        .where(eq(messages.id, messageId));
    } catch (error) {
      console.error("Error toggling message pin:", error);
      throw error;
    }
  }

  async addMessageReaction(messageId: number, profileId: number, reaction: string): Promise<void> {
    try {
      // Get current reactions
      const [message] = await db
        .select({
          reactions: messages.reactions
        })
        .from(messages)
        .where(eq(messages.id, messageId));

      if (!message) {
        throw new Error("Message not found");
      }

      const reactions = message.reactions as Record<string, number> || {};

      // Toggle reaction
      if (reactions[reaction]) {
        reactions[reaction]++;
      } else {
        reactions[reaction] = 1;
      }

      // Update message with new reactions
      await db
        .update(messages)
        .set({
          reactions: reactions
        })
        .where(eq(messages.id, messageId));
    } catch (error) {
      console.error("Error adding message reaction:", error);
      throw error;
    }
  }

  async blockProfile(blockerProfileId: number, blockedProfileId: number): Promise<void> {
    try {
      // Create block record (you'll need to create a blocks table)
      await db.execute(sql`
        INSERT INTO profile_blocks (blocker_profile_id, blocked_profile_id, created_at)
        VALUES (${blockerProfileId}, ${blockedProfileId}, NOW())
        ON CONFLICT (blocker_profile_id, blocked_profile_id) DO NOTHING
      `);
    } catch (error) {
      console.error("Error blocking profile:", error);
      throw error;
    }
  }

  async reportProfile(reporterId: number, reportedProfileId: number, reason: string) {
    // Implementation for reporting profiles would go here
    // For now, just log the report
    console.log(`Profile ${reportedProfileId} reported by ${reporterId} for: ${reason}`);
  }

  async trackProfileView(viewerId: number, viewerProfileId: number, viewedProfileId: number, sessionId?: string, ipAddress?: string, userAgent?: string) {
    // Don't track self-views
    if (viewerProfileId === viewedProfileId) {
      return;
    }

    // Check if this user has viewed this profile in the last hour to avoid spam
    const recentView = await db
      .select()
      .from(profileViews)
      .where(and(
        eq(profileViews.viewerId, viewerId),
        eq(profileViews.viewerProfileId, viewerProfileId),
        eq(profileViews.viewedProfileId, viewedProfileId),
        sql`${profileViews.viewedAt} > NOW() - INTERVAL '1 hour'`
      ))
      .limit(1);

    if (recentView.length === 0) {
      await db.insert(profileViews).values({
        viewerId,
        viewerProfileId,
        viewedProfileId,
        sessionId,
        ipAddress,
        userAgent,
        viewedAt: new Date()
      });
    }
  }

  async getMostViewedArtistProfile(viewerId: number, viewerProfileId: number) {
    // Get the most viewed artist profile in the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const mostViewed = await db
      .select({
        profileId: profileViews.viewedProfileId,
        viewCount: sql<number>`COUNT(*)`,
        profile: {
          id: profiles.id,
          name: profiles.name,
          profileImageUrl: profiles.profileImageUrl,
          bio: profiles.bio,
          location: profiles.location,
          type: profiles.type,
          genre: profiles.genre
        }
      })
      .from(profileViews)
      .innerJoin(profiles, eq(profileViews.viewedProfileId, profiles.id))
      .where(and(
        eq(profileViews.viewerId, viewerId),
        eq(profileViews.viewerProfileId, viewerProfileId),
        eq(profiles.type, 'artist'),
        sql`${profileViews.viewedAt} >= ${thirtyDaysAgo}`
      ))
      .groupBy(profileViews.viewedProfileId, profiles.id, profiles.name, profiles.profileImageUrl, profiles.bio, profiles.location, profiles.type, profiles.genre)
      .orderBy(sql`COUNT(*) DESC`)
      .limit(1);

    return mostViewed[0] || null;
  }

  async getProfilePhotos(profileId: number) {
    const result = await db
      .select()
      .from(photos)
      .where(eq(photos.profileId, profileId))
      .orderBy(desc(photos.createdAt));

    // Get tagged friends data for each photo
    const photosWithTaggedFriends = await Promise.all(result.map(async (photo) => {
      if (photo.friendTags && photo.friendTags.length > 0) {
        const taggedFriends = await db
          .select({
            id: profiles.id,
            name: profiles.name,
            profileImageUrl: profiles.profileImageUrl,
          })
          .from(profiles)
          .where(inArray(profiles.id, photo.friendTags));

        return {
          ...photo,
          taggedFriends,
        };
      }
      return {
        ...photo,
        taggedFriends: [],
      };
    }));

    return photosWithTaggedFriends;
  }

  async createProfilePhotos(photosData: Array<{ profileId: number; albumId?: number | null; imageUrl: string; caption?: string; tags?: string[]; friendTags?: number[] }>) {
    const [insertedPhotos] = await Promise.all([
      db.insert(photos).values(photosData.map(data => ({
        profileId: data.profileId,
        albumId: data.albumId,
        imageUrl: data.imageUrl,
        caption: data.caption,
        tags: data.tags || [],
        friendTags: data.friendTags || [],
      }))).returning()
    ]);

    return insertedPhotos;
  }

  async getPhoto(photoId: number): Promise<Photo | null> {
    try {
      const result = await db
        .select()
        .from(photos)
        .where(eq(photos.id, photoId))
        .limit(1);

      return result[0] || null;
    } catch (error) {
      console.error("Error fetching photo:", error);
      throw error;
    }
  }

  async updatePhoto(photoId: number, updates: { caption?: string; friendTags?: number[] }) {
    const [updatedPhoto] = await db
      .update(photos)
      .set(updates)
      .where(eq(photos.id, photoId))
      .returning();

    return updatedPhoto;
  }

  async deletePhoto(photoId: number): Promise<void> {
    try {
      await db
        .delete(photos)
        .where(eq(photos.id, photoId));
    } catch (error) {
      console.error("Error deleting photo:", error);
      throw error;
    }
  }

  // Album methods
  async getProfileAlbums(profileId: number): Promise<Album[]> {
    try {
      const result = await db
        .select()
        .from(albums)
        .where(eq(albums.profileId, profileId))
        .orderBy(desc(albums.createdAt));

      return result;
    } catch (error) {
      console.error("Error fetching profile albums:", error);
      throw error;
    }
  }

  async createAlbum(albumData: Omit<Album, 'id' | 'createdAt' | 'updatedAt'>): Promise<Album> {
    try {
      const result = await db
        .insert(albums)
        .values(albumData)
        .returning();

      return result[0];
    } catch (error) {
      console.error("Error creating album:", error);
      throw error;
    }
  }

  async getAlbum(albumId: number): Promise<Album | null> {
    try {
      const result = await db
        .select()
        .from(albums)
        .where(eq(albums.id, albumId))
        .limit(1);

      return result[0] || null;
    } catch (error) {
      console.error("Error fetching album:", error);
      throw error;
    }
  }

  async updateAlbum(albumId: number, updates: Partial<Omit<Album, 'id' | 'profileId' | 'createdAt'>>): Promise<Album> {
    try {
      const result = await db
        .update(albums)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(albums.id, albumId))
        .returning();

      return result[0];
    } catch (error) {
      console.error("Error updating album:", error);
      throw error;
    }
  }

  async deleteAlbum(albumId: number) {
    return await db.delete(albums).where(eq(albums.id, albumId));
  }

  // Photo comment methods
  async getPhotoComments(photoId: number) {
    // Build the comments tree
    const buildCommentsTree = (comments: any[], parentId: number | null = null): any[] => {
      return comments
        .filter(comment => comment.parentId === parentId)
        .map(comment => ({
          ...comment,
          replies: buildCommentsTree(comments, comment.id)
        }));
    };

    const commentsData = await db
      .select({
        id: photoComments.id,
        content: photoComments.content,
        friendTags: photoComments.friendTags,
        createdAt: photoComments.createdAt,
        updatedAt: photoComments.updatedAt,
        parentId: photoComments.parentId,
        profile: {
          id: profiles.id,
          name: profiles.name,
          profileImageUrl: profiles.profileImageUrl,
        },
      })
      .from(photoComments)
      .innerJoin(profiles, eq(photoComments.profileId, profiles.id))
      .where(eq(photoComments.photoId, photoId))
      .orderBy(photoComments.createdAt);

    // Get tagged friends data for each comment
    const commentsWithTaggedFriends = await Promise.all(commentsData.map(async (comment) => {
      if (comment.friendTags && comment.friendTags.length > 0) {
        const taggedFriends = await db
          .select({
            id: profiles.id,
            name: profiles.name,
            profileImageUrl: profiles.profileImageUrl,
          })
          .from(profiles)
          .where(inArray(profiles.id, comment.friendTags));

        return {
          ...comment,
          taggedFriends,
        };
      }
      return {
        ...comment,
        taggedFriends: [],
      };
    }));

    return buildCommentsTree(commentsWithTaggedFriends);
  }

  async createPhotoComment(commentData: { photoId: number; profileId: number; content: string; parentId?: number; friendTags?: number[] }) {
    return await db.transaction(async (tx) => {
      // Create the comment
      const [comment] = await tx
        .insert(photoComments)
        .values({
          ...commentData,
          friendTags: commentData.friendTags || [],
        })
        .returning();

      // Update parent comment replies count if this is a reply
      if (commentData.parentId) {
        await tx
          .update(photoComments)
          .set({
            repliesCount: sql`${photoComments.repliesCount} + 1`
          })
          .where(eq(photoComments.id, commentData.parentId));
      }

      // Update photo comments count
      await tx
        .update(photos)
        .set({
          commentsCount: sql`${photos.commentsCount} + 1`
        })
        .where(eq(photos.id, commentData.photoId));

      // Return comment with profile data
      const result = await tx
        .select({
          id: photoComments.id,
          content: photoComments.content,
          friendTags: photoComments.friendTags,
          createdAt: photoComments.createdAt,
          updatedAt: photoComments.updatedAt,
          parentId: photoComments.parentId,
          profile: {
            id: profiles.id,
            name: profiles.name,
            profileImageUrl: profiles.profileImageUrl,
          },
        })
        .from(photoComments)
        .innerJoin(profiles, eq(photoComments.profileId, profiles.id))
        .where(eq(photoComments.id, comment.id));

      return result[0];
    });
  }

  async deletePhotoComment(commentId: number, profileId: number) {
    // Get the comment to find the photo ID
    const [comment] = await db
      .select()
      .from(photoComments)
      .where(and(eq(photoComments.id, commentId), eq(photoComments.profileId, profileId)));

    if (!comment) {
      throw new Error("Comment not found or unauthorized");
    }

    // Delete the comment
    await db.delete(photoComments).where(eq(photoComments.id, commentId));

    // Update comments count
    await db
      .update(photos)
      .set({ 
        commentsCount: sql`${photos.commentsCount} - 1` 
      })
      .where(eq(photos.id, comment.photoId));

    return true;
  }

  async getAlbumPhotos(albumId: number): Promise<Photo[]> {
    try {
      const result = await db
        .select()
        .from(photos)
        .where(eq(photos.albumId, albumId))
        .orderBy(desc(photos.createdAt));

      return result;
    } catch (error) {
      console.error("Error fetching album photos:", error);
      throw error;
    }
  }

  async addPhotosToAlbum(photoIds: number[], albumId: number): Promise<void> {
    try {
      await db
        .update(photos)
        .set({ albumId })
        .where(inArray(photos.id, photoIds));
    } catch (error) {
      console.error("Error adding photos to album:", error);
      throw error;
    }
  }

  async removePhotosFromAlbum(photoIds: number[]): Promise<void> {
    try {
      await db
        .update(photos)
        .set({ albumId: null })
        .where(inArray(photos.id, photoIds));
    } catch (error) {
      console.error("Error removing photos from album:", error);
      throw error;
    }
  }
}

export const storage = new Storage();