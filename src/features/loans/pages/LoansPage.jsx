import { AlertCircle, Banknote, Eye, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { normalizeApiError } from '../../../api/apiUtils.js';
import Button from '../../../components/common/Button.jsx';
import FinancialRequestList from '../../../components/common/FinancialRequestList.jsx';
import PageHero from '../../../components/common/PageHero.jsx';
import UserRecordsModal from '../../../components/common/UserRecordsModal.jsx';
import useGrowcapPageMotion from '../../../hooks/useGrowcapPageMotion.js';
import LoanWizard from '../components/LoanWizard.jsx';
import { getLoanPlans, getLoans } from '../services/loanService.js';

function getValue(item, fields) {
  const field = fields.find((key) => item?.[key] !== undefined && item?.[key] !== null && item?.[key] !== '');
  return field ? item[field] : null;
}

function formatText(value, fallback = 'No definido') {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  if (typeof value === 'string' || typeof value === 'number') {
    return String(value);
  }

  if (typeof value === 'boolean') {
    return value ? 'Si' : 'No';
  }

  if (typeof value === 'object') {
    const readableValue = [value.nombre, value.label, value.name, value.titulo, value.title, value.tipo]
      .map((candidate) => formatText(candidate, ''))
      .find(Boolean);

    return readableValue || fallback;
  }

  return fallback;
}

function LoanPlanCard({ index, plan }) {
  const name = formatText(getValue(plan, ['nombre', 'name', 'titulo', 'title', 'plan', 'tipo']), `Plan ${index + 1}`);
  const amount = getValue(plan, ['monto_minimo', 'monto_min', 'cantidad_minima', 'monto', 'limite']);
  const term = getValue(plan, ['plazo', 'periodo', 'tiempo', 'duracion', 'meses']);
  const rate = getValue(plan, ['tasa', 'tasa_interes', 'interes', 'porcentaje']);

  return (
    <article className="plan-card motion-item">
      <h3>{name}</h3>
      <p>{formatText(getValue(plan, ['descripcion', 'description', 'detalle']), 'Plan disponible para iniciar una solicitud guiada.')}</p>
      <div className="loan-plan-details">
        {amount && <span>Monto {formatText(amount)}</span>}
        {term && <span>Plazo {formatText(term)}</span>}
        {rate && <span>Tasa {formatText(rate)}%</span>}
      </div>
    </article>
  );
}

function LoansPage() {
  const pageRef = useRef(null);
  const [loans, setLoans] = useState([]);
  const [plans, setPlans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [plansError, setPlansError] = useState('');
  const [isRecordsOpen, setIsRecordsOpen] = useState(false);

  useGrowcapPageMotion(pageRef);

  const loadLoansData = useCallback(async () => {
    setIsLoading(true);
    setError('');
    setPlansError('');

    try {
      const [plansResponse, loansResponse] = await Promise.all([
        getLoanPlans(),
        getLoans({ orden: 'fecha_desc' }),
      ]);

      setPlans(plansResponse.data);
      setLoans(loansResponse.data);
    } catch (requestError) {
      const normalized = normalizeApiError(requestError, 'No fue posible cargar prestamos y planes.');
      setError(normalized.message);
      setPlansError(normalized.message);
      setPlans([]);
      setLoans([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLoansData();
  }, [loadLoansData]);

  return (
    <div className="page loans-page motion-page" ref={pageRef}>
      <PageHero
        eyebrow="Prestamos"
        icon={Banknote}
        stats={[
          { label: 'Planes activos', value: isLoading ? '...' : String(plans.length) },
          { label: 'Solicitudes', value: isLoading ? '...' : String(loans.length) },
        ]}
        title="Solicita un prestamo con una ruta clara"
      >
        Avanza por monto, documentos y confirmacion en una solicitud guiada que evita saturar al usuario.
      </PageHero>

      <section className="section-block plans-section motion-immediate">
        <div className="section-heading">
          <span>Opciones disponibles</span>
          <h2>Planes de prestamo</h2>
        </div>
        {isLoading && <div className="loading">Cargando planes...</div>}
        {!isLoading && plansError && (
          <div className="savings-plans-state savings-plans-error" role="alert">
            <AlertCircle size={34} aria-hidden="true" />
            <div>
              <h3>No se pudieron cargar los planes</h3>
              <p>{plansError}</p>
            </div>
            <Button className="button-secondary icon-button" onClick={loadLoansData}>
              <RefreshCw size={18} aria-hidden="true" />
              Reintentar
            </Button>
          </div>
        )}
        {!isLoading && !plansError && plans.length === 0 && (
          <div className="savings-plans-state">
            <div>
              <h3>Aun no hay planes disponibles</h3>
              <p>Cuando haya planes de prestamo activos, apareceran aqui.</p>
            </div>
          </div>
        )}
        {!isLoading && !plansError && plans.length > 0 && (
          <div className="grid grid-2">
            {plans.map((plan, index) => (
              <LoanPlanCard key={plan?.id || plan?.id_prestamo || plan?.label || `loan-plan-${index}`} index={index} plan={plan} />
            ))}
          </div>
        )}
      </section>

      <section className="guided-request-section">
        {!plansError && <LoanWizard onCreated={loadLoansData} plans={plans} />}
      </section>

      <div className="records-entry motion-immediate">
        <div>
          <span>Seguimiento</span>
          <h2>Consulta prestamos y solicitudes existentes</h2>
          <p>Los registros quedan en un modal para mantener la pantalla principal enfocada en solicitar.</p>
        </div>
        <Button className="button-secondary icon-button records-entry-button" onClick={() => setIsRecordsOpen(true)}>
          <Eye size={18} aria-hidden="true" />
          Ver mis prestamos
        </Button>
      </div>

      <UserRecordsModal
        isOpen={isRecordsOpen}
        onClose={() => setIsRecordsOpen(false)}
        subtitle="Revisa monto solicitado, estado, plan, fecha, aval, documentos y acciones disponibles."
        title="Mis prestamos"
      >
        <FinancialRequestList
          emptyDescription="Cuando completes una solicitud, aparecera aqui."
          emptyTitle="Aun no tienes prestamos registrados."
          error={error}
          isLoading={isLoading}
          items={loans}
          onRefresh={loadLoansData}
          searchable
          title="Historial de prestamos"
          type="loans"
        />
      </UserRecordsModal>
    </div>
  );
}

export default LoansPage;
