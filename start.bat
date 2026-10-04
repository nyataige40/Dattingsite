@echo off
setlocal

echo Starting Dattingsite Premium Dating Platform...
echo.

echo [1/2] Starting Backend API (port 5000)...
cd /d "C:\xampp\htdocs\Dattingsite\backend"
start "Dattingsite Backend" cmd /c "node src/app.js"

timeout /t 3 /nobreak > nul

echo [2/2] Starting Frontend Dev Server (port 5173)...
cd /d "C:\xampp\htdocs\Dattingsite\frontend"
start "Dattingsite Frontend" cmd /c "npx vite"

echo.
echo Both services are starting...
echo   Backend:  http://localhost:5000
echo   Frontend: http://localhost:5173
echo.
echo Demo credentials:
echo   Email: demo@example.com
echo   Password: password123
echo.

endlocal
