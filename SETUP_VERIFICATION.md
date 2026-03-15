# Firebase & Debug Mode Setup Verification Checklist

Use this checklist to verify your Firebase setup and debug mode are working correctly.

## ✅ Firebase Setup Verification

### 1. Firebase Project Created
- [ ] Project exists in [Firebase Console](https://console.firebase.google.com/)
- [ ] Project ID matches `.env` configuration

### 2. Authentication Enabled
- [ ] Google sign-in provider is enabled
- [ ] Support email is configured
- [ ] Test: Can sign in from the app

### 3. Firestore Database Created
- [ ] Database created in Firebase Console
- [ ] Location selected (should be close to your users)
- [ ] Production mode enabled

### 4. Security Rules Deployed
```bash
firebase deploy --only firestore:rules
```
- [ ] Command executed successfully
- [ ] Rules visible in Firebase Console → Firestore → Rules
- [ ] Rules require authentication (`if request.auth != null`)

### 5. Indexes Deployed
```bash
firebase deploy --only firestore:indexes
```
- [ ] Command executed successfully
- [ ] Indexes visible in Firebase Console → Firestore → Indexes
- [ ] Three indexes created:
  - `games` collection: `createdAt DESC`
  - `gameLogs` collection: `gameId ASC, timestamp DESC`
  - `gameLogs` collection: `timestamp DESC`

### 6. Environment Variables Configured
Check `.env` file contains:
- [ ] `VITE_FIREBASE_API_KEY` (real value from Firebase Console)
- [ ] `VITE_FIREBASE_AUTH_DOMAIN` (ends with `.firebaseapp.com`)
- [ ] `VITE_FIREBASE_PROJECT_ID` (matches Firebase project)
- [ ] `VITE_FIREBASE_STORAGE_BUCKET` (ends with `.appspot.com`)
- [ ] `VITE_FIREBASE_MESSAGING_SENDER_ID` (numeric)
- [ ] `VITE_FIREBASE_APP_ID` (starts with `1:`)
- [ ] `VITE_DEBUG_MODE=false` (for production Firebase mode)

### 7. Firebase Mode Test
```bash
npm run dev
```
- [ ] App starts without errors
- [ ] Home page shows "Sign in with Google" button
- [ ] Can sign in successfully
- [ ] Can add players in Admin → Players
- [ ] Can add decks in Admin → Decks
- [ ] Can start and complete a game
- [ ] Can view rankings and analytics
- [ ] Data persists after browser refresh
- [ ] Data syncs across devices (test on phone + desktop)

### 8. Firestore Console Verification
Check Firebase Console → Firestore → Data:
- [ ] `players` collection has documents
- [ ] `decks` collection has documents
- [ ] `games` collection created after finishing a game
- [ ] `gameLogs` collection created during gameplay

---

## ✅ Debug Mode Verification

### 1. Environment Configuration
Edit `.env`:
```env
VITE_FIREBASE_API_KEY=your-api-key  # Placeholder (starts with 'your-')
VITE_DEBUG_MODE=true
```

### 2. Start Debug Mode
```bash
# Option 1: Use the npm script (auto-configures)
npm run dev:debug

# Option 2: Manual
# Edit .env to set VITE_DEBUG_MODE=true
npm run dev
```

### 3. Debug Mode Checks
- [ ] Console shows: `🎮 DEBUG MODE: Initializing mock data...`
- [ ] Console shows: `✅ Mock data loaded: { players: 6, decks: 10-15, games: 15, logs: 150+ }`
- [ ] Console shows: `🎮 DEBUG MODE ACTIVE`
- [ ] No authentication required (no sign-in button shown)
- [ ] Chip/badge shows "LOCAL MODE" on home page

### 4. Mock Data Verification
- [ ] Admin → Players shows 6 players (Alice, Bob, Charlie, Diana, Ethan, Fiona)
- [ ] Each player has an avatar image
- [ ] Admin → Decks shows 10-15 commander decks
- [ ] Decks have real MTG card images from Scryfall
- [ ] Rankings page shows populated leaderboards
- [ ] Analytics page shows charts with data

### 5. Browser Console Utilities
Open browser DevTools console:
```javascript
// Check debug status
__debugUtils.logDebugInfo();

// Clear and regenerate mock data
__debugUtils.clearMockData();
location.reload();
```
- [ ] `__debugUtils` object is available
- [ ] `logDebugInfo()` shows data counts
- [ ] `clearMockData()` clears localStorage
- [ ] Reload regenerates fresh mock data

### 6. localStorage Verification
Open DevTools → Application → Local Storage:
- [ ] `ct_players` key exists with 6 players
- [ ] `ct_decks` key exists with decks array
- [ ] `ct_games` key exists with game records
- [ ] `ct_logs` key exists with log entries
- [ ] `ct_mock_initialized` key set to `"true"`

### 7. Data Persistence
- [ ] Mock data persists after browser refresh
- [ ] Can add new players/decks on top of mock data
- [ ] Can start new games with mock players
- [ ] New data mixes with mock data seamlessly

---

## 🐛 Troubleshooting

### Debug Mode Not Activating
**Symptoms:** No console logs, no mock data, app shows empty state

**Solutions:**
1. Check `.env` file: `VITE_DEBUG_MODE=true` (no quotes, lowercase `true`)
2. Restart dev server: Stop (`Ctrl+C`) and run `npm run dev` again
3. Clear browser cache and localStorage
4. Check Firebase credentials are placeholders (start with `your-`)

### Firebase "Permission Denied" Errors
**Symptoms:** Console errors about Firestore permissions

**Solutions:**
1. Deploy rules: `firebase deploy --only firestore:rules`
2. Check you're signed in (Google sign-in)
3. Verify rules in Firebase Console require auth
4. Check Firebase user is created (Firebase Console → Authentication)

### Firebase "Missing Index" Errors
**Symptoms:** Console errors about composite indexes

**Solutions:**
1. Deploy indexes: `firebase deploy --only firestore:indexes`
2. Wait 2-3 minutes for indexes to build
3. Or click the link in error message to auto-create

### Mock Data Not Loading
**Symptoms:** Debug mode active but no data appears

**Solutions:**
1. Open console, run: `localStorage.clear(); location.reload();`
2. Check console for initialization errors
3. Verify `mock-data.ts` file exists
4. Check browser supports localStorage (incognito mode may block)

### Firebase CLI Not Found
**Symptoms:** `firebase: command not found`

**Solution:**
```bash
npm install -g firebase-tools
firebase login
```

---

## 📊 Expected Data Volumes

### Debug Mode (Mock Data)
- **Players:** 6
- **Decks:** 10-15 (1-3 per player)
- **Games:** 15 (mix of 2-6 player games)
- **Log Entries:** 300-750 (20-50 per game)

### Production (After Real Usage)
- **Players:** Unlimited (your playgroup)
- **Decks:** Unlimited (per player)
- **Games:** Grows with each completed game
- **Log Entries:** 30-100 per game

---

## 🔄 Switching Between Modes

### Local Mode → Debug Mode
1. Edit `.env`: Set `VITE_DEBUG_MODE=true`
2. Restart server
3. Mock data auto-loads on next page load

### Debug Mode → Firebase Mode
1. Configure real Firebase credentials in `.env`
2. Set `VITE_DEBUG_MODE=false`
3. Deploy Firestore rules/indexes
4. Restart server
5. Sign in with Google

### Firebase Mode → Debug Mode
1. Edit `.env`: Use placeholder Firebase credentials
2. Set `VITE_DEBUG_MODE=true`
3. Clear localStorage: `localStorage.clear()`
4. Restart server

---

## ✨ Pro Tips

1. **Keep `.env.debug` as template:** Copy to `.env` when you want debug mode
2. **Use `npm run dev:debug`:** Automatically activates debug mode
3. **Console utilities:** Use `__debugUtils.logDebugInfo()` to verify state
4. **Firebase emulator:** For advanced testing, use Firebase Local Emulator Suite
5. **Version control:** Never commit `.env` (already in `.gitignore`)

---

## 📞 Need Help?

1. Check [FIREBASE_SETUP.md](./FIREBASE_SETUP.md) for detailed Firebase instructions
2. Review [README.md](./README.md) for general project setup
3. Open browser DevTools console for error messages
4. Check Firebase Console for configuration issues

