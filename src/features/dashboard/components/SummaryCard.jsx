import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';

function SummaryCard({ helper, icon: Icon, label, value, to, onClick, actionLabel = 'Ver activos', breakdown = null }) {
  const cardContent = (
    <div
      className={`balance-hero-card portfolio-item-card ${to || onClick ? 'balance-hero-card-interactive' : ''}`}
      title={helper || undefined}
    >
      <div className="portfolio-card-header">
        <div className="portfolio-card-title">
          {Icon && <Icon size={16} className="portfolio-card-title-icon" aria-hidden="true" />}
          <span>{label}</span>
        </div>
        {(to || onClick) && (
          <span className="portfolio-card-action">
            <span>{actionLabel}</span>
            <ArrowUpRight size={14} aria-hidden="true" />
          </span>
        )}
      </div>

      <span className="portfolio-card-value">{value}</span>

      {Array.isArray(breakdown) && breakdown.length > 0 ? (
        <div className="portfolio-card-breakdown">
          {breakdown.map((item) => (
            <div
              key={item.label}
              className="portfolio-breakdown-item"
              title={item.tooltip || helper || undefined}
            >
              <span className={`portfolio-breakdown-dot is-${item.tone || 'neutral'}`} aria-hidden="true" />
              <span className="portfolio-breakdown-label">{item.label}:</span>
              <span className="portfolio-breakdown-val">{item.value}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="portfolio-card-breakdown portfolio-card-breakdown-empty" />
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
