@echo off
echo Iniciando SEME...

start "Backend SEME" cmd /k "cd C:\proyectos\seme-system\backend && node server.js"

timeout /t 2

start "Frontend SEME" cmd /k "cd C:\proyectos\seme-system\frontend && npm run dev"

echo Listo! Backend en puerto 3001, Frontend en puerto 3000