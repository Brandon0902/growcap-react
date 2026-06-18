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
        gsap
          .timeline({
            defaults: {
              duration: 0.58,
              ease: 'power3.out',
            },
          })
          .from('.auth-panel', { autoAlpha: 0, x: 24, scale: 0.99 }, '<0.12')
          .from('.auth-panel .form-intro, .auth-panel .form-field, .auth-panel .button, .auth-panel .helper-text', {
            autoAlpha: 0,
            y: 14,
            stagger: 0.07,
            duration: 0.42,
          }, '<0.18');
      });

      return () => mm.revert();
    },
    { scope: authRef },
  );

  return (
    <main className="auth-layout motion-auth" ref={authRef}>
      <section className="auth-story" aria-label="Resumen Growcap">
        <LoginWealthScene />
      </section>
      <section className="auth-panel">
        <Outlet />
      </section>
    </main>
  );
}

export default AuthLayout;
