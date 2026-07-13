import { AlertCircle, Eye, HandCoins, PiggyBank, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { normalizeApiError } from '../../../api/apiUtils.js';
import { gsap, useGSAP } from '../../../animations/gsapSetup.js';
import Alert from '../../../components/common/Alert.jsx';
import Button from '../../../components/common/Button.jsx';
import FinancialRequestList from '../../../components/common/FinancialRequestList.jsx';
import PageHero from '../../../components/common/PageHero.jsx';
import UserRecordsModal from '../../../components/common/UserRecordsModal.jsx';
import useGrowcapPageMotion from '../../../hooks/useGrowcapPageMotion.js';
import SavingsPlanCard from '../components/SavingsPlanCard.jsx';
import SavingsRequestForm from '../components/SavingsRequestForm.jsx';
import { parseStripeReturn } from '../../payments/services/stripeReturn.js';
import {
  confirmSavingsCheckout,
  deleteSavingsRequest,
  getSavings,
  getSavingsFrequency,
  getSavingsPlans,
} from '../services/savingsService.js';

function getSavingsPlansError(error) {
  const status = error?.response?.status;
  const data = error?.response?.data;

  if (status === 401) {
    return 'Tu sesion no esta autorizada para consultar planes. Inicia sesion nuevamente.';
  }

  if (status === 403) {
    return 'No tienes permisos para consultar los planes de ahorro.';
  }

  return data?.message || data?.error || 'No fue posible cargar los planes de ahorro.';
}

function SavingsPlansSkeleton() {
  return (
    <div className="savings-plans-grid" aria-hidden="true">
      {[0, 1, 2].map((item) => (
        <article className="savings-plan-card savings-plan-skeleton" key={item}>
          <div className="skeleton-row">
            <span className="skeleton-icon" />
            <span className="skeleton-line skeleton-line-title" />
          </div>
          <span className="skeleton-line" />
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

function getSavingsPlanKey(plan, index) {
  return plan?.id || plan?.id_ahorro || plan?.ahorro_id || plan?.label || `savings-plan-${index}`;
}

function SavingsPage() {
  const pageRef = useRef(null);
  const plansRef = useRef(null);
  const handledStripeReturnRef = useRef('');
  const [searchParams, setSearchParams] = useSearchParams();
  const [plans, setPlans] = useState([]);
  const [savings, setSavings] = useState([]);
  const [suggestedFrequency, setSuggestedFrequency] = useState('');
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);
  const [plansError, setPlansError] = useState('');
  const [savingsError, setSavingsError] = useState('');
  const [checkoutNotice, setCheckoutNotice] = useState({ message: '', type: 'info' });
  const [isRecordsOpen, setIsRecordsOpen] = useState(false);

  useGrowcapPageMotion(pageRef);

  const loadSavingsPlans = useCallback(async () => {
    setIsLoadingPlans(true);
    setPlansError('');
    setSavingsError('');

    try {
      const [plansResponse, savingsResponse, frequencyResponse] = await Promise.all([
        getSavingsPlans(),
        getSavings({ orden: 'fecha_desc' }),
        getSavingsFrequency().catch(() => null),
      ]);

      setPlans(plansResponse.data);
      setSavings(savingsResponse.data);
      setSuggestedFrequency(
        frequencyResponse?.data?.frecuencia_pago
          || frequencyResponse?.data?.data?.frecuencia_pago
          || frequencyResponse?.data?.frecuencia
          || '',
      );
    } catch (error) {
      const normalized = normalizeApiError(error, 'No fue posible cargar ahorros y planes.');
      setPlans([]);
      setSavings([]);
      setPlansError(getSavingsPlansError(error));
      setSavingsError(normalized.message);
    } finally {
      setIsLoadingPlans(false);
    }
  }, []);

  useEffect(() => {
    loadSavingsPlans();
  }, [loadSavingsPlans]);

  useEffect(() => {
    const stripeReturn = parseStripeReturn(searchParams, 'ahorro_id');
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
          if (stripeReturn.entityId && stripeReturn.action === 'create') {
            try {
              await deleteSavingsRequest(stripeReturn.entityId);
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

          await confirmSavingsCheckout(stripeReturn.entityId, stripeReturn.sessionId);
          setCheckoutNotice({
            message: 'Pago confirmado por Stripe. Tu ahorro ya esta activo.',
            type: 'success',
          });
        }
      } catch (returnError) {
        const normalized = normalizeApiError(returnError, 'No fue posible confirmar el resultado del pago.');
        setCheckoutNotice({ message: normalized.message, type: 'error' });
      } finally {
        loadSavingsPlans();
      }
    };

    handleStripeReturn();
  }, [loadSavingsPlans, searchParams, setSearchParams]);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const cards = gsap.utils.toArray('.motion-plan-card');

        if (!cards.length) {
          return;
        }

        gsap.from(cards, {
          autoAlpha: 0,
          y: 24,
          scale: 0.965,
          duration: 0.58,
          ease: 'power3.out',
          stagger: 0.09,
        });
      });

      return () => mm.revert();
    },
    { dependencies: [plans, isLoadingPlans], scope: plansRef, revertOnUpdate: true },
  );

  return (
    <div className="page savings-page motion-page" ref={pageRef}>
      <PageHero
        eyebrow="Ahorro"
        icon={HandCoins}
        stats={[
          { label: 'Planes activos', value: isLoadingPlans ? '...' : String(plans.length) },
          { label: 'Solicitudes', value: isLoadingPlans ? '...' : String(savings.length) },
        ]}
        title="Elige un plan de ahorro con claridad"
      >
        Consulta las opciones activas desde caja_growcap y compara cada plan con una vista limpia y enfocada.
      </PageHero>

      {checkoutNotice.message && <Alert type={checkoutNotice.type}>{checkoutNotice.message}</Alert>}

      <section className="section-block savings-plans-section motion-section" ref={plansRef}>
        <div className="section-heading savings-plans-heading">
          <div>
            <span>Catalogo conectado</span>
            <h2>Planes de ahorro</h2>
          </div>
        </div>

        {isLoadingPlans && <SavingsPlansSkeleton />}

        {!isLoadingPlans && plansError && (
          <div className="savings-plans-state savings-plans-error" role="alert">
            <AlertCircle size={34} aria-hidden="true" />
            <div>
              <h3>No se pudieron cargar los planes</h3>
              <p>{plansError}</p>
            </div>
            <Button className="button-secondary icon-button" onClick={loadSavingsPlans}>
              <RefreshCw size={18} aria-hidden="true" />
              Reintentar
            </Button>
          </div>
        )}

        {!isLoadingPlans && !plansError && plans.length === 0 && (
          <div className="savings-plans-state">
            <PiggyBank size={38} aria-hidden="true" />
            <div>
              <h3>Aun no hay planes disponibles</h3>
              <p>Cuando caja_growcap tenga planes de ahorro activos, apareceran aqui automaticamente.</p>
            </div>
          </div>
        )}

        {!isLoadingPlans && !plansError && plans.length > 0 && (
          <div className="savings-plans-grid">
            {plans.map((plan, index) => (
              <SavingsPlanCard index={index} key={getSavingsPlanKey(plan, index)} plan={plan} />
            ))}
          </div>
        )}
      </section>

      <SavingsRequestForm
        onCreated={loadSavingsPlans}
        plans={plans}
        suggestedFrequency={suggestedFrequency}
      />

      <div className="records-entry motion-immediate">
        <div>
          <span>Seguimiento</span>
          <h2>Consulta tus ahorros cuando lo necesites</h2>
          <p>Los registros existentes se mantienen separados para que la solicitud sea la accion principal.</p>
        </div>
        <Button className="button-secondary icon-button records-entry-button" onClick={() => setIsRecordsOpen(true)}>
          <Eye size={18} aria-hidden="true" />
          Ver mis ahorros
        </Button>
      </div>

      <UserRecordsModal
        isOpen={isRecordsOpen}
        onClose={() => setIsRecordsOpen(false)}
        subtitle="Revisa cuotas, saldos, fechas, metodo de pago y estado de cada solicitud."
        title="Mis ahorros"
      >
        <FinancialRequestList
          emptyDescription="Cuando completes una solicitud, aparecera aqui."
          emptyTitle="Aun no tienes ahorros registrados."
          error={savingsError}
          isLoading={isLoadingPlans}
          items={savings}
          onRefresh={loadSavingsPlans}
          searchable
          title="Historial de ahorros"
          type="savings"
        />
      </UserRecordsModal>
    </div>
  );
}

export default SavingsPage;
