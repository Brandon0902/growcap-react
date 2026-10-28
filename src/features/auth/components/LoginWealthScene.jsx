import { useRef } from 'react';
import { gsap, useGSAP } from '../../../animations/gsapSetup.js';

const coins = [
  { id: 'coin-a', startX: 168, driftX: -2, delay: 0 },
  { id: 'coin-b', startX: 206, driftX: 1, delay: 0.65 },
  { id: 'coin-c', startX: 156, driftX: -3, delay: 1.30 },
  { id: 'coin-d', startX: 196, driftX: 2, delay: 1.95 },
  { id: 'coin-e', startX: 176, driftX: -1, delay: 2.60 },
  { id: 'coin-f', startX: 216, driftX: 3, delay: 3.25 },
  { id: 'coin-g', startX: 184, driftX: 0, delay: 3.90 },
];

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
          isMobile: '(max-width: 900px)',
        },
        ({ conditions }) => {
          const { reduceMotion, isDesktop } = conditions;

          // Target slot in SVG viewBox coordinates (360x320)
          const slotX = 188;
          const slotY = 95;

          gsap.set('.wealth-coin', {
            autoAlpha: 0,
            transformOrigin: '50% 50%',
          });
          gsap.set('.piggy-bank', {
            transformOrigin: '184px 260px',
            transformPerspective: 900,
            scale: 1,
            y: 0,
          });
          gsap.set('.piggy-core, .piggy-belly-full', {
            transformOrigin: '50% 68%',
          });

          if (reduceMotion) {
            gsap.set('.wealth-scene, .piggy-bank, .piggy-core, .wealth-copy, .wealth-copy > *', {
              autoAlpha: 1,
              clearProps: 'all',
            });
            gsap.set('.piggy-bank', { scale: 1, y: 0 });
            gsap.set('.piggy-belly-full, .piggy-cheek', {
              autoAlpha: 0.8,
            });
            gsap.set('.wealth-progress-fill', { scaleX: 1 });
            return;
          }

          // Initial entrance
          gsap.fromTo(
            '.wealth-ambient',
            { autoAlpha: 0, scale: 0.94 },
            { autoAlpha: 1, scale: 1, duration: 0.6, ease: 'power3.out' }
          );

          gsap.fromTo(
            '.piggy-bank',
            { autoAlpha: 0, scale: 0.88, y: 14 },
            { autoAlpha: 1, scale: 1, y: 0, duration: 0.7, ease: 'back.out(1.5)' }
          );

          gsap.fromTo(
            '.wealth-shadow',
            { autoAlpha: 0, scaleX: 0.6 },
            { autoAlpha: 0.8, scaleX: 1, duration: 0.7, ease: 'power2.out' }
          );

          // Continuous gentle idle bobbing
          gsap.to('.piggy-bank', {
            y: -5,
            rotationZ: isDesktop ? 0.35 : 0.2,
            duration: 2.6,
            ease: 'sine.inOut',
            repeat: -1,
            yoyo: true,
          });

          gsap.to('.wealth-shadow', {
            scaleX: 0.94,
            opacity: 0.55,
            duration: 2.6,
            ease: 'sine.inOut',
            repeat: -1,
            yoyo: true,
          });

          gsap.to('.piggy-belly-full', {
            scaleX: 1.025,
            scaleY: 1.018,
            duration: 2.2,
            ease: 'sine.inOut',
            repeat: -1,
            yoyo: true,
          });

          gsap.to('.wealth-bg-orbit', {
            x: 14,
            y: -10,
            rotation: 4,
            duration: 6,
            ease: 'sine.inOut',
            repeat: -1,
            yoyo: true,
          });

          // Master continuous coin fall loop
          const masterLoop = gsap.timeline({
            repeat: -1,
            repeatDelay: 0.25,
          });

          coins.forEach((coin, index) => {
            const dropDuration = 0.72;
            const impactAt = coin.delay + dropDuration;
            const targetCoinX = slotX + coin.driftX;
            const progress = (index + 1) / coins.length;

            masterLoop
              .set(`#${coin.id}`, {
                autoAlpha: 0,
                x: coin.startX,
                y: 18,
                scale: 0.9,
                rotation: (index % 2 === 0 ? 1 : -1) * 25,
                rotationX: 65,
                rotationY: (index % 2 === 0 ? -1 : 1) * 45,
              }, coin.delay)
              .to(`#${coin.id}`, {
                autoAlpha: 1,
                duration: 0.12,
                ease: 'power1.out',
              }, coin.delay)
              .to(`#${coin.id}`, {
                x: targetCoinX,
                y: slotY,
                rotation: (index % 2 === 0 ? 1 : -1) * 180,
                rotationX: 12,
                rotationY: (index % 2 === 0 ? 1 : -1) * 15,
                duration: dropDuration,
                ease: 'power2.in',
              }, coin.delay)
              .to(`#${coin.id}`, {
                y: slotY + 12,
                scale: 0.22,
                autoAlpha: 0,
                duration: 0.12,
                ease: 'power1.in',
              }, impactAt)
              .fromTo('.piggy-slot-shine', {
                autoAlpha: 0,
                scale: 0.8,
              }, {
                autoAlpha: 1,
                scale: 1.2,
                duration: 0.07,
                yoyo: true,
                repeat: 1,
                ease: 'power1.out',
              }, impactAt - 0.03)
              .to('.piggy-core', {
                scaleY: 0.968,
                scaleX: 1.028,
                duration: 0.09,
                yoyo: true,
                repeat: 1,
                ease: 'back.out(2)',
              }, impactAt - 0.02)
              .to('.wealth-progress-fill', {
                scaleX: progress,
                duration: 0.25,
                ease: 'power2.out',
              }, impactAt);
          });

          // Reset progress fill smoothly at end of loop
          masterLoop.to('.wealth-progress-fill', {
            scaleX: 0,
            duration: 0.35,
            ease: 'power2.inOut',
          }, '+=0.2');
        },
      );

      return () => {
        gsap.set('.wealth-copy > *, .wealth-ambient, .piggy-bank, .wealth-shadow', { clearProps: 'all' });
        mm.revert();
      };
    },
    { scope: sceneRef },
  );

  return (
    <div className="wealth-scene" ref={sceneRef} aria-hidden="true">
      <div className="wealth-ambient wealth-bg-orbit" />
      <div className="wealth-ambient wealth-bg-halo" />

      <div className="wealth-copy">
        <span>Caja de ahorro para colaboradores</span>
        <h1>{import.meta.env.VITE_APP_NAME || 'Growcap'}</h1>
        <p>Ahorro, inversión y préstamos con una experiencia privada, clara y enfocada en crecimiento.</p>
      </div>

      <div className="wealth-stage">
        <svg
          className="wealth-illustration"
          viewBox="0 0 360 320"
          role="img"
          aria-label="Alcancía de cochinito recibiendo monedas doradas"
        >
          <defs>
            <linearGradient id="pigBody" x1="20%" x2="84%" y1="8%" y2="92%">
              <stop offset="0%" stopColor="var(--color-primary-soft, #F3E8FF)" />
              <stop offset="28%" stopColor="#E9D5FF" />
              <stop offset="62%" stopColor="var(--color-primary-hover, #9333EA)" />
              <stop offset="100%" stopColor="var(--color-primary, #7E22CE)" />
            </linearGradient>
            <linearGradient id="pigSnout" x1="16%" x2="92%" y1="8%" y2="96%">
              <stop offset="0%" stopColor="var(--color-primary-soft, #F3E8FF)" />
              <stop offset="58%" stopColor="#E9D5FF" />
              <stop offset="100%" stopColor="var(--color-primary, #7E22CE)" />
            </linearGradient>
            <linearGradient id="pigSlot" x1="8%" x2="100%" y1="0%" y2="100%">
              <stop offset="0%" stopColor="#581C87" />
              <stop offset="62%" stopColor="var(--color-primary-dark, #6B21A8)" />
              <stop offset="100%" stopColor="var(--color-primary-hover, #9333EA)" />
            </linearGradient>
            <linearGradient id="pigMetal" x1="15%" x2="95%" y1="0%" y2="100%">
              <stop offset="0%" stopColor="#FEF08A" />
              <stop offset="35%" stopColor="#FACC15" />
              <stop offset="70%" stopColor="#EAB308" />
              <stop offset="100%" stopColor="#CA8A04" />
            </linearGradient>
            <radialGradient id="pigHighlight" cx="34%" cy="24%" r="70%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.82" />
              <stop offset="42%" stopColor="#ffffff" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
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
          <span className="wealth-progress-fill" />
        </div>
      </div>

      <span className="wealth-spark spark-one" />
      <span className="wealth-spark spark-two" />
      <span className="wealth-spark spark-three" />
    </div>
  );
}

export default LoginWealthScene;
