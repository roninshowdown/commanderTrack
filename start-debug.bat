@echo off
REM Commander Track Debug Mode Activator
REM Copies .env.debug to .env and starts dev server

echo ========================================
echo   Commander Track - Debug Mode
echo ========================================
echo.

if not exist .env.debug (
    echo ERROR: .env.debug file not found
    echo Please ensure you're in the project root directory
    pause
    exit /b 1
)

echo [1/2] Backing up current .env...
if exist .env (
    copy /Y .env .env.backup >nul
    echo       Backed up to .env.backup
) else (
    echo       No existing .env to backup
)

echo [2/2] Activating debug mode...
copy /Y .env.debug .env >nul
echo       Debug mode activated!
echo.

echo ========================================
echo   Starting dev server...
echo ========================================
echo.
echo Press Ctrl+C to stop the server
echo.

npm run dev

pause

