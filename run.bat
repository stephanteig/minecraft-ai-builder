@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul || (echo Node.js is required. Install Node.js 20 or newer from https://nodejs.org/ & pause & exit /b 1)
where npm >nul 2>nul || (echo npm is required and normally ships with Node.js. & pause & exit /b 1)
if not exist node_modules (echo Dependencies are missing. Run: npm install & pause & exit /b 1)
start "Minecraft AI Builder dev server" cmd /k "npm run dev"
echo Waiting for http://localhost:3000 ...
for /l %%i in (1,1,30) do (
  powershell -NoProfile -Command "try { $r=Invoke-WebRequest -UseBasicParsing http://127.0.0.1:3000 -TimeoutSec 1; if ($r.StatusCode -eq 200) { exit 0 } } catch { exit 1 }" >nul 2>nul
  if not errorlevel 1 (start "" http://localhost:3000 & exit /b 0)
  timeout /t 1 /nobreak >nul
)
echo The application did not respond within 30 seconds. Check the server window for errors.
pause
