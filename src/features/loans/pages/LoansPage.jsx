import { AlertCircle, Banknote, Eye, HandCoins, RefreshCw } from 'lucide-react';
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

function getNumericValue(value) {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'object' && value !== null) {
    return getNumericValue(value.monto_min ?? value.monto ?? value.limite ?? value.tasa ?? value.porcentaje ?? value.cantidad);
  }

  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.replace(/[$,%\s]/g, '').replace(/,/g, '');
  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : null;
}

function formatAmount(value) {
  const numeric = getNumericValue(value);

  if (numeric === null) {
    return formatText(value);
  }

  return new Intl.NumberFormat('es-MX', {
    currency: 'MXN',
    maximumFractionDigits: 2,
    style: 'currency',
  }).format(numeric);
}

function formatPercent(value) {
  const numeric = getNumericValue(value);

  if (numeric === null) {
    return formatText(value);
  }

  return `${new Intl.NumberFormat('es-MX', { maximumFractionDigits: 2 }).format(numeric)}%`;
}

function formatTerm(value) {
  const text = formatText(value, '');

  if (!text) {
    return 'No definido';
  }

  return /\b(dia|dias|mes|meses|semana|semanas|quincena|quincenal|mensual|anual|ano|anos|year)\b/i.test(text)
    ? text
    : `${text} plazo`;
}

function PlanCardsSkeleton() {
  return (
    <div className="savings-plans-grid" aria-hidden="true">
      {[0, 1, 2].map((item) => (
        <article className="savings-plan-card savings-plan-skeleton" key={item}>
          <div className="skeleton-row">
            <span className="skeleton-icon" />
            <span className="skeleton-line skeleton-line-title" />
          </div>
          <span className="skeleton-line skeleton-line-short" />
          <div className="skeleton-card-metrics">
            <span />
            <span />
          </div>
        </article>
      ))}
    </div>
  );
}

function LoanPlanCard({ index, plan }) {
  const name = formatText(getValue(plan, ['nombre', 'name', 'titulo', 'title', 'plan', 'tipo']), `Plan ${index + 1}`);
  const description = formatText(getValue(plan, ['descripcion', 'description', 'detalle']), 'Plan disponible para iniciar una solicitud guiada.');
  const amount = getValue(plan, ['monto_minimo', 'monto_min', 'cantidad_minima', 'monto', 'limite']);
  const term = getValue(plan, ['plazo', 'periodo', 'tiempo', 'duracion', 'meses']);
  const rate = getValue(plan, ['tasa', 'tasa_interes', 'interes', 'porcentaje']);

  return (
    <article className="savings-plan-card motion-item motion-plan-card" tabIndex={0}>
      <div className="savings-plan-card-top">
        <span className="savings-plan-icon loan-card-icon" aria-hidden="true">
          <HandCoins size={22} />
        </span>
        <div>
          <h3>{name}</h3>
          <p>{description}</p>
        </div>
      </div>

      <div className="savings-plan-rate loan-plan-rate">
        <span>Tasa</span>
        <strong>{rate !== null ? formatPercent(rate) : 'No definido'}</strong>
      </div>

      <div className="savings-plan-summary">
        <span>
          <small>Monto disponible</small>
          <strong>{amount !== null ? formatAmount(amount) : 'No definido'}</strong>
        </span>
        <span>
          <small>Plazo</small>
          <strong>{term !== null ? formatTerm(term) : 'No definido'}</strong>
        </span>
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

      <section className="section-block savings-plans-section motion-immediate">
        <div className="section-heading savings-plans-heading">
          <div>
            <span>Opciones disponibles</span>
            <h2>Planes de prestamo</h2>
          </div>
        </div>
        {isLoading && <PlanCardsSkeleton />}
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
          <div className="savings-plans-grid">
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
