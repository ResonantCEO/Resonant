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
  backgroundImageUrl: varchar("background_image_url"),
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
  backgroundImageUrl: varchar("background_image_url"),
  profileBackground: text("profile_background"), // 'sunset', 'ocean', 'forest', 'gradient-1', etc., or 'custom-photo'
  visibility: varchar("visibility").notNull().default("public"), // 'public', 'friends', 'private'
  location: varchar("location"),
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
export type InsertProfileInvitation = z.infer<typeof insertProfileInvitationSchema>;
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

export const notificationTypeSchema = z.enum([
  "friend_request",
  "friend_accepted",
  "post_like",
  "comment",
  "post_comment",
  "message",
  "profile_invite",
  "profile_deleted",
  "profile_restored",
  "membership_updated",
  "system_announcement",
  "booking_request",
  "booking_confirmed",
  "booking_cancelled",
  "event_reminder"
]);

// Events table - for both artists and venues
export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  title: varchar("title").notNull(),
  description: text("description"),
  eventType: varchar("event_type").notNull(), // 'concert', 'private_event', 'rehearsal', 'meeting', 'recording', 'show'
  startDateTime: timestamp("start_date_time").notNull(),
  endDateTime: timestamp("end_date_time").notNull(),
  allDay: boolean("all_day").default(false),
  location: varchar("location"),
  venueId: integer("venue_id").references(() => profiles.id), // reference to venue profile if applicable
  maxCapacity: integer("max_capacity"),
  currentBookings: integer("current_bookings").default(0),
  ticketPrice: varchar("ticket_price"), // stored as string to handle "Free", "$50", etc.
  contactEmail: varchar("contact_email"),
  contactPhone: varchar("contact_phone"),
  recurring: varchar("recurring"), // 'none', 'daily', 'weekly', 'monthly'
  recurringEndDate: timestamp("recurring_end_date"),
  status: varchar("status").notNull().default("draft"), // 'draft', 'published', 'cancelled', 'completed'
  visibility: varchar("visibility").notNull().default("public"), // 'public', 'private', 'friends'
  requiresApproval: boolean("requires_approval").default(false), // for venue bookings
  metadata: jsonb("metadata"), // flexible field for additional event data
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Bookings table - for venue booking requests and confirmations
export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").references(() => events.id, { onDelete: "cascade" }),
  venueId: integer("venue_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  artistId: integer("artist_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  requestedDateTime: timestamp("requested_date_time").notNull(),
  endDateTime: timestamp("end_date_time").notNull(),
  eventTitle: varchar("event_title").notNull(),
  eventDescription: text("event_description"),
  expectedAttendance: integer("expected_attendance"),
  setupRequirements: text("setup_requirements"),
  equipmentNeeds: text("equipment_needs"),
  budgetRange: varchar("budget_range"),
  contactEmail: varchar("contact_email").notNull(),
  contactPhone: varchar("contact_phone"),
  status: varchar("status").notNull().default("pending"), // 'pending', 'approved', 'rejected', 'cancelled', 'completed'
  rejectionReason: text("rejection_reason"),
  venueNotes: text("venue_notes"), // internal notes from venue
  artistNotes: text("artist_notes"), // notes from artist
  contractUrl: varchar("contract_url"), // link to signed contract if applicable
  depositAmount: varchar("deposit_amount"),
  totalCost: varchar("total_cost"),
  paymentStatus: varchar("payment_status").default("pending"), // 'pending', 'partial', 'paid', 'refunded'
  remindersSent: integer("reminders_sent").default(0),
  lastReminderSent: timestamp("last_reminder_sent"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Availability table - for venues to set their available time slots
export const availability = pgTable("availability", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  dayOfWeek: integer("day_of_week").notNull(), // 0 = Sunday, 1 = Monday, etc.
  startTime: varchar("start_time").notNull(), // "09:00"
  endTime: varchar("end_time").notNull(), // "17:00"
  isAvailable: boolean("is_available").default(true),
  notes: text("notes"), // special notes about this time slot
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Blocked dates table - for specific dates when venues are unavailable
export const blockedDates = pgTable("blocked_dates", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  reason: varchar("reason"), // 'maintenance', 'private_event', 'holiday', 'other'
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Event attendees table - for tracking who's attending events
export const eventAttendees = pgTable("event_attendees", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  profileId: integer("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  status: varchar("status").notNull().default("going"), // 'going', 'maybe', 'not_going'
  ticketsPurchased: integer("tickets_purchased").default(0),
  totalPaid: varchar("total_paid"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations for booking system
export const eventsRelations = relations(events, ({ one, many }) => ({
  profile: one(profiles, {
    fields: [events.profileId],
    references: [profiles.id],
  }),
  venue: one(profiles, {
    fields: [events.venueId],
    references: [profiles.id],
    relationName: "venue",
  }),
  bookings: many(bookings),
  attendees: many(eventAttendees),
}));

export const bookingsRelations = relations(bookings, ({ one }) => ({
  event: one(events, {
    fields: [bookings.eventId],
    references: [events.id],
  }),
  venue: one(profiles, {
    fields: [bookings.venueId],
    references: [profiles.id],
    relationName: "venue",
  }),
  artist: one(profiles, {
    fields: [bookings.artistId],
    references: [profiles.id],
    relationName: "artist",
  }),
}));

export const availabilityRelations = relations(availability, ({ one }) => ({
  profile: one(profiles, {
    fields: [availability.profileId],
    references: [profiles.id],
  }),
}));

export const blockedDatesRelations = relations(blockedDates, ({ one }) => ({
  profile: one(profiles, {
    fields: [blockedDates.profileId],
    references: [profiles.id],
  }),
}));

export const eventAttendeesRelations = relations(eventAttendees, ({ one }) => ({
  event: one(events, {
    fields: [eventAttendees.eventId],
    references: [events.id],
  }),
  profile: one(profiles, {
    fields: [eventAttendees.profileId],
    references: [profiles.id],
  }),
}));

// Booking system schemas
export const insertEventSchema = createInsertSchema(events).omit({
  id: true,
  currentBookings: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBookingSchema = createInsertSchema(bookings).omit({
  id: true,
  status: true,
  remindersSent: true,
  lastReminderSent: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAvailabilitySchema = createInsertSchema(availability).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBlockedDateSchema = createInsertSchema(blockedDates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEventAttendeeSchema = createInsertSchema(eventAttendees).omit({
  id: true,
  ticketsPurchased: true,
  totalPaid: true,
  createdAt: true,
  updatedAt: true,
});

// Booking system types
export type Event = typeof events.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Availability = typeof availability.$inferSelect;
export type InsertAvailability = z.infer<typeof insertAvailabilitySchema>;
export type BlockedDate = typeof blockedDates.$inferSelect;
export type InsertBlockedDate = z.infer<typeof insertBlockedDateSchema>;
export type EventAttendee = typeof eventAttendees.$inferSelect;
export type InsertEventAttendee = z.infer<typeof insertEventAttendeeSchema>;

// Event and booking validation schemas
export const eventTypeSchema = z.enum(["concert", "private_event", "rehearsal", "meeting", "recording", "show"]);
export const bookingStatusSchema = z.enum(["pending", "approved", "rejected", "cancelled", "completed"]);
export const attendeeStatusSchema = z.enum(["going", "maybe", "not_going"]);