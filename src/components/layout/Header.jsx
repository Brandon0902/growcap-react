import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import Button from '../common/Button.jsx';
import { clearSession } from '../../utils/storage.js';
import logoGrowcap from '../../assets/rombo_blanco.png';

function Header() {
  const navigate = useNavigate();

  const handleLogout = () => {
    clearSession();
    navigate('/login', { replace: true });
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

      <Button className="button-secondary icon-button" onClick={handleLogout}>
        <LogOut size={20} aria-hidden="true" />
        Salir
      </Button>
    </header>
  );
}

export default Header;