# Cómo Obtener la Connection String de Supabase

## Ubicación

1. Ve a: https://supabase.com/dashboard/project/xowzybvqhvozwvhojkil
2. En el menú lateral izquierdo, busca **Settings** (⚙️)
3. Click en **Database** (NO en "API")
4. Scroll hacia abajo hasta encontrar **"Connection string"**

## Formato

Verás varias pestañas:
- **URI** ← Esta es la que necesitamos
- JDBC
- Golang
- etc.

## Ejemplo de Connection String

La URL se verá algo así:

### Opción 1: Direct Connection
```
postgresql://postgres:[YOUR-PASSWORD]@db.xowzybvqhvozwvhojkil.supabase.co:5432/postgres
```

### Opción 2: Pooler (Session mode)
```
postgresql://postgres.xowzybvqhvozwvhojkil:[YOUR-PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
```

## Pasos

1. Click en la pestaña **URI**
2. Copia la URL completa
3. Reemplaza `[YOUR-PASSWORD]` con tu contraseña: `T0telcampesunclam!`
4. Pega la URL completa aquí

## Nota Importante

- La URL que viste (`https://xowzybvqhvozwvhojkil.supabase.co`) es para la **API REST**
- Necesitamos la **connection string de PostgreSQL** que está en Settings → Database

