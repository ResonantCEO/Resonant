import {
  users,
  profiles,
  friendships,
  posts,
  postLikes,
  comments,
  type User,
  type InsertUser,
  type Profile,
  type InsertProfile,
  type Post,
  type InsertPost,
  type Friendship,
  type InsertFriendship,
  type Comment,
  type InsertComment,
  type PostLike,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, desc, count, sql, inArray } from "drizzle-orm";

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
  setActiveProfile(userId: number, profileId: number): Promise<void>;
  searchProfiles(query: string, limit?: number): Promise<Profile[]>;

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
    const [user] = await db.select().from(users).where(eq(users.id, id));
    console.log("Storage getUser result:", JSON.stringify(user, null, 2));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
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
    return db.select().from(profiles).where(eq(profiles.userId, userId)).orderBy(desc(profiles.createdAt));
  }

  async getActiveProfile(userId: number): Promise<Profile | undefined> {
    const [profile] = await db
      .select()
      .from(profiles)
      .where(and(eq(profiles.userId, userId), eq(profiles.isActive, true)));
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
}

export const storage = new DatabaseStorage();