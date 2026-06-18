import Card from '../../../components/common/Card.jsx';

function SummaryCard({ helper, icon: Icon, label, status = 'Estado', value }) {
  return (
    <Card className="summary-card">
      {Icon && (
        <span className="summary-icon" aria-hidden="true">
          <Icon size={24} />
        </span>
      )}
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
}

export default SummaryCard;
