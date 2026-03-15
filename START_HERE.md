# 🎮 Commander Track - Getting Started

Welcome! Here's how to get up and running in **30 seconds**.

---

## ⚡ Fastest Start (Debug Mode)

```bash
npm install
npm run dev:debug
```

Then open: **http://localhost:5173**

✅ **Done!** The app is running with mock data (6 players, 15 games, full analytics).

**Windows users:** You can also double-click `start-debug.bat`

---

## 📚 Need More Options?

See **[QUICK_START.md](./QUICK_START.md)** for:
- Local mode (empty state)
- Firebase mode (cloud sync)
- Mode comparison table

---

## 🔥 Firebase Setup

**Want cloud sync and multi-device support?**

1. Read **[FIREBASE_SETUP.md](./FIREBASE_SETUP.md)** (15 min setup)
2. Deploy: `firebase deploy --only firestore`
3. Configure `.env` with real credentials
4. Run: `npm run dev`

---

## 🎯 Key Commands

```bash
npm run dev:debug    # Start with mock data
npm run dev          # Start normal mode
npm run build        # Build for production
```

**Windows:** Use `start-debug.bat` or `start-firebase.bat`

---

## 🐛 Troubleshooting

**"npm run dev:debug doesn't work"**
- ✅ **FIXED** - Now uses Node.js (cross-platform)
- Just run: `npm run dev:debug`

**"Port already in use"**
- Vite will auto-select another port (check console output)

**"No mock data showing"**
- Check console for "🎮 DEBUG MODE ACTIVE"
- Try: `localStorage.clear()` in browser console, then reload
- Verify `.env` has `VITE_DEBUG_MODE=true`

**"Permission denied (Firebase)"**
- Deploy rules: `firebase deploy --only firestore:rules`
- Sign in with Google in the app

---

## 📖 Full Documentation

| File | Purpose |
|------|---------|
| **QUICK_START.md** | Choose your mode (debug/local/firebase) |
| **FIREBASE_SETUP.md** | Complete Firebase setup guide |
| **COMMANDS.md** | Command reference |
| **SETUP_VERIFICATION.md** | Verify everything works |

---

## 🎉 What You Get

### Debug Mode:
- 6 players (Alice, Bob, Charlie, Diana, Ethan, Fiona)
- 10-15 commander decks with real MTG card images
- 15 completed games with realistic data
- 300+ log entries for charts
- Full rankings and analytics

### Production Mode:
- Google Authentication
- Cloud Firestore sync
- Multi-device support
- Share with your playgroup

---

## ✨ Current Status

✅ Build: Passing  
✅ Type Check: 0 errors  
✅ Debug Mode: Working  
✅ Firebase Config: Ready to deploy  

**You're all set! Run `npm run dev:debug` to start exploring.**

