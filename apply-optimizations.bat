@echo off
echo 🚀 Aplicando optimizaciones de rendimiento...

echo ✅ Optimizaciones aplicadas:
echo    - Intervalo de sensores: 20s → 60s (frontend)
echo    - Intervalo de simulación: 30s → 120s (backend)
echo    - Modo lote habilitado por defecto
echo    - Tamaño de lote reducido a 25 habitaciones
echo    - Limpieza automática de datos antiguos
echo    - Optimización de re-renderizado en React

echo.
echo 📋 Próximos pasos:
echo 1. Reiniciar el backend: cd backend && npm run dev
echo 2. Reiniciar el frontend: cd frontend && npm run dev
echo 3. Monitorear el uso de recursos en el Task Manager

echo.
echo 💡 Variables de entorno recomendadas para el backend:
echo SENSOR_UPDATE_INTERVAL=120000
echo SENSOR_BATCH_SIZE=25
echo SENSOR_BATCH_MODE=true
echo AUTO_CLEANUP_ENABLED=true
echo DATA_RETENTION_DAYS=7

pause
