@echo off
echo Building SMART PHONE for Windows...
echo.

echo Installing dependencies...
call npm install
if errorlevel 1 (
  echo npm install failed.
  exit /b 1
)
echo.

echo Running electron-builder (Windows)...
call npm run build
if errorlevel 1 (
  echo Build failed.
  exit /b 1
)

echo.
echo Done. App folder is dist\win-unpacked. Put the database folder inside it.
pause
