import React, { useState, useEffect } from 'react';
import { messagingService, Notification } from '../../../../services/messagingService';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({ isOpen, onClose }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen, filter, pagination.page]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: pagination.page,
        limit: pagination.limit
      };
      
      if (filter === 'unread') {
        params.leida = false;
      }

      const response = await messagingService.getNotifications(params);
      setNotifications(response.notificaciones);
      setPagination(prev => ({
        ...prev,
        total: response.pagination.total,
        pages: response.pagination.pages
      }));
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await messagingService.markNotificationAsRead(notificationId);
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, leida: true }
            : notif
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await messagingService.markAllNotificationsAsRead();
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, leida: true }))
      );
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="notification-center-overlay" onClick={onClose}>
      <div className="notification-center" onClick={(e) => e.stopPropagation()}>
        <div className="notification-header">
          <h2>Notificaciones</h2>
          <div className="notification-actions">
            <button 
              className="btn btn-sm btn-secondary"
              onClick={handleMarkAllAsRead}
            >
              Marcar todas como leídas
            </button>
            <button className="close-btn" onClick={onClose}>×</button>
          </div>
        </div>

        <div className="notification-filters">
          <button 
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            Todas
          </button>
          <button 
            className={`filter-btn ${filter === 'unread' ? 'active' : ''}`}
            onClick={() => setFilter('unread')}
          >
            No leídas
          </button>
        </div>

        <div className="notification-list">
          {loading ? (
            <div className="loading">Cargando notificaciones...</div>
          ) : notifications.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🔔</div>
              <p>No hay notificaciones</p>
            </div>
          ) : (
            notifications.map(notification => (
              <div 
                key={notification.id}
                className={`notification-item ${!notification.leida ? 'unread' : ''}`}
                onClick={() => !notification.leida && handleMarkAsRead(notification.id)}
              >
                <div className="notification-icon">
                  {messagingService.getNotificationIcon(notification.tipo)}
                </div>
                <div className="notification-content">
                  <div className="notification-title">{notification.titulo}</div>
                  <div className="notification-message">{notification.mensaje}</div>
                  <div className="notification-meta">
                    <span className="notification-time">
                      {messagingService.formatTimeAgo(notification.createdAt)}
                    </span>
                    {notification.tarea && (
                      <span className="notification-task">
                        Tarea: {notification.tarea.titulo}
                      </span>
                    )}
                  </div>
                </div>
                {!notification.leida && (
                  <div className="unread-indicator"></div>
                )}
              </div>
            ))
          )}
        </div>

        {pagination.pages > 1 && (
          <div className="notification-pagination">
            <button 
              disabled={pagination.page === 1}
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
            >
              Anterior
            </button>
            <span>
              {pagination.page} de {pagination.pages}
            </span>
            <button 
              disabled={pagination.page === pagination.pages}
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
            >
              Siguiente
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationCenter;
