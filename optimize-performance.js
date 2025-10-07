#!/usr/bin/env node

/**
 * Script de optimización de rendimiento para CCSPT-FM
 * 
 * Este script aplica configuraciones de optimización para reducir
 * el uso de CPU, memoria y disco.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Iniciando optimización de rendimiento...');

// Configuración de optimización
const optimizations = {
  // Variables de entorno recomendadas
  envVars: {
    'SENSOR_UPDATE_INTERVAL': '120000',
    'SENSOR_BATCH_SIZE': '25', 
    'SENSOR_BATCH_MODE': 'true',
    'AUTO_CLEANUP_ENABLED': 'true',
    'DATA_RETENTION_DAYS': '7',
    'CLEANUP_INTERVAL_HOURS': '24',
    'LOG_LEVEL': 'warn'
  },

  // Configuración de Vite para desarrollo
  viteOptimizations: {
    server: {
      hmr: {
        overlay: false // Deshabilitar overlay de errores en desarrollo
      }
    },
    build: {
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            three: ['three', '@thatopen/components']
          }
        }
      }
    }
  }
};

// Función para actualizar archivo .env
function updateEnvFile() {
  const envPath = path.join(__dirname, 'backend', '.env');
  const envExamplePath = path.join(__dirname, 'backend', '.env.example');
  
  let envContent = '';
  
  // Leer archivo existente o crear uno nuevo
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  } else if (fs.existsSync(envExamplePath)) {
    envContent = fs.readFileSync(envExamplePath, 'utf8');
  }
  
  // Agregar optimizaciones
  const optimizationComment = '\n# Optimizaciones de rendimiento\n';
  let newEnvContent = envContent;
  
  if (!newEnvContent.includes('# Optimizaciones de rendimiento')) {
    newEnvContent += optimizationComment;
  }
  
  Object.entries(optimizations.envVars).forEach(([key, value]) => {
    const regex = new RegExp(`^${key}=.*$`, 'm');
    const newLine = `${key}=${value}`;
    
    if (regex.test(newEnvContent)) {
      newEnvContent = newEnvContent.replace(regex, newLine);
    } else {
      newEnvContent += `${newLine}\n`;
    }
  });
  
  // Escribir archivo actualizado
  fs.writeFileSync(envPath, newEnvContent);
  console.log('✅ Archivo .env actualizado con optimizaciones');
}

// Función para limpiar datos antiguos
async function cleanupOldData() {
  try {
    const response = await fetch('http://localhost:4000/api/sensors/cleanup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ days: 7 })
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log(`✅ Limpieza completada: ${result.deletedCount} registros eliminados`);
    } else {
      console.log('⚠️ No se pudo conectar al backend para limpieza');
    }
  } catch (error) {
    console.log('⚠️ Backend no disponible para limpieza automática');
  }
}

// Función para verificar estado de simulación
async function checkSimulationStatus() {
  try {
    const response = await fetch('http://localhost:4000/api/sensors/status');
    if (response.ok) {
      const status = await response.json();
      console.log('📊 Estado de simulación:');
      console.log(`   - Ejecutándose: ${status.isRunning}`);
      console.log(`   - Habitaciones: ${status.roomCount}`);
      console.log(`   - Intervalo: ${status.interval}ms`);
      console.log(`   - Modo lote: ${status.batchMode}`);
      console.log(`   - Tamaño lote: ${status.batchSize}`);
    }
  } catch (error) {
    console.log('⚠️ No se pudo verificar estado de simulación');
  }
}

// Función principal
async function main() {
  try {
    // 1. Actualizar archivo .env
    updateEnvFile();
    
    // 2. Verificar estado actual
    await checkSimulationStatus();
    
    // 3. Limpiar datos antiguos
    await cleanupOldData();
    
    console.log('\n🎉 Optimización completada!');
    console.log('\n📋 Próximos pasos:');
    console.log('1. Reiniciar el backend para aplicar las nuevas configuraciones');
    console.log('2. Reiniciar el frontend si es necesario');
    console.log('3. Monitorear el uso de recursos en el Task Manager');
    console.log('\n💡 Consejos adicionales:');
    console.log('- Considera usar modo desarrollo con HMR optimizado');
    console.log('- Monitorea los logs del backend para verificar optimizaciones');
    console.log('- Ajusta las variables de entorno según tus necesidades');
    
  } catch (error) {
    console.error('❌ Error durante la optimización:', error);
  }
}

// Ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { optimizations, updateEnvFile, cleanupOldData };
