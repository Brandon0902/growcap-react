import { ArrowRight } from 'lucide-react';
import Button from './Button.jsx';
import Card from './Card.jsx';

function RequestStartCard({
  buttonLabel = 'Iniciar solicitud',
  children,
  description = 'Te guiaremos paso a paso para completar tu solicitud.',
  disabled = false,
  onStart,
  title,
}) {
  return (
    <Card className="request-start-card motion-immediate">
      <div>
        <span className="request-start-kicker">Solicitud guiada</span>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {children}
      <Button className="request-start-button" disabled={disabled} onClick={onStart}>
        {buttonLabel}
        <ArrowRight size={20} aria-hidden="true" />
      </Button>
    </Card>
  );
}

export default RequestStartCard;
