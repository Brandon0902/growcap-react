import { NavLink } from 'react-router-dom';
import { navItems } from './navigation.js';

function Sidebar() {
  return (
    <nav className="sidebar" aria-label="Navegacion principal">
      <div className="sidebar-panel">
        <span>Menu operativo</span>
        <strong>Gestion financiera</strong>
      </div>
      {navItems.map((item) => (
        <NavLink key={item.to} to={item.to}>
          <item.icon size={22} aria-hidden="true" />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}

export default Sidebar;
