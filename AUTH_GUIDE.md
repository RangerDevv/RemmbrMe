# RemmbrMe - Authentication System

## Overview

A comprehensive authentication system has been implemented with the following features:

### Features Implemented

1. **User Authentication**
   - Login page with email/password
   - Signup page with validation
   - Session management with PocketBase
   - Protected routes for authenticated users only
   - Auto-redirect to login for unauthenticated users

2. **Enhanced Sidebar**
   - User profile display with avatar
   - PRO user badge
   - Quick stats (Todos, Events, Completed tasks)
   - Profile dropdown menu
   - Settings navigation
   - Logout functionality
   - Quick action buttons

3. **Profile/Settings Page**
   - Update display name and email
   - Change password
   - Delete account (with confirmation)
   - Tabbed interface (Profile & Security)

4. **Centralized PocketBase Instance**
   - Single pb instance shared across all components
   - Reactive auth state management
   - Auth state listeners

## File Structure

```
src/
├── lib/
│   └── backend.ts          # Centralized PocketBase instance & auth helpers
├── components/
│   ├── Sidebar.tsx            # Enhanced sidebar with user profile
│   └── ProtectedRoute.tsx     # HOC for protecting routes
├── pages/
│   ├── Login.tsx              # Login page
│   ├── Signup.tsx             # Signup page
│   └── Profile.tsx            # User profile & settings
└── App.tsx                    # Updated with auth routes
```

## Setup

### 1. PocketBase Setup

Make sure your PocketBase instance has a `users` collection with these fields:
- email (email, required, unique)
- name (text, required)
- password (password, required, min 8 characters)
- proUser (bool, default: false)
- emailVisibility (bool, default: true)

### 2. Demo Account

A demo account is pre-configured:
- Email: `test@example.com`
- Password: `12345678`

You can create this account by visiting the signup page or using the PocketBase admin panel.

## Usage

### Authentication Flow

1. **Unauthenticated users** are redirected to `/login`
2. **After login**, users are redirected to Dashboard (`/`)
3. **Session persists** across page refreshes
4. **Logout** clears the auth session

### API Usage

```typescript
import { pb, login, signup, logout, currentUser, isAuthenticated } from './lib/pocketbase';

// Login
const result = await login('email@example.com', 'password');
if (result.success) {
  // Navigate to dashboard
}

// Signup
const result = await signup('email@example.com', 'password', 'password', 'John Doe');
if (result.success) {
  // Auto-logged in, navigate to dashboard
}

// Logout
logout(); // Clears auth store

// Check auth status
if (isAuthenticated()) {
  console.log('User is logged in:', currentUser());
}
```

### Protected Routes

All main routes are now protected:
- `/` - Dashboard
- `/todo` - Todo List
- `/calendar` - Calendar
- `/timemachine` - Time Machine
- `/ai` - AI Assistant
- `/tags` - Tags Management
- `/profile` - User Profile & Settings

Public routes:
- `/login` - Login page
- `/signup` - Signup page

### Sidebar Features

The new sidebar includes:

1. **User Profile Section**
   - Avatar with first letter of name
   - Display name and email
   - PRO badge (if applicable)
   - Dropdown menu on click

2. **Quick Stats**
   - Total todos
   - Total events
   - Completed tasks

3. **Navigation**
   - All existing pages
   - Visual indicators for active page

4. **Quick Actions**
   - New Todo button
   - New Event button

5. **Profile Menu**
   - Settings link
   - Upgrade to Pro (if not pro)
   - Logout button

## Security Features

- Passwords are hashed by PocketBase
- Minimum 8 character password requirement
- Email validation on signup
- Password confirmation on signup
- Session tokens stored securely
- Auth state reactivity for instant UI updates

## Customization

### Styling
The authentication pages use the same design system as the rest of the app:
- Black background (`bg-black`)
- Zinc-900 cards (`bg-zinc-900`)
- Gradient accents (blue-purple-pink)
- Border animations on focus
- Smooth transitions

### Adding Pro Features

To gate features behind PRO status:

```typescript
import { currentUser } from './lib/pocketbase';

// In your component
<Show when={currentUser()?.proUser}>
  <ProFeatureComponent />
</Show>
```

## Troubleshooting

### "Cannot connect to PocketBase"
- Ensure PocketBase is running on `http://127.0.0.1:8090`
- Check the `pb` instance URL in `lib/backend.ts`

### "Invalid credentials"
- Check email and password are correct
- Ensure user exists in PocketBase
- Create demo account if needed

### "Route not protected"
- Verify route is wrapped with `ProtectedRoute`
- Check `isAuthenticated()` returns correct value
- Clear browser cache and localStorage

## Next Steps

Consider implementing:
1. **Email verification** - Send verification emails on signup
2. **Password reset** - "Forgot password" functionality
3. **OAuth** - Google/GitHub login
4. **2FA** - Two-factor authentication
5. **Role-based access** - Admin vs regular users
6. **Pro subscription** - Payment integration for Pro features
7. **Profile pictures** - Upload custom avatars
8. **Account activity log** - Track logins and changes

## API Reference

### `lib/backend.ts`

#### Exports

- `pb: PocketBase` - Singleton PocketBase instance
- `isAuthenticated: () => boolean` - Check if user is authenticated
- `currentUser: () => Record | null` - Get current user record
- `login(email, password)` - Login user
- `signup(email, password, passwordConfirm, name)` - Register new user
- `logout()` - Clear auth session
- `updateProfile(userId, data)` - Update user profile

#### Signals

- `isAuthenticated` - Reactive signal for auth status
- `currentUser` - Reactive signal for current user record

These signals automatically update when auth state changes, triggering UI re-renders.

## Migration Guide

All pages have been updated to use the centralized `pb` instance from `lib/backend.ts` instead of creating individual instances. This ensures:

1. Single source of truth for auth state
2. Automatic auth state synchronization
3. Reduced memory footprint
4. Easier to manage auth across the app

No changes needed to existing PocketBase API calls - they work exactly the same!
