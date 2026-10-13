import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';

function SummaryCard({ helper, icon: Icon, label, value, to, onClick, actionLabel = 'Ver activos', breakdown = null }) {
  const cardContent = (
    <div
      className={`balance-hero-card portfolio-item-card ${to || onClick ? 'balance-hero-card-interactive' : ''}`}
      title={helper || undefined}
    >
      <div className="portfolio-card-header">
        <span className="page-kicker">
          {Icon && <Icon size={14} aria-hidden="true" />}
          <span>{label}</span>
        </span>
        {(to || onClick) && (
          <span className="portfolio-card-action">
            <span>{actionLabel}</span>
            <ArrowUpRight size={13} aria-hidden="true" />
          </span>
        )}
      </div>

      <span className="portfolio-card-value">{value}</span>

      {Array.isArray(breakdown) && breakdown.length > 0 ? (
        <div className="portfolio-card-chips">
          {breakdown.map((item) => (
            <div
              key={item.label}
              className={`portfolio-chip is-${item.tone || 'neutral'}`}
              title={item.tooltip || helper || undefined}
            >
              <span className="portfolio-chip-dot" aria-hidden="true" />
              <span className="portfolio-chip-label">{item.label}:</span>
              <span className="portfolio-chip-val">{item.value}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="portfolio-card-chips portfolio-card-chips-empty" />
      )}
    </div>
  );

  if (to) {
    return (
      <Link to={to} className="portfolio-card-link">
        {cardContent}
      </Link>
    );
  }

  if (onClick) {
    return (
      <div onClick={onClick} role="button" tabIndex={0} className="portfolio-card-link" style={{ cursor: 'pointer' }}>
        {cardContent}
      </div>
    );
  }

  return cardContent;
}

export default SummaryCard;
