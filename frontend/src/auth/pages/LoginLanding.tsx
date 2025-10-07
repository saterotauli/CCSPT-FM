import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { firebaseAuthService } from '../../services/firebaseAuthService';

const LoginLanding: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      await firebaseAuthService.login(email, password, remember);
      if (remember) {
        // Persist simple flag for UX (Firebase already persists the session by default)
        localStorage.setItem('remember_me', '1');
      } else {
        localStorage.removeItem('remember_me');
      }
      navigate('/control', { replace: true });
    } catch (err: any) {
      const code = err?.code as string | undefined;
      let msg = 'No se pudo iniciar sesión';
      if (code === 'auth/invalid-email') msg = 'El correu electr\u00f2nic no es vàlid.';
      else if (code === 'auth/user-disabled') msg = 'L\'usuari està deshabilitat.';
      else if (code === 'auth/user-not-found') msg = 'No existeix cap usuari amb aquest correu electr\u00f2nic.';
      else if (code === 'auth/wrong-password') msg = 'La contrasenya és incorrecta.';
      else if (code === 'auth/too-many-requests') msg = 'Massa intents fallits. Torna-ho a provar més tard o canvia la contrasenya.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Desarrollo: auto-login para no repetir credenciales constantemente
  useEffect(() => {
    const isDev = import.meta.env.DEV;
    if (!isDev) return;

    const alreadyLogged = firebaseAuthService.isAuthenticated();
    if (alreadyLogged) {
      navigate('/control', { replace: true });
      return;
    }

    // Evitar intentos múltiples: usar flag temporal en sessionStorage
    const autoTried = sessionStorage.getItem('dev_auto_login_tried');
    if (autoTried === '1') return;

    const devEmail = import.meta.env.VITE_DEV_EMAIL as string | undefined;
    const devPassword = import.meta.env.VITE_DEV_PASSWORD as string | undefined;
    if (devEmail && devPassword) {
      sessionStorage.setItem('dev_auto_login_tried', '1');
      (async () => {
        try {
          await firebaseAuthService.login(devEmail, devPassword, true);
          localStorage.setItem('remember_me', '1');
          navigate('/control', { replace: true });
        } catch (e) {
          // Si falla, no bloqueamos la UI de login
          console.warn('[DEV] Auto-login fallido, usar formulario manual:', e);
        }
      })();
    }
  }, [navigate]);

  const handleResetPassword = async () => {
    if (!email) {
      setError('Introdueix el teu correu electr\u00f2nic per rebre un enllaç per restablir la contrasenya.');
      return;
    }
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      await firebaseAuthService.resetPassword(email);
      setInfo('Hem enviat un correu electr\u00f2nic amb les instruccions per restablir la teva contrasenya.');
    } catch (err: any) {
      const code = err?.code as string | undefined;
      let msg = 'No s\'ha pogut enviar el correu electr\u00f2nic de restabliment';
      if (code === 'auth/invalid-email') msg = 'El correu electr\u00f2nic no és vàlid.';
      else if (code === 'auth/user-not-found') msg = 'No existeix cap usuari amb aquest correu electr\u00f2nic.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100%', fontFamily: 'Inter, system-ui, Arial' }}>
      {/* Left panel: login form */}
      <div style={{ width: '420px', minWidth: 320, padding: '36px 28px', background: '#fff', boxShadow: 'rgba(0,0,0,0.06) -1px 0 0 inset', marginBottom: '100px' }}>
        <div style={{ width: 320, margin: '0 auto', marginTop: 72 }}>
          <img
            src="/assets/images/logos/logo_tauli_color.png"
            alt="Parc Taulí"
            style={{ display: 'block', margin: '0 auto 36px', width: '68%' }}
          />

        {error && (
          <div style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', padding: 10, borderRadius: 6, marginBottom: 12, fontSize: 13 }}>
            {error}
          </div>
        )}
        {info && (
          <div style={{ background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', padding: 10, borderRadius: 6, marginBottom: 12, fontSize: 13 }}>
            {info}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'grid', gap: 10 }}>
          <div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Correu electrònic"
              required
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 6, boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Paraula de pas"
              required
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 6, boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#374151' }}>
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
              Recordar
            </label>
            <button type="button" onClick={handleResetPassword} style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: 13, cursor: 'pointer' }}>
              ¿Has oblidat la contrasenya?
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{ background: '#66bb6a', color: 'white', border: '1px solid #66bb6a', padding: '10px 12px', borderRadius: 6, fontWeight: 600, cursor: 'pointer', width: '100%', boxSizing: 'border-box', display: 'block' }}
          >
            {loading ? 'Conectando…' : 'Conectar'}
          </button>
        </form>

        </div>
      </div>

      {/* Right panel: hero image + CTA */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <img
          src="../public/assets/landing-background.png"
          alt="hero"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(17,24,39,0.45)' }} />
        <div style={{ position: 'relative', height: '100%', display: 'flex', alignItems: 'center', padding: '0 6vw' }}>
          <div style={{ color: 'white', maxWidth: 720 }}>
            <div style={{ fontSize: 12, letterSpacing: 1.5, marginBottom: 10, color: '#bbf7d0' }}>CONSORCI CORPORACIÓ SANITÀRIA PARC TAULÍ</div>
            <h1 style={{ fontSize: 38, lineHeight: 1.1, margin: '0 0 14px 0' }}>
              Vertex
            </h1>
            <p style={{ fontSize: 16, opacity: 0.95, margin: '0 0 18px 0' }}>
              Plataforma per la monitorització i control de la qualitat de les instal·lacions i infraestructures.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginLanding;
