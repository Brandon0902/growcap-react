import { AlertCircle, ArrowRight, Banknote, ChevronUp, Eye, HandCoins, RefreshCw, Lock, ShieldCheck, XCircle } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { normalizeApiError } from '../../../api/apiUtils.js';
import Alert from '../../../components/common/Alert.jsx';
import Button from '../../../components/common/Button.jsx';
import FinancialRequestList from '../../../components/common/FinancialRequestList.jsx';
import PageHero from '../../../components/common/PageHero.jsx';
import FinancialTipCarousel from '../../../components/common/FinancialTipCarousel.jsx';
import useGrowcapPageMotion from '../../../hooks/useGrowcapPageMotion.js';
import LoanWizard from '../components/LoanWizard.jsx';
import LoanLifecycleAlertBanner from '../components/LoanLifecycleAlertBanner.jsx';
import LoanAbonoModal from '../components/LoanAbonoModal.jsx';
import LoanCancelModal from '../components/LoanCancelModal.jsx';
import AvalCenterModal from '../components/AvalCenterModal.jsx';
import AvalAuthorizeModal from '../components/AvalAuthorizeModal.jsx';
import AvalSolidarioSection from '../components/AvalSolidarioSection.jsx';
import { formatCurrency } from '../../../utils/formatCurrency.js';
import { confirmLoanMercadoPago, getLoanPlans, getLoans, getPendingAvalRequests } from '../services/loanService.js';


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

function LoanPlanCard({ index, plan, onClick }) {
  const isLocked = plan.lock_reasons && plan.lock_reasons.length > 0;

  const name = plan.descripcion || `Plan ${index + 1}`;
  const description = plan.detalle || 'Plan disponible para iniciar una solicitud guiada.';
  
  const amountMax = getValue(plan, ['monto_maximo', 'monto_max', 'cantidad_maxima']);
  
  const baseSemanas = Number(plan.semanas || 1);
  const abonosStr = `${baseSemanas} abonos semanales`;

  // Example payment calculation based on Max Amount (assuming weekly by default for marketing)
  const interesPlan = Number(plan.interes ?? 0) / 100;
  const montoEjemplo = amountMax > 0 ? amountMax : 2000;
  const totalPagar = montoEjemplo + (montoEjemplo * interesPlan);
  const cuotaEjemplo = totalPagar / baseSemanas;

  const rate = getValue(plan, ['tasa', 'tasa_interes', 'interes', 'porcentaje']);

  return (
    <article 
      className={`savings-plan-card motion-item motion-plan-card ${isLocked ? 'locked' : ''}`} 
      tabIndex={0}
      onClick={() => onClick && onClick(plan)}
      style={{ cursor: onClick ? 'pointer' : 'default', position: 'relative' }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick && onClick(plan);
        }
      }}
    >
      {isLocked && (
        <div className="plan-locked-badge">
          <Lock size={12} />
          <span>Requisitos</span>
        </div>
      )}
      <div className="savings-plan-card-top">
        <span className="savings-plan-icon loan-card-icon" aria-hidden="true" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#ffffff', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)' }}>
          <HandCoins size={20} />
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <h3 style={{ color: '#0f172a', fontWeight: 800, letterSpacing: '-0.01em' }}>{name}</h3>
          <p style={{ color: '#475569' }}>{description}</p>
        </div>
      </div>

      <div className="savings-plan-rate loan-plan-rate" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
        <span style={{ color: '#15803d' }}>Monto máximo hasta</span>
        <strong style={{ color: '#166534' }}>
          {amountMax !== null && amountMax > 0 ? formatAmount(amountMax) : 'Flexible'}
        </strong>
      </div>

      <div className="savings-plan-summary">
        <span>
          <small>Tasa fija</small>
          <strong>{rate !== null ? formatPercent(rate) : 'No definido'}</strong>
        </span>
        <span style={{ textAlign: 'right' }}>
          <small>{abonosStr}</small>
          <strong style={{ color: '#059669' }}>{formatAmount(cuotaEjemplo)}</strong>
        </span>
      </div>

      <div className="plan-card-action">
        <span>{isLocked ? 'Ver requisitos' : 'Solicitar préstamo'}</span>
        <ArrowRight size={15} className="action-arrow" />
      </div>
    </article>
  );
}

function LoansPage() {
  const pageRef = useRef(null);
  const recordsRef = useRef(null);
  const avalSectionRef = useRef(null);
  const handledMpReturnRef = useRef('');
  const [searchParams, setSearchParams] = useSearchParams();
  const [loans, setLoans] = useState([]);
  const [plans, setPlans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [lockedPlan, setLockedPlan] = useState(null);
  const [plansError, setPlansError] = useState('');
  const [activeTab, setActiveTab] = useState(() => {
    const viewParam = searchParams.get('view');
    const tabParam = searchParams.get('tab');
    if (viewParam === 'my-records' || tabParam === 'records') return 'records';
    if (tabParam === 'aval') return 'aval';
    return 'plans';
  });
  const [checkoutNotice, setCheckoutNotice] = useState({ message: '', type: 'info' });
  const [selectedLoanForAbono, setSelectedLoanForAbono] = useState(null);
  const [selectedLoanForCancel, setSelectedLoanForCancel] = useState(null);
  const [pendingAvalRequests, setPendingAvalRequests] = useState([]);
  const [selectedAvalRequestToReview, setSelectedAvalRequestToReview] = useState(null);
  const [isAvalCenterOpen, setIsAvalCenterOpen] = useState(false);
  const [prerequisites, setPrerequisites] = useState(null);
  const [activeLoanTab, setActiveLoanTab] = useState('current');
  const hasAutoOpenedRecordsRef = useRef(false);

  useGrowcapPageMotion(pageRef);

  const loadLoansData = useCallback(async () => {
    setIsLoading(true);
    setError('');
    setPlansError('');

    try {
      const [plansResponse, loansResponse, pendingAvalResponse] = await Promise.all([
        getLoanPlans(),
        getLoans({ orden: 'fecha_desc' }),
        getPendingAvalRequests().catch(() => ({ data: [] })),
      ]);

      setPlans(plansResponse.data);
      const loansData = loansResponse?.data ?? [];
      setLoans(loansData);
      setPrerequisites(plansResponse.prerequisites ?? null);
      const pendingList = Array.isArray(pendingAvalResponse)
        ? pendingAvalResponse
        : (pendingAvalResponse?.data ?? []);
      setPendingAvalRequests(pendingList);

      if (!hasAutoOpenedRecordsRef.current && loansData.length > 0) {
        hasAutoOpenedRecordsRef.current = true;
        setIsRecordsOpen(true);
      }
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

  useEffect(() => {
    const viewParam = searchParams.get('view');
    const tabParam = searchParams.get('tab');
    if (viewParam === 'my-records' || tabParam === 'records') {
      setActiveTab('records');
    } else if (tabParam === 'aval') {
      setActiveTab('aval');
    } else if (tabParam === 'plans') {
      setActiveTab('plans');
    }
  }, [searchParams]);

  // Mercado Pago Return Handler
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

    // Limpiar query params de la URL para evitar re-ejecuciones
    setSearchParams({}, { replace: true });

    const handleMpReturn = async () => {
      setCheckoutNotice({ message: 'Verificando y acreditando tu abono con Mercado Pago...', type: 'info' });

      try {
        const res = await confirmLoanMercadoPago({
          payment_id: paymentId,
          collection_id: collectionId,
          status: mpStatus,
          external_reference: externalReference,
          preference_id: preferenceId,
        });

        if (res?.acreditado || res?.ok) {
          const montoStr = res.monto_acreditado ? ` por $${Number(res.monto_acreditado).toFixed(2)} MXN` : '';
          const liquidadoStr = res.liquidado ? ' ¡Felicidades, tu préstamo ha sido liquidado en su totalidad!' : '';
          setCheckoutNotice({
            message: `¡Pago confirmado por Mercado Pago! Tu abono extraordinario${montoStr} fue acreditado en tiempo real a tu préstamo.${liquidadoStr}`,
            type: 'success',
          });
          setActiveTab('records');
          setActiveLoanTab('current');
        } else if (res?.status === 'rejected' || res?.status === 'cancelled') {
          setCheckoutNotice({
            message: 'El pago no fue aprobado o fue cancelado por Mercado Pago. Tu saldo no fue modificado.',
            type: 'error',
          });
        } else {
          setCheckoutNotice({
            message: 'Tu pago está en proceso de validación por Mercado Pago. Se reflejará automáticamente al completarse.',
            type: 'info',
          });
        }
      } catch (err) {
        const normalized = normalizeApiError(err, 'No fue posible confirmar automáticamente el abono de Mercado Pago.');
        setCheckoutNotice({ message: normalized.message, type: 'error' });
      } finally {
        loadLoansData();
      }
    };

    handleMpReturn();
  }, [loadLoansData, searchParams, setSearchParams]);

  const wizardRef = useRef(null);

  const handlePlanClick = (plan) => {
    if (plan.lock_reasons && plan.lock_reasons.length > 0) {
      setLockedPlan(plan);
      return;
    }
    const planId = plan?.id_activo || plan?.id_prestamo || plan?.id || plan?.id_plan;
    if (wizardRef.current && planId) {
      wizardRef.current.openWithPlan(planId);
    }
  };

  const currentLoansCount = loans.filter((l) => [2, 5].includes(Number(l.status ?? 0))).length;
  const historyLoansCount = loans.filter((l) => ![2, 5].includes(Number(l.status ?? 0))).length;

  const loanMetrics = useMemo(() => {
    let totalAdeudoRestante = 0;
    let totalCuotaFija = 0;
    let activeCount = 0;

    for (const l of loans) {
      const statusNum = Number(l?.status ?? l?.id_status ?? 0);
      const isLiquidated = statusNum === 1 || statusNum === 6 || Number(l?.saldo_restante) <= 0.01;
      const isActive = [2, 5].includes(statusNum) && !isLiquidated;

      if (isActive) {
        activeCount += 1;
        const originalAmount = Number(l?.monto_solicitado ?? l?.cantidad ?? l?.monto ?? 0);
        const totalAdeudo = Number(l?.total_adeudo ?? (originalAmount > 0 ? originalAmount * 1.1 : 0));
        const saldoRestante = Number(l?.saldo_restante ?? totalAdeudo);
        const cuota = Number(l?.cuota_fija ?? (totalAdeudo > 0 ? totalAdeudo / 12 : 0));

        totalAdeudoRestante += saldoRestante;
        totalCuotaFija += cuota;
      }
    }

    return {
      totalAdeudoRestante,
      totalCuotaFija,
      activeCount,
    };
  }, [loans]);

  return (
    <div className="page loans-page motion-page" ref={pageRef}>
      <PageHero
        eyebrow="● Préstamos Personales"
        icon={Banknote}
        stats={
          loanMetrics.activeCount > 0 ? [
            { label: 'Adeudo Restante', value: isLoading ? '...' : formatCurrency(loanMetrics.totalAdeudoRestante) },
            { label: 'Próxima Cuota Estimada', value: isLoading ? '...' : formatCurrency(loanMetrics.totalCuotaFija) },
          ] : [
            { label: 'Adeudo Activo', value: '$0.00' },
            { label: 'Planes Disponibles', value: isLoading ? '...' : String(plans.length) },
          ]
        }
        title="Línea de Financiamiento y Préstamos"
      >
        <FinancialTipCarousel context="loans" />
      </PageHero>

      {checkoutNotice.message && (
        <div style={{ marginBottom: '16px' }}>
          <Alert type={checkoutNotice.type}>{checkoutNotice.message}</Alert>
        </div>
      )}

      {/* Aviso rápido si hay solicitudes de Aval pendientes */}
      {pendingAvalRequests.length > 0 && activeTab !== 'aval' && (
        <div
          className="aval-banner-quick-notice"
          role="alert"
          onClick={() => {
            setActiveTab('aval');
            setSearchParams({ tab: 'aval' });
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={16} aria-hidden="true" style={{ color: '#dc2626', flexShrink: 0 }} />
            <span>
              Tienes <strong>{pendingAvalRequests.length}</strong> solicitud{pendingAvalRequests.length > 1 ? 'es' : ''} de aval pendiente{pendingAvalRequests.length > 1 ? 's' : ''}
            </span>
          </div>
          <button
            type="button"
            className="aval-banner-quick-btn"
            onClick={(e) => {
              e.stopPropagation();
              setActiveTab('aval');
              setSearchParams({ tab: 'aval' });
            }}
          >
            Revisar
          </button>
        </div>
      )}

      {/* Segmented Top Navigation */}
      <div className="module-nav-tabs loans-nav-tabs" role="tablist" aria-label="Secciones de Préstamos">
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
          <Eye size={15} />
          <span className="module-nav-label-desktop">Mis préstamos</span>
          <span className="module-nav-label-mobile">Préstamos</span>
          <span className={`module-nav-badge ${activeTab === 'records' ? 'active' : 'inactive'}`}>
            {loans.length}
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
          <Banknote size={15} />
          <span className="module-nav-label-desktop">Planes y solicitud</span>
          <span className="module-nav-label-mobile">Solicitar</span>
          <span className={`module-nav-badge ${activeTab === 'plans' ? 'active' : 'inactive'}`}>
            {plans.length}
          </span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'aval'}
          className={`module-nav-btn ${activeTab === 'aval' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('aval');
            setSearchParams({ tab: 'aval' });
          }}
        >
          <ShieldCheck size={15} />
          <span className="module-nav-label-desktop">Aval solidario</span>
          <span className="module-nav-label-mobile">Aval</span>
          {pendingAvalRequests.length > 0 && (
            <span
              style={{
                background: '#dc2626',
                color: '#ffffff',
                fontSize: '0.68rem',
                fontWeight: 700,
                padding: '1px 5px',
                borderRadius: '8px',
                lineHeight: 1.2,
              }}
            >
              {pendingAvalRequests.length}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'records' && (
        <>
          {loans.length > 0 && (
            <LoanLifecycleAlertBanner
              items={loans}
              onAbonar={(loan) => setSelectedLoanForAbono(loan)}
              onCancel={(loan) => setSelectedLoanForCancel(loan)}
              onViewRecords={() => {
                setActiveLoanTab('current');
              }}
            />
          )}

          <section className="section-block records-main-section motion-immediate" ref={recordsRef}>
            <FinancialRequestList
              emptyDescription="Cuando completes una solicitud, aparecerá aquí."
              emptyTitle="Aún no tienes préstamos registrados."
              error={error}
              isLoading={isLoading}
              items={loans}
              onRefresh={loadLoansData}
              onCancelLoan={(loan) => setSelectedLoanForCancel(loan)}
              activeLoanTab={activeLoanTab}
              onLoanTabChange={setActiveLoanTab}
              searchable
              title=""
              type="loans"
            />
          </section>
        </>
      )}

      {activeTab === 'plans' && (
        <>
          {loans.length > 0 && (
            <LoanLifecycleAlertBanner
              items={loans}
              onAbonar={(loan) => setSelectedLoanForAbono(loan)}
              onCancel={(loan) => setSelectedLoanForCancel(loan)}
              onViewRecords={() => {
                setActiveTab('records');
                setActiveLoanTab('current');
                setSearchParams({ tab: 'records' });
              }}
            />
          )}

          <section className="section-block savings-plans-section motion-immediate">
            <div className="section-heading savings-plans-heading">
              <div>
                <span>Opciones disponibles</span>
                <h2>Planes de préstamo</h2>
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
                  <h3>Aún no hay planes disponibles</h3>
                  <p>Cuando haya planes de préstamo activos, aparecerán aquí.</p>
                </div>
              </div>
            )}
            {!isLoading && !plansError && plans.length > 0 && (
              <div className="savings-plans-grid">
                {plans.map((plan, index) => (
                  <LoanPlanCard key={plan?.id || plan?.id_prestamo || plan?.label || `loan-plan-${index}`} index={index} plan={plan} onClick={handlePlanClick} />
                ))}
              </div>
            )}
          </section>

          <section className="guided-request-section">
            {!plansError && (
              <LoanWizard
                ref={wizardRef}
                onCreated={() => {
                  setActiveTab('records');
                  setActiveLoanTab('current');
                  setSearchParams({ tab: 'records' });
                  loadLoansData();
                }}
                plans={plans}
                prerequisites={prerequisites}
              />
            )}
          </section>

          <div className="records-entry motion-immediate">
            <div>
              <span>Seguimiento</span>
              <h2>¿Ya tienes préstamos activos?</h2>
              <p>Revisa cuotas, saldos restantes, progreso de pago y realiza abonos en cualquier momento.</p>
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
              Ver mis préstamos ({loans.length})
            </Button>
          </div>
        </>
      )}

      {activeTab === 'aval' && (
        <AvalSolidarioSection
          ref={avalSectionRef}
          requests={pendingAvalRequests}
          onReview={(req) => setSelectedAvalRequestToReview(req)}
          onReload={loadLoansData}
        />
      )}

      {selectedLoanForAbono && (
        <LoanAbonoModal
          isOpen={Boolean(selectedLoanForAbono)}
          onClose={() => setSelectedLoanForAbono(null)}
          prestamo={selectedLoanForAbono}
          onSuccess={(msg) => {
            setCheckoutNotice({ message: msg, type: 'success' });
            loadLoansData();
          }}
        />
      )}

      {selectedLoanForCancel && (
        <LoanCancelModal
          isOpen={Boolean(selectedLoanForCancel)}
          onClose={() => setSelectedLoanForCancel(null)}
          loan={selectedLoanForCancel}
          onSuccess={(msg) => {
            setCheckoutNotice({ message: msg, type: 'success' });
            loadLoansData();
          }}
        />
      )}

      {selectedAvalRequestToReview && (
        <AvalAuthorizeModal
          isOpen={Boolean(selectedAvalRequestToReview)}
          onClose={() => setSelectedAvalRequestToReview(null)}
          request={selectedAvalRequestToReview}
          onSuccess={(msg) => {
            setCheckoutNotice({ message: msg, type: 'success' });
            loadLoansData();
          }}
        />
      )}

      <AvalCenterModal
        isOpen={isAvalCenterOpen}
        onClose={() => setIsAvalCenterOpen(false)}
        requests={pendingAvalRequests}
        onReview={(req) => {
          setIsAvalCenterOpen(false);
          setSelectedAvalRequestToReview(req);
        }}
      />


      {lockedPlan && (
        <div 
          className="records-modal-backdrop" 
          style={{ zIndex: 9999 }}
          onClick={(e) => {
             if(e.target === e.currentTarget) setLockedPlan(null);
          }}
        >
          <div className="records-modal" style={{ maxWidth: '400px', height: 'auto', maxHeight: 'none', padding: '24px' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#111827', fontSize: '1.25rem', marginBottom: '1rem' }}>
              <Lock size={24} color="#f59e0b" />
              Plan Bloqueado
            </h2>
            <p style={{ margin: '1rem 0', color: '#4b5563', fontSize: '14px' }}>
              ¡Estás muy cerca! Cumple con estas metas para desbloquear <strong>{lockedPlan.descripcion || 'este plan'}</strong> y acceder a mejores montos:
            </p>
            <ul style={{ listStyleType: 'none', padding: 0, margin: '1rem 0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {lockedPlan.lock_reasons.map((reason, idx) => (
                <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', color: '#ef4444', fontSize: '14px' }}>
                  <XCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
              <Button type="button" className="button-primary" onClick={() => setLockedPlan(null)}>
                Entendido
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LoansPage;
