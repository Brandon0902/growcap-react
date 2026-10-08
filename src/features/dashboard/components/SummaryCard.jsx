import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import Card from '../../../components/common/Card.jsx';

function SummaryCard({ helper, icon: Icon, label, status = 'Estado', value, to, onClick, actionLabel }) {
  const cardBody = (
    <Card className={`summary-card ${to || onClick ? 'summary-card-interactive' : ''}`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
        {Icon && (
          <span className="summary-icon" aria-hidden="true">
            <Icon size={24} />
          </span>
        )}
        {(to || onClick) && (
          <span 
            className="summary-card-nav-badge"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.72rem',
              fontWeight: 700,
              color: 'var(--color-primary, #6b21a8)',
              background: 'rgba(147, 51, 234, 0.08)',
              padding: '3px 8px',
              borderRadius: '8px',
              transition: 'all 0.2s ease',
            }}
          >
            <span>{actionLabel || 'Ver activos'}</span>
            <ArrowUpRight size={13} />
          </span>
        )}
      </div>
      <div>
        <p className="summary-label">{label}</p>
        <strong className="summary-value">{value}</strong>
        {helper && <p className="summary-helper">{helper}</p>}
      </div>
      <span className="summary-status">
        {status}
      </span>
    </Card>
  );

  if (to) {
    return (
      <Link to={to} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
        {cardBody}
      </Link>
    );
  }

  if (onClick) {
    return (
      <div onClick={onClick} role="button" tabIndex={0} style={{ cursor: 'pointer' }}>
        {cardBody}
      </div>
    );
  }

  return cardBody;
}

export default SummaryCard;

