import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useState } from 'react';
import Button from '../common/Button.jsx';
import logoGrowcap from '../../assets/rombo_blanco.png';
import useAuth from '../../features/auth/hooks/useAuth.js';

function Header() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);

    try {
      await logout();
    } finally {
      setIsLoggingOut(false);
      navigate('/login', { replace: true });
    }
  };

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

      <Button className="button-secondary icon-button" disabled={isLoggingOut} onClick={handleLogout}>
        <LogOut size={20} aria-hidden="true" />
        {isLoggingOut ? 'Saliendo...' : 'Salir'}
      </Button>
    </header>
  );
}

export default Header;
