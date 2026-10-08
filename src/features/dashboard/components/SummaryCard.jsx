import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';

function SummaryCard({ helper, icon: Icon, label, value, to, onClick, actionLabel = 'Ver activos' }) {
  const cardContent = (
    <div className={`balance-hero-card portfolio-item-card ${to || onClick ? 'balance-hero-card-interactive' : ''}`}>
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

      <strong className="portfolio-card-value">{value}</strong>

      {helper && <p className="portfolio-card-helper">{helper}</p>}
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

