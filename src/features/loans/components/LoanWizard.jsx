import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import Button from '../../../components/common/Button.jsx';
import LoanStepAmount from './LoanStepAmount.jsx';
import LoanStepDocuments from './LoanStepDocuments.jsx';
import LoanStepConfirmation from './LoanStepConfirmation.jsx';

const steps = [
  { label: 'Monto', component: LoanStepAmount },
  { label: 'Documentos', component: LoanStepDocuments },
  { label: 'Confirmar', component: LoanStepConfirmation },
];

function LoanWizard() {
  const [currentStep, setCurrentStep] = useState(0);
  const CurrentStepComponent = steps[currentStep].component;
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;

  return (
    <div className="wizard">
      <ol className="stepper" aria-label="Progreso de solicitud">
        {steps.map((step, index) => (
          <li
            className={index <= currentStep ? 'stepper-item active' : 'stepper-item'}
            key={step.label}
          >
            <span aria-hidden="true">
              {index < currentStep ? <CheckCircle2 size={18} /> : index + 1}
            </span>
            {step.label}
          </li>
        ))}
      </ol>
      <CurrentStepComponent />
      <div className="wizard-actions">
        <Button
          className="button-secondary"
          disabled={isFirstStep}
          onClick={() => setCurrentStep((step) => step - 1)}
        >
          Anterior
        </Button>
        <Button
          onClick={() => {
            if (!isLastStep) {
              setCurrentStep((step) => step + 1);
            }
          }}
        >
          {isLastStep ? 'Finalizar' : 'Siguiente'}
        </Button>
      </div>
    </div>
  );
}

export default LoanWizard;
