@echo off
setlocal
title ConnexLink Shutdown

echo ======================================================================
echo                     CONNEXLINK SYSTEM SHUTDOWN                        
echo ======================================================================
echo.
echo Stopping all running ConnexLink services...

echo.
echo [1/3] Terminating Backend on Port 8000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
    echo   Killed process with PID: %%a
)

echo.
echo [2/3] Terminating NLP Recommender on Port 8001...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8001" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
    echo   Killed process with PID: %%a
)

echo.
echo [3/3] Terminating Frontend on Port 3000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
    echo   Killed process with PID: %%a
)

echo.
echo ======================================================================
echo   All ConnexLink services on ports 8000, 8001, and 3000 are stopped.
echo ======================================================================
ping 127.0.0.1 -n 3 >nul
exit /b 0
