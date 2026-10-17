import { AlertCircle, ChartNoAxesColumnIncreasing, ChevronUp, Eye, History, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { normalizeApiError } from '../../../api/apiUtils.js';
import Alert from '../../../components/common/Alert.jsx';
import Button from '../../../components/common/Button.jsx';
import FinancialRequestList from '../../../components/common/FinancialRequestList.jsx';
import PageHero from '../../../components/common/PageHero.jsx';
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
  const recordsRef = useRef(null);
  const handledStripeReturnRef = useRef('');
  const [searchParams, setSearchParams] = useSearchParams();
  const [investments, setInvestments] = useState([]);
  const [plans, setPlans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [checkoutNotice, setCheckoutNotice] = useState({ message: '', type: 'info' });
  const [activeTab, setActiveTab] = useState(() => {
    const viewParam = searchParams.get('view');
    const tabParam = searchParams.get('tab');
    return viewParam === 'my-records' || tabParam === 'records' ? 'records' : 'plans';
  });

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
    const viewParam = searchParams.get('view');
    const tabParam = searchParams.get('tab');
    if (viewParam === 'my-records' || tabParam === 'records') {
      setActiveTab('records');
    } else if (tabParam === 'plans') {
      setActiveTab('plans');
    }
  }, [searchParams]);

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

  const requestFormRef = useRef(null);

  const handlePlanClick = (plan) => {
    const planId = plan?.id_activo || plan?.id_inversion || plan?.id || plan?.id_plan;
    if (requestFormRef.current && planId) {
      requestFormRef.current.openWithPlan(planId);
    }
  };

  return (
    <div className="page investments-page motion-page" ref={pageRef}>
      <PageHero
        eyebrow="Inversión"
        icon={ChartNoAxesColumnIncreasing}
        stats={[
          { label: 'Planes disponibles', value: isLoading ? '...' : String(plans.length) },
          { label: 'Mis inversiones', value: isLoading ? '...' : String(investments.length) },
        ]}
        title="Compara planes antes de invertir"
        actions={
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            {activeTab === 'plans' ? (
              <Button
                type="button"
                className="button-secondary"
                onClick={() => {
                  setActiveTab('records');
                  setSearchParams({ tab: 'records' });
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  borderRadius: '10px',
                  fontWeight: 600,
                  fontSize: '0.86rem',
                }}
              >
                <Eye size={17} style={{ color: '#6b21a8' }} />
                <span>Mis inversiones activas ({investments.length})</span>
              </Button>
            ) : (
              <Button
                type="button"
                className="button-secondary"
                onClick={() => {
                  setActiveTab('plans');
                  setSearchParams({ tab: 'plans' });
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  borderRadius: '10px',
                  fontWeight: 600,
                  fontSize: '0.86rem',
                }}
              >
                <ChartNoAxesColumnIncreasing size={17} style={{ color: '#6b21a8' }} />
                <span>Ver planes disponibles</span>
              </Button>
            )}
          </div>
        }
      >
        Planes de inversión diseñados para tu crecimiento financiero.
      </PageHero>

      {checkoutNotice.message && <Alert type={checkoutNotice.type}>{checkoutNotice.message}</Alert>}

      {/* Segmented Top Navigation */}
      <div className="module-nav-tabs" role="tablist" aria-label="Secciones de Inversión">
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
          <ChartNoAxesColumnIncreasing size={16} />
          <span>Planes disponibles</span>
          <span className={`module-nav-badge ${activeTab === 'plans' ? 'active' : 'inactive'}`}>
            {plans.length}
          </span>
        </button>

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
          <span>Mis inversiones activas</span>
          <span className={`module-nav-badge ${activeTab === 'records' ? 'active' : 'inactive'}`}>
            {investments.length}
          </span>
        </button>
      </div>

      {activeTab === 'records' && (
        <section className="section-block records-main-section motion-immediate" ref={recordsRef}>
          <div
            style={{
              background: 'var(--color-surface)',
              border: '1px solid #E9D5FF',
              borderRadius: 'var(--radius)',
              boxShadow: '0 16px 38px rgba(17, 24, 39, 0.06)',
              padding: 'clamp(16px, 2.5vw, 24px)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Registros del cliente
                </span>
                <h2 style={{ fontSize: '1.4rem', color: 'var(--purple-950)', margin: '2px 0 0' }}>Mis inversiones</h2>
                <p style={{ fontSize: '0.82rem', color: 'var(--muted)', margin: '3px 0 0' }}>
                  Monitorea el capital invertido, rendimientos acumulados, plazos de maduración y movimientos.
                </p>
              </div>
              <Button
                className="button-secondary icon-button"
                style={{ fontSize: '0.78rem', padding: '6px 14px', minHeight: '34px' }}
                onClick={() => {
                  setActiveTab('plans');
                  setSearchParams({ tab: 'plans' });
                }}
              >
                <ChartNoAxesColumnIncreasing size={16} aria-hidden="true" />
                Explorar nuevos planes
              </Button>
            </div>

            <FinancialRequestList
              emptyDescription="Cuando completes una solicitud, aparecerá aquí."
              emptyTitle="Aún no tienes inversiones registradas."
              error={error}
              isLoading={isLoading}
              items={investments}
              plans={plans}
              onRefresh={loadInvestmentsData}
              searchable
              title="Historial de inversiones"
              type="investments"
            />
          </div>
        </section>
      )}

      {activeTab === 'plans' && (
        <>
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
                  <h3>Aún no hay planes disponibles</h3>
                  <p>Cuando haya planes de inversión activos, aparecerán aquí.</p>
                </div>
              </div>
            )}
            {!isLoading && !error && plans.length > 0 && (
              <div className="savings-plans-grid">
                {plans.map((plan, index) => (
                  <InvestmentPlanCard key={plan?.id || plan?.id_inversion || plan?.label || `investment-plan-${index}`} plan={plan} onClick={handlePlanClick} />
                ))}
              </div>
            )}
          </section>

          <InvestmentRequestForm
            ref={requestFormRef}
            onCreated={() => {
              loadInvestmentsData();
              setActiveTab('records');
              setSearchParams({ tab: 'records' });
            }}
            plans={plans}
          />

          <div className="records-entry motion-immediate">
            <div>
              <span>Seguimiento</span>
              <h2>¿Ya tienes inversiones activas?</h2>
              <p>Revisa rendimientos generados, plazos de maduración y el estado de cada póliza.</p>
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
              Ver mis inversiones ({investments.length})
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

export default InvestmentsPage;
