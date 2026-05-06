import { Outlet } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';

function AuthLayout() {
  return (
    <main className="auth-layout">
      <section className="auth-story" aria-label="Resumen Growcap">
        <div className="auth-vertical" aria-hidden="true">
          Growcap
        </div>
        <div className="auth-story-content">
          <span className="brand-mark auth-mark" aria-hidden="true">
            <ShieldCheck size={30} />
          </span>
          <p className="auth-eyebrow">Caja de ahorro para empleados</p>
          <h1>{import.meta.env.VITE_APP_NAME || 'Growcap'}</h1>
          <p>
            Acceso privado para ahorro, inversion y prestamos con una interfaz directa para usuarios internos.
          </p>
        </div>
        <div className="auth-proof-grid">
          <div>
            <span>01</span>
            <strong>Ahorro</strong>
          </div>
          <div>
            <span>02</span>
            <strong>Inversion</strong>
          </div>
          <div>
            <span>03</span>
            <strong>Prestamos</strong>
          </div>
        </div>
      </section>
      <section className="auth-panel">
        <Outlet />
      </section>
    </main>
  );
}

export default AuthLayout;
