import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { firebaseAuthService, UserProfile } from '../../../../services/firebaseAuthService';
import { firebaseNotificationsService } from '../../../../services/firebaseNotificationsService';
import { firebaseMessagingService, ConversationDoc } from '../../../../services/firebaseMessagingService';
import styles from './Header.module.css';

type Props = { leftOffset?: string };

const Header: React.FC<Props> = ({ leftOffset = '0' }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [profile, setProfile] = useState<UserProfile | null>(() => firebaseAuthService.getUserProfile());
  const [openUserMenu, setOpenUserMenu] = useState(false);
  const [unreadNotifs, setUnreadNotifs] = useState<number>(0);
  const [unreadMsgs, setUnreadMsgs] = useState<number>(0);
  // Building context for /modelo/:code
  const [buildingCode, setBuildingCode] = useState<string | null>(null);
  const [buildingColor, setBuildingColor] = useState<string>('#9aa0a6');
  const [sectionLabel, setSectionLabel] = useState<string>('');

  useEffect(() => {
    // Aseguramos sincronización al montar
    firebaseAuthService.waitForAuth().then(() => {
      setProfile(firebaseAuthService.getUserProfile());
    });
    // También escuchamos periódicamente cambios simples (suficiente para esta app)
    const id = setInterval(() => setProfile(firebaseAuthService.getUserProfile()), 1500);
    // Notificaciones no leídas
    const unsubNotif = firebaseNotificationsService.listenUnreadCount(setUnreadNotifs);
    // Mensajes no leídos: contar conversaciones donde unreadFor incluye mi uid
    const unsubConvs = firebaseMessagingService.listenConversations((items: ConversationDoc[]) => {
      const me = firebaseAuthService.getCurrentUser()?.uid;
      const count = items.reduce((acc, c) => acc + ((c.unreadFor || []).includes(me || '') ? 1 : 0), 0);
      setUnreadMsgs(count);
    });
    return () => { clearInterval(id); unsubNotif && unsubNotif(); unsubConvs && unsubConvs(); };
  }, []);

  // Detect building code from route: /modelo/:code
  useEffect(() => {
    try {
      const match = location.pathname.match(/^\/modelo\/([^\/]+)/i);
      const code = match ? decodeURIComponent(match[1]) : null;
      setBuildingCode(code);
    } catch {
      setBuildingCode(null);
    }
    // Section label by route root
    const p = location.pathname;
    let label = '';
    if (p.startsWith('/modelo') || p.startsWith('/control')) label = 'Control';
    else if (p.startsWith('/espais')) label = 'Espais';
    else if (p.startsWith('/fm')) label = 'FM';
    else if (p.startsWith('/projectes')) label = 'Projectes';
    else if (p.startsWith('/docs')) label = 'Docs';
    else if (p.startsWith('/consultes')) label = 'Consultes';
    else if (p.startsWith('/config')) label = 'Config';
    else if (p.startsWith('/actius-mobils')) label = 'Actius mòbils';
    setSectionLabel(label);
  }, [location.pathname]);

  // Load building color when code changes
  useEffect(() => {
    const loadColor = async () => {
      if (!buildingCode) return;
      try {
        const res = await fetch('/api/ifcbuildings');
        if (res.ok) {
          const buildings = await res.json();
          const b = buildings.find((x: any) => (x.codi || x.nom || x.code) === buildingCode);
          setBuildingColor(b?.color || '#9aa0a6');
        }
      } catch {
        setBuildingColor('#9aa0a6');
      }
    };
    loadColor();
  }, [buildingCode]);

  return (
    <header className={styles.appHeader} style={{ left: leftOffset }}>
      <div className={styles.appHeader__left}>
        {buildingCode && (
          <>
            <button onClick={() => navigate(-1)} title="Tornar" aria-label="Tornar" className={styles.appHeader__backButton}>← Tornar</button>
            <div className={styles.appHeader__buildingBadge} style={{ background: buildingColor }}>{buildingCode}</div>
          </>
        )}
        {sectionLabel && (
          <div className={styles.appHeader__sectionLabel}>{sectionLabel}</div>
        )}
      </div>

      <div className={styles.appHeader__right}>
        {/* Mensajes */}
        <button onClick={() => navigate('/mensajes')} title="Mensajes" aria-label="Mensajes" className={styles.appHeader__notificationBtn}>
          <span className={styles.appHeader__notificationIcon}>💬</span>
          {unreadMsgs > 0 && (
            <span className={`${styles.appHeader__badge} ${styles['appHeader__badge--messages']}`}>{unreadMsgs}</span>
          )}
        </button>

        {/* Notificaciones */}
        <button onClick={() => navigate('/notificaciones')} title="Notificaciones" aria-label="Notificaciones" className={styles.appHeader__notificationBtn}>
          <span className={styles.appHeader__notificationIcon}>🔔</span>
          {unreadNotifs > 0 && (
            <span className={`${styles.appHeader__badge} ${styles['appHeader__badge--notifications']}`}>{unreadNotifs}</span>
          )}
        </button>

        {profile ? (
          <>
            {/* Usuario */}
            <div className={styles.appHeader__userMenu}>
              <button onClick={() => setOpenUserMenu(v => !v)} className={styles.appHeader__userButton}>
                <div className={styles.appHeader__userInfo}>
                  <div className={styles.appHeader__userName}>{profile.displayName || 'Usuario'}</div>
                  <div className={styles.appHeader__userEmail}>{profile.email}</div>
                </div>
                {(() => {
                  const initials = (profile.displayName || profile.email || 'US').slice(0, 2).toUpperCase();
                  const hasPhoto = false;
                  return (
                    <div className={styles.appHeader__userAvatar}>
                      {hasPhoto ? (
                        <img alt="avatar" src={''} />
                      ) : (
                        <span>{initials}</span>
                      )}
                    </div>
                  );
                })()}
              </button>

              {openUserMenu && (
                <div className={styles.appHeader__userDropdown}>
                  <div className={styles.appHeader__userDropdownHeader}>
                    <div className={styles.appHeader__userDropdownName}>{profile.displayName || 'Usuario'}</div>
                    <div className={styles.appHeader__userDropdownEmail}>{profile.email}</div>
                  </div>
                  <button onClick={() => { navigate('/config'); setOpenUserMenu(false); }} className={styles.appHeader__dropdownButton}>Configuración</button>
                  <button onClick={async () => { await firebaseAuthService.logout(); navigate('/login', { replace: true }); }} className={`${styles.appHeader__dropdownButton} ${styles['appHeader__dropdownButton--logout']}`}>Cerrar sesión</button>
                </div>
              )}
            </div>
          </>
        ) : (
          <button
            onClick={() => navigate('/login')}
            className={styles.appHeader__loginButton}
          >
            Iniciar sesión
          </button>
        )}
      </div>
    </header>
  );
};

export default Header;
