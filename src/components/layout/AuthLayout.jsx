import { Outlet } from 'react-router-dom';
import { useRef } from 'react';
import { gsap, useGSAP } from '../../animations/gsapSetup.js';
import LoginWealthScene from '../../features/auth/components/LoginWealthScene.jsx';

function AuthLayout() {
  const authRef = useRef(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.fromTo(
          '.auth-panel',
          { autoAlpha: 0, x: 20, scale: 0.99 },
          {
            autoAlpha: 1,
            x: 0,
            scale: 1,
            duration: 0.42,
            ease: 'power3.out',
            clearProps: 'all',
          },
        );
      });

      return () => {
        gsap.set('.auth-panel', { clearProps: 'all' });
        mm.revert();
      };
    },
    { scope: authRef },
  );

  return (
    <main className="auth-layout motion-auth" ref={authRef}>
      <section className="auth-story" aria-label="Resumen Growcap">
        <LoginWealthScene />
      </section>
      <section className="auth-panel" style={{ opacity: 1, visibility: 'visible' }}>
        <Outlet />
      </section>
    </main>
  );
}

export default AuthLayout;
