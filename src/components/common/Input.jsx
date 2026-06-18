import { useRef } from 'react';
import { gsap, useGSAP } from '../../animations/gsapSetup.js';

function Input({ error, id, label, onBlur, onFocus, ...props }) {
  const fieldRef = useRef(null);

  const { contextSafe } = useGSAP(
    () => {
      if (!fieldRef.current) {
        return;
      }

      gsap.set(fieldRef.current, { transformOrigin: '50% 50%' });
    },
    { scope: fieldRef },
  );

  const liftField = contextSafe(() => {
    if (!fieldRef.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    gsap.to(fieldRef.current, {
      y: -2,
      duration: 0.22,
      ease: 'power2.out',
      overwrite: 'auto',
    });
  });

  const settleField = contextSafe(() => {
    if (!fieldRef.current) {
      return;
    }

    gsap.to(fieldRef.current, {
      y: 0,
      duration: 0.22,
      ease: 'power2.out',
      overwrite: 'auto',
    });
  });

  return (
    <div className="form-field" ref={fieldRef}>
      {label && (
        <label className="form-label" htmlFor={id}>
          {label}
        </label>
      )}
      <input
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className="input"
        id={id}
        onBlur={(event) => {
          settleField();
          onBlur?.(event);
        }}
        onFocus={(event) => {
          liftField();
          onFocus?.(event);
        }}
        {...props}
      />
      {error && (
        <p className="form-error" id={`${id}-error`}>
          {error}
        </p>
      )}
    </div>
  );
}

export default Input;
