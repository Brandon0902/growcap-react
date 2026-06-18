import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useRef } from 'react';
import { gsap, useGSAP } from '../../../animations/gsapSetup.js';
import Card from '../../../components/common/Card.jsx';

function ModuleCard({ description, icon: Icon, nextStep, title, to }) {
  const cardRef = useRef(null);

  const { contextSafe } = useGSAP(
    () => {
      if (!cardRef.current) {
        return;
      }

      gsap.set('.module-icon svg, .module-card .button svg, .module-code', {
        transformOrigin: '50% 50%',
      });
    },
    { scope: cardRef },
  );

  const playInteraction = contextSafe(() => {
    if (!cardRef.current) {
      return;
    }

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduceMotion) {
      return;
    }

    gsap
      .timeline({
        defaults: {
          duration: 0.32,
          ease: 'power3.out',
          overwrite: 'auto',
        },
      })
      .to(cardRef.current, { y: -3 }, 0)
      .to('.module-icon', { scale: 1.08, rotation: -3 }, 0)
      .to('.module-icon svg', { x: 2, y: -1 }, 0)
      .to('.module-card .button svg', { x: 5 }, 0)
      .to('.module-code', { autoAlpha: 0.55, x: -6 }, 0);
  });

  const resetInteraction = contextSafe(() => {
    if (!cardRef.current) {
      return;
    }

    gsap.to(cardRef.current, {
      y: 0,
      duration: 0.28,
      ease: 'power2.out',
      overwrite: 'auto',
    });
    gsap.to('.module-icon, .module-icon svg, .module-card .button svg, .module-code', {
      x: 0,
      y: 0,
      scale: 1,
      rotation: 0,
      autoAlpha: 1,
      duration: 0.28,
      ease: 'power2.out',
      overwrite: 'auto',
    });
  });

  return (
    <Card
      ref={cardRef}
      className="module-card"
      onBlur={resetInteraction}
      onFocus={playInteraction}
      onMouseEnter={playInteraction}
      onMouseLeave={resetInteraction}
    >
      <div className="module-card-top">
        {Icon && (
          <span className="module-icon" aria-hidden="true">
            <Icon size={24} />
          </span>
        )}
        <div>
          <h2>{title}</h2>
          {nextStep && <span>{nextStep}</span>}
        </div>
      </div>
      <p>{description}</p>
      <span className="module-code" aria-hidden="true">
        {title.slice(0, 3).toUpperCase()}
      </span>
      <Link className="button icon-button" to={to}>
        Entrar
        <ArrowRight size={20} aria-hidden="true" />
      </Link>
    </Card>
  );
}

export default ModuleCard;
