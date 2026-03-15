@echo off
REM Commander Track Firebase Mode Activator
REM Restores .env.backup (if exists) or prompts to configure Firebase

echo ========================================
echo   Commander Track - Firebase Mode
echo ========================================
echo.

if exist .env.backup (
    echo [1/2] Restoring .env from backup...
    copy /Y .env.backup .env >nul
    echo       Restored from .env.backup
    del .env.backup >nul
    echo       Backup file removed
) else (
    echo [1/2] No backup found. Using current .env
    echo.
    echo Please ensure your .env has:
    echo   - Real Firebase credentials
    echo   - VITE_DEBUG_MODE=false
    echo.
    echo See FIREBASE_SETUP.md for details
    echo.
    pause
)

echo [2/2] Starting dev server...
echo.

npm run dev

pause

