import { forwardRef } from 'react';

const Card = forwardRef(function Card({ children, className = '', ...props }, ref) {
  return (
    <section ref={ref} className={`card ${className}`.trim()} {...props}>
      {children}
    </section>
  );
});

export default Card;
