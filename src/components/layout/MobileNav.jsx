import { NavLink } from 'react-router-dom';
import { navItems } from './navigation.js';

function MobileNav() {
  return (
    <nav className="mobile-nav" aria-label="Navegacion movil">
      {navItems.map((item) => (
        <NavLink key={item.to} to={item.to}>
          <item.icon size={20} aria-hidden="true" />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}

export default MobileNav;
