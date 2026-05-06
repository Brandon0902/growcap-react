import { HandCoins } from 'lucide-react';
import Card from '../../../components/common/Card.jsx';
import PageHero from '../../../components/common/PageHero.jsx';
import SavingsRequestForm from '../components/SavingsRequestForm.jsx';

function SavingsPage() {
  return (
    <div className="page">
      <PageHero
        eyebrow="Ahorro"
        icon={HandCoins}
        stats={[
          { label: 'Saldo actual', value: '$0.00' },
          { label: 'Solicitud', value: 'Disponible' },
        ]}
        title="Gestiona tu ahorro con mayor control"
      >
        Consulta tu posicion actual y prepara una solicitud con datos limpios para revision interna.
      </PageHero>

      <Card className="insight-card">
        <h2>Resumen de ahorro</h2>
        <div className="insight-grid">
          <div>
            <span className="metric-label">Saldo estimado</span>
            <strong className="metric-value">$0.00</strong>
          </div>
          <div>
            <span className="metric-label">Movimientos</span>
            <strong className="metric-value">Pendiente</strong>
          </div>
          <div>
            <span className="metric-label">Planes</span>
            <strong className="metric-value">Por conectar</strong>
          </div>
        </div>
      </Card>

      <SavingsRequestForm />
    </div>
  );
}

export default SavingsPage;
