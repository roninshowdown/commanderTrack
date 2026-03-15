# 🎮 Quick Start Guide

Choose your setup mode and get started in minutes!

## 🚀 Option 1: Debug Mode (Fastest - 30 seconds)

Perfect for **testing, development, and demos**. No Firebase setup required!

```bash
# 1. Install dependencies
npm install

# 2. Activate debug mode
npm run dev:debug

# 3. Open browser
# Visit http://localhost:5173
```

**What you get:**
- ✅ 6 players with avatars
- ✅ 15 commander decks with real card images  
- ✅ 15 completed games
- ✅ 300+ log entries for analytics
- ✅ Full rankings and charts
- ✅ No authentication needed

**Perfect for:**
- First-time exploration
- Development and testing
- Demos and screenshots
- UI/UX development

---

## 🏠 Option 2: Local Mode (2 minutes)

**Empty state with localStorage persistence**. No Firebase, no mock data.

```bash
# 1. Install dependencies
npm install

# 2. Create .env file
cp .env.example .env

# 3. Keep debug mode OFF in .env
VITE_DEBUG_MODE=false
VITE_FIREBASE_API_KEY=your-api-key  # Keep placeholder

# 4. Start dev server
npm run dev
```

**What you get:**
- ✅ Empty state (add your own data)
- ✅ Data persists in browser localStorage
- ✅ No authentication
- ✅ Works offline

**Perfect for:**
- Personal use on single device
- Offline usage
- Quick local testing

---

## ☁️ Option 3: Firebase Mode (15 minutes)

**Full production setup** with cloud sync, authentication, and multi-device support.

### Prerequisites
- Google account
- Firebase CLI: `npm install -g firebase-tools`

### Quick Setup
```bash
# 1. Install dependencies
npm install

# 2. Create Firebase project (web console)
# → https://console.firebase.google.com/
# → Create project "commander-track"
# → Enable Google Authentication
# → Create Firestore database

# 3. Deploy rules and indexes
firebase login
firebase init  # Select Firestore, use existing files
firebase deploy --only firestore

# 4. Configure .env with your Firebase credentials
cp .env.example .env
# Edit .env with real Firebase config from console

# 5. Start dev server
npm run dev
```

**Detailed guide:** See [FIREBASE_SETUP.md](./FIREBASE_SETUP.md)

**What you get:**
- ✅ Google sign-in authentication
- ✅ Cloud data persistence (Firestore)
- ✅ Multi-device sync
- ✅ Shared data with playgroup
- ✅ Production-ready

**Perfect for:**
- Production deployment
- Multiple devices
- Sharing with playgroup
- Long-term use

---

## 🎯 Which Mode Should I Choose?

| Scenario | Recommended Mode |
|----------|-----------------|
| "I want to try it NOW" | **Debug Mode** |
| "Testing the app locally" | **Debug Mode** or **Local Mode** |
| "Building new features" | **Debug Mode** |
| "Using on one device" | **Local Mode** |
| "Sharing with friends" | **Firebase Mode** |
| "Production deployment" | **Firebase Mode** |
| "Multi-device sync" | **Firebase Mode** |

---

## 📱 Usage Modes Summary

### Debug Mode Features
- ✅ Auto-populated mock data
- ✅ Realistic MTG commanders
- ✅ Pre-populated game history
- ✅ Console utilities (`__debugUtils`)
- ❌ No cloud sync
- ❌ No authentication

### Local Mode Features
- ✅ Empty state (add your own data)
- ✅ Browser localStorage
- ✅ Works offline
- ❌ No cloud sync
- ❌ No authentication
- ❌ Single device only

### Firebase Mode Features
- ✅ Google Authentication
- ✅ Cloud Firestore storage
- ✅ Multi-device sync
- ✅ Share with playgroup
- ✅ Production-ready
- ⚠️ Requires Firebase setup
- ⚠️ Requires internet connection

---

## 🔧 Switching Modes

### Debug → Local
```bash
# Edit .env
VITE_DEBUG_MODE=false
VITE_FIREBASE_API_KEY=your-api-key  # Keep placeholder

# Restart
npm run dev
```

### Debug → Firebase
```bash
# Setup Firebase (see FIREBASE_SETUP.md)
# Edit .env with real credentials
VITE_DEBUG_MODE=false
VITE_FIREBASE_API_KEY=<real-key>

# Deploy Firestore
firebase deploy --only firestore

# Restart
npm run dev
```

### Firebase → Debug
```bash
# Use the npm script (cross-platform)
npm run dev:debug

# OR manually edit .env
VITE_DEBUG_MODE=true
VITE_FIREBASE_API_KEY=your-api-key  # Use placeholder

# Clear data in browser console
localStorage.clear()
```

---

## 🐛 Troubleshooting

### Debug mode not working?
1. Check `.env` has `VITE_DEBUG_MODE=true`
2. Firebase credentials must be **placeholders** (start with `your-`)
3. Restart dev server completely
4. Clear browser localStorage and reload

### Firebase errors?
1. Deploy rules: `firebase deploy --only firestore:rules`
2. Deploy indexes: `firebase deploy --only firestore:indexes`  
3. Check you're signed in with Google
4. Verify credentials in `.env` match Firebase Console

### No data showing?
- **Debug mode:** Check console for initialization logs
- **Local mode:** Add data manually in Admin section
- **Firebase mode:** Sign in first, then add data

---

## 📚 Documentation

- **[README.md](./README.md)** - Project overview and architecture
- **[FIREBASE_SETUP.md](./FIREBASE_SETUP.md)** - Detailed Firebase setup guide
- **[SETUP_VERIFICATION.md](./SETUP_VERIFICATION.md)** - Verification checklists

---

## 🎉 Next Steps

After setup, explore the app:

1. **Home** - Main navigation hub
2. **Setup** - Configure new game (players, timer, life total)
3. **Game** - Track life and timer during gameplay
4. **Admin** - Manage players and commander decks
5. **Log** - View analytics with charts (per-match, per-player, global)
6. **Rank** - Leaderboards and statistics

Enjoy tracking your Commander games! ⚔️


