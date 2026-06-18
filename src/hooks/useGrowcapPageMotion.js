import { gsap, ScrollTrigger, useGSAP } from '../animations/gsapSetup.js';

const introTargets = [
  '.page-hero',
  '.hero-index',
  '.page-kicker',
  '.page-hero h1',
  '.page-hero p',
  '.hero-stat',
  '.motion-item',
  '.motion-section',
  '.motion-form .form-field',
  '.motion-form .button',
].join(', ');

function revealCollection(targets, vars = {}) {
  if (!targets.length) {
    return null;
  }

  return gsap.from(targets, {
    autoAlpha: 0,
    y: 18,
    duration: 0.5,
    ease: 'power3.out',
    stagger: 0.08,
    ...vars,
  });
}

function useGrowcapPageMotion(scopeRef, { desktopScroll = true } = {}) {
  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add(
        {
          reduceMotion: '(prefers-reduced-motion: reduce)',
          isDesktop: '(min-width: 901px)',
        },
        (context) => {
          const { reduceMotion, isDesktop } = context.conditions;

          if (reduceMotion) {
            gsap.set(introTargets, {
              autoAlpha: 1,
              clearProps: 'transform,visibility',
            });
            return;
          }

          const intro = gsap.timeline({
            defaults: {
              duration: 0.58,
              ease: 'power3.out',
            },
          });

          intro
            .from('.page-hero', { autoAlpha: 0, y: 16, scale: 0.988 })
            .from('.hero-index', { xPercent: -100, duration: 0.48 }, '<0.06')
            .from('.page-kicker', { autoAlpha: 0, y: 8, duration: 0.34 }, '<0.12')
            .from('.page-hero h1', { autoAlpha: 0, y: 16 }, '<0.08')
            .from('.page-hero p', { autoAlpha: 0, y: 10, duration: 0.42 }, '<0.08')
            .from(
              '.hero-stat',
              {
                autoAlpha: 0,
                x: isDesktop ? 20 : 0,
                y: isDesktop ? 0 : 10,
                duration: 0.42,
                stagger: 0.09,
              },
              '<0.12',
            );

          const firstSection = scopeRef.current?.querySelector('.motion-section, .motion-item');
          if (firstSection) {
            const immediateTargets = gsap.utils.toArray(
              '.motion-immediate, .motion-immediate .motion-item, .motion-immediate .form-field, .motion-immediate .button',
            );
            const reveal = revealCollection(immediateTargets, { y: 20, stagger: 0.07 });

            if (reveal) {
              intro.add(reveal, '<0.18');
            }
          }

          const scrollTargets = gsap.utils.toArray('.motion-scroll');
          if (isDesktop && desktopScroll && scrollTargets.length) {
            scrollTargets.forEach((target, index) => {
              const children = target.querySelectorAll(
                '.motion-item, .card, .plan-card, .form-field, .stepper-item, .simple-list li, .profile-list dt, .profile-list dd',
              );
              const animatedTargets = children.length ? [target, ...children] : [target];

              gsap
                .timeline({
                  defaults: {
                    duration: 0.5,
                    ease: 'power3.out',
                  },
                  scrollTrigger: {
                    trigger: target,
                    start: 'top 82%',
                    toggleActions: 'play none none reverse',
                    refreshPriority: index,
                  },
                })
                .from(animatedTargets, {
                  autoAlpha: 0,
                  y: 22,
                  stagger: 0.07,
                });
            });
          }

          ScrollTrigger.refresh();
        },
      );

      return () => mm.revert();
    },
    { scope: scopeRef },
  );
}

export default useGrowcapPageMotion;
