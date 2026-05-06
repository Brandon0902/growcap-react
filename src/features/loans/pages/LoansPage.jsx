import { Banknote } from 'lucide-react';
import Card from '../../../components/common/Card.jsx';
import PageHero from '../../../components/common/PageHero.jsx';
import LoanWizard from '../components/LoanWizard.jsx';

function LoansPage() {
  return (
    <div className="page">
      <PageHero
        eyebrow="Prestamos"
        icon={Banknote}
        stats={[
          { label: 'Pasos', value: '3' },
          { label: 'Captura', value: 'Por partes' },
        ]}
        title="Solicita un prestamo con una ruta clara"
      >
        Avanza por monto, documentos y confirmacion en una solicitud guiada que evita saturar al usuario.
      </PageHero>

      <Card className="wizard-card">
        <h2>Solicitud guiada</h2>
        <LoanWizard />
      </Card>
    </div>
  );
}

export default LoansPage;
