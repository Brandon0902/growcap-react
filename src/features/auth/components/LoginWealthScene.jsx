import { useRef } from 'react';
import { gsap, useGSAP } from '../../../animations/gsapSetup.js';

const coins = [
  { id: 'coin-a', startX: 62, drift: -10, scale: 0.95, depth: 0 },
  { id: 'coin-b', startX: 126, drift: 12, scale: 0.82, depth: 1 },
  { id: 'coin-c', startX: 210, drift: -18, scale: 1.04, depth: 2 },
  { id: 'coin-d', startX: 94, drift: 22, scale: 0.74, depth: 1 },
  { id: 'coin-e', startX: 176, drift: -8, scale: 0.9, depth: 0 },
  { id: 'coin-f', startX: 242, drift: -28, scale: 0.78, depth: 2 },
  { id: 'coin-g', startX: 48, drift: 26, scale: 0.86, depth: 1 },
  { id: 'coin-h', startX: 154, drift: 8, scale: 1, depth: 0 },
  { id: 'coin-i', startX: 224, drift: -16, scale: 0.7, depth: 1 },
  { id: 'coin-j', startX: 112, drift: 18, scale: 0.94, depth: 2 },
  { id: 'coin-k', startX: 72, drift: 34, scale: 0.76, depth: 0 },
  { id: 'coin-l', startX: 194, drift: -6, scale: 0.88, depth: 1 },
  { id: 'coin-m', startX: 136, drift: -20, scale: 0.72, depth: 2 },
  { id: 'coin-n', startX: 258, drift: -38, scale: 0.92, depth: 0 },
];

const BUILD_DURATION = 7;
const COIN_INTERVAL = 0.42;

function Coin({ id }) {
  return (
    <g className="wealth-coin" id={id}>
      <ellipse cx="0" cy="0" rx="15.5" ry="15.5" className="wealth-coin-face" />
      <ellipse cx="-4.5" cy="-5" rx="4.8" ry="3" className="wealth-coin-shine" />
      <path className="wealth-coin-rim" d="M-9.5 0a9.5 9.5 0 1 0 19 0a9.5 9.5 0 1 0-19 0" />
      <path className="wealth-coin-mark" d="M-5.5 2.5h11M0-7v14" />
    </g>
  );
}

function LoginWealthScene() {
  const sceneRef = useRef(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add(
        {
          reduceMotion: '(prefers-reduced-motion: reduce)',
          isDesktop: '(min-width: 901px)',
          isTablet: '(min-width: 641px) and (max-width: 900px)',
          isPhone: '(max-width: 640px)',
        },
        ({ conditions }) => {
          const { reduceMotion, isDesktop, isTablet, isPhone } = conditions;
          const pigScale = isPhone
            ? { start: 0.36, entry: 0.44, build: 0.64, final: 0.69 }
            : isTablet
              ? { start: 0.5, entry: 0.58, build: 0.92, final: 0.98 }
              : { start: 0.58, entry: 0.66, build: 1.08, final: 1.16 };
          const pigRestY = isPhone ? -12 : 0;
          const coinScale = isPhone ? 0.72 : isTablet ? 0.88 : 1;
          const coinFallY = isPhone ? 106 : isTablet ? 124 : 130;
          const coinStartOffset = isPhone ? -36 : isTablet ? -58 : -98;

          gsap.set('.wealth-coin', {
            autoAlpha: 0,
            transformOrigin: '50% 50%',
          });
          gsap.set('.piggy-bank', {
            transformOrigin: '50% 86%',
            transformPerspective: 900,
          });
          gsap.set('.piggy-core, .piggy-belly-full', {
            transformOrigin: '50% 68%',
          });

          if (reduceMotion) {
            gsap.set('.wealth-scene, .piggy-bank, .piggy-core, .wealth-copy', {
              autoAlpha: 1,
              clearProps: 'transform,visibility',
            });
            gsap.set('.piggy-bank', { scale: pigScale.final, y: pigRestY });
            gsap.set('.piggy-belly-full, .piggy-cheek, .piggy-brow, .piggy-stuffed-eye, .piggy-mouth-pop', {
              autoAlpha: 1,
            });
            gsap.set('.wealth-progress-fill', { scaleX: 1 });
            return;
          }

          gsap.set('.piggy-bank', {
            autoAlpha: 0,
            scale: pigScale.start,
            y: isPhone ? 2 : 22,
            rotationY: isDesktop ? -14 : 0,
            rotationX: isDesktop ? 6 : 0,
          });
          gsap.set('.piggy-belly-full, .piggy-cheek, .piggy-brow, .piggy-stuffed-eye, .piggy-mouth-pop', {
            autoAlpha: 0,
          });
          gsap.set('.wealth-progress-fill', { scaleX: 0 });

          const startIdle = () => {
            gsap.to('.piggy-bank', {
              y: isPhone ? pigRestY - 2 : -7,
              rotationY: isDesktop ? 2.5 : 0,
              rotationZ: isPhone ? 0.18 : 0.55,
              duration: 3.4,
              ease: 'sine.inOut',
              repeat: -1,
              yoyo: true,
            });

            gsap.to('.piggy-belly-full', {
              scaleX: 1.025,
              scaleY: 1.018,
              duration: 2.6,
              ease: 'sine.inOut',
              repeat: -1,
              yoyo: true,
            });
          };

          const intro = gsap.timeline({
            defaults: {
              duration: 0.68,
              ease: 'power3.out',
            },
            onComplete: startIdle,
          });

          intro
            .from('.wealth-ambient', { autoAlpha: 0, scale: 0.94 })
            .from('.wealth-copy > *', { autoAlpha: 0, y: 16, stagger: 0.08 }, '<0.08')
            .to('.piggy-bank', {
              autoAlpha: 1,
              y: pigRestY,
              scale: pigScale.entry,
              rotationY: isDesktop ? -7 : 0,
              rotationX: 0,
              duration: 0.74,
            }, '<0.1')
            .from('.wealth-shadow', { autoAlpha: 0, scaleX: 0.58 }, '<')
            .to('.piggy-bank', {
              scale: pigScale.build,
              duration: BUILD_DURATION,
              ease: 'none',
            }, 0.82)
            .to('.wealth-shadow', {
              scaleX: 1.2,
              autoAlpha: 0.88,
              duration: BUILD_DURATION,
              ease: 'none',
            }, 0.82);

          coins.forEach((coin, index) => {
            const coinStart = 0.94 + index * COIN_INTERVAL;
            const impactAt = coinStart + 0.64;
            const progress = (index + 1) / coins.length;
            const targetX = 181 + coin.drift * 0.28;
            const fallY = coinFallY;
            const startY = coinStartOffset - coin.depth * (isPhone ? 5 : 12);

            intro
              .set(`#${coin.id}`, {
                autoAlpha: 1,
                x: coin.startX,
                y: startY,
                scale: coin.scale * coinScale * (coin.depth === 2 ? 0.86 : 1),
                rotation: index % 2 ? -28 : 24,
                rotationX: 68,
                rotationY: index % 2 ? -74 : 74,
              }, coinStart)
              .to(`#${coin.id}`, {
                x: targetX,
                y: fallY,
                rotation: index % 2 ? 190 : -180,
                rotationX: 0,
                rotationY: index % 2 ? 22 : -22,
                duration: 0.7,
                ease: 'power2.in',
              }, coinStart)
              .to(`#${coin.id}`, {
                y: fallY - 8,
                duration: 0.1,
                ease: 'power1.out',
              }, impactAt - 0.1)
              .to(`#${coin.id}`, {
                autoAlpha: 0,
                scale: coin.scale * coinScale * 0.34,
                y: fallY + 10,
                duration: 0.15,
                ease: 'power1.out',
              }, impactAt)
              .to('.piggy-core', {
                y: -2.5,
                scaleX: 1.008,
                scaleY: 0.994,
                duration: 0.1,
                yoyo: true,
                repeat: 1,
                ease: 'power2.out',
              }, impactAt - 0.03)
              .to('.piggy-slot-shine', {
                autoAlpha: 0.72,
                duration: 0.08,
                yoyo: true,
                repeat: 1,
                ease: 'power1.out',
              }, impactAt - 0.03)
              .to('.wealth-progress-fill', {
                scaleX: progress,
                duration: 0.3,
                ease: 'power2.out',
              }, impactAt)
              .to('.piggy-belly-full', {
                autoAlpha: Math.min(0.9, 0.18 + progress),
                scaleX: 0.94 + progress * 0.14,
                scaleY: 0.92 + progress * 0.1,
                duration: 0.26,
                ease: 'power2.out',
              }, impactAt + 0.02);
          });

          intro
            .to('.piggy-bank', {
              scale: pigScale.final,
              y: pigRestY,
              rotationY: isDesktop ? 2 : 0,
              duration: 0.42,
              ease: 'back.out(1.55)',
            }, 7.28)
            .to('.piggy-belly-full', {
              autoAlpha: 0.96,
              scaleX: 1.16,
              scaleY: 1.1,
              duration: 0.4,
              ease: 'back.out(1.7)',
            }, 7.28)
            .to('.piggy-normal-eye', { autoAlpha: 0, duration: 0.14 }, 7.36)
            .to('.piggy-stuffed-eye, .piggy-cheek, .piggy-brow, .piggy-mouth-pop', {
              autoAlpha: 1,
              scale: 1,
              duration: 0.22,
              stagger: 0.025,
              ease: 'power2.out',
            }, 7.42)
            .to('.piggy-core', {
              rotationZ: 1.4,
              duration: 0.08,
              ease: 'power1.inOut',
              repeat: 7,
              yoyo: true,
            }, 7.64);

          gsap.to('.wealth-bg-orbit', {
            x: 18,
            y: -14,
            rotation: 5,
            duration: 7,
            ease: 'sine.inOut',
            repeat: -1,
            yoyo: true,
          });

          gsap.to('.wealth-spark', {
            autoAlpha: 0.28,
            scale: 1.18,
            duration: 1.8,
            ease: 'sine.inOut',
            stagger: 0.28,
            repeat: -1,
            yoyo: true,
          });
        },
      );

      return () => mm.revert();
    },
    { scope: sceneRef },
  );

  return (
    <div className="wealth-scene" ref={sceneRef} aria-hidden="true">
      <div className="wealth-ambient wealth-bg-orbit" />
      <div className="wealth-ambient wealth-bg-halo" />

      <div className="wealth-copy">
        <span>Caja de ahorro para empleados</span>
        <h1>{import.meta.env.VITE_APP_NAME || 'Growcap'}</h1>
        <p>Ahorro, inversion y prestamos con una experiencia privada, clara y enfocada en crecimiento.</p>
      </div>

      <div className="wealth-stage">
        <svg className="wealth-illustration" viewBox="0 0 360 320" role="img">
          <defs>
            <linearGradient id="pigBody" x1="20%" x2="84%" y1="8%" y2="92%">
              <stop offset="0%" stopColor="var(--color-primary-soft)" />
              <stop offset="28%" stopColor="#E9D5FF" />
              <stop offset="62%" stopColor="var(--color-primary-hover)" />
              <stop offset="100%" stopColor="var(--color-primary)" />
            </linearGradient>
            <linearGradient id="pigSnout" x1="16%" x2="92%" y1="8%" y2="96%">
              <stop offset="0%" stopColor="var(--color-primary-soft)" />
              <stop offset="58%" stopColor="#E9D5FF" />
              <stop offset="100%" stopColor="var(--color-primary)" />
            </linearGradient>
            <linearGradient id="pigSlot" x1="8%" x2="100%" y1="0%" y2="100%">
              <stop offset="0%" stopColor="#581C87" />
              <stop offset="62%" stopColor="var(--color-primary-dark)" />
              <stop offset="100%" stopColor="var(--color-primary-hover)" />
            </linearGradient>
            <linearGradient id="pigMetal" x1="15%" x2="95%" y1="0%" y2="100%">
              <stop offset="0%" stopColor="var(--color-primary-soft)" />
              <stop offset="45%" stopColor="#E9D5FF" />
              <stop offset="100%" stopColor="var(--color-primary)" />
            </linearGradient>
            <radialGradient id="pigHighlight" cx="34%" cy="24%" r="70%">
              <stop offset="0%" stopColor="var(--color-surface)" stopOpacity="0.82" />
              <stop offset="42%" stopColor="var(--color-surface)" stopOpacity="0.22" />
              <stop offset="100%" stopColor="var(--color-surface)" stopOpacity="0" />
            </radialGradient>
            <filter id="pigSoftShadow" x="-25%" y="-25%" width="150%" height="150%">
              <feDropShadow dx="0" dy="12" stdDeviation="12" floodColor="#581C87" floodOpacity="0.18" />
            </filter>
            <filter id="softGlow" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <ellipse className="wealth-shadow" cx="184" cy="270" rx="112" ry="22" />
          <g className="coin-field">
            {coins.map((coin) => (
              <Coin key={coin.id} id={coin.id} />
            ))}
          </g>

          <g className="piggy-bank">
            <g className="piggy-core" filter="url(#pigSoftShadow)">
              <path className="piggy-tail" d="M287 171c29-20 55 12 35 29-16 13-39 2-27-17" />
              <path className="piggy-ear piggy-ear-back" d="M134 104c-8-27 6-45 31-53 8 27 1 48-19 60z" />
              <path className="piggy-leg piggy-leg-back" d="M112 226c16 3 31 3 46 0l-6 33h-35z" />
              <path className="piggy-leg" d="M218 226c16 2 30 1 44-3l-8 36h-36z" />
              <path className="piggy-body" d="M69 164c4-58 55-98 126-98 75 0 128 43 128 104 0 60-53 99-128 99-78 0-130-42-126-105z" />
              <ellipse className="piggy-belly-full" cx="194" cy="183" rx="88" ry="67" />
              <path className="piggy-ear" d="M170 100c2-29 20-43 47-42 0 28-13 47-37 53z" />
              <path className="piggy-highlight" d="M101 146c20-42 62-64 114-60 36 3 66 18 82 41-67-26-139-19-196 19z" />
              <path className="piggy-side-gloss" d="M244 104c32 13 53 37 58 69" />
              <path className="piggy-slot" d="M151 95c21-6 53-6 74 0c4 1 6 4 5 7c0 4-3 6-7 5c-19-5-49-5-69 0c-4 1-7-1-8-5c-1-3 1-6 5-7z" />
              <path className="piggy-slot-shine" d="M160 98c17-3 39-3 56 0" />
              <ellipse className="piggy-snout" cx="286" cy="165" rx="34" ry="28" />
              <ellipse className="piggy-snout-gloss" cx="274" cy="153" rx="10" ry="6" />
              <circle className="piggy-cheek piggy-cheek-left" cx="259" cy="181" r="9" />
              <circle className="piggy-cheek piggy-cheek-right" cx="309" cy="181" r="8" />
              <circle className="piggy-nostril" cx="277" cy="165" r="4" />
              <circle className="piggy-nostril" cx="296" cy="165" r="4" />
              <circle className="piggy-eye piggy-normal-eye" cx="246" cy="133" r="5" />
              <path className="piggy-stuffed-eye" d="M238 132c5-5 12-5 17 0M238 139c5 5 12 5 17 0" />
              <path className="piggy-brow" d="M236 124c8-4 16-3 22 3" />
              <path className="piggy-mouth-pop" d="M278 185c8 6 19 6 27 0" />
              <path className="piggy-rim" d="M97 183c22 46 87 69 154 47" />
              <path className="piggy-shine" d="M122 126c22-22 58-32 94-27" />
            </g>
          </g>
        </svg>

        <div className="wealth-progress" aria-hidden="true">
          <span />
          <strong className="wealth-progress-fill" />
        </div>
      </div>

      <span className="wealth-spark spark-one" />
      <span className="wealth-spark spark-two" />
      <span className="wealth-spark spark-three" />
    </div>
  );
}

export default LoginWealthScene;
