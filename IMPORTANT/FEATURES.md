# Resonant Feature & Component Breakdown

## 1. User & Profile Management

### Features:

Multi-profile support (Artist, Venue, Audience profiles)

Shared profiles with multiple members and roles

Role-based access control (Owner, Admin, Manager, Member)

Profile switching & active profile management

Profile cover photos and avatars

Profile privacy and visibility settings

### Backend Functions/APIs:

CRUD for profiles

Membership management (profileMemberships table)

Permissions validation middleware

Invitations system (create, validate, accept, expire)

Profile photo upload handling (with Multer)

### React Components:

ProfileList — displays all user profiles for switching/management

ProfileHeader — shows profile info, cover photo, active profile indicator

ProfileTabs — tab navigation for posts, members, events, etc.

ProfileSettings — tabbed settings interface (privacy, appearance)

SharedProfileMembersTab — list of members/staff with role badges

MemberInviteModal — modal for inviting members by email with role/permission selection

MemberRoleBadge — visual role indicator (Crown, Shield, etc.)

ProfileCoverUploader — upload and crop cover photos

## 2. Member & Permissions Management

### Features:

Role hierarchy with granular permissions

Invitation workflow with email validation and expiration

Member role updates and removal (with safeguards)

Real-time member list updates

Permission-based UI and API restrictions

### Backend Functions/APIs:

GET /api/profiles/:id/members — fetch members with roles

POST /api/profiles/:id/invite — send invitations

PATCH /api/profile-memberships/:id — update roles/permissions

DELETE /api/profile-memberships/:id — remove members

Permission validation layer in all APIs

### React Components:

MembersTab — displays current members/staff with pagination

InvitationsTab — shows pending invitations with status

RolePermissionGrid — checkbox grid for fine-tuning permissions during invite/edit

MemberActionsDropdown — remove/edit role options with confirmation dialogs

PermissionRestrictedWrapper — HOC or hook to conditionally render UI based on permissions

## 3. Posts & Content System

### Features:

Post creation and editing (rich text or markdown)

Posts tied to active profile

Likes, comments, and threaded replies

Post privacy and visibility settings

Activity feed with real-time updates

### Backend Functions/APIs:

Posts CRUD endpoints

Likes and comments endpoints

Feed API with pagination and filtering

Notification triggers on post activities

### React Components:

PostList — feed of posts with infinite scroll

PostItem — individual post display with likes/comments

PostEditor — rich text or markdown editor

CommentThread — nested comments display and input

LikeButton — toggles like state with optimistic UI update

## 4. Events & Bookings Module

### Features:

Event creation, editing, and publishing

Booking requests and confirmations

Calendar or list views for events

Notifications for booking status changes

Role-based access to event and booking management

### Backend Functions/APIs:

Events CRUD APIs

Booking request APIs (create, approve, decline)

User event participation status

Notification hooks for bookings and event updates

### React Components:

EventList — upcoming and past events display

EventCard — event summary with booking status

EventEditor — create/edit event form

BookingRequests — list of booking requests with action buttons

BookingStatusBadge — visual indicator of booking state

## 5. Invitation & Notification System

### Features:

Email invitations for profile membership

Real-time notification for member activities and events

Notification preferences management

Email templates and token-based invitation security

### Backend Functions/APIs:

Invitation token generation and expiration management

Email sending integration (SendGrid or similar)

Notification CRUD and delivery system

User preferences API for notifications

### React Components:

InvitationModal — form for sending invites (part of members management)

NotificationBell — UI icon with unread count

NotificationDropdown — list of recent notifications

NotificationSettings — user preferences for notification types

## 6. Settings & Preferences

### Features:

User account settings (email, password, language)

Profile-specific settings (appearance, privacy)

Notification preferences

Dark mode & compact mode toggles

Persistent preferences stored in DB and local storage

### Backend Functions/APIs:

User settings endpoints (GET/PUT /api/user/preferences)

Profile settings endpoints

Appearance preference storage and retrieval

### React Components:

SettingsPage — main settings container with tab navigation

PreferencesForm — update user preferences with validation

ThemeToggle — dark/light mode switch

LanguageSelector — dropdown for localization options

## 7. Authentication & Authorization

### Features:

User registration and login with Replit Auth

Session management with JWT or secure cookies

Role-based access enforcement on frontend and backend

Forgot password and account recovery flow

### Backend Functions/APIs:

Auth middleware for protected routes

User session APIs

Password reset APIs (if applicable)

### React Components:

LoginForm — login UI with error handling

RegisterForm — new user signup form

ProtectedRoute — wrapper to guard pages based on auth status

AuthContext — context provider managing auth state

## 8. File Uploads & Media Handling

### Features:

Profile cover photos and avatars upload (max size 5MB)

Secure file validation and storage

Upload progress UI and error handling

CDN or static serving for media files

### Backend Functions/APIs:

File upload endpoints with Multer middleware

Storage folder management and cleanup

Validation on file type and size

### React Components:

FileUploadInput — reusable file input with preview

UploadProgressBar — visual upload progress indicator

ImageCropper (optional) — crop/resize before upload

## 9. Real-time & Optimistic UI Updates

### Features:

Optimistic UI updates for member changes, likes, comments

Real-time UI sync on role changes, invitations, event updates

React Query integration for cache invalidation and data fetching

### Backend Functions/APIs:

WebSocket or polling endpoints for real-time events

Event emitters on backend to notify connected clients

### React Components:

Hooks to subscribe to real-time updates

Toast notifications for feedback on optimistic updates

State management integration with React Query