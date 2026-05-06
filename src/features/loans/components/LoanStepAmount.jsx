import Input from '../../../components/common/Input.jsx';

function LoanStepAmount() {
  return (
    <div className="step">
      <h3>Monto del prestamo</h3>
      <p>Indica cuanto necesitas. El plazo se puede ajustar despues.</p>
      <div className="form">
        <Input id="loan-amount" label="Monto solicitado" name="amount" type="number" />
        <Input id="loan-term" label="Plazo" name="term" placeholder="Ej. 12 meses" />
      </div>
    </div>
  );
}

export default LoanStepAmount;
