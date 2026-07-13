import { AlertCircle, ChartNoAxesColumnIncreasing, Eye, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { normalizeApiError } from '../../../api/apiUtils.js';
import Alert from '../../../components/common/Alert.jsx';
import Button from '../../../components/common/Button.jsx';
import FinancialRequestList from '../../../components/common/FinancialRequestList.jsx';
import PageHero from '../../../components/common/PageHero.jsx';
import UserRecordsModal from '../../../components/common/UserRecordsModal.jsx';
import useGrowcapPageMotion from '../../../hooks/useGrowcapPageMotion.js';
import InvestmentPlanCard from '../components/InvestmentPlanCard.jsx';
import InvestmentRequestForm from '../components/InvestmentRequestForm.jsx';
import { parseStripeReturn } from '../../payments/services/stripeReturn.js';
import {
  confirmInvestmentCheckout,
  deleteInvestmentRequest,
  getInvestmentPlans,
  getInvestments,
} from '../services/investmentService.js';

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

function InvestmentsPage() {
  const pageRef = useRef(null);
  const handledStripeReturnRef = useRef('');
  const [searchParams, setSearchParams] = useSearchParams();
  const [investments, setInvestments] = useState([]);
  const [plans, setPlans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [checkoutNotice, setCheckoutNotice] = useState({ message: '', type: 'info' });
  const [isRecordsOpen, setIsRecordsOpen] = useState(false);

  useGrowcapPageMotion(pageRef);

  const loadInvestmentsData = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      const [plansResponse, investmentsResponse] = await Promise.all([
        getInvestmentPlans(),
        getInvestments({ orden: 'fecha_desc' }),
      ]);

      setPlans(plansResponse.data);
      setInvestments(investmentsResponse.data);
    } catch (requestError) {
      const normalized = normalizeApiError(requestError, 'No fue posible cargar inversiones y planes.');
      setError(normalized.message);
      setPlans([]);
      setInvestments([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInvestmentsData();
  }, [loadInvestmentsData]);

  useEffect(() => {
    const stripeReturn = parseStripeReturn(searchParams, 'inversion_id');
    const returnKey = searchParams.toString();

    if (!stripeReturn.hasReturn || handledStripeReturnRef.current === returnKey) {
      return;
    }

    handledStripeReturnRef.current = returnKey;
    setSearchParams({}, { replace: true });
    setCheckoutNotice({ message: 'Verificando el resultado directamente con Stripe...', type: 'info' });

    const handleStripeReturn = async () => {
      try {
        if (stripeReturn.isCanceled) {
          if (stripeReturn.entityId) {
            try {
              await deleteInvestmentRequest(stripeReturn.entityId);
            } catch (cleanupError) {
              if (cleanupError?.response?.status !== 404) {
                throw cleanupError;
              }
            }
          }

          setCheckoutNotice({
            message: 'Pago cancelado. La solicitud pendiente no fue registrada.',
            type: 'error',
          });
        } else {
          if (!stripeReturn.entityId || !stripeReturn.sessionId) {
            throw new Error('El retorno de Stripe no incluye los datos necesarios para confirmar el pago.');
          }

          await confirmInvestmentCheckout(stripeReturn.entityId, stripeReturn.sessionId);
          setCheckoutNotice({
            message: 'Pago confirmado por Stripe. Tu inversion ya esta activa.',
            type: 'success',
          });
        }
      } catch (returnError) {
        const normalized = normalizeApiError(returnError, 'No fue posible confirmar el resultado del pago.');
        setCheckoutNotice({ message: normalized.message, type: 'error' });
      } finally {
        loadInvestmentsData();
      }
    };

    handleStripeReturn();
  }, [loadInvestmentsData, searchParams, setSearchParams]);

  return (
    <div className="page investments-page motion-page" ref={pageRef}>
      <PageHero
        eyebrow="Inversion"
        icon={ChartNoAxesColumnIncreasing}
        stats={[
          { label: 'Planes', value: isLoading ? '...' : String(plans.length) },
          { label: 'Solicitudes', value: isLoading ? '...' : String(investments.length) },
        ]}
        title="Compara planes antes de invertir"
      >
        Una vista mas enfocada para revisar opciones y dejar lista tu solicitud sin perder contexto.
      </PageHero>

      {checkoutNotice.message && <Alert type={checkoutNotice.type}>{checkoutNotice.message}</Alert>}

      <section className="section-block savings-plans-section motion-immediate">
        <div className="section-heading savings-plans-heading">
          <div>
            <span>Comparador</span>
            <h2>Planes disponibles</h2>
          </div>
        </div>
        {isLoading && <PlanCardsSkeleton />}
        {!isLoading && error && (
          <div className="savings-plans-state savings-plans-error" role="alert">
            <AlertCircle size={34} aria-hidden="true" />
            <div>
              <h3>No se pudieron cargar los planes</h3>
              <p>{error}</p>
            </div>
            <Button className="button-secondary icon-button" onClick={loadInvestmentsData}>
              <RefreshCw size={18} aria-hidden="true" />
              Reintentar
            </Button>
          </div>
        )}
        {!isLoading && !error && plans.length === 0 && (
          <div className="savings-plans-state">
            <div>
              <h3>Aun no hay planes disponibles</h3>
              <p>Cuando haya planes de inversion activos, apareceran aqui.</p>
            </div>
          </div>
        )}
        {!isLoading && !error && plans.length > 0 && (
          <div className="savings-plans-grid">
            {plans.map((plan, index) => (
              <InvestmentPlanCard key={plan?.id || plan?.id_inversion || plan?.label || `investment-plan-${index}`} plan={plan} />
            ))}
          </div>
        )}
      </section>

      <InvestmentRequestForm onCreated={loadInvestmentsData} plans={plans} />

      <div className="records-entry motion-immediate">
        <div>
          <span>Seguimiento</span>
          <h2>Consulta tus inversiones sin saturar la vista</h2>
          <p>El historial queda disponible en un modal con estados de pago y datos clave.</p>
        </div>
        <Button className="button-secondary icon-button records-entry-button" onClick={() => setIsRecordsOpen(true)}>
          <Eye size={18} aria-hidden="true" />
          Ver mis inversiones
        </Button>
      </div>

      <UserRecordsModal
        isOpen={isRecordsOpen}
        onClose={() => setIsRecordsOpen(false)}
        subtitle="Consulta monto invertido, plan, rendimiento, fecha y estado de pago."
        title="Mis inversiones"
      >
        <FinancialRequestList
          emptyDescription="Cuando completes una solicitud, aparecera aqui."
          emptyTitle="Aun no tienes inversiones registradas."
          error={error}
          isLoading={isLoading}
          items={investments}
          onRefresh={loadInvestmentsData}
          searchable
          title="Historial de inversiones"
          type="investments"
        />
      </UserRecordsModal>
    </div>
  );
}

export default InvestmentsPage;
