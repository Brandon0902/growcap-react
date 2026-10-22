import { useState, useEffect, useRef } from 'react';
import { Lightbulb, ChevronLeft, ChevronRight } from 'lucide-react';
import { assistantService } from '../../services/assistantService.js';
import './FinancialTipCarousel.css';

const DEFAULT_TIPS = [
  'Pon tu dinero a trabajar en planes de ahorro con rendimientos diarios garantizados.',
  'Ahorra en piloto automático: programa tus aportaciones antes de gastos no planeados.',
  'Un abono extraordinario a capital reduce intereses y te acerca más rápido a tus metas.',
  'Aprovecha tu liquidez en caja para generar rendimientos seguros por encima de la inflación.'
];

export default function FinancialTipCarousel({ context = 'all' }) {
  const [tips, setTips] = useState(() => {
    try {
      const cached = sessionStorage.getItem('growcap_financial_tips_list');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
    return DEFAULT_TIPS;
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSwitching, setIsSwitching] = useState(false);
  const [phase, setPhase] = useState(() => {
    // Si ya vio la animación inicial del badge en esta sesión, mostramos directamente la tarjeta
    try {
      return sessionStorage.getItem('growcap_tip_teaser_seen') ? 'card' : 'hidden';
    } catch {
      return 'hidden';
    }
  });

  useEffect(() => {
    let isMounted = true;
    let t1 = null;
    let t2 = null;
    let t3 = null;

    assistantService.getFinancialTips().then((loadedTips) => {
      if (!isMounted) return;
      if (Array.isArray(loadedTips) && loadedTips.length > 0) {
        // Ordenar según contexto si aplica
        let sorted = [...loadedTips];
        if (context === 'loans') {
          sorted.sort((a, b) => (b.toLowerCase().includes('crédito') || b.toLowerCase().includes('préstamo') ? 1 : 0) - (a.toLowerCase().includes('crédito') || a.toLowerCase().includes('préstamo') ? 1 : 0));
        } else if (context === 'savings') {
          sorted.sort((a, b) => (b.toLowerCase().includes('ahorro') || b.toLowerCase().includes('meta') ? 1 : 0) - (a.toLowerCase().includes('ahorro') || a.toLowerCase().includes('meta') ? 1 : 0));
        } else if (context === 'investments') {
          sorted.sort((a, b) => (b.toLowerCase().includes('rendimiento') || b.toLowerCase().includes('plazo') ? 1 : 0) - (a.toLowerCase().includes('rendimiento') || a.toLowerCase().includes('plazo') ? 1 : 0));
        }

        // Garantizar siempre al menos 4 tips para navegación interactiva completa
        if (sorted.length < DEFAULT_TIPS.length) {
          DEFAULT_TIPS.forEach((tip) => {
            if (!sorted.includes(tip)) {
              sorted.push(tip);
            }
          });
        }

        setTips(sorted);
      }

      // Si no ha visto el teaser en la sesión, ejecutamos la secuencia elegante
      const alreadySeen = sessionStorage.getItem('growcap_tip_teaser_seen');
      if (!alreadySeen) {
        t1 = setTimeout(() => {
          if (!isMounted) return;
          setPhase('badge');

          t2 = setTimeout(() => {
            if (!isMounted) return;
            setPhase('exiting');

            t3 = setTimeout(() => {
              if (!isMounted) return;
              setPhase('card');
              try {
                sessionStorage.setItem('growcap_tip_teaser_seen', 'true');
              } catch {
                // ignore
              }
            }, 280);
          }, 2200);
        }, 650);
      } else {
        setPhase('card');
      }
    });

    return () => {
      isMounted = false;
      if (t1) clearTimeout(t1);
      if (t2) clearTimeout(t2);
      if (t3) clearTimeout(t3);
    };
  }, [context]);

  const handleNext = () => {
    if (tips.length <= 1 || isSwitching) return;
    setIsSwitching(true);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % tips.length);
      setIsSwitching(false);
    }, 200);
  };

  const handlePrev = () => {
    if (tips.length <= 1 || isSwitching) return;
    setIsSwitching(true);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev - 1 + tips.length) % tips.length);
      setIsSwitching(false);
    }, 200);
  };

  if (phase === 'hidden') {
    return <div className="financial-tip-carousel-wrap" aria-hidden="true" />;
  }

  return (
    <div className="financial-tip-carousel-wrap" role="region" aria-label="Consejo Financiero Inteligente">
      {phase === 'badge' && (
        <span className="tip-carousel-teaser">
          <Lightbulb size={15} className="tip-bulb-icon" />
          <span>¡Tip Financiero!</span>
        </span>
      )}

      {phase === 'exiting' && (
        <span className="tip-carousel-teaser is-exiting">
          <Lightbulb size={15} className="tip-bulb-icon" />
          <span>¡Tip Financiero!</span>
        </span>
      )}

      {phase === 'card' && (
        <div className="financial-tip-card">
          <span className="tip-card-badge">
            <Lightbulb size={13} className="tip-bulb-icon" />
            <span>Tip Financiero</span>
          </span>

          <span className={`tip-card-text ${isSwitching ? 'is-switching' : ''}`}>
            {tips[currentIndex] || DEFAULT_TIPS[0]}
          </span>

          <div className="tip-carousel-nav" aria-label="Controles de carrusel">
            <button
              type="button"
              onClick={handlePrev}
              title="Consejo anterior"
              className="tip-nav-btn"
              aria-label="Consejo anterior"
              disabled={tips.length <= 1}
            >
              <ChevronLeft size={14} />
            </button>
            <span className="tip-counter">
              {currentIndex + 1}/{tips.length || 1}
            </span>
            <button
              type="button"
              onClick={handleNext}
              title="Siguiente consejo"
              className="tip-nav-btn"
              aria-label="Siguiente consejo"
              disabled={tips.length <= 1}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
