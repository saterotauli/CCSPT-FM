// Script para migrar datos usando Prisma
// Uso: node migrar-datos-con-prisma.js

const { PrismaClient } = require('@prisma/client');

// URLs de las bases de datos
const SOURCE_DB_URL = process.env.SOURCE_DATABASE_URL || 'postgresql://satero:T0t0r0@localhost:5432/CCSPT';
const TARGET_DB_URL = process.env.SUPABASE_URL;

if (!TARGET_DB_URL) {
  console.error('❌ ERROR: Necesitas configurar SUPABASE_URL');
  console.log('');
  console.log('Ejemplo:');
  console.log('  $env:SUPABASE_URL="postgresql://postgres:PASSWORD@db.xxx.supabase.co:5432/postgres"');
  console.log('  node migrar-datos-con-prisma.js');
  process.exit(1);
}

// Crear clientes Prisma para ambas bases de datos
const sourcePrisma = new PrismaClient({
  datasources: {
    db: {
      url: SOURCE_DB_URL
    }
  }
});

const targetPrisma = new PrismaClient({
  datasources: {
    db: {
      url: TARGET_DB_URL
    }
  }
});

// Función para migrar una tabla
async function migrateTable(tableName, fetchFn, createFn) {
  console.log(`\n📦 Migrando ${tableName}...`);
  
  try {
    const items = await fetchFn();
    console.log(`  Encontrados ${items.length} registros`);
    
    if (items.length === 0) {
      console.log(`  ✅ ${tableName}: Sin datos para migrar`);
      return;
    }
    
    let success = 0;
    let errors = 0;
    
    for (const item of items) {
      try {
        await createFn(item);
        success++;
      } catch (error) {
        if (error.code === 'P2002') {
          // Duplicado, saltar
          console.log(`  ⚠️  Duplicado saltado: ${tableName} ID ${item.id || 'N/A'}`);
        } else {
          console.error(`  ❌ Error en ${tableName}:`, error.message);
          errors++;
        }
      }
    }
    
    console.log(`  ✅ ${tableName}: ${success} migrados, ${errors} errores`);
  } catch (error) {
    console.error(`  ❌ Error migrando ${tableName}:`, error.message);
  }
}

// Función principal de migración
async function migrate() {
  console.log('🚀 Iniciando migración de datos...');
  console.log(`📤 Origen: ${SOURCE_DB_URL.replace(/:[^:@]+@/, ':****@')}`);
  console.log(`📥 Destino: ${TARGET_DB_URL.replace(/:[^:@]+@/, ':****@')}`);
  console.log('');
  
  try {
    // Migrar Usuarios (primero, porque otras tablas dependen de ellos)
    await migrateTable(
      'Usuario',
      () => sourcePrisma.usuario.findMany(),
      (user) => targetPrisma.usuario.create({
        data: {
          id: user.id,
          nombre: user.nombre,
          apellidos: user.apellidos,
          email: user.email,
          telefono: user.telefono,
          password: user.password,
          rol: user.rol,
          activo: user.activo,
          fcmToken: user.fcmToken,
          avatar: user.avatar,
          ultimoAcceso: user.ultimoAcceso,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      })
    );
    
    // Migrar Actius (del schema patrimoni)
    await migrateTable(
      'actius',
      () => sourcePrisma.$queryRaw`SELECT * FROM patrimoni.actius`,
      async (actiu) => {
        await targetPrisma.$executeRaw`
          INSERT INTO patrimoni.actius (id, guid, tipus, subtipus, edifici, planta, zona, ubicacio)
          VALUES (${actiu.id}, ${actiu.guid}, ${actiu.tipus}, ${actiu.subtipus}, ${actiu.edifici}, ${actiu.planta}, ${actiu.zona}, ${actiu.ubicacio})
          ON CONFLICT (guid) DO NOTHING
        `;
      }
    );
    
    // Migrar Tareas
    await migrateTable(
      'Tarea',
      () => sourcePrisma.tarea.findMany(),
      (tarea) => targetPrisma.tarea.create({
        data: {
          id: tarea.id,
          titulo: tarea.titulo,
          descripcion: tarea.descripcion,
          tipo: tarea.tipo,
          prioridad: tarea.prioridad,
          estado: tarea.estado,
          edifici: tarea.edifici,
          planta: tarea.planta,
          zona: tarea.zona,
          ubicacio: tarea.ubicacio,
          fechaCreacion: tarea.fechaCreacion,
          fechaAsignacion: tarea.fechaAsignacion,
          fechaInicio: tarea.fechaInicio,
          fechaVencimiento: tarea.fechaVencimiento,
          fechaCompletada: tarea.fechaCompletada,
          creadoPorId: tarea.creadoPorId,
          asignadoAId: tarea.asignadoAId,
          actiuGuid: tarea.actiuGuid,
          observaciones: tarea.observaciones,
          tiempoEstimado: tarea.tiempoEstimado,
          tiempoReal: tarea.tiempoReal
        }
      })
    );
    
    // Migrar TareaComentarios
    await migrateTable(
      'TareaComentario',
      () => sourcePrisma.tareaComentario.findMany(),
      (comentario) => targetPrisma.tareaComentario.create({
        data: {
          id: comentario.id,
          tareaId: comentario.tareaId,
          usuarioId: comentario.usuarioId,
          contenido: comentario.contenido,
          createdAt: comentario.createdAt
        }
      })
    );
    
    // Migrar TareaAdjuntos
    await migrateTable(
      'TareaAdjunto',
      () => sourcePrisma.tareaAdjunto.findMany(),
      (adjunto) => targetPrisma.tareaAdjunto.create({
        data: {
          id: adjunto.id,
          tareaId: adjunto.tareaId,
          filename: adjunto.filename,
          url: adjunto.url,
          mime: adjunto.mime,
          size: adjunto.size,
          uploadedBy: adjunto.uploadedBy,
          createdAt: adjunto.createdAt
        }
      })
    );
    
    // Migrar Conversaciones
    await migrateTable(
      'Conversacion',
      () => sourcePrisma.conversacion.findMany(),
      (conv) => targetPrisma.conversacion.create({
        data: {
          id: conv.id,
          nombre: conv.nombre,
          esGrupal: conv.esGrupal,
          createdAt: conv.createdAt,
          updatedAt: conv.updatedAt
        }
      })
    );
    
    // Migrar ConversacionParticipante
    await migrateTable(
      'ConversacionParticipante',
      () => sourcePrisma.conversacionParticipante.findMany(),
      (part) => targetPrisma.conversacionParticipante.create({
        data: {
          id: part.id,
          conversacionId: part.conversacionId,
          usuarioId: part.usuarioId,
          fechaUnion: part.fechaUnion,
          ultimaLectura: part.ultimaLectura
        }
      })
    );
    
    // Migrar Mensajes
    await migrateTable(
      'Mensaje',
      () => sourcePrisma.mensaje.findMany(),
      (msg) => targetPrisma.mensaje.create({
        data: {
          id: msg.id,
          conversacionId: msg.conversacionId,
          remitenteId: msg.remitenteId,
          destinatarioId: msg.destinatarioId,
          contenido: msg.contenido,
          leido: msg.leido,
          createdAt: msg.createdAt
        }
      })
    );
    
    // Migrar Notificaciones
    await migrateTable(
      'Notificacion',
      () => sourcePrisma.notificacion.findMany(),
      (notif) => targetPrisma.notificacion.create({
        data: {
          id: notif.id,
          usuarioId: notif.usuarioId,
          tipo: notif.tipo,
          titulo: notif.titulo,
          mensaje: notif.mensaje,
          leida: notif.leida,
          tareaId: notif.tareaId,
          createdAt: notif.createdAt
        }
      })
    );
    
    console.log('\n✅ Migración completada!');
    
  } catch (error) {
    console.error('\n❌ Error durante la migración:', error);
  } finally {
    await sourcePrisma.$disconnect();
    await targetPrisma.$disconnect();
  }
}

// Ejecutar migración
migrate().catch(console.error);

