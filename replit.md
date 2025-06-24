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
- None currently - application is stable and functional

## Deployment
- Ready for deployment on Replit
- Server configured to bind to 0.0.0.0:5000
- Database connections properly configured
- Environment variables managed through Replit secrets