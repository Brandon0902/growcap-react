import { useNavigate } from 'react-router-dom';
import { ChevronDown, KeyRound, LogOut, User } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import logoGrowcap from '../../assets/rombo_blanco.png';
import useAuth from '../../features/auth/hooks/useAuth.js';
import { getUserDisplayName, getUserInitials } from '../../utils/userFormatting.js';
import ChangePasswordModal from '../../features/profile/components/ChangePasswordModal.jsx';
import NotificationBell from './NotificationBell.jsx';

function Header() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const menuRef = useRef(null);

  const displayName = getUserDisplayName(user);
  const initials = getUserInitials(user);

  const handleLogout = async () => {
    setIsLoggingOut(true);

    try {
      await logout();
    } finally {
      setIsLoggingOut(false);
      navigate('/login', { replace: true });
    }
  };

  useEffect(() => {
    if (!isMenuOpen) return;

    const handlePointerDown = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMenuOpen]);

  return (
    <header className="header">
      <a className="skip-link" href="#main-content">
        Saltar al contenido
      </a>

      <div className="brand-lockup">
        <span className="brand-mark" aria-hidden="true">
          <img
            src={logoGrowcap}
            alt=""
            className="brand-logo"
          />
        </span>

        <div>
          <strong>{import.meta.env.VITE_APP_NAME || 'Growcap'}</strong>
          <span>Caja de ahorro para empleados</span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <NotificationBell />

        <div className="header-user-menu" ref={menuRef}>
          <button
            aria-expanded={isMenuOpen}
            aria-haspopup="true"
            aria-label={`Menú de usuario para ${displayName}`}
            className={`user-avatar-trigger ${isMenuOpen ? 'is-active' : ''}`}
            onClick={() => setIsMenuOpen((prev) => !prev)}
            type="button"
          >
            <div className="user-avatar-badge" aria-hidden="true">
              {initials}
            </div>
            <div className="user-avatar-meta">
              <span className="user-avatar-name">{displayName}</span>
              <span className="user-avatar-role">Mi cuenta</span>
            </div>
            <ChevronDown
              aria-hidden="true"
              className={`user-avatar-chevron ${isMenuOpen ? 'is-open' : ''}`}
              size={16}
            />
          </button>

          {isMenuOpen && (
            <div aria-label="Opciones de usuario" className="header-dropdown-menu" role="menu">
              <div className="dropdown-user-header">
                <div className="dropdown-user-avatar" aria-hidden="true">
                  {initials}
                </div>
                <div className="dropdown-user-meta">
                  <span className="dropdown-user-name">{displayName}</span>
                  <span className="dropdown-user-email">{user?.email || 'Cuenta activa'}</span>
                </div>
              </div>

              <div className="dropdown-divider" role="separator" />

              <button
                className="dropdown-item"
                onClick={() => {
                  setIsMenuOpen(false);
                  navigate('/perfil');
                }}
                role="menuitem"
                type="button"
              >
                <span className="dropdown-item-icon" aria-hidden="true">
                  <User size={18} />
                </span>
                <span className="dropdown-item-content">
                  <strong>Ver perfil</strong>
                  <small>Información personal y bancaria</small>
                </span>
              </button>

              <button
                className="dropdown-item"
                onClick={() => {
                  setIsMenuOpen(false);
                  setIsPasswordModalOpen(true);
                }}
                role="menuitem"
                type="button"
              >
                <span className="dropdown-item-icon" aria-hidden="true">
                  <KeyRound size={18} />
                </span>
                <span className="dropdown-item-content">
                  <strong>Cambiar contraseña</strong>
                  <small>Seguridad y clave de acceso</small>
                </span>
              </button>

              <div className="dropdown-divider" role="separator" />

              <button
                className="dropdown-item dropdown-item-danger"
                disabled={isLoggingOut}
                onClick={() => {
                  setIsMenuOpen(false);
                  handleLogout();
                }}
                role="menuitem"
                type="button"
              >
                <span className="dropdown-item-icon" aria-hidden="true">
                  <LogOut size={18} />
                </span>
                <span className="dropdown-item-content">
                  <strong>{isLoggingOut ? 'Cerrando sesión...' : 'Cerrar sesión'}</strong>
                  <small>Finalizar tu sesión en este equipo</small>
                </span>
              </button>
            </div>
          )}
        </div>
      </div>

      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />
    </header>
  );
}

export default Header;
