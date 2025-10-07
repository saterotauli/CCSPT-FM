import React, { useEffect, useMemo, useRef, useState } from 'react';
import { firebaseMessagingService, ConversationDoc, MessageDoc } from '../../../services/firebaseMessagingService';
import { firebaseAuthService } from '../../../services/firebaseAuthService';

const ListItem: React.FC<{ c: ConversationDoc; active: boolean; onClick: () => void }> = ({ c, active, onClick }) => {
  const me = firebaseAuthService.getCurrentUser();
  const otherId = (c.participants || []).find((p) => p !== me?.uid) || '';
  const name = c.name || `Chat con ${otherId.slice(0, 6)}`;
  const unread = (c.unreadFor || []).includes(me?.uid || '');
  return (
    <button onClick={onClick} style={{
      width: '100%', textAlign: 'left', background: active ? '#eef6ff' : '#fff',
      border: '1px solid #e5e7eb', borderRadius: 8, padding: 10, cursor: 'pointer'
    }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#e5e7eb', display: 'grid', placeItems: 'center', fontWeight: 700 }}>
          {(name || 'US').slice(0, 2).toUpperCase()}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{name}</div>
          <div style={{ fontSize: 12, color: '#6b7280', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{c.lastMessage || '—'}</div>
        </div>
        {unread && <span style={{ background: '#10b981', color: '#fff', borderRadius: 10, padding: '2px 8px', fontSize: 11 }}>Nuevo</span>}
      </div>
    </button>
  );
};

const Mensajes: React.FC = () => {
  const [convs, setConvs] = useState<ConversationDoc[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<MessageDoc[]>([]);
  const [text, setText] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = firebaseMessagingService.listenConversations(setConvs);
    return () => unsub && unsub();
  }, []);

  useEffect(() => {
    if (!activeId) return;
    const unsub = firebaseMessagingService.listenMessages(activeId, setMsgs);
    firebaseMessagingService.markConversationAsRead(activeId);
    return () => unsub && unsub();
  }, [activeId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs]);

  const activeConv = useMemo(() => convs.find((c) => c.id === activeId) || null, [convs, activeId]);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 12, padding: 12 }}>
      <div style={{ display: 'grid', gap: 8, alignContent: 'start' }}>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>Mensajes</div>
        {convs.length === 0 ? (
          <div style={{ color: '#6b7280', fontSize: 14 }}>No hay conversaciones todavía</div>
        ) : (
          convs.map((c) => (
            <ListItem key={c.id} c={c} active={c.id === activeId} onClick={() => setActiveId(c.id!)} />
          ))
        )}
      </div>

      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, minHeight: '60vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '10px 12px', borderBottom: '1px solid #e5e7eb', fontWeight: 700 }}>
          {activeConv ? activeConv.name || 'Conversación' : 'Selecciona una conversación'}
        </div>
        <div style={{ flex: 1, padding: 12, overflowY: 'auto' }}>
          {msgs.map((m) => {
            const mine = m.sender === firebaseAuthService.getCurrentUser()?.uid;
            return (
              <div key={m.id} style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start', marginBottom: 8 }}>
                <div style={{ background: mine ? '#dbeafe' : '#f3f4f6', borderRadius: 12, padding: '6px 10px', maxWidth: '70%' }}>
                  <div style={{ fontSize: 14 }}>{m.text}</div>
                </div>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!activeId || !text.trim()) return;
            await firebaseMessagingService.sendMessage(activeId, text.trim());
            setText('');
          }}
          style={{ display: 'flex', gap: 8, padding: 10, borderTop: '1px solid #e5e7eb' }}
        >
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Escribe un mensaje…" style={{ flex: 1, border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 12px' }} />
          <button type="submit" style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 14px', fontWeight: 700 }}>Enviar</button>
        </form>
      </div>
    </div>
  );
};

export default Mensajes;
