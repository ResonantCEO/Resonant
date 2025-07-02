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
  real,
  InferSelectModel,
  InferInsertModel,
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
  backgroundImageUrl: varchar("background_image_url"),
  birthdate: timestamp("birthdate"),
  hometown: varchar("hometown"), // Now stores zipcode
  showOnlineStatus: boolean("show_online_status").default(true),
  allowFriendRequests: boolean("allow_friend_requests").default(true),
  showActivityStatus: boolean("show_activity_status").default(true),
  emailNotifications: boolean("email_notifications").default(false),
  notifyFriendRequests: boolean("notify_friend_requests").default(true),
  notifyMessages: boolean("notify_messages").default(true),
  notifyPostLikes: boolean("notify_post_likes").default(true),
  notifyComments: boolean("notify_comments").default(true),
  theme: text("theme").default("light"), // 'light', 'dark', 'system'
  language: text("language").default("en"),
  compactMode: boolean("compact_mode").default(false),
  autoplayVideos: boolean("autoplay_videos").default(true),
  profileBackground: text("profile_background"),
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
  coverPositionX: real("cover_position_x").default(50),
  coverPositionY: real("cover_position_y").default(50),
  profilePositionX: real("profile_position_x").default(50),
  profilePositionY: real("profile_position_y").default(50),
  backgroundImageUrl: varchar("background_image_url"),
  profileBackground: text("profile_background"), // 'sunset', 'ocean', 'forest', 'gradient-1', etc., or 'custom-photo'
  visibility: varchar("visibility").notNull().default("public"), // 'public', 'friends', 'private'
  location: varchar("location"),
  hometown: varchar("hometown"),
  isActive: boolean("is_active").default(false), // which profile is currently active
  isShared: boolean("is_shared").default(false), // true for artist/venue profiles that can have multiple members
  deletedAt: timestamp("deleted_at"), // soft delete timestamp
  deletedBy: integer("deleted_by").references(() => users.id), // who deleted the profile
  deletionReason: text("deletion_reason"), // reason for deletion
  backupData: jsonb("backup_data"), // backup of related data
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

export const bookingRequests = pgTable("booking_requests", {
  id: serial("id").primaryKey(),
  artistProfileId: integer("artist_profile_id").references(() => profiles.id, { onDelete: "cascade" }).notNull(),
  venueProfileId: integer("venue_profile_id").references(() => profiles.id, { onDelete: "cascade" }).notNull(),
  status: varchar("status", { length: 20 }).default("pending").notNull(), // pending, accepted, rejected
  requestedAt: timestamp("requested_at").notNull(),
  eventDate: timestamp("event_date"),
  eventTime: varchar("event_time"),
  budget: real("budget"),
  requirements: text("requirements"),
  message: text("message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  respondedAt: timestamp("responded_at"),
});



export const albums = pgTable("albums", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").references(() => profiles.id).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  coverPhotoId: integer("cover_photo_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const photos = pgTable("photos", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").references(() => profiles.id).notNull(),
  albumId: integer("album_id").references(() => albums.id),
  imageUrl: varchar("image_url", { length: 500 }).notNull(),
  caption: text("caption"),
  tags: text("tags").array().default([]).notNull(),
  friendTags: integer("friend_tags").array().default([]).notNull(), // Array of profile IDs
  commentsCount: integer("comments_count").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const photoComments = pgTable("photo_comments", {
  id: serial("id").primaryKey(),
  photoId: integer("photo_id").notNull().references(() => photos.id, { onDelete: "cascade" }),
  profileId: integer("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  parentId: integer("parent_id").references(() => photoComments.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  friendTags: integer("friend_tags").array().default([]).notNull(), // Array of profile IDs
  repliesCount: integer("replies_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations

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
  albums: many(albums),
  photos: many(photos),
  artistBookingRequests: many(bookingRequests, { relationName: "artistProfile" }),
  venueBookingRequests: many(bookingRequests, { relationName: "venueProfile" }),
  events: many(events),
}));

export const albumsRelations = relations(albums, ({ one, many }) => ({
  profile: one(profiles, {
    fields: [albums.profileId],
    references: [profiles.id],
  }),
  photos: many(photos),
  coverPhoto: one(photos, {
    fields: [albums.coverPhotoId],
    references: [photos.id],
  }),
}));

export const photosRelations = relations(photos, ({ one, many }) => ({
  profile: one(profiles, {
    fields: [photos.profileId],
    references: [profiles.id],
  }),
  album: one(albums, {
    fields: [photos.albumId],
    references: [albums.id],
  }),
  comments: many(photoComments),
}));

export const photoCommentsRelations = relations(photoComments, ({ one, many }) => ({
  photo: one(photos, {
    fields: [photoComments.photoId],
    references: [photos.id],
  }),
  profile: one(profiles, {
    fields: [photoComments.profileId],
    references: [profiles.id],
  }),
  parent: one(photoComments, {
    fields: [photoComments.parentId],
    references: [photoComments.id],
    relationName: "parent",
  }),
  replies: many(photoComments, {
    relationName: "parent",
  }),
}));

export const bookingRequestsRelations = relations(bookingRequests, ({ one }) => ({
  artistProfile: one(profiles, {
    fields: [bookingRequests.artistProfileId],
    references: [profiles.id],
    relationName: "artistProfile",
  }),
  venueProfile: one(profiles, {
    fields: [bookingRequests.venueProfileId],
    references: [profiles.id],
    relationName: "venueProfile",
  }),
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
}).extend({
  birthdate: z.string().optional().transform((str) => str ? new Date(str) : null),
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

// Notifications table
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  recipientId: integer("recipient_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  senderId: integer("sender_id").references(() => users.id, { onDelete: "set null" }),
  type: varchar("type").notNull(), // 'friend_request', 'post_like', 'comment', 'message', 'profile_invite', etc.
  title: varchar("title").notNull(),
  message: text("message").notNull(),
  data: jsonb("data"), // Additional data like profileId, postId, etc.
  read: boolean("read").default(false),
  emailSent: boolean("email_sent").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User notification settings table (extends the user preferences)
export const userNotificationSettings = pgTable("user_notification_settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: varchar("type").notNull(), // notification type
  inApp: boolean("in_app").default(true),
  email: boolean("email").default(true),
  push: boolean("push").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations for notifications
export const notificationsRelations = relations(notifications, ({ one }) => ({
  recipient: one(users, {
    fields: [notifications.recipientId],
    references: [users.id],
    relationName: "recipient",
  }),
  sender: one(users, {
    fields: [notifications.senderId],
    references: [users.id],
    relationName: "sender",
  }),
}));

export const userNotificationSettingsRelations = relations(userNotificationSettings, ({ one }) => ({
  user: one(users, {
    fields: [userNotificationSettings.userId],
    references: [users.id],
  }),
}));

// User relations with all associations
export const usersRelations = relations(users, ({ many }) => ({
  profiles: many(profiles),
  profileMemberships: many(profileMemberships),
  sentInvitations: many(profileInvitations, { relationName: "inviter" }),
  receivedNotifications: many(notifications, { relationName: "recipient" }),
  sentNotifications: many(notifications, { relationName: "sender" }),
  notificationSettings: many(userNotificationSettings),
}));

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
export type InsertProfileInvitation = z.infer<typeof profileInvitationSchema>;
export type ProfileInvitation = typeof profileInvitations.$inferSelect;
export type ProfileRole = z.infer<typeof profileRoleSchema>;
export type ProfilePermission = z.infer<typeof profilePermissionSchema>;

// Notification types
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;
export type UserNotificationSettings = typeof userNotificationSettings.$inferSelect;
export type InsertUserNotificationSettings = typeof userNotificationSettings.$inferInsert;

// Notification schemas
export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  read: true,
  emailSent: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserNotificationSettingsSchema = createInsertSchema(userNotificationSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPhotoCommentSchema = createInsertSchema(photoComments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const notificationTypeSchema = z.enum([
  "friend_request",
  "friend_accepted",
  "post_like",
  "comment",
  "post_comment",
  "photo_comment",
  "message",
  "profile_invite",
  "profile_deleted",
  "profile_restored",
  "membership_updated",
  "system_announcement"
]);

// Messages and conversations tables
export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  type: varchar("type").notNull().default("direct"), // 'direct', 'group'
  name: varchar("name"), // For group chats
  description: text("description"), // For group chats
  imageUrl: varchar("image_url"), // For group chats
  createdBy: integer("created_by").references(() => profiles.id),
  isPrivate: boolean("is_private").default(false), // Private groups require invitation
  maxMembers: integer("max_members").default(50), // Group size limit
  settings: jsonb("settings").default({}), // Group settings like permissions
  isArchived: boolean("is_archived").default(false),
  lastMessageId: integer("last_message_id"),
  lastActivityAt: timestamp("last_activity_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const conversationParticipants = pgTable("conversation_participants", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  profileId: integer("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  role: varchar("role").default("member"), // 'admin', 'member'
  joinedAt: timestamp("joined_at").defaultNow(),
  leftAt: timestamp("left_at"),
  lastReadAt: timestamp("last_read_at").defaultNow(),
  isMuted: boolean("is_muted").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  senderId: integer("sender_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  replyToId: integer("reply_to_id").references(() => messages.id),
  content: text("content").notNull(),
  messageType: varchar("message_type").default("text"), // 'text', 'image', 'file', 'system'
  attachments: jsonb("attachments").default([]),
  reactions: jsonb("reactions").default({}),
  editedAt: timestamp("edited_at"),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const messageReads = pgTable("message_reads", {
  id: serial("id").primaryKey(),
  messageId: integer("message_id").notNull().references(() => messages.id, { onDelete: "cascade" }),
  profileId: integer("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  readAt: timestamp("read_at").defaultNow(),
});

// Relations for messages
export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  creator: one(profiles, {
    fields: [conversations.createdBy],
    references: [profiles.id],
  }),
  participants: many(conversationParticipants),
  messages: many(messages),
  lastMessage: one(messages, {
    fields: [conversations.lastMessageId],
    references: [messages.id],
  }),
}));

export const conversationParticipantsRelations = relations(conversationParticipants, ({ one }) => ({
  conversation: one(conversations, {
    fields: [conversationParticipants.conversationId],
    references: [conversations.id],
  }),
  profile: one(profiles, {
    fields: [conversationParticipants.profileId],
    references: [profiles.id],
  }),
}));

export const messagesRelations = relations(messages, ({ one, many }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
  sender: one(profiles, {
    fields: [messages.senderId],
    references: [profiles.id],
  }),
  replyTo: one(messages, {
    fields: [messages.replyToId],
    references: [messages.id],
    relationName: "reply",
  }),
  replies: many(messages, {
    relationName: "reply",
  }),
  reads: many(messageReads),
}));

export const messageReadsRelations = relations(messageReads, ({ one }) => ({
  message: one(messages, {
    fields: [messageReads.messageId],
    references: [messages.id],
  }),
  profile: one(profiles, {
    fields: [messageReads.profileId],
    references: [profiles.id],
  }),
}));

// Insert schemas
export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  lastMessageId: true,
  lastActivityAt: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  editedAt: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
});

export const insertConversationParticipantSchema = createInsertSchema(conversationParticipants).omit({
  id: true,
  joinedAt: true,
  leftAt: true,
  lastReadAt: true,
  createdAt: true,
});

// Profile blocks and reports tables
export const profileBlocks = pgTable("profile_blocks", {
  id: serial("id").primaryKey(),
  blockerProfileId: integer("blocker_profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  blockedProfileId: integer("blocked_profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const profileReports = pgTable("profile_reports", {
  id: serial("id").primaryKey(),
  reporterProfileId: integer("reporter_profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  reportedProfileId: integer("reported_profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  reason: text("reason").notNull(),
  status: varchar("status").default("pending"), // pending, reviewed, resolved
  reviewedBy: integer("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Add missing columns to existing tables
export const messagesExtended = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  senderId: integer("sender_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  replyToId: integer("reply_to_id").references(() => messages.id),
  content: text("content").notNull(),
  messageType: varchar("message_type").default("text"),
  attachments: jsonb("attachments").default([]),
  reactions: jsonb("reactions").default({}),
  isPinned: boolean("is_pinned").default(false),
  editedAt: timestamp("edited_at"),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const conversationParticipantsExtended = pgTable("conversation_participants", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  profileId: integer("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  role: varchar("role").default("member"),
  joinedAt: timestamp("joined_at").defaultNow(),
  leftAt: timestamp("left_at"),
  lastReadAt: timestamp("last_read_at").defaultNow(),
  isMuted: boolean("is_muted").default(false),
  isArchived: boolean("is_archived").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations for new tables
export const profileBlocksRelations = relations(profileBlocks, ({ one }) => ({
  blocker: one(profiles, {
    fields: [profileBlocks.blockerProfileId],
    references: [profiles.id],
    relationName: "blocker",
  }),
  blocked: one(profiles, {
    fields: [profileBlocks.blockedProfileId],
    references: [profiles.id],
    relationName: "blocked",
  }),
}));

export const profileReportsRelations = relations(profileReports, ({ one }) => ({
  reporter: one(profiles, {
    fields: [profileReports.reporterProfileId],
    references: [profiles.id],
    relationName: "reporter",
  }),
  reported: one(profiles, {
    fields: [profileReports.reportedProfileId],
    references: [profiles.id],
    relationName: "reported",
  }),
  reviewer: one(users, {
    fields: [profileReports.reviewedBy],
    references: [users.id],
  }),
}));

// Tickets table
export const tickets = pgTable("tickets", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull(), // Reference to event
  profileId: integer("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  originalPurchaserId: integer("original_purchaser_id").notNull().references(() => profiles.id),
  ticketType: varchar("ticket_type").notNull(), // 'general', 'vip', 'early_bird', 'student'
  sectionName: varchar("section_name"),
  rowName: varchar("row_name"),
  seatNumber: varchar("seat_number"),
  price: real("price").notNull(),
  qrCode: varchar("qr_code").notNull().unique(),
  orderNumber: varchar("order_number").notNull(),
  status: varchar("status").notNull().default("active"), // 'active', 'used', 'transferred', 'returned', 'cancelled'
  purchaseDate: timestamp("purchase_date").notNull(),
  eventDate: timestamp("event_date").notNull(),
  eventTime: varchar("event_time"),
  venue: varchar("venue").notNull(),
  eventName: varchar("event_name").notNull(),
  artistName: varchar("artist_name"),
  artistImageUrl: varchar("artist_image_url"),
  venueImageUrl: varchar("venue_image_url"),
  transferable: boolean("transferable").default(true),
  returnable: boolean("returnable").default(true),
  returnDeadline: timestamp("return_deadline"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Ticket transfers table
export const ticketTransfers = pgTable("ticket_transfers", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").notNull().references(() => tickets.id, { onDelete: "cascade" }),
  fromProfileId: integer("from_profile_id").notNull().references(() => profiles.id),
  toProfileId: integer("to_profile_id").references(() => profiles.id),
  toEmail: varchar("to_email"), // For transfers to non-users
  transferType: varchar("transfer_type").notNull(), // 'free', 'sale'
  salePrice: real("sale_price"), // If transferType is 'sale'
  message: text("message"),
  status: varchar("status").notNull().default("pending"), // 'pending', 'accepted', 'declined', 'expired'
  token: varchar("token").notNull().unique(), // Unique transfer token
  expiresAt: timestamp("expires_at").notNull(),
  acceptedAt: timestamp("accepted_at"),
  declinedAt: timestamp("declined_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Ticket returns table
export const ticketReturns = pgTable("ticket_returns", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").notNull().references(() => tickets.id, { onDelete: "cascade" }),
  profileId: integer("profile_id").notNull().references(() => profiles.id),
  reason: varchar("reason").notNull(), // 'cant_attend', 'event_cancelled', 'other'
  reasonDetails: text("reason_details"),
  refundAmount: real("refund_amount").notNull(),
  processingFee: real("processing_fee").default(0),
  status: varchar("status").notNull().default("pending"), // 'pending', 'approved', 'denied', 'processed'
  adminNotes: text("admin_notes"),
  processedBy: integer("processed_by").references(() => users.id),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations for tickets
export const ticketsRelations = relations(tickets, ({ one, many }) => ({
  profile: one(profiles, {
    fields: [tickets.profileId],
    references: [profiles.id],
  }),
  originalPurchaser: one(profiles, {
    fields: [tickets.originalPurchaserId],
    references: [profiles.id],
    relationName: "originalPurchaser",
  }),
  transfers: many(ticketTransfers),
  returns: many(ticketReturns),
}));

export const ticketTransfersRelations = relations(ticketTransfers, ({ one }) => ({
  ticket: one(tickets, {
    fields: [ticketTransfers.ticketId],
    references: [tickets.id],
  }),
  fromProfile: one(profiles, {
    fields: [ticketTransfers.fromProfileId],
    references: [profiles.id],
    relationName: "fromProfile",
  }),
  toProfile: one(profiles, {
    fields: [ticketTransfers.toProfileId],
    references: [profiles.id],
    relationName: "toProfile",
  }),
}));

export const ticketReturnsRelations = relations(ticketReturns, ({ one }) => ({
  ticket: one(tickets, {
    fields: [ticketReturns.ticketId],
    references: [tickets.id],
  }),
  profile: one(profiles, {
    fields: [ticketReturns.profileId],
    references: [profiles.id],
  }),
  processedByUser: one(users, {
    fields: [ticketReturns.processedBy],
    references: [users.id],
  }),
}));

// Events table
export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  organizerProfileId: integer("organizer_profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  venueProfileId: integer("venue_profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  artistProfileIds: integer("artist_profile_ids").array().notNull().default([]),
  name: varchar("name").notNull(),
  description: text("description"),
  eventDate: timestamp("event_date").notNull(),
  eventTime: varchar("event_time"),
  duration: integer("duration"), // in minutes
  genre: varchar("genre"),
  ageRestriction: varchar("age_restriction"), // 'all_ages', '18+', '21+'
  status: varchar("status").notNull().default("draft"), // 'draft', 'published', 'cancelled', 'postponed', 'completed'
  capacity: integer("capacity"),
  ticketsAvailable: boolean("tickets_available").default(true),
  ticketSalesStart: timestamp("ticket_sales_start"),
  ticketSalesEnd: timestamp("ticket_sales_end"),
  eventImageUrl: varchar("event_image_url"),
  tags: varchar("tags").array().default([]),
  socialLinks: jsonb("social_links").default({}),
  requiresApproval: boolean("requires_approval").default(false),
  isPrivate: boolean("is_private").default(false),
  bookingRequestId: integer("booking_request_id").references(() => bookingRequests.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Event ticket types table
export const eventTicketTypes = pgTable("event_ticket_types", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  name: varchar("name").notNull(), // 'General Admission', 'VIP', 'Early Bird'
  description: text("description"),
  price: real("price").notNull(),
  quantity: integer("quantity"), // null for unlimited
  quantitySold: integer("quantity_sold").default(0),
  saleStart: timestamp("sale_start"),
  saleEnd: timestamp("sale_end"),
  isActive: boolean("is_active").default(true),
  benefits: varchar("benefits").array().default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Event attendance table
export const eventAttendance = pgTable("event_attendance", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  profileId: integer("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  status: varchar("status").notNull().default("interested"), // 'interested', 'going', 'attended', 'no_show'
  ticketId: integer("ticket_id").references(() => tickets.id),
  checkInTime: timestamp("check_in_time"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Update tickets table to reference events
export const ticketsUpdated = pgTable("tickets", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  ticketTypeId: integer("ticket_type_id").references(() => eventTicketTypes.id),
  profileId: integer("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  originalPurchaserId: integer("original_purchaser_id").notNull().references(() => profiles.id),
  ticketType: varchar("ticket_type").notNull(), // 'general', 'vip', 'early_bird', 'student'
  sectionName: varchar("section_name"),
  rowName: varchar("row_name"),
  seatNumber: varchar("seat_number"),
  price: real("price").notNull(),
  qrCode: varchar("qr_code").notNull().unique(),
  orderNumber: varchar("order_number").notNull(),
  status: varchar("status").notNull().default("active"), // 'active', 'used', 'transferred', 'returned', 'cancelled'
  purchaseDate: timestamp("purchase_date").notNull(),
  transferable: boolean("transferable").default(true),
  returnable: boolean("returnable").default(true),
  returnDeadline: timestamp("return_deadline"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations for events
export const eventsRelations = relations(events, ({ one, many }) => ({
  organizer: one(profiles, {
    fields: [events.organizerProfileId],
    references: [profiles.id],
    relationName: "organizer",
  }),
  venue: one(profiles, {
    fields: [events.venueProfileId],
    references: [profiles.id],
    relationName: "venue",
  }),
  bookingRequest: one(bookingRequests, {
    fields: [events.bookingRequestId],
    references: [bookingRequests.id],
  }),
  ticketTypes: many(eventTicketTypes),
  attendance: many(eventAttendance),
  tickets: many(ticketsUpdated),
}));

export const eventTicketTypesRelations = relations(eventTicketTypes, ({ one, many }) => ({
  event: one(events, {
    fields: [eventTicketTypes.eventId],
    references: [events.id],
  }),
  tickets: many(ticketsUpdated),
}));

export const eventAttendanceRelations = relations(eventAttendance, ({ one }) => ({
  event: one(events, {
    fields: [eventAttendance.eventId],
    references: [events.id],
  }),
  profile: one(profiles, {
    fields: [eventAttendance.profileId],
    references: [profiles.id],
  }),
  ticket: one(ticketsUpdated, {
    fields: [eventAttendance.ticketId],
    references: [ticketsUpdated.id],
  }),
}));

// Update tickets relations
export const ticketsUpdatedRelations = relations(ticketsUpdated, ({ one, many }) => ({
  event: one(events, {
    fields: [ticketsUpdated.eventId],
    references: [events.id],
  }),
  ticketType: one(eventTicketTypes, {
    fields: [ticketsUpdated.ticketTypeId],
    references: [eventTicketTypes.id],
  }),
  profile: one(profiles, {
    fields: [ticketsUpdated.profileId],
    references: [profiles.id],
  }),
  originalPurchaser: one(profiles, {
    fields: [ticketsUpdated.originalPurchaserId],
    references: [profiles.id],
    relationName: "originalPurchaser",
  }),
  transfers: many(ticketTransfers),
  returns: many(ticketReturns),
}));

// Type exports
export type Event = InferSelectModel<typeof events>;
export type InsertEvent = InferInsertModel<typeof events>;
export type EventTicketType = InferSelectModel<typeof eventTicketTypes>;
export type InsertEventTicketType = InferInsertModel<typeof eventTicketTypes>;
export type EventAttendance = InferSelectModel<typeof eventAttendance>;
export type InsertEventAttendance = InferInsertModel<typeof eventAttendance>;
export type Ticket = InferSelectModel<typeof tickets>;
export type InsertTicket = InferInsertModel<typeof tickets>;
export type TicketTransfer = InferSelectModel<typeof ticketTransfers>;
export type InsertTicketTransfer = InferInsertModel<typeof ticketTransfers>;
export type TicketReturn = InferSelectModel<typeof ticketReturns>;
export type InsertTicketReturn = InferInsertModel<typeof ticketReturns>;

export type Conversation = InferSelectModel<typeof conversations>;
export type InsertConversation = InferInsertModel<typeof conversations>;
export type ConversationParticipant = InferSelectModel<typeof conversationParticipants>;
export type InsertConversationParticipant = InferInsertModel<typeof conversationParticipants>;
export type Message = InferSelectModel<typeof messages>;
export type InsertMessage = InferInsertModel<typeof messages>;
export type MessageRead = InferSelectModel<typeof messageReads>;
export type ProfileBlock = InferSelectModel<typeof profileBlocks>;
export type InsertProfileBlock = InferInsertModel<typeof profileBlocks>;
export type ProfileReport = InferSelectModel<typeof profileReports>;

export type BookingRequest = InferSelectModel<typeof bookingRequests>;
export type InsertBookingRequest = InferInsertModel<typeof bookingRequests>;
export type Album = InferSelectModel<typeof albums>;
export type InsertAlbum = InferInsertModel<typeof albums>;
export type Photo = InferSelectModel<typeof photos>;
export type InsertPhoto = InferInsertModel<typeof photos>;
export type PhotoComment = InferSelectModel<typeof photoComments>;
export type InsertPhotoComment = InferInsertModel<typeof photoComments>;


// Contract proposals table
export const contractProposals = pgTable("contract_proposals", {
  id: serial("id").primaryKey(),
  bookingRequestId: integer("booking_request_id").references(() => bookingRequests.id, { onDelete: "cascade" }).notNull(),
  proposedBy: integer("proposed_by").references(() => profiles.id, { onDelete: "cascade" }).notNull(),
  proposedTo: integer("proposed_to").references(() => profiles.id, { onDelete: "cascade" }).notNull(),
  title: varchar("title").notNull(),
  description: text("description"),
  terms: jsonb("terms").notNull(), // Contract terms object
  payment: jsonb("payment").notNull(), // Payment details
  requirements: text("requirements"),
  attachments: jsonb("attachments").default([]),
  status: varchar("status").notNull().default("pending"), // pending, accepted, rejected, negotiating
  expiresAt: timestamp("expires_at"),
  acceptedAt: timestamp("accepted_at"),
  rejectedAt: timestamp("rejected_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Contract negotiations table for back-and-forth proposals
export const contractNegotiations = pgTable("contract_negotiations", {
  id: serial("id").primaryKey(),
  contractProposalId: integer("contract_proposal_id").references(() => contractProposals.id, { onDelete: "cascade" }).notNull(),
  profileId: integer("profile_id").references(() => profiles.id, { onDelete: "cascade" }).notNull(),
  message: text("message").notNull(),
  proposedChanges: jsonb("proposed_changes"), // Changes to terms/payment
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Contract signatures table
export const contractSignatures = pgTable("contract_signatures", {
  id: serial("id").primaryKey(),
  contractProposalId: integer("contract_proposal_id").references(() => contractProposals.id).notNull(),
  profileId: integer("profile_id").references(() => profiles.id).notNull(),
  signatureData: text("signature_data").notNull(),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  signedAt: timestamp("signed_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const profileViews = pgTable("profile_views", {
  id: serial("id").primaryKey(),
  viewerId: integer("viewer_id").references(() => users.id).notNull(),
  viewerProfileId: integer("viewer_profile_id").references(() => profiles.id).notNull(),
  viewedProfileId: integer("viewed_profile_id").references(() => profiles.id).notNull(),
  viewedAt: timestamp("viewed_at").defaultNow().notNull(),
  sessionId: varchar("session_id", { length: 255 }),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
});

// Relations for contract system
export const contractProposalsRelations = relations(contractProposals, ({ one, many }) => ({
  bookingRequest: one(bookingRequests, {
    fields: [contractProposals.bookingRequestId],
    references: [bookingRequests.id],
  }),
  proposer: one(profiles, {
    fields: [contractProposals.proposedBy],
    references: [profiles.id],
    relationName: "proposer",
  }),
  recipient: one(profiles, {
    fields: [contractProposals.proposedTo],
    references: [profiles.id],
    relationName: "recipient",
  }),
  negotiations: many(contractNegotiations),
  signatures: many(contractSignatures),
}));

export const contractNegotiationsRelations = relations(contractNegotiations, ({ one }) => ({
  contractProposal: one(contractProposals, {
    fields: [contractNegotiations.contractProposalId],
    references: [contractProposals.id],
  }),
  profile: one(profiles, {
    fields: [contractNegotiations.profileId],
    references: [profiles.id],
  }),
}));

export const contractSignaturesRelations = relations(contractSignatures, ({ one }) => ({
  contractProposal: one(contractProposals, {
    fields: [contractSignatures.contractProposalId],
    references: [contractProposals.id],
  }),
  profile: one(profiles, {
    fields: [contractSignatures.profileId],
    references: [profiles.id],
  }),
}));

// Type exports
export type ContractProposal = InferSelectModel<typeof contractProposals>;
export type InsertContractProposal = InferInsertModel<typeof contractProposals>;
export type ContractNegotiation = InferSelectModel<typeof contractNegotiations>;
export type InsertContractNegotiation = InferInsertModel<typeof contractNegotiations>;
export type ContractSignature = InferSelectModel<typeof contractSignatures>;
export type InsertContractSignature = InferInsertModel<typeof contractSignatures>;