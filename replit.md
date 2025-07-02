# Resonant - Social Music Platform

## Project Overview
Resonant is a full-stack social music platform built with React, Express, and PostgreSQL. The platform enables users to create multiple profile types (audience, artist, venue), connect with others, share posts, and manage bookings.

## Current State
The application is fully functional with:
- User authentication and session management
- Multiple profile types per user
- Social features (posts, friends, notifications)
- Booking system for artists and venues
- Real-time notification counts
- Image upload and profile customization

## Recent Changes
### July 1, 2025 - Version 0.7.0 - Performance Optimization Complete
- ✓ **Critical React Hooks Order Fix**: Resolved React Hooks order violation in ProfileHeader component that caused app crashes and excessive re-renders
- ✓ **Optimized Notification Polling**: Reduced polling frequency from 5 seconds to 30 seconds with smart caching (25-second staleTime, 5-minute garbage collection)
- ✓ **WebSocket Notification System**: Implemented useNotificationSocket hook for real-time notification updates with proper connection management and cleanup
- ✓ **Request Debouncing**: Added useDebounce hook with 300ms debouncing for profile switching to prevent rapid-fire API calls
- ✓ **Smart Cache Management**: Implemented selective cache invalidation with optimized refetch strategies (active queries only, stale marking)
- ✓ **Memory Leak Prevention**: Added proper WebSocket cleanup and timeout management to prevent memory accumulation
- ✓ **Performance Monitoring**: Eliminated 20-second profile switching delays and reduced notification API load by 83%
- ✓ **Message System Optimization**: Fixed WebSocket cleanup blocking in messages page that caused 20-second delays when switching profiles after opening messages
- ✓ **Cache Management Fix**: Added targeted cache clearing for conversations and friends data during profile switches to prevent stale data blocking

### July 1, 2025 - Version 0.6.0 - Real-Time Messaging
- ✓ Successfully migrated messaging system from polling to real-time WebSockets
- ✓ Implemented comprehensive useSocket hook with connection management and event handlers
- ✓ Updated messages.tsx to use WebSocket events for real-time message sending and receiving
- ✓ Added conversation joining/leaving logic for proper WebSocket room management
- ✓ Implemented typing indicators with visual animations and automatic timeout
- ✓ Eliminated all polling queries (previously every 2-5 seconds) for true real-time messaging
- ✓ Enhanced message input with typing detection and WebSocket fallback to HTTP API
- ✓ Added real-time cache updates for conversations and messages via WebSocket events
- ✓ Improved performance by removing unnecessary API calls and leveraging WebSocket infrastructure

### June 30, 2025 - Version 0.5.1
- ✓ Fixed critical JSX syntax error in friends.tsx that caused app crash
- ✓ Resolved "Unterminated JSX contents" compilation error by adding missing closing div tag
- ✓ Updated discover page to display Events tab first by default as requested
- ✓ Reordered tab navigation so Events appears before Profiles
- ✓ Application stability restored with all functionality preserved
- ✓ Discover page now shows Events tab selected on initial load

### June 30, 2025 - Version 0.5.0
- ✓ Fixed critical JSX syntax errors in sidebar component that caused complete app failure
- ✓ Resolved "Expected corresponding JSX closing tag" compilation errors
- ✓ Rebuilt sidebar component with proper JSX structure and error handling
- ✓ Application now starts reliably on port 5000 without compilation errors
- ✓ Maintained all existing functionality while fixing critical stability issues
- ✓ Enhanced error handling for database operations to prevent crashes
- ✓ Confirmed profile navigation and real-time notifications continue working
- ✓ Published comprehensive changelog documenting all critical fixes

### June 29, 2025
- ✓ Fixed profile navigation issue from discovery page
- ✓ Resolved database error caused by missing `profile_views` table
- ✓ Added proper error handling for profile view tracking to prevent endpoint crashes
- ✓ Profile API endpoints now return correct data without 500 errors
- ✓ Navigation from discovery page to individual profiles confirmed working

### December 24, 2025
- ✓ Fixed critical app crashes caused by JSX syntax errors in post-feed.tsx
- ✓ Resolved database query error for following-artists endpoint by removing non-existent `genre` field
- ✓ Fixed structural issues in routes.ts that were causing compilation failures
- ✓ Server now running successfully on port 5000 with frontend connecting properly
- ✓ Authentication system working correctly with proper session handling

## Technical Architecture
- **Frontend**: React with TypeScript, Vite, TailwindCSS, shadcn/ui components
- **Backend**: Express.js with TypeScript, Drizzle ORM
- **Database**: PostgreSQL with Drizzle schema management
- **Authentication**: Passport.js with local strategy
- **File Upload**: Multer for image handling
- **State Management**: TanStack Query for API state

## Database Schema
Key tables:
- `users` - Primary user accounts
- `profiles` - Multiple profile types per user (audience, artist, venue)
- `posts` - User-generated content
- `friendships` - Social connections between profiles
- `notifications` - Real-time notification system
- `booking_requests` - Artist/venue booking system
- `contract_proposals` - Contract management

## User Preferences
- Theme: Dark mode enabled by default
- Notifications: Real-time notification counts across profiles
- Profile switching: Seamless switching between multiple profile types

## Known Issues
- TypeScript errors in profile.tsx component due to untyped API responses (non-critical - functionality works)
- Minor LSP errors in routes.ts for error handling and type definitions (non-critical)

## Deployment
- Ready for deployment on Replit
- Server configured to bind to 0.0.0.0:5000
- Database connections properly configured
- Environment variables managed through Replit secrets