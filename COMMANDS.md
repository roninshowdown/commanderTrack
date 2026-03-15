# 🎯 Command Reference Card

Quick reference for common tasks with Commander Track.

---

## 🚀 Development

### Start Debug Mode (with mock data)
```bash
npm run dev:debug
```
→ Auto-configures debug mode + starts dev server  
→ Mock data auto-loads (6 players, 15 games, etc.)

### Start Normal Dev
```bash
npm run dev
```
→ Uses `.env` configuration  
→ Firebase or local mode depending on credentials

### Build Production
```bash
npm run build
```
→ Outputs to `build/` folder  
→ Ready for deployment

### Preview Production Build
```bash
npm run preview
```
→ Serves production build locally  
→ Test before deployment

### Type Check
```bash
npm run check
```
→ Runs svelte-check  
→ Finds type errors

---

## 🔥 Firebase

### Login
```bash
firebase login
```

### Initialize Project
```bash
firebase init
```
→ Select: Firestore, Hosting  
→ Use existing files for rules/indexes

### Deploy Everything
```bash
firebase deploy
```

### Deploy Firestore Only
```bash
firebase deploy --only firestore
```
→ Deploys rules + indexes  
→ Required after setup

### Deploy Rules Only
```bash
firebase deploy --only firestore:rules
```

### Deploy Indexes Only
```bash
firebase deploy --only firestore:indexes
```

### Deploy Hosting Only
```bash
firebase deploy --only hosting
```

### View Deployed Rules
```bash
firebase firestore:rules get
```

### View Indexes
```bash
firebase firestore:indexes list
```

### Delete Project (careful!)
```bash
firebase projects:delete PROJECT_ID
```

---

## 🛠️ Debug Utilities

### Browser Console Commands

```javascript
// Show debug info
__debugUtils.logDebugInfo();

// Clear mock data
__debugUtils.clearMockData();
location.reload();

// Check debug mode
__debugUtils.isDebugMode();

// Manual localStorage operations
localStorage.clear();  // Clear all data
localStorage.getItem('ct_players');  // View players
localStorage.getItem('ct_mock_initialized');  // Check init flag
```

---

## 📝 Environment Configuration

### Activate Debug Mode
```bash
# Recommended: Use npm script (cross-platform)
npm run dev:debug

# Manual alternative: Edit .env file
# Set VITE_DEBUG_MODE=true
# Set VITE_FIREBASE_API_KEY=your-api-key (placeholder)
```

### Activate Firebase Mode
```bash
# Edit .env
VITE_DEBUG_MODE=false
VITE_FIREBASE_API_KEY=<real-api-key>
# ... other Firebase config

npm run dev
```

### Check Current Mode
```bash
cat .env | grep VITE_DEBUG_MODE
cat .env | grep VITE_FIREBASE_API_KEY
```

---

## 🔄 Mode Switching

### Firebase → Debug
```bash
npm run dev:debug
```

### Debug → Firebase
```bash
# Edit .env with real Firebase credentials
# Set VITE_DEBUG_MODE=false
firebase deploy --only firestore
npm run dev
```

### Backup .env
```bash
# Windows PowerShell
Copy-Item .env .env.backup

# Linux/Mac
cp .env .env.backup
```

### Restore .env
```bash
# Windows PowerShell
Copy-Item .env.backup .env

# Linux/Mac
cp .env.backup .env
```

---

## 🗄️ Data Management

### Export localStorage Data
```javascript
// In browser console
const data = {
  players: JSON.parse(localStorage.getItem('ct_players') || '[]'),
  decks: JSON.parse(localStorage.getItem('ct_decks') || '[]'),
  games: JSON.parse(localStorage.getItem('ct_games') || '[]'),
  logs: JSON.parse(localStorage.getItem('ct_logs') || '[]')
};
console.log(JSON.stringify(data, null, 2));
```

### Import localStorage Data
```javascript
// In browser console
const data = { /* paste data here */ };
localStorage.setItem('ct_players', JSON.stringify(data.players));
localStorage.setItem('ct_decks', JSON.stringify(data.decks));
localStorage.setItem('ct_games', JSON.stringify(data.games));
localStorage.setItem('ct_logs', JSON.stringify(data.logs));
location.reload();
```

### Clear All Data
```javascript
localStorage.clear();
location.reload();
```

---

## 🐛 Troubleshooting

### Clear Node Modules & Rebuild
```bash
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Clear Build Cache
```bash
rm -rf .svelte-kit build
npm run build
```

### Clear Browser Cache
1. Open DevTools (F12)
2. Right-click refresh button
3. Select "Empty Cache and Hard Reload"

### View All Environment Variables
```bash
cat .env
```

### Test Environment Loading
```bash
npm run dev
# Check console for environment variable logs
```

### Firebase Connection Test
```bash
firebase projects:list
```

---

## 📦 Deployment

### Deploy to Firebase Hosting
```bash
npm run build
firebase deploy --only hosting
```

### Deploy to Vercel
```bash
npm run build
vercel --prod
```

### Deploy to Netlify
```bash
npm run build
netlify deploy --prod --dir=build
```

---

## 📊 Monitoring

### View Firebase Console
```bash
# Open in browser
https://console.firebase.google.com/project/YOUR_PROJECT_ID
```

### View Firestore Data
```bash
# Open in browser
https://console.firebase.google.com/project/YOUR_PROJECT_ID/firestore
```

### View Authentication Users
```bash
# Open in browser
https://console.firebase.google.com/project/YOUR_PROJECT_ID/authentication/users
```

---

## 🎓 Documentation Links

| Resource | Command/Link |
|----------|--------------|
| Quick Start | `cat QUICK_START.md` |
| Firebase Setup | `cat FIREBASE_SETUP.md` |
| Verification | `cat SETUP_VERIFICATION.md` |
| README | `cat README.md` |
| Implementation Summary | `cat IMPLEMENTATION_SUMMARY.md` |

---

## ⚡ Quick Reference

```bash
# DEVELOPMENT
npm run dev              # Start dev server (uses .env)
npm run dev:debug        # Debug mode with mock data
npm run build            # Production build
npm run preview          # Preview production build

# FIREBASE
firebase login           # Authenticate
firebase deploy          # Deploy everything
firebase deploy --only firestore  # Deploy rules + indexes

# DEBUG
__debugUtils.logDebugInfo()       # Browser console
__debugUtils.clearMockData()      # Browser console
localStorage.clear()              # Browser console

# ENVIRONMENT
cp .env.debug .env       # Activate debug mode
cat .env                 # View current config
```

---

## 🎮 Quick Start (Reminder)

### For Testing/Development:
```bash
npm install && npm run dev:debug
```

### For Production:
```bash
npm install
# Configure .env with Firebase credentials
firebase deploy --only firestore
npm run build
firebase deploy --only hosting
```

---

**Need help?** Check the full documentation:
- `QUICK_START.md` - Choose your setup mode
- `FIREBASE_SETUP.md` - Complete Firebase guide
- `SETUP_VERIFICATION.md` - Verify everything works



