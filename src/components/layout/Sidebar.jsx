import { NavLink } from 'react-router-dom';
import { HelpCircle, Bot } from 'lucide-react';
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
      <div style={{ marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.15)' }}>
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent('growcap:open-assistant'))}
          className="sidebar-assistant-trigger"
          title="Abrir Asistente IA de GrowCap"
        >
          <Bot size={20} aria-hidden="true" />
          <span>Asistente IA</span>
        </button>
        <NavLink to="/faq" title="Preguntas frecuentes y ayuda" style={{ opacity: 0.9 }}>
          <HelpCircle size={20} aria-hidden="true" />
          <span style={{ fontSize: '0.72rem' }}>Ayuda / FAQ</span>
        </NavLink>
      </div>
    </nav>
  );
}

export default Sidebar;
