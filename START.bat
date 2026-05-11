@echo off
title LEBIHFIT TRACKER - CYBERPUNK ENGINE
color 0B
echo.
echo  ╔══════════════════════════════════════════════════╗
echo  ║      LEBIHFIT TRACKER - CYBERPUNK ENGINE v2.0     ║
echo  ╚══════════════════════════════════════════════════╝
echo.
echo  [*] Checking dependencies...

cd /d "%~dp0"

if not exist node_modules (
    echo  [*] Installing dependencies...
    npm install
    echo.
)

echo  [*] Starting server...
echo  [*] Open browser: http://localhost:3000
echo.
start http://localhost:3000
node server.js
pause
