import { Banknote, ChartNoAxesColumnIncreasing, HandCoins } from 'lucide-react';
import PageHero from '../../../components/common/PageHero.jsx';
import ModuleCard from '../components/ModuleCard.jsx';
import SummaryCard from '../components/SummaryCard.jsx';

function DashboardPage() {
  return (
    <div className="page">
      <PageHero
        eyebrow="Panel principal"
        stats={[
          { label: 'Modulos activos', value: '3' },
          { label: 'Estado', value: 'Listo' },
        ]}
        title="Tu centro financiero de empleados"
      >
        Revisa ahorro, inversion y prestamos desde una mesa de control pensada para empleados.
      </PageHero>

      <section className="summary-ledger" aria-label="Resumen financiero">
        <SummaryCard icon={HandCoins} label="Ahorro" value="$0.00" />
        <SummaryCard icon={ChartNoAxesColumnIncreasing} label="Inversion" value="$0.00" />
        <SummaryCard icon={Banknote} label="Prestamos" value="Sin solicitudes" />
      </section>

      <section className="operations-board">
        <div className="section-heading">
          <span>Accesos rapidos</span>
          <h2>Operaciones principales</h2>
        </div>
        <div className="module-list">
          <ModuleCard
            description="Revisa tu ahorro y prepara una solicitud sencilla."
            icon={HandCoins}
            nextStep="Consulta y solicitud"
            title="Ahorro"
            to="/ahorro"
          />
          <ModuleCard
            description="Compara planes antes de preparar tu solicitud."
            icon={ChartNoAxesColumnIncreasing}
            nextStep="Planes disponibles"
            title="Inversion"
            to="/inversion"
          />
          <ModuleCard
            description="Avanza paso a paso con datos claros."
            icon={Banknote}
            nextStep="Solicitud guiada"
            title="Prestamos"
            to="/prestamos"
          />
        </div>
      </section>
    </div>
  );
}

export default DashboardPage;
