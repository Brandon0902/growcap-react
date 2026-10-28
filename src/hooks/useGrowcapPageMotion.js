import { gsap, ScrollTrigger, useGSAP } from '../animations/gsapSetup.js';

const introTargets = [
  '.page-hero',
  '.hero-index',
  '.page-kicker',
  '.page-hero h1',
  '.page-hero p',
  '.page-hero .page-hero-content',
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
            const targets = gsap.utils.toArray(introTargets, scopeRef.current);
            if (targets.length) {
              gsap.set(targets, {
                autoAlpha: 1,
                clearProps: 'transform,visibility',
              });
            }
            return;
          }

          const intro = gsap.timeline({
            defaults: {
              duration: 0.58,
              ease: 'power3.out',
            },
          });

          const animateIfExists = (selector, vars, position) => {
            const targets = gsap.utils.toArray(selector, scopeRef.current);
            if (targets.length > 0) {
              const hasTweens = intro.getChildren().length > 0;
              intro.from(targets, vars, hasTweens && position ? position : undefined);
            }
          };

          animateIfExists('.page-hero', { autoAlpha: 0, y: 16, scale: 0.988 });
          animateIfExists('.hero-index', { xPercent: -100, duration: 0.48 }, '<0.06');
          animateIfExists('.page-kicker', { autoAlpha: 0, y: 8, duration: 0.34 }, '<0.12');
          animateIfExists('.page-hero h1', { autoAlpha: 0, y: 16 }, '<0.08');
          animateIfExists('.page-hero p, .page-hero .page-hero-content', { autoAlpha: 0, y: 10, duration: 0.42 }, '<0.08');
          animateIfExists(
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
              scopeRef.current,
            );
            const reveal = revealCollection(immediateTargets, { y: 20, stagger: 0.07 });

            if (reveal) {
              intro.add(reveal, '<0.18');
            }
          }

          const scrollTargets = gsap.utils.toArray('.motion-scroll', scopeRef.current);
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
