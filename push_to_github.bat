@echo off
cd /d "%~dp0"
echo ============================================
echo  Pushing megafleet-dashboard to GitHub
echo  Target: https://github.com/mikeesmailian-max/Leads.git
echo ============================================
echo.

git --version
if errorlevel 1 (
  echo.
  echo ERROR: Git is not installed or not on PATH.
  echo Install it from https://git-scm.com/download/win then run this file again.
  pause
  exit /b 1
)

if not exist ".git" (
  echo Initializing git repo...
  git init
  git branch -M main
)

echo.
echo Staging files...
git add .

echo.
echo Configuring git identity for this repo...
git config user.email "mikee@megafleetcorp.com"
git config user.name "Mike"

echo.
echo Committing...
git commit -m "Initial commit: Mega Fleet Sales Prospecting & RC Intelligence Dashboard"

echo.
echo Setting remote...
git remote remove origin >nul 2>&1
git remote add origin https://github.com/mikeesmailian-max/Leads.git

echo.
echo Pushing to GitHub - a browser window may open asking you to log in.
echo Please sign in and click Authorize if prompted.
echo.
git push -u origin main

echo.
echo ============================================
echo  Done. Check the messages above for errors.
echo  If it said "rejected" or "fetch first", run:
echo    git pull origin 