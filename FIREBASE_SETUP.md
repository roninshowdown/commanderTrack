# Firebase Setup Guide

This guide walks you through setting up Firebase for Commander Track.

## Prerequisites

1. A Google account
2. Node.js 18+ installed

## Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"**
3. Enter project name: `commander-track` (or your preferred name)
4. Disable Google Analytics (optional for this app)
5. Click **"Create project"**

## Step 2: Enable Authentication

1. In the Firebase Console, go to **Authentication** → **Sign-in method**
2. Click **"Get started"** if prompted
3. Enable **Google** as a sign-in provider:
   - Click on **Google**
   - Toggle **"Enable"**
   - Select a support email (your email)
   - Click **"Save"**

## Step 3: Create Firestore Database

1. Go to **Firestore Database** in the left sidebar
2. Click **"Create database"**
3. Choose **"Start in production mode"** (we have security rules defined)
4. Select a location (choose closest to your users)
5. Click **"Enable"**

## Step 4: Deploy Firestore Rules & Indexes

In your project directory, run:

```bash
# Install Firebase CLI (if not already installed)
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase (select existing project)
firebase init

# When prompted, select:
# - Firestore (rules and indexes)
# - Use existing files (firestore.rules, firestore.indexes.json)

# Deploy rules and indexes
firebase deploy --only firestore
```

**Important:** The Firestore rules require authentication. Users must sign in with Google before they can read/write data.

## Step 5: Register Your Web App

1. In Firebase Console, go to **Project Settings** (gear icon)
2. Scroll down to **"Your apps"**
3. Click the **Web** icon (`</>`)
4. Register app:
   - App nickname: `Commander Track Web`
   - Don't check "Firebase Hosting" (we'll do that separately if needed)
   - Click **"Register app"**
5. Copy the Firebase configuration object

## Step 6: Configure Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Open `.env` and replace the placeholder values with your Firebase config:
   ```env
   VITE_FIREBASE_API_KEY=your-api-key-from-firebase-console
   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
   VITE_FIREBASE_APP_ID=your-app-id
   
   # Debug mode (set to 'true' for local dev with mock data)
   VITE_DEBUG_MODE=false
   ```

3. Save the file

## Step 7: Test the Setup

```bash
# Start the dev server
npm run dev
```

Open http://localhost:5173

- You should see the sign-in screen
- Click "Sign in with Google"
- After signing in, you should be able to:
  - Add players in Admin → Players
  - Add decks in Admin → Decks
  - Start a new game
  - View rankings and analytics

## Debug Mode (Local Development)

For rapid development and testing **without Firebase**:

1. Set `VITE_DEBUG_MODE=true` in `.env`
2. Comment out or remove Firebase credentials (or use placeholders starting with `your-`)
3. Restart dev server

The app will:
- Run in **Local Mode** (localStorage)
- Auto-populate with **mock data** (6 players, 10-15 decks, 15 games with logs)
- No authentication required

**Note:** Debug mode only works when Firebase is NOT configured. Once you add real Firebase credentials, the app uses Firebase exclusively.

## Troubleshooting

### "Permission denied" errors in Firestore

**Cause:** User is not authenticated, or Firestore rules are not deployed.

**Solution:**
1. Ensure you're signed in (click "Sign in with Google")
2. Deploy Firestore rules: `firebase deploy --only firestore:rules`
3. Check rules in Firebase Console → Firestore → Rules

### "Missing index" errors

**Cause:** Firestore composite indexes not created.

**Solution:**
1. Deploy indexes: `firebase deploy --only firestore:indexes`
2. Or click the link in the error message to auto-create the index

### App stuck on "Loading..."

**Cause:** Firebase connection timeout or missing configuration.

**Solution:**
1. Check browser console for errors
2. Verify `.env` file has correct Firebase credentials
3. Try clearing localStorage: `localStorage.clear()` in browser console
4. Restart dev server

## Production Deployment

### Option A: Firebase Hosting

```bash
# Build the app
npm run build

# Initialize Firebase Hosting (if not done)
firebase init hosting

# Deploy
firebase deploy --only hosting
```

### Option B: Other Hosting (Vercel, Netlify, etc.)

1. Build the app: `npm run build`
2. Upload the `build/` folder to your hosting provider
3. Configure environment variables on the hosting platform

## Security Considerations

- **Never commit `.env` to git** (already in `.gitignore`)
- Firestore rules require authentication for all operations
- Consider adding rate limiting and more granular rules for production
- Review Firebase Console → Authentication → Users regularly

## Next Steps

- Customize Firestore security rules in `firestore.rules`
- Add Firebase Cloud Functions for advanced features
- Set up Firebase Analytics (optional)
- Configure custom domain in Firebase Hosting

