@echo off
title SmartMart Retail POS & Analytics
echo ========================================================
echo   Starting SmartMart Retail POS & Analytics System...
echo ========================================================
echo.
cd /d "%~dp0backend"
start http://localhost:5000
node server.js
pause
