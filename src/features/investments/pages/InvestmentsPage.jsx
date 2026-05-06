import { ChartNoAxesColumnIncreasing } from 'lucide-react';
import PageHero from '../../../components/common/PageHero.jsx';
import InvestmentPlanCard from '../components/InvestmentPlanCard.jsx';
import InvestmentRequestForm from '../components/InvestmentRequestForm.jsx';

function InvestmentsPage() {
  return (
    <div className="page">
      <PageHero
        eyebrow="Inversion"
        icon={ChartNoAxesColumnIncreasing}
        stats={[
          { label: 'Planes', value: '2' },
          { label: 'Revision', value: 'Guiada' },
        ]}
        title="Compara planes antes de invertir"
      >
        Una vista mas enfocada para revisar opciones y dejar lista tu solicitud sin perder contexto.
      </PageHero>

      <section className="section-block plans-section">
        <div className="section-heading">
          <span>Comparador</span>
          <h2>Planes disponibles</h2>
        </div>
        <div className="grid grid-2">
          <InvestmentPlanCard name="Plan basico" description="Entrada simple para iniciar con una estructura controlada." />
          <InvestmentPlanCard name="Plan flexible" description="Opcion preparada para ajustar monto y condiciones cuando la API este lista." />
        </div>
      </section>

      <InvestmentRequestForm />
    </div>
  );
}

export default InvestmentsPage;
