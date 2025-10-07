import React, { useEffect, useState } from 'react';
import { firebaseNotificationsService, NotificationDoc } from '../../../services/firebaseNotificationsService';

const Notificaciones: React.FC = () => {
  const [items, setItems] = useState<NotificationDoc[]>([]);

  useEffect(() => {
    const unsub = firebaseNotificationsService.listenAll(setItems);
    return () => unsub && unsub();
  }, []);

  return (
    <div style={{ padding: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h3 style={{ margin: 0 }}>Notificaciones</h3>
        <button onClick={() => firebaseNotificationsService.markAllAsRead()} style={{ background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 6, padding: '6px 10px' }}>Marcar todas como leídas</button>
      </div>
      {items.length === 0 ? (
        <div style={{ color: '#6b7280' }}>No tienes notificaciones</div>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {items.map((n) => (
            <div key={n.id} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 10, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: n.read ? '#e5e7eb' : '#dbeafe', display: 'grid', placeItems: 'center' }}>🔔</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700 }}>{n.title}</div>
                <div style={{ color: '#374151', marginTop: 4 }}>{n.body}</div>
                {!n.read && <div style={{ marginTop: 6, fontSize: 12, color: '#10b981' }}>Nuevo</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Notificaciones;
