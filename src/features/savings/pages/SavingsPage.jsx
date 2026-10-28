import { AlertCircle, HelpCircle, ChevronUp, Eye, EyeOff, HandCoins, History, PiggyBank, RefreshCw, TrendingUp } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import { normalizeApiError } from '../../../api/apiUtils.js';

import Alert from '../../../components/common/Alert.jsx';
import Button from '../../../components/common/Button.jsx';
import FinancialRequestList from '../../../components/common/FinancialRequestList.jsx';
import PageHero from '../../../components/common/PageHero.jsx';
import useGrowcapPageMotion from '../../../hooks/useGrowcapPageMotion.js';
import SavingsPlanCard from '../components/SavingsPlanCard.jsx';
import SavingsRequestForm from '../components/SavingsRequestForm.jsx';
import PlansHelpModal from '../../../components/common/PlansHelpModal.jsx';
import SavingsProjectionModal from '../components/SavingsProjectionModal.jsx';
import { formatCurrency } from '../../../utils/formatCurrency.js';
import { parseStripeReturn } from '../../payments/services/stripeReturn.js';
import {
  confirmMercadoPago,
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
  const recordsRef = useRef(null);
  const handledStripeReturnRef = useRef('');
  const handledMpReturnRef = useRef('');
  const [searchParams, setSearchParams] = useSearchParams();
  const [plans, setPlans] = useState([]);
  const [savings, setSavings] = useState([]);
  const [suggestedFrequency, setSuggestedFrequency] = useState('');
  const [salaryCapacity, setSalaryCapacity] = useState(null);
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);
  const [plansError, setPlansError] = useState('');
  const [savingsError, setSavingsError] = useState('');
  const [checkoutNotice, setCheckoutNotice] = useState({ message: '', type: 'info' });
  const [activeTab, setActiveTab] = useState(() => {
    const viewParam = searchParams.get('view');
    const tabParam = searchParams.get('tab');
    return viewParam === 'my-records' || tabParam === 'records' ? 'records' : 'plans';
  });
  const [isPlanProjectionOpen, setIsPlanProjectionOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [selectedPlanToProject, setSelectedPlanToProject] = useState(null);

  const activePlans = useMemo(() => {
    return (plans || []).filter((p) => Number(p?.status ?? 1) === 1);
  }, [plans]);

  const savingsMetrics = useMemo(() => {
    let totalAhorrado = 0;
    let totalDisponible = 0;

    for (const item of savings) {
      const sTotal = Number(item.monto_ahorro ?? item.saldo ?? item.cantidad ?? 0);
      const sDisp = Number(item.saldo_disponible ?? (item.en_ventana_retiro ? sTotal : 0));
      totalAhorrado += sTotal;
      totalDisponible += sDisp;
    }

    return { totalAhorrado, totalDisponible };
  }, [savings]);

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

      const freqData = frequencyResponse?.data?.data || frequencyResponse?.data;
      setSuggestedFrequency(
        freqData?.frecuencia_pago
          || freqData?.frecuencia
          || '',
      );

      if (freqData && (freqData.salario_periodico !== undefined || freqData.capacidad_disponible !== undefined)) {
        setSalaryCapacity({
          salario_mensual: Number(freqData.salario_mensual ?? 0),
          salario_periodico: Number(freqData.salario_periodico ?? 0),
          limite_porcentaje: Number(freqData.limite_porcentaje ?? 50),
          max_cuota_permitida: Number(freqData.max_cuota_permitida ?? 0),
          cuota_comprometida: Number(freqData.cuota_comprometida ?? 0),
          capacidad_disponible: Number(freqData.capacidad_disponible ?? 0),
        });
      }
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
    const viewParam = searchParams.get('view');
    const tabParam = searchParams.get('tab');
    if (viewParam === 'my-records' || tabParam === 'records') {
      setActiveTab('records');
    } else if (viewParam === 'plans' || tabParam === 'plans' || (!viewParam && !tabParam)) {
      setActiveTab('plans');
    }
  }, [searchParams]);

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

  useEffect(() => {
    const collectionId = searchParams.get('collection_id');
    const paymentId = searchParams.get('payment_id') || collectionId;
    const mpStatus = searchParams.get('status') || searchParams.get('collection_status') || searchParams.get('mp_status');
    const externalReference = searchParams.get('external_reference');
    const preferenceId = searchParams.get('preference_id');

    if (!paymentId && !externalReference && !mpStatus) {
      return;
    }

    const returnKey = searchParams.toString();
    if (handledMpReturnRef.current === returnKey) {
      return;
    }
    handledMpReturnRef.current = returnKey;

    // Limpiar query params de la URL para evitar ejecuciones repetidas
    setSearchParams({}, { replace: true });

    const handleMpReturn = async () => {
      setCheckoutNotice({ message: 'Verificando y acreditando tu pago con Mercado Pago...', type: 'info' });

      try {
        const res = await confirmMercadoPago({
          payment_id: paymentId,
          collection_id: collectionId,
          status: mpStatus,
          external_reference: externalReference,
          preference_id: preferenceId,
        });

        if (res?.acreditado || res?.ok) {
          const montoStr = res.monto_acreditado ? ` por $${Number(res.monto_acreditado).toFixed(2)} MXN` : '';
          setCheckoutNotice({
            message: `¡Pago confirmado por Mercado Pago! Tu aportación voluntaria${montoStr} fue acreditada automáticamente en tu meta de ahorro.`,
            type: 'success',
          });
          setActiveTab('records');
        } else if (res?.status === 'rejected' || res?.status === 'cancelled') {
          setCheckoutNotice({
            message: 'El pago no fue aprobado o fue rechazado por Mercado Pago. Tu saldo no fue modificado.',
            type: 'error',
          });
        } else {
          setCheckoutNotice({
            message: 'Tu pago está en proceso de verificación por Mercado Pago. Se reflejará automáticamente en cuanto sea completado.',
            type: 'info',
          });
        }
      } catch (error) {
        const normalized = normalizeApiError(error, 'No fue posible confirmar automáticamente el pago de Mercado Pago.');
        setCheckoutNotice({ message: normalized.message, type: 'error' });
      } finally {
        loadSavingsPlans();
      }
    };

    handleMpReturn();
  }, [loadSavingsPlans, searchParams, setSearchParams]);



  const requestFormRef = useRef(null);

  const handlePlanClick = (plan) => {
    if (Number(plan?.status) === 0 || plan?.status === false) {
      return;
    }
    const planId = plan?.ahorro_id || plan?.id_ahorro || plan?.id || plan?.id_plan;
    if (requestFormRef.current && planId) {
      requestFormRef.current.openWithPlan(planId);
    }
  };

  return (
    <div className="page savings-page motion-page" ref={pageRef}>
      <PageHero
        eyebrow="Ahorro"
        icon={HandCoins}
        stats={[
          { label: 'Total en Ahorro', value: isLoadingPlans ? '...' : formatCurrency(savingsMetrics.totalAhorrado) },
          { label: 'Saldo Disponible', value: isLoadingPlans ? '...' : formatCurrency(savingsMetrics.totalDisponible) },
        ]}
        title="Haz crecer tu dinero con GrowCap"
      />

      {checkoutNotice.message && <Alert type={checkoutNotice.type}>{checkoutNotice.message}</Alert>}

      {/* Segmented Top Navigation */}
      <div className="module-nav-tabs" role="tablist" aria-label="Secciones de Ahorro">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'records'}
          className={`module-nav-btn ${activeTab === 'records' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('records');
            setSearchParams({ tab: 'records' });
          }}
        >
          <Eye size={16} />
          <span>Mis ahorros activos</span>
          <span className={`module-nav-badge ${activeTab === 'records' ? 'active' : 'inactive'}`}>
            {savings.length}
          </span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'plans'}
          className={`module-nav-btn ${activeTab === 'plans' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('plans');
            setSearchParams({ tab: 'plans' });
          }}
        >
          <PiggyBank size={16} />
          <span>Planes y solicitud</span>
          <span className={`module-nav-badge ${activeTab === 'plans' ? 'active' : 'inactive'}`}>
            {activePlans.length}
          </span>
        </button>
      </div>

      {activeTab === 'records' && (
        <section className="section-block records-main-section motion-immediate" ref={recordsRef}>
          <FinancialRequestList
            emptyDescription="Cuando completes una solicitud de ahorro, aparecerá aquí."
            emptyTitle="Aún no tienes ahorros registrados."
            error={savingsError}
            isLoading={isLoadingPlans}
            items={savings}
            plans={plans}
            suggestedFrequency={suggestedFrequency}
            salaryCapacity={salaryCapacity}
            onRefresh={loadSavingsPlans}
            searchable
            title=""
            type="savings"
          />
        </section>
      )}

      {activeTab === 'plans' && (
        <>
          <section className="section-block savings-plans-section motion-section" ref={plansRef}>
            <div className="section-heading savings-plans-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ margin: 0 }}>Planes de ahorro</h2>
                <button
                  type="button"
                  className="plan-help-btn"
                  onClick={() => setIsHelpModalOpen(true)}
                  aria-label="Conoce cómo funciona cada plan de ahorro"
                  title="Conoce cómo funciona cada plan"
                >
                  <HelpCircle size={15} />
                </button>
              </div>
              {activePlans.length > 0 && (
                <Button
                  className="button-secondary icon-button"
                  style={{ fontSize: '0.8rem', minHeight: '34px', padding: '6px 14px' }}
                  onClick={() => {
                    setSelectedPlanToProject(null);
                    setIsPlanProjectionOpen(true);
                  }}
                  title="Simula y proyecta tus ganancias antes de contratar un plan"
                >
                  <TrendingUp size={16} aria-hidden="true" />
                  Simular Proyección
                </Button>
              )}
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

            {!isLoadingPlans && !plansError && activePlans.length === 0 && (
              <div className="savings-plans-state">
                <PiggyBank size={38} aria-hidden="true" />
                <div>
                  <h3>Aun no hay planes disponibles</h3>
                  <p>Cuando caja_growcap tenga planes de ahorro activos, apareceran aqui automaticamente.</p>
                </div>
              </div>
            )}

            {!isLoadingPlans && !plansError && activePlans.length > 0 && (
              <div className="savings-plans-grid">
                {activePlans.map((plan, index) => {
                  const hasActivePlan = savings.some(
                    (s) =>
                      (Number(s.status) === 1 || String(s.estado ?? '').toLowerCase().includes('activ')) &&
                      (String(s.ahorro_id) === String(plan.id) ||
                        String(s.id_ahorro) === String(plan.id) ||
                        String(s.plan?.id) === String(plan.id)),
                  );
                  return (
                    <SavingsPlanCard 
                      index={index} 
                      key={getSavingsPlanKey(plan, index)} 
                      plan={plan} 
                      onClick={handlePlanClick}
                      disabled={hasActivePlan}
                    />
                  );
                })}
              </div>
            )}
          </section>

          <PlansHelpModal
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
        title="Información de Planes de Ahorro"
        type="savings"
        plans={activePlans.length > 0 ? activePlans : plans}
      />
      <SavingsRequestForm
            ref={requestFormRef}
            onCreated={() => {
              loadSavingsPlans();
              setActiveTab('records');
              setSearchParams({ tab: 'records' });
            }}
            plans={activePlans}
            suggestedFrequency={suggestedFrequency}
            salaryCapacity={salaryCapacity}
          />

          <div className="records-entry motion-immediate">
            <div>
              <span>Seguimiento</span>
              <h2>¿Ya tienes ahorros activos?</h2>
              <p>Consulta cuotas, estados de cuenta, aportaciones voluntarias y retiros.</p>
            </div>
            <Button
              className="button-secondary icon-button records-entry-button"
              onClick={() => {
                setActiveTab('records');
                setSearchParams({ tab: 'records' });
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              <Eye size={18} aria-hidden="true" />
              Ver mis ahorros ({savings.length})
            </Button>
          </div>
        </>
      )}

      {isPlanProjectionOpen && createPortal(
        <SavingsProjectionModal
          items={savings}
          plans={plans}
          isOpen={isPlanProjectionOpen}
          initialMode="plans"
          initialId={selectedPlanToProject}
          suggestedFrequency={suggestedFrequency}
          salaryCapacity={salaryCapacity}
          onClose={() => {
            setIsPlanProjectionOpen(false);
            setSelectedPlanToProject(null);
          }}
          onSelectPlan={(plan, cuota) => {
            const planId = plan?.ahorro_id || plan?.id_ahorro || plan?.id || plan?.id_plan;
            if (requestFormRef.current && planId) {
              requestFormRef.current.openWithPlan(planId, cuota);
            }
          }}
        />,
        document.body
      )}
    </div>
  );
}

export default SavingsPage;
