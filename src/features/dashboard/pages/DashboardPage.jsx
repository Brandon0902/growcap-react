import { ArrowDownLeft, Banknote, ChartNoAxesColumnIncreasing, ChevronRight, FileText, HandCoins, Lightbulb, PlusCircle, ShieldCheck, Sparkles } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { normalizeApiError } from '../../../api/apiUtils.js';
import Alert from '../../../components/common/Alert.jsx';
import Button from '../../../components/common/Button.jsx';
import PageHero from '../../../components/common/PageHero.jsx';
import SuccessAlertModal from '../../../components/common/SuccessAlertModal.jsx';
import useGrowcapPageMotion from '../../../hooks/useGrowcapPageMotion.js';
import SummaryCard from '../components/SummaryCard.jsx';
import GeneralWithdrawalModal from '../components/GeneralWithdrawalModal.jsx';
import GeneralKardexModal from '../components/GeneralKardexModal.jsx';
import { getClienteSaldoDisponible } from '../services/dashboardService.js';
import { getPendingAvalRequests } from '../../loans/services/loanService.js';
import AvalCenterModal from '../../loans/components/AvalCenterModal.jsx';
import AvalAuthorizeModal from '../../loans/components/AvalAuthorizeModal.jsx';
import DepositModal from '../../deposits/components/DepositModal.jsx';
import useAuth from '../../auth/hooks/useAuth.js';
import { getFullGreeting, getFormalDate } from '../../../utils/userFormatting.js';
import { assistantService } from '../../../services/assistantService.js';
import FinancialTipCarousel from '../../../components/common/FinancialTipCarousel.jsx';


function getNumericValue(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'string') {
    const parsed = Number(value.replace(/[$,%\s]/g, '').replace(/,/g, ''));
    return Number.isFinite(parsed) ? parsed : null;
  }

  if (typeof value === 'object') {
    return getNumericValue(
      value.saldo
      ?? value.saldo_disponible
      ?? value.total
      ?? value.monto
      ?? value.cantidad
      ?? value.valor,
    );
  }

  return null;
}

function formatCurrency(value) {
  const number = getNumericValue(value);

  if (number === null) {
    return 'No disponible';
  }

  return new Intl.NumberFormat('es-MX', {
    currency: 'MXN',
    maximumFractionDigits: 2,
    style: 'currency',
  }).format(number);
}

function getDashboardAmount(data, possibleKeys) {
  const sources = [data, data?.data, data?.detalle, data?.data?.detalle].filter(Boolean);

  for (const source of sources) {
    for (const key of possibleKeys) {
      const value = source?.[key];

      if (value !== undefined && value !== null && value !== '') {
        return value;
      }
    }
  }

  return null;
}

function getDashboardDate(data) {
  return data?.fecha || data?.data?.fecha || null;
}

function DashboardPage() {
  const pageRef = useRef(null);
  const { user } = useAuth();
  const [balance, setBalance] = useState(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(true);
  const [balanceError, setBalanceError] = useState('');
  const [pendingAvalRequests, setPendingAvalRequests] = useState([]);
  const [selectedAvalRequestToReview, setSelectedAvalRequestToReview] = useState(null);
  const [isAvalCenterOpen, setIsAvalCenterOpen] = useState(false);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [isWithdrawalModalOpen, setIsWithdrawalModalOpen] = useState(false);
  const [isKardexModalOpen, setIsKardexModalOpen] = useState(false);
  const [notice, setNotice] = useState({ message: '', type: 'info' });
  const noticeTimerRef = useRef(null);
  const [withdrawalAlert, setWithdrawalAlert] = useState({
    isOpen: false,
    title: 'Retiro solicitado',
    message: '',
  });

  const showTimedNotice = useCallback((message, type = 'success') => {
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    setNotice({ message, type });
    noticeTimerRef.current = setTimeout(() => {
      setNotice({ message: '', type: 'info' });
    }, 5000);
  }, []);

  useGrowcapPageMotion(pageRef);

  const greetingText = getFullGreeting(user);
  const formalDate = getFormalDate();

  const loadBalance = useCallback(async () => {
    setIsLoadingBalance(true);
    setBalanceError('');

    try {
      const [response, pendingAvalRes] = await Promise.all([
        getClienteSaldoDisponible(),
        getPendingAvalRequests().catch(() => ({ data: [] })),
      ]);
      setBalance(response.data);
      const pendingList = Array.isArray(pendingAvalRes)
        ? pendingAvalRes
        : (pendingAvalRes?.data ?? []);
      setPendingAvalRequests(pendingList);
    } catch (error) {
      const normalized = normalizeApiError(error, 'No fue posible cargar el saldo disponible.');
      setBalance(null);
      setBalanceError(normalized.message);
    } finally {
      setIsLoadingBalance(false);
    }
  }, []);

  useEffect(() => {
    loadBalance();
  }, [loadBalance]);

  const generalBalance = getDashboardAmount(balance, ['saldo_disponible', 'saldo_general', 'saldo', 'total']);
  const savingsColocado = getNumericValue(getDashboardAmount(balance, ['sd_ahorros_colocado'])) ?? 0;
  const savingsDisponible = getNumericValue(getDashboardAmount(balance, ['sd_ahorros_disponible', 'sd_ahorros'])) ?? 0;
  const savingsBalance = savingsColocado + savingsDisponible;
  const investmentColocado = getNumericValue(getDashboardAmount(balance, ['sd_inversiones_colocado', 'sd_inversiones'])) ?? 0;
  const investmentDisponible = getNumericValue(getDashboardAmount(balance, ['sd_inversiones_disponible', 'sd_inversiones_disponibles'])) ?? 0;
  const investmentBalance = investmentColocado + investmentDisponible;
  const depositsDisponible = getNumericValue(getDashboardAmount(balance, ['sd_depositos'])) ?? 0;
  const loansBalance = getDashboardAmount(balance, ['sd_prestamos', 'saldo_prestamos', 'saldo_prestamo', 'deuda_prestamos', 'prestamos', 'solicitudes_prestamos']);
  const balanceDate = getDashboardDate(balance);

  const rawAccounts =
    balance?.cuentas_disponibles
    || balance?.data?.cuentas_disponibles
    || balance?.detalle?.cuentas_disponibles
    || balance?.data?.detalle?.cuentas_disponibles
    || [];

  const availableAccounts = Array.isArray(rawAccounts) && rawAccounts.length > 0
    ? rawAccounts
    : [
        ...(depositsDisponible > 0
          ? [{
              key: 'depositos:general',
              origen_tipo: 'depositos',
              id: null,
              etiqueta: 'Depósitos en Caja',
              saldo_disponible: depositsDisponible,
            }]
          : []),
        ...(savingsDisponible > 0
          ? [{
              key: 'ahorro:general',
              origen_tipo: 'ahorro',
              id: null,
              etiqueta: 'Ahorro Disponible',
              saldo_disponible: savingsDisponible,
            }]
          : []),
        ...(investmentDisponible > 0
          ? [{
              key: 'inversion:general',
              origen_tipo: 'inversion',
              id: null,
              etiqueta: 'Inversiones Liberadas',
              saldo_disponible: investmentDisponible,
            }]
          : []),
      ];

  const buildBreakdown = (colocado, disponible) => (isLoadingBalance ? null : [
    { label: 'Colocado', value: formatCurrency(colocado), tone: 'growing', tooltip: 'Capital activo colocado' },
    { label: 'Disponible', value: formatCurrency(disponible), tone: 'available', tooltip: 'Saldo liberado disponible cobrable' },
  ]);

  const loansNumber = getNumericValue(loansBalance);
  const loansBreakdown = isLoadingBalance ? null : [
    {
      label: loansNumber && loansNumber > 0 ? 'Saldo deudor' : 'Estado',
      value: loansNumber && loansNumber > 0 ? formatCurrency(loansNumber) : 'Al corriente',
      tone: loansNumber && loansNumber > 0 ? 'warning' : 'available',
      tooltip: loansNumber && loansNumber > 0 ? 'Compromiso financiero pendiente de liquidación' : 'Sin créditos adeudados',
    },
  ];

  return (
    <div className="page dashboard-page" ref={pageRef}>
      <PageHero
        eyebrow={`● Portafolio Personal · ${formalDate}`}
        stats={[
          { label: 'Saldo Disponible', value: isLoadingBalance ? 'Cargando...' : formatCurrency(generalBalance) },
          { label: 'Actualizado', value: balanceDate || 'Hoy' },
        ]}
        title={greetingText}
        actions={
          <div className="hero-action-pills">
            <button
              type="button"
              className="hero-pill-btn hero-pill-primary"
              onClick={() => setIsDepositModalOpen(true)}
            >
              <PlusCircle size={16} />
              <span className="hidden min-[380px]:inline">Cargar Saldo</span>
            </button>
            <button
              type="button"
              className="hero-pill-btn hero-pill-secondary"
              onClick={() => setIsWithdrawalModalOpen(true)}
              disabled={Number(generalBalance ?? 0) <= 0}
              title={Number(generalBalance ?? 0) <= 0 ? 'Sin saldo disponible para retirar' : 'Retirar saldo'}
            >
              <ArrowDownLeft size={16} className="text-purple-600" />
              <span>Retirar</span>
            </button>
            <button
              type="button"
              className="hero-pill-btn hero-pill-secondary"
              onClick={() => setIsKardexModalOpen(true)}
            >
              <FileText size={16} className="text-slate-500" />
              <span>Movimientos</span>
            </button>
          </div>
        }
      >
        <FinancialTipCarousel context="dashboard" />
      </PageHero>

      {notice.message && (
        <div style={{ marginBottom: '16px' }}>
          <Alert type={notice.type}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: '12px' }}>
              <span>{notice.message}</span>
              <Button
                type="button"
                className="button-secondary"
                style={{ fontSize: '0.75rem', padding: '3px 12px', minHeight: '26px' }}
                onClick={() => {
                  if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
                  setNotice({ message: '', type: 'info' });
                }}
              >
                Aceptar
              </Button>
            </div>
          </Alert>
        </div>
      )}

      {balanceError && (
        <Alert type="error">
          {balanceError}
          <Button className="button-secondary balance-retry" onClick={loadBalance}>
            Reintentar
          </Button>
        </Alert>
      )}

      {pendingAvalRequests.length > 0 && (
        <div
          className="motion-immediate"
          style={{
            marginBottom: '16px',
            padding: '10px 16px',
            background: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #bfdbfe',
            borderLeft: '4px solid #2563eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            boxShadow: '0 2px 8px rgba(37, 99, 235, 0.06)',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShieldCheck size={18} color="#2563eb" />
            <span style={{ fontSize: '0.84rem', color: '#0f172a' }}>
              <strong>Solicitud de aval pendiente:</strong>{' '}
              {pendingAvalRequests.length === 1
                ? `${pendingAvalRequests[0].solicitante_nombre} requiere tu autorización.`
                : `Tienes ${pendingAvalRequests.length} solicitudes de aval pendientes de revisión.`}
            </span>
          </div>

          <Button
            type="button"
            className="button-primary"
            style={{
              fontSize: '0.78rem',
              padding: '5px 12px',
              minHeight: '30px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              background: '#1e293b',
              borderColor: '#0f172a',
            }}
            onClick={() => {
              if (pendingAvalRequests.length === 1) {
                setSelectedAvalRequestToReview(pendingAvalRequests[0]);
              } else {
                setIsAvalCenterOpen(true);
              }
            }}
          >
            <span>Revisar</span>
            <ChevronRight size={14} />
          </Button>
        </div>
      )}

      <section className="portfolio-ledger-grid motion-immediate" aria-label="Resumen de productos financieros">
        <SummaryCard
          helper="Disponible: fondos liberados listos para cobro o reinversión."
          icon={HandCoins}
          label="Mis Ahorros"
          value={isLoadingBalance ? 'Cargando...' : formatCurrency(savingsBalance)}
          breakdown={buildBreakdown(savingsColocado, savingsDisponible)}
          to="/ahorro?view=my-records"
          actionLabel="Ver activos"
        />
        <SummaryCard
          helper="Disponible: inversiones con plazo de maduración concluido."
          icon={ChartNoAxesColumnIncreasing}
          label="Mis Inversiones"
          value={isLoadingBalance ? 'Cargando...' : formatCurrency(investmentBalance)}
          breakdown={buildBreakdown(investmentColocado, investmentDisponible)}
          to="/inversion?view=my-records"
          actionLabel="Ver activos"
        />
        <SummaryCard
          helper={loansNumber && loansNumber > 0 ? 'Saldo adeudado activo.' : 'Sin compromisos financieros pendientes.'}
          icon={Banknote}
          label="Mis Préstamos"
          value={isLoadingBalance ? 'Cargando...' : (loansBalance === null ? 'No disponible' : formatCurrency(loansBalance))}
          breakdown={loansBreakdown}
          to="/prestamos?view=my-records"
          actionLabel="Ver activos"
        />
      </section>

      {selectedAvalRequestToReview && (
        <AvalAuthorizeModal
          isOpen={Boolean(selectedAvalRequestToReview)}
          onClose={() => setSelectedAvalRequestToReview(null)}
          request={selectedAvalRequestToReview}
          onSuccess={(msg) => {
            setNotice({ message: msg, type: 'success' });
            loadBalance();
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

      <DepositModal
        isOpen={isDepositModalOpen}
        onClose={() => setIsDepositModalOpen(false)}
        onSuccess={loadBalance}
      />

      <GeneralWithdrawalModal
        isOpen={isWithdrawalModalOpen}
        onClose={() => setIsWithdrawalModalOpen(false)}
        availableBalance={Number(generalBalance ?? 0)}
        availableAccounts={availableAccounts}
        onSuccess={(msg) => {
          setWithdrawalAlert({
            isOpen: true,
            title: 'Retiro solicitado',
            message: msg || 'Solicitud realizada con éxito. Verás el depósito reflejado en tu cuenta en un lapso de 24 a 48 hrs hábiles.',
          });
          loadBalance();
        }}
      />

      <GeneralKardexModal
        isOpen={isKardexModalOpen}
        onClose={() => setIsKardexModalOpen(false)}
        availableBalance={Number(generalBalance ?? 0)}
      />

      <SuccessAlertModal
        isOpen={withdrawalAlert.isOpen}
        onClose={() => setWithdrawalAlert((prev) => ({ ...prev, isOpen: false }))}
        title={withdrawalAlert.title}
        message={withdrawalAlert.message}
      />
    </div>
  );
}

export default DashboardPage;
