@echo off
echo ========================================
echo  Starting MongoDB for Hospital Meeting App
echo ========================================
echo.

REM Check if MongoDB is installed
if exist "C:\Program Files\MongoDB\Server\8.2\bin\mongod.exe" (
    set MONGODB_PATH=C:\Program Files\MongoDB\Server\8.2\bin
) else if exist "C:\mongodb\bin\mongod.exe" (
    set MONGODB_PATH=C:\mongodb\bin
) else (
    echo ERROR: MongoDB not found!
    echo.
    echo Please install MongoDB or check the path.
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
"%MONGODB_PATH%\mongod.exe" --dbpath C:\data\db --logpath C:\mongodb\log\mongod.log --port 27017

pause
