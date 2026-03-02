@echo off
echo ========================================
echo  Starting MongoDB for Hospital Meeting App
echo ========================================
echo.

REM Check if MongoDB bin folder exists
if not exist "C:\mongodb\bin\mongod.exe" (
    echo ERROR: MongoDB not found at C:\mongodb\bin\
    echo.
    echo Please extract MongoDB ZIP to C:\mongodb\
    echo Download from: https://www.mongodb.com/try/download/community
    echo.
    pause
    exit /b 1
)

REM Create data directories if they don't exist
if not exist "C:\data\db" mkdir C:\data\db
if not exist "C:\mongodb\log" mkdir C:\mongodb\log

echo Starting MongoDB...
echo.
echo MongoDB will run in this window.
echo DO NOT CLOSE this window while using the app!
echo.
echo Press Ctrl+C to stop MongoDB
echo.

REM Start MongoDB
C:\mongodb\bin\mongod.exe --dbpath C:\data\db --logpath C:\mongodb\log\mongod.log --port 27017

pause
