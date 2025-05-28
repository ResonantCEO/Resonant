import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  boolean,
  integer,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Primary user table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email").unique().notNull(),
  password: varchar("password").notNull(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  coverImageUrl: varchar("cover_image_url"),
  showOnlineStatus: boolean("show_online_status").default(true),
  allowFriendRequests: boolean("allow_friend_requests").default(true),
  showActivityStatus: boolean("show_activity_status").default(true),
  emailNotifications: boolean("email_notifications").default(false),
  notifyFriendRequests: boolean("notify_friend_requests").default(true),
  notifyMessages: boolean("notify_messages").default(true),
  notifyPostLikes: boolean("notify_post_likes").default(true),
  notifyComments: boolean("notify_comments").default(true),
  theme: varchar("theme").default("light"), // 'light', 'dark', 'system'
  language: varchar("language").default("en"),
  compactMode: boolean("compact_mode").default(false),
  autoplayVideos: boolean("autoplay_videos").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Profiles table - supports multiple profile types per user
export const profiles = pgTable("profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }), // nullable for shared profiles
  type: varchar("type").notNull(), // 'audience', 'artist', 'venue'
  name: varchar("name").notNull(),
  bio: text("bio"),
  profileImageUrl: varchar("profile_image_url"),
  coverImageUrl: varchar("cover_image_url"),
  visibility: varchar("visibility").notNull().default("public"), // 'public', 'friends', 'private'
  location: varchar("location"),
  isActive: boolean("is_active").default(false), // which profile is currently active
  isShared: boolean("is_shared").default(false), // true for artist/venue profiles that can have multiple members
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Profile memberships table - for shared artist/venue profiles
export const profileMemberships = pgTable("profile_memberships", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: varchar("role").notNull().default("member"), // 'owner', 'admin', 'manager', 'member'
  permissions: varchar("permissions").array().default([]), // array of permission strings
  status: varchar("status").notNull().default("active"), // 'active', 'pending', 'suspended'
  invitedBy: integer("invited_by").references(() => users.id),
  joinedAt: timestamp("joined_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Profile invitations table - for inviting users to shared profiles
export const profileInvitations = pgTable("profile_invitations", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  invitedEmail: varchar("invited_email").notNull(),
  invitedBy: integer("invited_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: varchar("role").notNull().default("member"),
  permissions: varchar("permissions").array().default([]),
  token: varchar("token").notNull().unique(), // unique invitation token
  status: varchar("status").notNull().default("pending"), // 'pending', 'accepted', 'declined', 'expired'
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Friendships table
export const friendships = pgTable("friendships", {
  id: serial("id").primaryKey(),
  requesterId: integer("requester_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  addresseeId: integer("addressee_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  status: varchar("status").notNull().default("pending"), // 'pending', 'accepted', 'rejected', 'blocked'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Posts table
export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  imageUrl: varchar("image_url"),
  visibility: varchar("visibility").notNull().default("public"), // 'public', 'friends', 'private'
  likesCount: integer("likes_count").default(0),
  commentsCount: integer("comments_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Post likes table
export const postLikes = pgTable("post_likes", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  profileId: integer("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Comments table
export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  profileId: integer("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  profiles: many(profiles),
  profileMemberships: many(profileMemberships),
  sentInvitations: many(profileInvitations, { relationName: "inviter" }),
}));

export const profilesRelations = relations(profiles, ({ one, many }) => ({
  user: one(users, {
    fields: [profiles.userId],
    references: [users.id],
  }),
  posts: many(posts),
  sentFriendRequests: many(friendships, { relationName: "requester" }),
  receivedFriendRequests: many(friendships, { relationName: "addressee" }),
  postLikes: many(postLikes),
  comments: many(comments),
  memberships: many(profileMemberships),
  invitations: many(profileInvitations),
}));

export const profileMembershipsRelations = relations(profileMemberships, ({ one }) => ({
  profile: one(profiles, {
    fields: [profileMemberships.profileId],
    references: [profiles.id],
  }),
  user: one(users, {
    fields: [profileMemberships.userId],
    references: [users.id],
  }),
  inviter: one(users, {
    fields: [profileMemberships.invitedBy],
    references: [users.id],
    relationName: "inviter",
  }),
}));

export const profileInvitationsRelations = relations(profileInvitations, ({ one }) => ({
  profile: one(profiles, {
    fields: [profileInvitations.profileId],
    references: [profiles.id],
  }),
  inviter: one(users, {
    fields: [profileInvitations.invitedBy],
    references: [users.id],
    relationName: "inviter",
  }),
}));

export const friendshipsRelations = relations(friendships, ({ one }) => ({
  requester: one(profiles, {
    fields: [friendships.requesterId],
    references: [profiles.id],
    relationName: "requester",
  }),
  addressee: one(profiles, {
    fields: [friendships.addresseeId],
    references: [profiles.id],
    relationName: "addressee",
  }),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  profile: one(profiles, {
    fields: [posts.profileId],
    references: [profiles.id],
  }),
  likes: many(postLikes),
  comments: many(comments),
}));

export const postLikesRelations = relations(postLikes, ({ one }) => ({
  post: one(posts, {
    fields: [postLikes.postId],
    references: [posts.id],
  }),
  profile: one(profiles, {
    fields: [postLikes.profileId],
    references: [profiles.id],
  }),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  post: one(posts, {
    fields: [comments.postId],
    references: [posts.id],
  }),
  profile: one(profiles, {
    fields: [comments.profileId],
    references: [profiles.id],
  }),
}));

// Schema exports for validation
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const loginUserSchema = z.object({
  email: z.string().email("Valid email is required"),
  password: z.string().min(1, "Password is required"),
});

export const insertProfileSchema = createInsertSchema(profiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPostSchema = createInsertSchema(posts).omit({
  id: true,
  likesCount: true,
  commentsCount: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFriendshipSchema = createInsertSchema(friendships).omit({
  id: true,
  status: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCommentSchema = createInsertSchema(comments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProfileMembershipSchema = createInsertSchema(profileMemberships).omit({
  id: true,
  status: true,
  joinedAt: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProfileInvitationSchema = createInsertSchema(profileInvitations).omit({
  id: true,
  token: true,
  status: true,
  createdAt: true,
  updatedAt: true,
});

// Role and permission validation schemas
export const profileRoleSchema = z.enum(["owner", "admin", "manager", "member"]);
export const profilePermissionSchema = z.enum([
  "manage_profile", // Edit profile details, images, bio
  "manage_members", // Invite, remove, change roles
  "manage_posts", // Create, edit, delete posts
  "manage_events", // Create, edit events (venue specific)
  "manage_bookings", // Handle bookings (venue specific)
  "view_analytics", // View profile analytics
  "moderate_content", // Moderate comments, reports
]);

// Type exports
export type InsertUser = z.infer<typeof insertUserSchema>;
export type LoginUser = z.infer<typeof loginUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertProfile = z.infer<typeof insertProfileSchema>;
export type Profile = typeof profiles.$inferSelect;
export type InsertPost = z.infer<typeof insertPostSchema>;
export type Post = typeof posts.$inferSelect;
export type InsertFriendship = z.infer<typeof insertFriendshipSchema>;
export type Friendship = typeof friendships.$inferSelect;
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type Comment = typeof comments.$inferSelect;
export type PostLike = typeof postLikes.$inferSelect;
export type InsertProfileMembership = z.infer<typeof insertProfileMembershipSchema>;
export type ProfileMembership = typeof profileMemberships.$inferSelect;
export type InsertProfileInvitation = z.infer<typeof insertProfileInvitationSchema>;
export type ProfileInvitation = typeof profileInvitations.$inferSelect;
export type ProfileRole = z.infer<typeof profileRoleSchema>;
export type ProfilePermission = z.infer<typeof profilePermissionSchema>;