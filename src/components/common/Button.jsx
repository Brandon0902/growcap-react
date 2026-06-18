import { useRef } from 'react';
import { gsap, useGSAP } from '../../animations/gsapSetup.js';

function Button({
  children,
  className = '',
  onBlur,
  onFocus,
  onMouseEnter,
  onMouseLeave,
  onPointerDown,
  onPointerUp,
  type = 'button',
  ...props
}) {
  const buttonRef = useRef(null);

  const { contextSafe } = useGSAP(
    () => {
      if (!buttonRef.current) {
        return;
      }

      gsap.set(buttonRef.current, { transformOrigin: '50% 50%' });
    },
    { scope: buttonRef },
  );

  const play = contextSafe(() => {
    if (!buttonRef.current || props.disabled || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    gsap.to(buttonRef.current, {
      y: -2,
      scale: 1.015,
      duration: 0.2,
      ease: 'power2.out',
      overwrite: 'auto',
    });
  });

  const press = contextSafe(() => {
    if (!buttonRef.current || props.disabled || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    gsap.to(buttonRef.current, {
      y: 0,
      scale: 0.985,
      duration: 0.12,
      ease: 'power2.out',
      overwrite: 'auto',
    });
  });

  const reset = contextSafe(() => {
    if (!buttonRef.current) {
      return;
    }

    gsap.to(buttonRef.current, {
      y: 0,
      scale: 1,
      duration: 0.22,
      ease: 'power2.out',
      overwrite: 'auto',
    });
  });

  return (
    <button
      ref={buttonRef}
      className={`button ${className}`.trim()}
      onBlur={(event) => {
        reset();
        onBlur?.(event);
      }}
      onFocus={(event) => {
        play();
        onFocus?.(event);
      }}
      onMouseEnter={(event) => {
        play();
        onMouseEnter?.(event);
      }}
      onMouseLeave={(event) => {
        reset();
        onMouseLeave?.(event);
      }}
      onPointerDown={(event) => {
        press();
        onPointerDown?.(event);
      }}
      onPointerUp={(event) => {
        play();
        onPointerUp?.(event);
      }}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
}

export default Button;
