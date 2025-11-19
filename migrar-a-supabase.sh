#!/bin/bash
# Script para migrar base de datos PostgreSQL a Supabase
# Uso: ./migrar-a-supabase.sh

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo ""
echo -e "${CYAN}============================================================${NC}"
echo -e "${CYAN}  MIGRACION DE BASE DE DATOS A SUPABASE${NC}"
echo -e "${CYAN}============================================================${NC}"
echo ""

# Verificar parámetros
if [ $# -lt 2 ]; then
    echo -e "${RED}Uso: $0 <SOURCE_DATABASE_URL> <SUPABASE_URL> [BACKUP_FILE]${NC}"
    echo ""
    echo "Ejemplo:"
    echo "  $0 'postgresql://user:pass@localhost:5432/db' 'postgresql://postgres:pass@db.xxx.supabase.co:5432/postgres'"
    exit 1
fi

SOURCE_DB_URL="$1"
SUPABASE_URL="$2"
BACKUP_FILE="${3:-backup_migracion_$(date +%Y%m%d_%H%M%S).sql}"

# Verificar herramientas
echo -e "${YELLOW}[1/5] Verificando herramientas...${NC}"
if ! command -v pg_dump &> /dev/null; then
    echo -e "${RED}  ERROR: pg_dump no encontrado${NC}"
    echo -e "${YELLOW}  Instala PostgreSQL para obtener pg_dump${NC}"
    exit 1
fi
echo -e "${GREEN}  OK: pg_dump encontrado: $(pg_dump --version)${NC}"

if ! command -v psql &> /dev/null; then
    echo -e "${RED}  ERROR: psql no encontrado${NC}"
    echo -e "${YELLOW}  Instala PostgreSQL para obtener psql${NC}"
    exit 1
fi
echo -e "${GREEN}  OK: psql encontrado: $(psql --version)${NC}"
echo ""

# Crear backup
echo -e "${YELLOW}[2/5] Creando backup de la base de datos...${NC}"
echo "  Base de datos origen: $SOURCE_DB_URL"
echo "  Archivo de backup: $BACKUP_FILE"
echo ""

pg_dump "$SOURCE_DB_URL" \
    --schema=public \
    --schema=patrimoni \
    --no-owner \
    --no-acl \
    --clean \
    --if-exists \
    -f "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo -e "${GREEN}  OK: Backup creado exitosamente ($FILE_SIZE)${NC}"
else
    echo -e "${RED}  ERROR: Fallo al crear el backup${NC}"
    exit 1
fi
echo ""

# Preparar Supabase
echo -e "${YELLOW}[3/5] Preparando Supabase...${NC}"
echo "  Verificando schemas en Supabase..."

psql "$SUPABASE_URL" -q <<EOF
CREATE SCHEMA IF NOT EXISTS patrimoni;
EOF

if [ $? -eq 0 ]; then
    echo -e "${GREEN}  OK: Schema patrimoni verificado/creado${NC}"
else
    echo -e "${YELLOW}  ADVERTENCIA: No se pudo crear el schema patrimoni${NC}"
    echo -e "${YELLOW}  Puedes crearlo manualmente en el SQL Editor de Supabase${NC}"
fi
echo ""

# Restaurar en Supabase
echo -e "${YELLOW}[4/5] Restaurando backup en Supabase...${NC}"
echo "  URL de Supabase: $SUPABASE_URL"
echo "  Esto puede tardar varios minutos..."
echo ""

read -p "  ¿Continuar con la restauración? (S/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Ss]$ ]]; then
    echo -e "${YELLOW}  Migración cancelada${NC}"
    exit 0
fi

psql "$SUPABASE_URL" -f "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}  OK: Restauración completada${NC}"
else
    echo -e "${YELLOW}  ADVERTENCIA: La restauración puede haber tenido errores${NC}"
    echo -e "${YELLOW}  Revisa los mensajes anteriores${NC}"
fi
echo ""

# Verificar migración
echo -e "${YELLOW}[5/5] Verificando migración...${NC}"

psql "$SUPABASE_URL" -t -A -F'|' <<EOF
SELECT 
    schema_name,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = schema_name) as table_count
FROM information_schema.schemata 
WHERE schema_name IN ('public', 'patrimoni')
ORDER BY schema_name;
EOF

if [ $? -eq 0 ]; then
    echo -e "${GREEN}  OK: Verificación completada${NC}"
else
    echo -e "${YELLOW}  ADVERTENCIA: No se pudo verificar completamente${NC}"
fi
echo ""

# Resumen
echo -e "${CYAN}============================================================${NC}"
echo -e "${GREEN}  MIGRACION COMPLETADA${NC}"
echo -e "${CYAN}============================================================${NC}"
echo ""
echo -e "${YELLOW}Próximos pasos:${NC}"
echo "  1. Verifica los datos en el dashboard de Supabase"
echo "  2. Actualiza DATABASE_URL en Railway o .env"
echo "  3. Ejecuta: npx prisma migrate deploy"
echo "  4. Prueba la aplicación"
echo ""
echo -e "${CYAN}Archivo de backup guardado en: $BACKUP_FILE${NC}"
echo -e "${YELLOW}  (Guárdalo por seguridad)${NC}"
echo ""

