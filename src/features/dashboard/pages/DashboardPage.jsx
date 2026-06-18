import { Banknote, ChartNoAxesColumnIncreasing, HandCoins } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { normalizeApiError } from '../../../api/apiUtils.js';
import Alert from '../../../components/common/Alert.jsx';
import Button from '../../../components/common/Button.jsx';
import PageHero from '../../../components/common/PageHero.jsx';
import useGrowcapPageMotion from '../../../hooks/useGrowcapPageMotion.js';
import ModuleCard from '../components/ModuleCard.jsx';
import SummaryCard from '../components/SummaryCard.jsx';
import { getClienteSaldoDisponible } from '../services/dashboardService.js';

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
  const [balance, setBalance] = useState(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(true);
  const [balanceError, setBalanceError] = useState('');

  useGrowcapPageMotion(pageRef);

  const loadBalance = useCallback(async () => {
    setIsLoadingBalance(true);
    setBalanceError('');

    try {
      const response = await getClienteSaldoDisponible();
      setBalance(response.data);
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
  const loansBalance = getDashboardAmount(balance, ['saldo_prestamos', 'saldo_prestamo', 'deuda_prestamos', 'prestamos', 'solicitudes_prestamos']);
  const balanceDate = getDashboardDate(balance);

  return (
    <div className="page dashboard-page" ref={pageRef}>
      <PageHero
        eyebrow="Panel principal"
        stats={[
          { label: 'Saldo general', value: isLoadingBalance ? 'Cargando' : formatCurrency(generalBalance) },
          { label: 'Actualizado', value: balanceDate || 'Hoy' },
        ]}
        title="Tu centro financiero"
      >
        Revisa ahorro, inversion y prestamos desde una misma mesa de control.
      </PageHero>

      {balanceError && (
        <Alert type="error">
          {balanceError}
          <Button className="button-secondary balance-retry" onClick={loadBalance}>
            Reintentar
          </Button>
        </Alert>
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

      <section className="summary-ledger motion-immediate" aria-label="Resumen financiero">
        <SummaryCard
          helper="Saldo real"
          icon={HandCoins}
          label="Ahorro"
          status={savingsBalance === null ? 'Sin dato' : 'Saldo real'}
          value={isLoadingBalance ? 'Cargando...' : formatCurrency(savingsBalance)}
        />
        <SummaryCard
          helper="Saldo real"
          icon={ChartNoAxesColumnIncreasing}
          label="Inversion"
          status={investmentBalance === null ? 'Sin dato' : 'Saldo real'}
          value={isLoadingBalance ? 'Cargando...' : formatCurrency(investmentBalance)}
        />
        <SummaryCard
          helper="Seguimiento de prestamos"
          icon={Banknote}
          label="Prestamos"
          status={loansBalance === null ? 'Sin prestamos activos' : 'Saldo real'}
          value={isLoadingBalance ? 'Cargando...' : (loansBalance === null ? 'No disponible' : formatCurrency(loansBalance))}
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
    </div>
  );
}

export default DashboardPage;
