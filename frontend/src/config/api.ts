// Configuración centralizada del API
// En desarrollo: usa localhost
// En producción: usa la URL del backend desplegado (vía Netlify redirects o variable de entorno)

const getApiBaseUrl = (): string => {
  // Si hay una variable de entorno, úsala
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  
  // En desarrollo, usa localhost
  if (import.meta.env.DEV) {
    return 'http://localhost:4000/api/v2';
  }
  
  // En producción, usa rutas relativas (Netlify redirigirá al backend)
  // Si el backend está en Railway, las rutas relativas funcionarán gracias a los redirects de Netlify
  return '/api/v2';
};

export const API_BASE_URL = getApiBaseUrl();

// Para rutas que no usan /api/v2 (rutas legacy)
export const API_LEGACY_BASE_URL = import.meta.env.DEV 
  ? 'http://localhost:4000' 
  : '';

