import Card from '../../../components/common/Card.jsx';

function SummaryCard({ icon: Icon, label, value }) {
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
      </div>
      <span className="summary-status" aria-hidden="true">
        Disponible
      </span>
    </Card>
  );
}

export default SummaryCard;
