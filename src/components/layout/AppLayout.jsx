import { Outlet } from 'react-router-dom';
import { useRef } from 'react';
import { gsap, useGSAP } from '../../animations/gsapSetup.js';
import Header from './Header.jsx';
import Sidebar from './Sidebar.jsx';
import MobileNav from './MobileNav.jsx';

function AppLayout() {
  const shellRef = useRef(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap
          .timeline({
            defaults: {
              duration: 0.42,
              ease: 'power3.out',
            },
          })
          .from('.header', { autoAlpha: 0, y: -12 })
          .from('.sidebar a, .mobile-nav a', {
            autoAlpha: 0,
            x: -8,
            stagger: 0.035,
          }, '<0.12');
      });

      return () => mm.revert();
    },
    { scope: shellRef },
  );

  return (
    <div className="app-shell" ref={shellRef}>
      <Header />
      <div className="app-body">
        <Sidebar />
        <main className="main-content" id="main-content">
          <Outlet />
        </main>
      </div>
      <MobileNav />
    </div>
  );
}

export default AppLayout;
