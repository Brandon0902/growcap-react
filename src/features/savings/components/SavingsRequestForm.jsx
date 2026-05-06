import Button from '../../../components/common/Button.jsx';
import Card from '../../../components/common/Card.jsx';
import Input from '../../../components/common/Input.jsx';

function SavingsRequestForm() {
  return (
    <Card>
      <h2>Solicitud de ahorro</h2>
      <p className="section-help">Completa estos datos cuando quieras preparar una solicitud.</p>
      <form className="form">
        <Input id="savings-amount" label="Monto a ahorrar" name="amount" type="number" />
        <Input id="savings-frequency" label="Frecuencia" name="frequency" placeholder="Ej. semanal" />
        <Button type="button">Preparar solicitud</Button>
      </form>
    </Card>
  );
}

export default SavingsRequestForm;
