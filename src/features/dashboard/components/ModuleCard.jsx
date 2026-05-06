import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import Card from '../../../components/common/Card.jsx';

function ModuleCard({ description, icon: Icon, nextStep, title, to }) {
  return (
    <Card className="module-card">
      <div className="module-card-top">
        {Icon && (
          <span className="module-icon" aria-hidden="true">
            <Icon size={24} />
          </span>
        )}
        <div>
          <h2>{title}</h2>
          {nextStep && <span>{nextStep}</span>}
        </div>
      </div>
      <p>{description}</p>
      <span className="module-code" aria-hidden="true">
        {title.slice(0, 3).toUpperCase()}
      </span>
      <Link className="button icon-button" to={to}>
        Entrar
        <ArrowRight size={20} aria-hidden="true" />
      </Link>
    </Card>
  );
}

export default ModuleCard;
