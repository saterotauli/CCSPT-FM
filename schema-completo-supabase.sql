-- Script completo para crear el schema en Supabase
-- Basado en las migraciones de Prisma
-- Ejecuta esto en el SQL Editor de Supabase

-- Crear schemas
CREATE SCHEMA IF NOT EXISTS "patrimoni";
CREATE SCHEMA IF NOT EXISTS "public";

-- Crear extensiones
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- MIGRACION 0_INIT
-- ============================================

-- Enums
CREATE TYPE "public"."Rol" AS ENUM ('ADMIN', 'EDITOR', 'CONSULTOR', 'COORDINADOR', 'OPERARIO', 'VISOR');
CREATE TYPE "public"."EstadoTarea" AS ENUM ('PENDIENTE', 'EN_PROGRESO', 'COMPLETADA', 'CANCELADA');
CREATE TYPE "public"."PrioridadTarea" AS ENUM ('BAJA', 'MEDIA', 'ALTA', 'CRITICA');
CREATE TYPE "public"."TipoTarea" AS ENUM ('MANTENIMIENTO', 'REPARACION', 'INSPECCION', 'ALARMA', 'EMERGENCIA');
CREATE TYPE "public"."TipoNotificacion" AS ENUM ('TAREA_ASIGNADA', 'TAREA_VENCIDA', 'MENSAJE_NUEVO', 'ALARMA_CRITICA', 'SISTEMA');

-- Tablas schema patrimoni
CREATE TABLE IF NOT EXISTS "patrimoni"."actius" (
    "id" SERIAL NOT NULL,
    "guid" TEXT NOT NULL,
    "tipus" TEXT NOT NULL,
    "subtipus" TEXT,
    "edifici" TEXT,
    "planta" TEXT,
    "zona" TEXT,
    "ubicacio" TEXT,
    CONSTRAINT "actius_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "actius_guid_key" ON "patrimoni"."actius"("guid" ASC);

CREATE TABLE IF NOT EXISTS "patrimoni"."ifcbuilding" (
    "guid" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "codi" TEXT NOT NULL,
    "color" TEXT,
    CONSTRAINT "ifcbuilding_pkey" PRIMARY KEY ("guid")
);

CREATE TABLE IF NOT EXISTS "patrimoni"."ifcspace" (
    "guid" TEXT NOT NULL,
    "codi" TEXT,
    "dispositiu" TEXT NOT NULL,
    "edifici" TEXT NOT NULL,
    "planta" TEXT NOT NULL,
    "departament" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "centre_cost" TEXT NOT NULL,
    "area" DOUBLE PRECISION NOT NULL,
    CONSTRAINT "ifcspace_pkey" PRIMARY KEY ("guid")
);

CREATE TABLE IF NOT EXISTS "patrimoni"."ifcdoor" (
    "actiu_id" INTEGER NOT NULL,
    "from_room" TEXT,
    "to_room" TEXT,
    CONSTRAINT "ifcdoor_pkey" PRIMARY KEY ("actiu_id"),
    CONSTRAINT "ifcdoor_actiu_id_fkey" FOREIGN KEY ("actiu_id") REFERENCES "patrimoni"."actius"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "patrimoni"."ifcdoor_fire" (
    "ifcdoor_id" INTEGER NOT NULL,
    "numero" TEXT,
    CONSTRAINT "ifcdoor_fire_pkey" PRIMARY KEY ("ifcdoor_id"),
    CONSTRAINT "ifcdoor_fire_ifcdoor_id_fkey" FOREIGN KEY ("ifcdoor_id") REFERENCES "patrimoni"."ifcdoor"("actiu_id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Tablas schema public
CREATE TABLE IF NOT EXISTS "public"."Usuario" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellidos" TEXT,
    "email" TEXT NOT NULL,
    "telefono" TEXT,
    "password" TEXT NOT NULL,
    "rol" "public"."Rol" NOT NULL DEFAULT 'VISOR',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "fcmToken" TEXT,
    "avatar" TEXT,
    "ultimoAcceso" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Usuario_email_key" ON "public"."Usuario"("email" ASC);

CREATE TABLE IF NOT EXISTS "public"."Tarea" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT,
    "tipo" "public"."TipoTarea" NOT NULL DEFAULT 'MANTENIMIENTO',
    "prioridad" "public"."PrioridadTarea" NOT NULL DEFAULT 'MEDIA',
    "estado" "public"."EstadoTarea" NOT NULL DEFAULT 'PENDIENTE',
    "edifici" TEXT,
    "planta" TEXT,
    "zona" TEXT,
    "ubicacio" TEXT,
    "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaAsignacion" TIMESTAMP(3),
    "fechaInicio" TIMESTAMP(3),
    "fechaVencimiento" TIMESTAMP(3),
    "fechaCompletada" TIMESTAMP(3),
    "creadoPorId" INTEGER NOT NULL,
    "asignadoAId" INTEGER,
    "actiuGuid" TEXT,
    "observaciones" TEXT,
    "tiempoEstimado" INTEGER,
    "tiempoReal" INTEGER,
    CONSTRAINT "Tarea_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Tarea_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "public"."Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Tarea_asignadoAId_fkey" FOREIGN KEY ("asignadoAId") REFERENCES "public"."Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Tarea_actiuGuid_fkey" FOREIGN KEY ("actiuGuid") REFERENCES "patrimoni"."actius"("guid") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "Tarea_estado_prioridad_idx" ON "public"."Tarea"("estado", "prioridad");
CREATE INDEX IF NOT EXISTS "Tarea_asignadoAId_estado_idx" ON "public"."Tarea"("asignadoAId", "estado");
CREATE INDEX IF NOT EXISTS "Tarea_creadoPorId_idx" ON "public"."Tarea"("creadoPorId");

CREATE TABLE IF NOT EXISTS "public"."TareaComentario" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "tareaId" TEXT NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "contenido" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TareaComentario_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "TareaComentario_tareaId_fkey" FOREIGN KEY ("tareaId") REFERENCES "public"."Tarea"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TareaComentario_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "public"."Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "public"."TareaAdjunto" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "tareaId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "uploadedBy" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TareaAdjunto_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "TareaAdjunto_tareaId_fkey" FOREIGN KEY ("tareaId") REFERENCES "public"."Tarea"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TareaAdjunto_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "public"."Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "public"."Conversacion" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "nombre" TEXT,
    "esGrupal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Conversacion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public"."ConversacionParticipante" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "conversacionId" TEXT NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "fechaUnion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ultimaLectura" TIMESTAMP(3),
    CONSTRAINT "ConversacionParticipante_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ConversacionParticipante_conversacionId_fkey" FOREIGN KEY ("conversacionId") REFERENCES "public"."Conversacion"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ConversacionParticipante_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "public"."Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "ConversacionParticipante_conversacionId_usuarioId_key" ON "public"."ConversacionParticipante"("conversacionId", "usuarioId");

CREATE TABLE IF NOT EXISTS "public"."Mensaje" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "conversacionId" TEXT NOT NULL,
    "remitenteId" INTEGER NOT NULL,
    "destinatarioId" INTEGER,
    "contenido" TEXT NOT NULL,
    "leido" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Mensaje_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Mensaje_conversacionId_fkey" FOREIGN KEY ("conversacionId") REFERENCES "public"."Conversacion"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Mensaje_remitenteId_fkey" FOREIGN KEY ("remitenteId") REFERENCES "public"."Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Mensaje_destinatarioId_fkey" FOREIGN KEY ("destinatarioId") REFERENCES "public"."Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "Mensaje_conversacionId_createdAt_idx" ON "public"."Mensaje"("conversacionId", "createdAt");

CREATE TABLE IF NOT EXISTS "public"."Notificacion" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "usuarioId" INTEGER NOT NULL,
    "tipo" "public"."TipoNotificacion" NOT NULL,
    "titulo" TEXT NOT NULL,
    "mensaje" TEXT NOT NULL,
    "leida" BOOLEAN NOT NULL DEFAULT false,
    "tareaId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notificacion_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Notificacion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "public"."Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Notificacion_tareaId_fkey" FOREIGN KEY ("tareaId") REFERENCES "public"."Tarea"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "Notificacion_usuarioId_leida_idx" ON "public"."Notificacion"("usuarioId", "leida");

-- ============================================
-- MIGRACION 20250902_ADD_MAINTENANCE
-- ============================================

CREATE TABLE IF NOT EXISTS "patrimoni"."actiu_images" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "actiuGuid" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "thumbUrl" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "description" TEXT,
    "isCover" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "uploadedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "actiu_images_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "actiu_images_actiuGuid_fkey" FOREIGN KEY ("actiuGuid") REFERENCES "patrimoni"."actius"("guid") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "actiu_images_actiuGuid_sortOrder_idx" ON "patrimoni"."actiu_images"("actiuGuid", "sortOrder");
CREATE INDEX IF NOT EXISTS "actiu_images_actiuGuid_createdAt_idx" ON "patrimoni"."actiu_images"("actiuGuid", "createdAt");

CREATE TABLE IF NOT EXISTS "patrimoni"."maintenance_record" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "actiuGuid" TEXT NOT NULL,
    "performedAt" TIMESTAMP(3) NOT NULL,
    "nextPlannedAt" TIMESTAMP(3),
    "periodMonths" INTEGER,
    "periodDays" INTEGER,
    "responsible" TEXT,
    "incidents" TEXT,
    "correctiveActions" TEXT,
    "checklist" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "maintenance_record_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "maintenance_record_actiuGuid_fkey" FOREIGN KEY ("actiuGuid") REFERENCES "patrimoni"."actius"("guid") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "maintenance_record_actiuGuid_performedAt_idx" ON "patrimoni"."maintenance_record"("actiuGuid", "performedAt");

CREATE TABLE IF NOT EXISTS "patrimoni"."maintenance_attachment" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "recordId" TEXT NOT NULL,
    "type" TEXT,
    "filename" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "maintenance_attachment_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "maintenance_attachment_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "patrimoni"."maintenance_record"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "maintenance_attachment_recordId_idx" ON "patrimoni"."maintenance_attachment"("recordId");

-- Tabla sensor_data (si existe en el schema)
CREATE TABLE IF NOT EXISTS "patrimoni"."sensor_data" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "spaceGuid" TEXT NOT NULL,
    "temperature" DOUBLE PRECISION NOT NULL,
    "humidity" DOUBLE PRECISION NOT NULL,
    "ppm" DOUBLE PRECISION NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sensor_data_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "sensor_data_spaceGuid_fkey" FOREIGN KEY ("spaceGuid") REFERENCES "patrimoni"."ifcspace"("guid") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "sensor_data_spaceGuid_timestamp_idx" ON "patrimoni"."sensor_data"("spaceGuid", "timestamp");
CREATE INDEX IF NOT EXISTS "sensor_data_timestamp_idx" ON "patrimoni"."sensor_data"("timestamp");

