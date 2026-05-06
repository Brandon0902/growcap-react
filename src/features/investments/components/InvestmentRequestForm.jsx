import Button from '../../../components/common/Button.jsx';
import Card from '../../../components/common/Card.jsx';
import Input from '../../../components/common/Input.jsx';

function InvestmentRequestForm() {
  return (
    <Card>
      <h2>Solicitud de inversion</h2>
      <p className="section-help">Primero elige un plan, despues indica el monto.</p>
      <form className="form">
        <Input id="investment-amount" label="Monto a invertir" name="amount" type="number" />
        <Input id="investment-plan" label="Plan elegido" name="plan" />
        <Button type="button">Preparar solicitud</Button>
      </form>
    </Card>
  );
}

export default InvestmentRequestForm;
