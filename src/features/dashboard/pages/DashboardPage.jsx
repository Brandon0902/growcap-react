import { Banknote, ChartNoAxesColumnIncreasing, ChevronRight, HandCoins, ShieldCheck } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { normalizeApiError } from '../../../api/apiUtils.js';
import Alert from '../../../components/common/Alert.jsx';
import Button from '../../../components/common/Button.jsx';
import PageHero from '../../../components/common/PageHero.jsx';
import useGrowcapPageMotion from '../../../hooks/useGrowcapPageMotion.js';
import ModuleCard from '../components/ModuleCard.jsx';
import SummaryCard from '../components/SummaryCard.jsx';
import { getClienteSaldoDisponible } from '../services/dashboardService.js';
import { getPendingAvalRequests } from '../../loans/services/loanService.js';
import AvalCenterModal from '../../loans/components/AvalCenterModal.jsx';
import AvalAuthorizeModal from '../../loans/components/AvalAuthorizeModal.jsx';
import useAuth from '../../auth/hooks/useAuth.js';
import { getFullGreeting, getFormalDate } from '../../../utils/userFormatting.js';


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
  const [notice, setNotice] = useState({ message: '', type: 'info' });

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
  const savingsBalance = getDashboardAmount(balance, ['sd_ahorros', 'saldo_ahorro', 'saldo_ahorros', 'monto_ahorro', 'ahorros']);
  const investmentBalance = getDashboardAmount(balance, ['sd_inversiones', 'saldo_inversion', 'saldo_inversiones', 'monto_inversion', 'inversiones']);
  const loansBalance = getDashboardAmount(balance, ['sd_prestamos', 'saldo_prestamos', 'saldo_prestamo', 'deuda_prestamos', 'prestamos', 'solicitudes_prestamos']);
  const balanceDate = getDashboardDate(balance);

  return (
    <div className="page dashboard-page" ref={pageRef}>
      <PageHero
        eyebrow={`● Portafolio Personal · ${formalDate}`}
        stats={[
          { label: 'Saldo general', value: isLoadingBalance ? 'Cargando' : formatCurrency(generalBalance) },
          { label: 'Actualizado', value: balanceDate || 'Hoy' },
        ]}
        title={greetingText}
      >
        Monitorea el crecimiento de tu capital, rendimientos acumulados y compromisos activos.
      </PageHero>

      {notice.message && (
        <div style={{ marginBottom: '16px' }}>
          <Alert type={notice.type}>{notice.message}</Alert>
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
            padding: '12px 18px',
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <ShieldCheck size={18} />
            </div>
            <div>
              <strong style={{ fontSize: '0.88rem', color: '#0f172a' }}>
                Solicitud de respaldo como aval pendiente
              </strong>
              <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block' }}>
                {pendingAvalRequests.length === 1
                  ? `${pendingAvalRequests[0].solicitante_nombre} te ha solicitado como aval solidario.`
                  : `Tienes ${pendingAvalRequests.length} solicitudes de aval pendientes de confirmación.`}
              </span>
            </div>
          </div>

          <Button
            type="button"
            className="button-primary"
            style={{
              fontSize: '0.8rem',
              padding: '6px 14px',
              minHeight: '32px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
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

      <section className="balance-hero-card motion-immediate" aria-label="Saldo disponible del cliente">
        <span className="page-kicker">Saldo disponible</span>
        <strong>{isLoadingBalance ? 'Cargando...' : formatCurrency(generalBalance)}</strong>
        <p>
          {balanceDate
            ? `Informacion consultada al ${balanceDate}.`
            : 'Informacion actualizada de tu cuenta GrowCap.'}
        </p>
      </section>

      <section className="portfolio-ledger-grid motion-immediate" aria-label="Resumen de productos financieros">
        <SummaryCard
          helper="Saldo acumulado en planes de ahorro"
          icon={HandCoins}
          label="Mis Ahorros"
          value={isLoadingBalance ? 'Cargando...' : formatCurrency(savingsBalance)}
          to="/ahorro?view=my-records"
          actionLabel="Ver activos"
        />
        <SummaryCard
          helper="Capital colocado en inversiones vigentes"
          icon={ChartNoAxesColumnIncreasing}
          label="Mis Inversiones"
          value={isLoadingBalance ? 'Cargando...' : formatCurrency(investmentBalance)}
          to="/inversion?view=my-records"
          actionLabel="Ver activos"
        />
        <SummaryCard
          helper={loansBalance === null ? 'Sin préstamos activos' : 'Seguimiento de saldo deudor'}
          icon={Banknote}
          label="Mis Préstamos"
          value={isLoadingBalance ? 'Cargando...' : (loansBalance === null ? 'No disponible' : formatCurrency(loansBalance))}
          to="/prestamos?view=my-records"
          actionLabel="Ver activos"
        />
      </section>

      <section className="operations-board motion-scroll">
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
    </div>
  );
}

export default DashboardPage;
