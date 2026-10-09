import { NavLink, useLocation } from 'react-router-dom';
import { navItems } from './navigation.js';

function MobileNav() {
  const location = useLocation();

  const handleNavClick = (to) => {
    // Si el usuario ya se encuentra en este módulo (click adicional), llevar al top suavemente
    if (location.pathname === to) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      document.documentElement.scrollTo({ top: 0, behavior: 'smooth' });
      document.body.scrollTo({ top: 0, behavior: 'smooth' });
      const mainEl = document.getElementById('main-content');
      if (mainEl) {
        mainEl.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  return (
    <nav className="mobile-nav" aria-label="Navegacion movil">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={() => handleNavClick(item.to)}
        >
          <item.icon size={20} aria-hidden="true" />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}

export default MobileNav;
