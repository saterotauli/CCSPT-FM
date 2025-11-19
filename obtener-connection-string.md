# Cómo Obtener la Connection String de Supabase

## Pasos Rápidos

1. Ve a: https://supabase.com/dashboard/project/xowzybvqhvozwvhojkil
2. En el menú lateral, ve a **Settings** (⚙️)
3. Click en **Database**
4. Scroll hasta "Connection string"
5. Selecciona la pestaña **URI**
6. Verás algo como:
   ```
   postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
   ```
   
   O la versión directa:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xowzybvqhvozwvhojkil.supabase.co:5432/postgres
   ```

7. **Reemplaza `[YOUR-PASSWORD]`** con la contraseña que creaste cuando creaste el proyecto
8. **Copia la URL completa**

## Formato Esperado

La URL debería verse así:
```
postgresql://postgres:TU_PASSWORD_AQUI@db.xowzybvqhvozwvhojkil.supabase.co:5432/postgres
```

O con SSL:
```
postgresql://postgres:TU_PASSWORD_AQUI@db.xowzybvqhvozwvhojkil.supabase.co:5432/postgres?sslmode=require
```

## Si Olvidaste la Contraseña

1. Ve a **Settings** → **Database**
2. Busca "Database password"
3. Puedes resetearla si es necesario

