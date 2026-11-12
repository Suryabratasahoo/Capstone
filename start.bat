@echo off
setlocal enabledelayedexpansion
title ConnexLink Launcher

echo ======================================================================
echo                     CONNEXLINK SYSTEM LAUNCHER                        
echo ======================================================================
echo.
echo Launching all 3 ConnexLink services in separate dedicated windows...
echo.

:: 1. Launch Backend API (Port 8000)
echo [1/3] Starting Backend API (McRAPTOR engine on Port 8000)...
if exist "%~dp0backend\venv\Scripts\activate.bat" (
    start "ConnexLink - Backend API (Port 8000)" cmd /k "title ConnexLink - Backend API (Port 8000) && cd /d "%~dp0backend" && call "%~dp0backend\venv\Scripts\activate.bat" && uvicorn app.main:app --reload --port 8000"
) else (
    start "ConnexLink - Backend API (Port 8000)" cmd /k "title ConnexLink - Backend API (Port 8000) && cd /d "%~dp0backend" && python -m uvicorn app.main:app --reload --port 8000"
)

:: 2. Launch Recommendation Backend (Port 8001)
echo [2/3] Starting Recommendation Backend (NLP Recommender on Port 8001)...
start "ConnexLink - NLP Recommender (Port 8001)" cmd /k "title ConnexLink - NLP Recommender (Port 8001) && cd /d "%~dp0rec_backend" && python api.py"

:: 3. Launch Frontend (Port 3000)
echo [3/3] Starting Frontend (Next.js Dashboard on Port 3000)...
start "ConnexLink - Frontend (Port 3000)" cmd /k "title ConnexLink - Frontend (Port 3000) && cd /d "%~dp0frontend" && npm run dev"

echo.
echo ======================================================================
echo   All 3 services have been launched!
echo.
echo   - Frontend:        http://localhost:3000
echo   - Backend API:     http://localhost:8000  (Docs: http://localhost:8000/docs)
echo   - NLP Recommender: http://localhost:8001  (Docs: http://localhost:8001/docs)
echo.
echo   To stop all services at once, run: stop.bat
echo   Or close the individual command windows.
echo ======================================================================
echo.

:: Wait 5 seconds for servers to initialize, then launch the browser
ping 127.0.0.1 -n 6 >nul
echo Opening ConnexLink Dashboard in your default browser...
start http://localhost:3000

exit /b 0
