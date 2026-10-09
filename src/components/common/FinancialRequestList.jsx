import {
  AlertCircle,
  ArrowDown,
  ArrowDownToLine,
  ArrowRightLeft,
  ArrowUp,
  ArrowUpDown,
  Clock,
  CreditCard,
  ChevronDown,
  ExternalLink,
  FileText,
  Filter,
  History,
  Pause,
  Pencil,
  Play,
  PlusCircle,
  RefreshCw,
  Search,
  TrendingUp,
  X,
  Banknote,
  WalletCards,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Alert from './Alert.jsx';
import Button from './Button.jsx';
import Input from './Input.jsx';
import {
  updateSavingsFee,
  transferSavings,
  withdrawSavings,
  getSavingsMovements,
  pauseSavings,
  resumeSavings,
} from '../../features/savings/services/savingsService.js';
import { normalizeApiError } from '../../api/apiUtils.js';
import { calculateSavingsProjection } from '../../features/savings/utils/savingsProjection.js';
import SavingsProjectionModal from '../../features/savings/components/SavingsProjectionModal.jsx';
import SavingsStatementModal from '../../features/savings/components/SavingsStatementModal.jsx';
import SavingsLifecycleAlertBanner from '../../features/savings/components/SavingsLifecycleAlertBanner.jsx';
import SavingsVoluntaryDepositModal from '../../features/savings/components/SavingsVoluntaryDepositModal.jsx';
import InvestmentStatementModal from '../../features/investments/components/InvestmentStatementModal.jsx';
import { getInvestmentMovements } from '../../features/investments/services/investmentService.js';
import LoanLifecycleAlertBanner from '../../features/loans/components/LoanLifecycleAlertBanner.jsx';
import LoanAbonoModal from '../../features/loans/components/LoanAbonoModal.jsx';
import LoanKardexTable from '../../features/loans/components/LoanKardexTable.jsx';
import LoanStatementModal from '../../features/loans/components/LoanStatementModal.jsx';
import { getLoanMovements } from '../../features/loans/services/loanService.js';

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

  if (Array.isArray(value)) {
    const firstReadable = value.map((item) => formatText(item, '')).find(Boolean);
    return firstReadable || fallback;
  }

  if (typeof value === 'object') {
    const readableValue = [
      value.nombre,
      value.label,
      value.name,
      value.titulo,
      value.title,
      value.tipo_ahorro,
      value.tipo,
    ]
      .map((candidate) => formatText(candidate, ''))
      .find(Boolean);

    return readableValue || (value.id !== undefined ? `Plan #${value.id}` : fallback);
  }

  return fallback;
}

function normalizeText(value) {
  return formatText(value, '').toLowerCase();
}

function formatMoney(value) {
  if (value === null || value === undefined || value === '') {
    return 'No definido';
  }

  if (typeof value === 'object') {
    return formatMoney(
      value.monto
      ?? value.monto_ahorro
      ?? value.monto_min
      ?? value.cantidad
      ?? value.cuota
      ?? value.total
      ?? value.saldo,
    );
  }

  const normalized = typeof value === 'string' ? value.replace(/[$,\s]/g, '') : value;
  const number = Number(normalized);

  if (!Number.isFinite(number)) {
    return formatText(value);
  }

  return new Intl.NumberFormat('es-MX', {
    currency: 'MXN',
    maximumFractionDigits: 2,
    style: 'currency',
  }).format(number);
}

function formatDate(value) {
  if (!value) {
    return 'Sin fecha';
  }

  if (typeof value === 'object' && !(value instanceof Date)) {
    return formatDate(value.fecha_inicio || value.fecha_solicitud || value.fecha_registro || value.created_at || value.fecha);
  }

  let date;
  if (value instanceof Date) {
    date = value;
  } else if (typeof value === 'string') {
    const cleanStr = value.trim().replace(' ', 'T');
    if (/^\d{4}-\d{2}-\d{2}$/.test(cleanStr)) {
      date = new Date(`${cleanStr}T00:00:00`);
    } else {
      date = new Date(cleanStr);
    }
  } else {
    date = new Date(value);
  }

  if (Number.isNaN(date.getTime())) {
    return formatText(value, 'Sin fecha');
  }

  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function statusLabel(value) {
  if (typeof value === 'boolean') {
    return value ? 'Activo' : 'Inactivo';
  }

  if (typeof value === 'object') {
    return statusLabel(value.status ?? value.estado ?? value.estatus ?? value.activo ?? value.nombre ?? value.label);
  }

  const normalized = String(value ?? '').toLowerCase();

  if (normalized === '0' || normalized.includes('pend')) {
    return 'Pendiente';
  }

  if (normalized === '1' || normalized.includes('aprob') || normalized.includes('activo')) {
    return 'Activo';
  }

  if (normalized === '2' || normalized.includes('cerr')) {
    return 'Cerrado';
  }

  if (normalized === '4' || normalized.includes('rechaz') || normalized.includes('cancel')) {
    return 'Rechazado';
  }

  return formatText(value, 'Sin estado');
}

function statusTone(value) {
  const normalized = statusLabel(value).toLowerCase();

  if (normalized.includes('pag') || normalized.includes('aprob') || normalized.includes('activo') || normalized.includes('confirm') || normalized.includes('vigent') || normalized.includes('liquid') || normalized.includes('transfer')) {
    return 'success';
  }

  if (normalized.includes('pend') || normalized.includes('por vencer') || normalized.includes('paus')) {
    return 'warning';
  }

  if (normalized.includes('revision') || normalized.includes('revisi')) {
    return 'info';
  }

  if (normalized.includes('rechaz') || normalized.includes('cancel') || normalized.includes('cerr') || normalized.includes('vencid') || normalized.includes('atras')) {
    return 'danger';
  }

  return 'neutral';
}

function formatMovementType(tipo) {
  const map = {
    META_CUMPLIDA: 'Meta Cumplida',
    REINVERSION: 'Reinversión',
    TRANSFER: 'Transferencia Enviada',
    TRANSFER_IN: 'Transferencia Recibida',
    RETIRO: 'Retiro',
    CAMBIO_CUOTA: 'Cambio Cuota',
    APORTACION: 'Aportación Nómina',
    DEPOSITO: 'Aportación Nómina',
    APORTACION_VOLUNTARIA: 'Aportación Voluntaria',
    DEPOSITO_EXTRAORDINARIO: 'Aportación Voluntaria',
    INTERES: 'Rendimiento',
    RENDIMIENTO: 'Rendimiento',
  };
  return map[String(tipo ?? '').trim().toUpperCase()] || tipo || 'Movimiento';
}


function getMovementConcept(mov) {
  let obs = String(mov?.observaciones ?? '').trim();
  
  if (Number(mov?.mora_generada) > 0 && Number(mov?.monto) > 0) {
    const moraStr = `(Penalización aplicada: ${formatMoney(mov.mora_generada)})`;
    obs = obs && obs !== '-' ? `${obs} ${moraStr}` : moraStr;
  }
  
  if (obs && obs !== '-') {
    return obs;
  }
  if (mov?.metodo_pago && String(mov.metodo_pago).trim()) {
    return `Pago vía ${mov.metodo_pago}`;
  }
  const t = String(mov?.tipo ?? '').trim().toUpperCase();
  if (t.includes('DEP') || t.includes('APORT')) {
    return 'Aportación vía nómina';
  }
  if (t === 'RETIRO') return 'Retiro de ahorro';
  if (t === 'META_CUMPLIDA') return 'Meta de ahorro cumplida';
  if (t === 'REINVERSION') return 'Re-inversión automática de saldo remanente';
  if (t === 'TRANSFER') return 'Transferencia enviada';
  if (t === 'TRANSFER_IN') return 'Transferencia recibida';
  if (t === 'CAMBIO_CUOTA') return 'Actualización de cuota';
  return 'Movimiento de ahorro';
}

function formatMovementDate(fechaStr) {
  if (!fechaStr) return '';
  const date = new Date(String(fechaStr).replace(' ', 'T'));
  if (isNaN(date.getTime())) return fechaStr;
  return date.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getAmount(item) {
  return getValue(item, [
    'cantidad',
    'monto',
    'monto_ahorro',
    'cantidad_inversion',
    'cantidad_prestamo',
    'total',
    'saldo',
  ]);
}

function getTitle(item, fallback) {
  const value = getValue(item, [
    'nombre',
    'name',
    'titulo',
    'title',
    'plan',
    'tipo_ahorro',
    'ahorro',
    'inversion',
    'prestamo',
    'tipo',
    'concepto',
    'id_activo',
    'ahorro_id',
    'id',
  ]);

  return formatText(value, fallback);
}

function getDate(item) {
  return getValue(item, [
    'fecha_inicio',
    'fecha_solicitud',
    'fecha_registro',
    'created_at',
    'fecha',
  ]);
}

function getEndDate(item) {
  const explicit = getValue(item, [
    'fecha_fin',
    'fecha_final',
    'fecha_vencimiento',
    'end_date',
  ]);
  if (explicit) {
    return explicit;
  }

  // Fallback si no tiene fecha_fin explícita, pero el plan tiene mes y día de corte (ej. Meta Navideña o Verano)
  const mesCorte = item?.plan?.mes_corte ?? item?.mes_corte;
  const diaCorte = item?.plan?.dia_corte ?? item?.dia_corte;
  if (mesCorte && diaCorte) {
    const now = new Date();
    const startDate = item?.fecha_inicio ? new Date(String(item.fecha_inicio).replace(' ', 'T')) : now;
    let targetYear = startDate.getFullYear();
    const targetMonth = Number(mesCorte) - 1;
    const targetDay = Number(diaCorte);
    const targetDate = new Date(targetYear, targetMonth, targetDay);
    if (targetDate <= startDate) {
      targetYear += 1;
    }
    return `${targetYear}-${String(mesCorte).padStart(2, '0')}-${String(targetDay).padStart(2, '0')} 00:00:00`;
  }

  return null;
}

function getStatus(item) {
  return getValue(item, ['estado', 'estatus', 'status', 'activo']);
}

function getPaymentMethod(item) {
  return getValue(item, [
    'metodo_pago',
    'payment_method',
    'pay_method',
    'pago_inicial',
    'forma_pago',
  ]);
}

function getStripeStatus(item) {
  return getValue(item, [
    'stripe_status',
    'estado_stripe',
    'payment_status',
    'estatus_pago',
    'estado_pago',
    'pagado',
  ]);
}

function getCheckoutUrl(item) {
  return getValue(item, [
    'checkout_url',
    'stripe_url',
    'url_checkout',
    'payment_url',
    'url_pago',
  ]);
}

function resolveMovementStatusBadge(item, type = 'general') {
  const statusRaw = getValue(item, ['estado', 'estatus', 'status', 'activo']);
  const statusNum = Number(statusRaw ?? 0);
  const statusLabelBackend = item?.status_label || null;

  if (type === 'investments') {
    if (statusNum === 1 || statusNum === 2) {
      const fechaFin = item?.fecha_fin || getEndDate(item);
      if (fechaFin) {
        const today = new Date().toISOString().slice(0, 10);
        const diffMs = new Date(fechaFin).getTime() - new Date(today).getTime();
        const diasRestantes = Math.ceil(diffMs / 86400000);
        if (diasRestantes < 0) {
          return { label: 'Concluida', tone: 'neutral' };
        }
        if (diasRestantes <= 30) {
          return { label: 'Por Vencer', tone: 'warning' };
        }
      }
      return { label: statusLabelBackend || 'Vigente', tone: 'success' };
    }
    if (statusNum === 0 || statusNum === 5) {
      return { label: statusLabelBackend || 'En Revisión', tone: 'info' };
    }
    if (statusNum === 3 || statusNum === 4) {
      return { label: statusLabelBackend || 'Liquidada', tone: 'neutral' };
    }
    return { label: statusLabel(statusRaw), tone: statusTone(statusRaw) };
  }

  if (type === 'deposits' || type === 'depositos') {
    if (statusNum === 0) return { label: 'Pendiente', tone: 'warning' };
    if (statusNum === 1) return { label: 'Aprobado', tone: 'success' };
    if (statusNum === 4 || statusNum === 2) return { label: 'Rechazado', tone: 'danger' };
    return { label: statusLabel(statusRaw), tone: statusTone(statusRaw) };
  }

  if (type === 'withdrawals' || type === 'retiros') {
    if (statusNum === 3 || statusNum === 4) return { label: 'Transferido', tone: 'success' };
    if (statusNum === 2 || statusNum === 5) return { label: 'Rechazado', tone: 'danger' };
    if (statusNum === 1) {
      if (item?.fecha_aprobacion || item?.fecha_transferencia) {
        return { label: 'Transferido', tone: 'success' };
      }
      return { label: 'Pendiente', tone: 'warning' };
    }
    if (statusNum === 0) return { label: 'Pendiente', tone: 'warning' };
    return { label: statusLabel(statusRaw), tone: statusTone(statusRaw) };
  }

  if (type === 'loans') {
    if (statusNum === 1 || statusNum === 6) return { label: 'Liquidado', tone: 'success' };
    if (statusNum === 5) {
      if (Number(item?.mora_acumulada ?? 0) > 0 || Number(item?.num_atrasos ?? 0) > 0) {
        return { label: 'Con Atraso', tone: 'danger' };
      }
      return { label: 'Activo', tone: 'success' };
    }
    if (statusNum === 7) return { label: 'Aprobado • Por Dispersar', tone: 'info' };
    if (statusNum === 0 || statusNum === 2) return { label: 'En Revisión', tone: 'warning' };
    if (statusNum === 3 || statusNum === 4) return { label: 'Rechazado', tone: 'danger' };
    return { label: statusLabel(statusRaw), tone: statusTone(statusRaw) };
  }

  // Fallback if item has explicit status_label from backend
  if (statusLabelBackend) {
    const norm = statusLabelBackend.toLowerCase();
    if (norm.includes('vencid') || norm.includes('rechaz') || norm.includes('atras') || norm.includes('cancel')) {
      return { label: statusLabelBackend, tone: 'danger' };
    }
    if (norm.includes('por vencer') || norm.includes('pend') || norm.includes('paus')) {
      return { label: statusLabelBackend, tone: 'warning' };
    }
    if (norm.includes('revis')) {
      return { label: statusLabelBackend, tone: 'info' };
    }
    if (norm.includes('vigent') || norm.includes('activ') || norm.includes('aprob') || norm.includes('transfer') || norm.includes('liquidado')) {
      return { label: statusLabelBackend, tone: 'success' };
    }
    if (norm.includes('liquidada') || norm.includes('cerr')) {
      return { label: statusLabelBackend, tone: 'neutral' };
    }
    return { label: statusLabelBackend, tone: 'neutral' };
  }

  return { label: statusLabel(statusRaw), tone: statusTone(statusRaw) };
}

function getRecordDetails(item, type) {
  const commonDetails = [
    ['Plan', getValue(item, ['plan', 'ahorro', 'inversion', 'prestamo', 'tipo_ahorro', 'tipo'])],
    ['Fecha inicio', getDate(item), 'date'],
    ['Fecha fin', getEndDate(item), 'date'],
    ['Metodo de pago', getPaymentMethod(item)],
    ['Stripe', getStripeStatus(item), 'status'],
  ];

  if (type === 'savings') {
    const frequency = item?.frecuencia_pago || 'Semanal';
    const yieldText = item?.rendimiento !== null && item?.rendimiento !== undefined
      ? `${item.rendimiento}% anual`
      : (item?.plan?.rendimiento ? `${item.plan.rendimiento}% anual` : 'No definido');
    const endDate = getEndDate(item);

    return [
      ['Cuota obligatoria', `${formatMoney(item?.cuota)} (${frequency})`],
      ['Rendimiento anual', yieldText],
      ['Fecha inicio', getDate(item), 'date'],
      ['Fecha término / corte', endDate ? endDate : 'Sin corte (Siempre disponible)', endDate ? 'date' : undefined],
    ];
  }

  if (type === 'investments') {
    return [
      ['Monto invertido', getValue(item, ['cantidad', 'monto', 'monto_invertido', 'total']), 'money'],
      ['Rendimiento', getValue(item, ['rendimiento', 'porcentaje', 'tasa'])],
      ['Fecha', getDate(item), 'date'],
      ['Plan', getValue(item, ['plan', 'inversion', 'tipo', 'id_activo'])],
      ['Estado de pago', getStripeStatus(item), 'status'],
    ];
  }

  if (type === 'loans') {
    return [
      ['Monto solicitado', getValue(item, ['cantidad', 'monto', 'cantidad_prestamo', 'monto_solicitado']), 'money'],
      ['Plan', getValue(item, ['plan', 'prestamo', 'tipo', 'id_activo'])],
      ['Fecha', getDate(item), 'date'],
      ['Aval', getValue(item, ['aval', 'codigo_aval', 'avalista'])],
      ['Documentos', getValue(item, ['documentos', 'docs', 'archivos'])],
      ['Metodo de pago', getPaymentMethod(item)],
    ];
  }

  return commonDetails;
}

function getPlanDetails(item) {
  const source = getValue(item, ['plan', 'ahorro', 'tipo_ahorro', 'id_activo', 'ahorro_id']) || item;

  if (!source || typeof source !== 'object') {
    return [];
  }

  return [
    ['Tipo', source.tipo_ahorro || source.tipo],
    ['Rendimiento', source.rendimiento],
    ['Monto minimo', source.monto_min],
    ['Meses minimos', source.meses_minimos],
    ['Temporada', source.is_temporada],
    ['Estado', source.status],
  ].filter(([, value]) => value !== undefined && value !== null && value !== '');
}

function formatDetailValue(label, value, kind) {
  if (kind === 'money') {
    return formatMoney(value);
  }

  if (kind === 'date') {
    return formatDate(value);
  }

  if (kind === 'status') {
    return statusLabel(value);
  }

  if (label === 'Monto minimo') {
    return formatMoney(value);
  }

  if (label === 'Estado') {
    return statusLabel(value);
  }

  return formatText(value);
}

function isPaymentPending(item) {
  const paymentStatus = normalizeText(getStripeStatus(item));
  const status = normalizeText(getStatus(item));

  return paymentStatus.includes('pend') || status.includes('pend') || paymentStatus === 'no' || paymentStatus === 'false';
}

function matchesSearch(item, query) {
  if (!query) {
    return true;
  }

  const searchable = [
    getTitle(item, ''),
    getStatus(item),
    getAmount(item),
    getDate(item),
    getEndDate(item),
    getPaymentMethod(item),
    getStripeStatus(item),
    ...getPlanDetails(item).map(([, value]) => value),
  ].map((value) => normalizeText(value)).join(' ');

  return searchable.includes(query.toLowerCase());
}

function FinancialRequestList({
  emptyDescription,
  emptyTitle,
  error,
  isLoading,
  items,
  plans = [],
  suggestedFrequency = 'Semanal',
  salaryCapacity = null,
  onRefresh,
  onCancelLoan,
  activeLoanTab: controlledLoanTab,
  onLoanTabChange,
  searchable = false,
  title,
  type = 'general',
}) {
  const [query, setQuery] = useState('');
  const [internalLoanTab, setInternalLoanTab] = useState('current');
  const loanTab = controlledLoanTab ?? internalLoanTab;
  const setLoanTab = onLoanTabChange ?? setInternalLoanTab;
  const hasAutoSwitchedLoanTabRef = useRef(false);

  const [activeAction, setActiveAction] = useState(null); // { type: 'fee' | 'transfer' | 'withdraw' | 'kardex', item }
  const [actionFee, setActionFee] = useState('');
  const [actionAmount, setActionAmount] = useState('');
  const [actionDestinoId, setActionDestinoId] = useState('');
  const [actionPausePeriodos, setActionPausePeriodos] = useState(4);
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [kardexMovements, setKardexMovements] = useState([]);
  const [isKardexLoading, setIsKardexLoading] = useState(false);
  const [kardexSearch, setKardexSearch] = useState('');
  const [kardexFilterType, setKardexFilterType] = useState('ALL');
  const [kardexAccountFilter, setKardexAccountFilter] = useState('ALL');
  const [kardexSortField, setKardexSortField] = useState('fecha');
  const [kardexSortDirection, setKardexSortDirection] = useState('desc'); // 'asc' | 'desc'
  const [isProjectionOpen, setIsProjectionOpen] = useState(false);
  const [isStatementOpen, setIsStatementOpen] = useState(false);
  const [statementInitialId, setStatementInitialId] = useState('ALL');
  const [voluntaryDepositAhorro, setVoluntaryDepositAhorro] = useState(null);
  const [selectedLoanForAbono, setSelectedLoanForAbono] = useState(null);
  const [expandedItemIds, setExpandedItemIds] = useState(new Set());

  const toggleItemExpanded = (id) => {
    setExpandedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const maxFeeAllowed = useMemo(() => {
    if (!salaryCapacity || !salaryCapacity.max_cuota_permitida || !activeAction?.item) return null;
    const currentItemCuota = Number(activeAction.item.cuota ?? 0);
    const otherCommitted = Math.max(0, Number(salaryCapacity.cuota_comprometida ?? 0) - currentItemCuota);
    return Math.max(0, Number((salaryCapacity.max_cuota_permitida - otherCommitted).toFixed(2)));
  }, [salaryCapacity, activeAction]);

  const handleOpenStatement = (ahorroId = 'ALL') => {
    setStatementInitialId(ahorroId ? String(ahorroId) : 'ALL');
    setIsStatementOpen(true);
  };

  const filteredItems = useMemo(
    () => items.filter((item) => matchesSearch(item, query.trim())),
    [items, query],
  );

  // Classify loans into current/active vs history/cancelled
  const currentLoans = useMemo(() => {
    if (type !== 'loans') return [];
    return filteredItems.filter((it) => {
      const s = Number(it.status ?? it.id_status ?? 0);
      return [2, 5].includes(s);
    });
  }, [filteredItems, type]);

  const historyLoans = useMemo(() => {
    if (type !== 'loans') return [];
    return filteredItems.filter((it) => {
      const s = Number(it.status ?? it.id_status ?? 0);
      return ![2, 5].includes(s);
    });
  }, [filteredItems, type]);

  // Dynamic Investment Portfolio KPIs computed from active filter
  const investmentStats = useMemo(() => {
    if (type !== 'investments' || !items.length) {
      return null;
    }

    let totalCapital = 0;
    let totalRendimientos = 0;
    let totalSaldoVivo = 0;
    let weightedYieldSum = 0;
    let totalCapitalForYield = 0;
    let activeCount = 0;
    let concludedCount = 0;

    const todayStr = new Date().toISOString().slice(0, 10);
    const todayMs = new Date(todayStr).getTime();

    filteredItems.forEach((item) => {
      const cap = Number(item.cantidad || item.inversion || item.monto || 0);
      const rend = Number(item.rendimiento_generado_hoy ?? item.rendimiento_generado ?? item.interes_acumulado ?? 0);
      const saldo = Number(item.capital_actual_hoy ?? item.capital_actual ?? (cap + rend));
      const statusRaw = getValue(item, ['estado', 'estatus', 'status', 'activo']);
      const statusNum = Number(statusRaw ?? 0);

      const endDate = item.fecha_fin || getEndDate(item);
      let diasRestantes = null;
      if (endDate) {
        const endMs = new Date(String(endDate).slice(0, 10)).getTime();
        diasRestantes = Math.ceil((endMs - todayMs) / 86400000);
      }

      const isApprovedActive = (statusNum === 1 || statusNum === 2) && item.payment_status !== 'pending' && Boolean(item.fecha_inicio);

      if (isApprovedActive) {
        if (diasRestantes !== null && diasRestantes < 0) {
          concludedCount += 1;
        } else {
          activeCount += 1;
          totalCapital += cap;
          totalRendimientos += rend;
          totalSaldoVivo += saldo;

          const tasa = item.rendimiento !== null && item.rendimiento !== undefined
            ? Number(item.rendimiento)
            : (item.plan?.rendimiento ? Number(item.plan.rendimiento) : null);

          if (tasa !== null && cap > 0) {
            weightedYieldSum += cap * tasa;
            totalCapitalForYield += cap;
          }
        }
      } else if (statusNum === 3 || statusNum === 4) {
        concludedCount += 1;
      }
    });

    const avgYield = totalCapitalForYield > 0
      ? (weightedYieldSum / totalCapitalForYield).toFixed(1)
      : null;

    return {
      totalCapital,
      totalRendimientos,
      totalSaldoVivo,
      activeCount,
      concludedCount,
      avgYield,
      totalCount: filteredItems.length,
    };
  }, [type, items.length, filteredItems]);

  useEffect(() => {
    if (type === 'loans' && !hasAutoSwitchedLoanTabRef.current && items.length > 0) {
      hasAutoSwitchedLoanTabRef.current = true;
      const hasCurrent = items.some((it) => [2, 5].includes(Number(it.status ?? it.id_status ?? 0)));
      if (!hasCurrent) {
        setLoanTab('history');
      }
    }
  }, [items, type, setLoanTab]);

  const destinationOptions = useMemo(() => {
    if (!activeAction || activeAction.type !== 'transfer' || !activeAction.item) return [];
    return items.filter(
      (other) => String(other.id) !== String(activeAction.item.id) && Number(other.status) === 1
    );
  }, [items, activeAction]);

  const currentItemFreq = useMemo(() => {
    const raw = String(activeAction?.item?.frecuencia_pago || suggestedFrequency || 'Semanal').toLowerCase();
    if (raw.includes('quin') || raw.includes('15')) {
      return {
        type: 'quincenal',
        label: 'Quincenal',
        singular: 'quincena',
        plural: 'quincenas',
        options: [
          { value: 1, label: '1 quincena (15 días aprox.)' },
          { value: 2, label: '2 quincenas (~1 mes)' },
          { value: 4, label: '4 quincenas (~2 meses)' },
        ],
      };
    }
    if (raw.includes('mens') || raw.includes('30')) {
      return {
        type: 'mensual',
        label: 'Mensual',
        singular: 'mes',
        plural: 'meses',
        options: [
          { value: 1, label: '1 mes (30 días aprox.)' },
          { value: 2, label: '2 meses (~60 días)' },
          { value: 3, label: '3 meses (~90 días)' },
        ],
      };
    }
    return {
      type: 'semanal',
      label: 'Semanal',
      singular: 'semana',
      plural: 'semanas',
      options: [
        { value: 1, label: '1 semana (~7 días)' },
        { value: 2, label: '2 semanas (~15 días)' },
        { value: 4, label: '4 semanas (~1 mes)' },
        { value: 8, label: '8 semanas (~2 meses)' },
      ],
    };
  }, [activeAction?.item?.frecuencia_pago, suggestedFrequency]);

  const handleToggleKardexSort = (field) => {
    if (kardexSortField === field) {
      setKardexSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setKardexSortField(field);
      setKardexSortDirection(field === 'fecha' || field === 'monto' || field === 'saldo' ? 'desc' : 'asc');
    }
  };

  const processedKardexMovements = useMemo(() => {
    let list = [...kardexMovements];

    if (kardexSearch.trim()) {
      const q = kardexSearch.toLowerCase().trim();
      list = list.filter((m) => {
        const ahorroStr = type === 'loans'
          ? String(m.metodo_pago ?? '').toLowerCase()
          : (type === 'investments' ? String(m.inversion_nombre ?? '').toLowerCase() : String(m.ahorro_nombre ?? '').toLowerCase());
        const typeStr = formatMovementType(m.tipo).toLowerCase();
        const obsStr = getMovementConcept(m).toLowerCase();
        const dateStr = formatMovementDate(m.fecha).toLowerCase();
        const amountStr = String(m.monto ?? '');
        return ahorroStr.includes(q) || typeStr.includes(q) || obsStr.includes(q) || dateStr.includes(q) || amountStr.includes(q);
      });
    }

    if (kardexAccountFilter !== 'ALL') {
      const selectedItem = items.find((it) => String(it.id) === String(kardexAccountFilter));
      const planName = selectedItem ? getTitle(selectedItem, '').toLowerCase() : '';
      list = list.filter((m) => {
        const directMatch = String(m.id_ahorro ?? m.id_inversion) === String(kardexAccountFilter);
        const transferMatch = planName && getMovementConcept(m).toLowerCase().includes(planName);
        return directMatch || transferMatch;
      });
    }

    if (kardexFilterType !== 'ALL') {
      list = list.filter((m) => {
        const t = String(m.tipo ?? '').toUpperCase();
        if (type === 'loans') {
          if (kardexFilterType === 'PAGO_REGULAR') return Number(m.monto) > 0 || t.includes('PAGO') || t.includes('ABONO') || t.includes('NÓMINA');
          if (kardexFilterType === 'MORA') return Number(m.monto) < 0 || t.includes('CARGO_MORATORIO') || t.includes('INTERES_MORATORIO');
          if (kardexFilterType === 'LIQUIDACION') return t.includes('LIQUID');
        } else {
          if (kardexFilterType === 'APORTACION') return t.includes('APORT') || t.includes('DEP');
          if (kardexFilterType === 'RENDIMIENTO') return t.includes('INT') || t.includes('REND');
          if (kardexFilterType === 'RETIRO') return t === 'RETIRO' || t === 'LIQUIDACION';
          if (kardexFilterType === 'TRANSFER') return t.includes('TRANSFER');
          if (kardexFilterType === 'META') return t === 'META_CUMPLIDA' || t === 'REINVERSION';
        }
        return true;
      });
    }

    list.sort((a, b) => {
      let valA = 0;
      let valB = 0;

      if (kardexSortField === 'fecha') {
        valA = a.fecha ? new Date(String(a.fecha).replace(' ', 'T')).getTime() : 0;
        valB = b.fecha ? new Date(String(b.fecha).replace(' ', 'T')).getTime() : 0;
      } else if (kardexSortField === 'ahorro') {
        valA = type === 'loans' ? String(a.metodo_pago ?? '').toLowerCase() : (type === 'investments' ? String(a.inversion_nombre ?? '').toLowerCase() : String(a.ahorro_nombre ?? '').toLowerCase());
        valB = type === 'loans' ? String(b.metodo_pago ?? '').toLowerCase() : (type === 'investments' ? String(b.inversion_nombre ?? '').toLowerCase() : String(b.ahorro_nombre ?? '').toLowerCase());
      } else if (kardexSortField === 'tipo') {
        valA = formatMovementType(a.tipo).toLowerCase();
        valB = formatMovementType(b.tipo).toLowerCase();
      } else if (kardexSortField === 'observaciones') {
        valA = getMovementConcept(a).toLowerCase();
        valB = getMovementConcept(b).toLowerCase();
      } else if (kardexSortField === 'monto') {
        valA = Number(a.monto ?? 0);
        valB = Number(b.monto ?? 0);
      } else if (kardexSortField === 'saldo') {
        valA = Number(a.saldo_resultante ?? 0);
        valB = Number(b.saldo_resultante ?? 0);
      }

      if (valA < valB) return kardexSortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return kardexSortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [kardexMovements, kardexSearch, kardexAccountFilter, kardexFilterType, kardexSortField, kardexSortDirection, items, type]);

  const kardexSummary = useMemo(() => {
    let totalIngresos = 0;
    let totalEgresos = 0;
    for (const m of processedKardexMovements) {
      const amount = Number(m.monto ?? 0);
      const t = String(m.tipo ?? '').toUpperCase();
      if (t === 'RETIRO' || t === 'TRANSFER' || t === 'LIQUIDACION') {
        totalEgresos += amount;
      } else {
        totalIngresos += amount;
      }
    }
    return { totalIngresos, totalEgresos };
  }, [processedKardexMovements]);

  const handleOpenAction = (actionType, item) => {
    setActiveAction({ type: actionType, item });
    setActionFee(item.cuota ? String(item.cuota) : '');
    setActionAmount('');
    setActionDestinoId('');
    const rawFreq = String(item?.frecuencia_pago || suggestedFrequency || 'Semanal').toLowerCase();
    const defaultPeriods = rawFreq.includes('sem') ? 4 : 2;
    setActionPausePeriodos(defaultPeriods);
    setActionError('');
    setActionSuccess('');

    if (actionType === 'kardex') {
      setIsKardexLoading(true);
      setKardexMovements([]);
      setKardexSearch('');
      setKardexFilterType('ALL');
      setKardexAccountFilter('ALL');
      setKardexSortField('fecha');
      setKardexSortDirection('desc');
      const fetchFn = type === 'loans'
        ? getLoanMovements
        : (type === 'investments' ? getInvestmentMovements : getSavingsMovements);
      fetchFn(item.id)
        .then((res) => {
          setKardexMovements(res?.data ?? []);
        })
        .catch((err) => {
          setActionError(normalizeApiError(err).message || 'No fue posible cargar el historial de movimientos.');
        })
        .finally(() => {
          setIsKardexLoading(false);
        });
    }
  };

  const handleCloseAction = () => {
    if (isSubmittingAction) return;
    setActiveAction(null);
    setActionError('');
    setActionSuccess('');
  };

  const handleSubmitAction = async (e) => {
    if (e) e.preventDefault();
    if (!activeAction || !activeAction.item) return;

    setActionError('');
    setActionSuccess('');
    setIsSubmittingAction(true);

    try {
      if (activeAction.type === 'fee') {
        const feeNum = Number(actionFee);
        if (!Number.isFinite(feeNum) || feeNum <= 0) {
          throw new Error('Ingresa una cuota válida mayor a 0.');
        }
        if (maxFeeAllowed !== null && feeNum > maxFeeAllowed) {
          throw new Error(`La cuota (${formatMoney(feeNum)}) supera tu límite disponible de ${formatMoney(maxFeeAllowed)} (máximo 50% de tu salario por periodo).`);
        }
        const res = await updateSavingsFee(activeAction.item.id, { cuota: feeNum });
        setActionSuccess(res?.message || 'Cuota actualizada correctamente.');
      } else if (activeAction.type === 'transfer') {
        const amountNum = Number(actionAmount);
        if (!actionDestinoId) {
          throw new Error('Selecciona el ahorro destino.');
        }
        if (!Number.isFinite(amountNum) || amountNum <= 0) {
          throw new Error('Ingresa un monto a transferir mayor a 0.');
        }
        if (amountNum > Number(activeAction.item.saldo_disponible ?? 0)) {
          throw new Error('El monto no puede superar tu saldo disponible.');
        }
        const res = await transferSavings(activeAction.item.id, {
          destino_id: actionDestinoId,
          monto: amountNum,
        });
        setActionSuccess(res?.message || 'Transferencia realizada con éxito.');
      } else if (activeAction.type === 'withdraw') {
        const amountNum = Number(actionAmount);
        if (!Number.isFinite(amountNum) || amountNum <= 0) {
          throw new Error('Ingresa un monto a retirar mayor a 0.');
        }
        if (amountNum > Number(activeAction.item.saldo_disponible ?? 0)) {
          throw new Error('El monto no puede superar tu saldo disponible.');
        }
        const res = await withdrawSavings(activeAction.item.id, {
          monto: amountNum,
        });
        setActionSuccess(res?.message || 'Retiro solicitado con éxito.');
      } else if (activeAction.type === 'pause') {
        const res = await pauseSavings(activeAction.item.id, { periodos: actionPausePeriodos });
        setActionSuccess(res?.data?.message || res?.message || 'Aportaciones pausadas temporalmente.');
      } else if (activeAction.type === 'resume') {
        const res = await resumeSavings(activeAction.item.id);
        setActionSuccess(res?.data?.message || res?.message || 'Aportaciones reanudadas con éxito.');
      }

      setTimeout(() => {
        handleCloseAction();
        onRefresh?.();
      }, 1500);
    } catch (err) {
      const normalized = normalizeApiError(err, 'Ocurrió un error al procesar la solicitud.');
      setActionError(normalized.message);
    } finally {
      setIsSubmittingAction(false);
    }
  };

  return (
    <section className="request-list motion-scroll" aria-live="polite">
      <div className="request-list-heading">
        <h2>{title}</h2>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {(type === 'savings' || type === 'investments' || type === 'loans') && items.length > 0 && (
            <Button
              className="button-secondary icon-button"
              style={{ fontSize: '0.78rem', minHeight: '34px', padding: '6px 12px' }}
              onClick={() => handleOpenStatement('ALL')}
              title="Descargar Estado de Cuenta Oficial en PDF"
            >
              <FileText size={15} aria-hidden="true" />
              Estado de Cuenta
            </Button>
          )}
          {type === 'savings' && items.length > 0 && (
            <Button
              className="button-secondary icon-button"
              style={{ fontSize: '0.78rem', minHeight: '34px', padding: '6px 12px' }}
              onClick={() => setIsProjectionOpen(true)}
              title="Ver proyección estimada de ahorro"
            >
              <TrendingUp size={15} aria-hidden="true" />
              Proyección de Ahorro
            </Button>
          )}
          {onRefresh && (
            <Button className="button-secondary icon-button" disabled={isLoading} onClick={onRefresh}>
              <RefreshCw size={18} aria-hidden="true" />
              Actualizar
            </Button>
          )}
        </div>
      </div>

      {/* Dynamic Investment Portfolio KPIs Header */}
      {type === 'investments' && investmentStats && (
        <div className="investment-kpi-summary-grid motion-immediate" aria-label="Métricas del portafolio de inversión">
          {/* 1. Valor Portafolio */}
          <article className="investment-kpi-card">
            <div className="investment-kpi-card-top">
              <span className="investment-kpi-card-label">Valor Portafolio</span>
              <div
                className="investment-kpi-card-icon"
                style={{
                  background: 'linear-gradient(135deg, rgba(107, 33, 168, 0.12), rgba(147, 51, 234, 0.05))',
                  border: '1px solid rgba(168, 85, 247, 0.28)',
                  color: 'var(--color-primary)',
                }}
              >
                <WalletCards size={16} aria-hidden="true" />
              </div>
            </div>
            <strong className="investment-kpi-card-value" style={{ color: 'var(--purple-950)' }}>
              {formatMoney(investmentStats.totalSaldoVivo)}
            </strong>
            <span className="investment-kpi-card-helper" style={{ color: '#64748b' }}>
              Capital activo + rendimientos
            </span>
            <div
              className="investment-kpi-card-accent"
              style={{ background: 'linear-gradient(90deg, var(--color-primary), #a855f7 70%, var(--color-success))' }}
              aria-hidden="true"
            />
          </article>

          {/* 2. Capital Invertido */}
          <article className="investment-kpi-card">
            <div className="investment-kpi-card-top">
              <span className="investment-kpi-card-label">Capital Colocado</span>
              <div
                className="investment-kpi-card-icon"
                style={{
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  color: '#2563eb',
                }}
              >
                <Banknote size={16} aria-hidden="true" />
              </div>
            </div>
            <strong className="investment-kpi-card-value" style={{ color: '#0f172a' }}>
              {formatMoney(investmentStats.totalCapital)}
            </strong>
            <span className="investment-kpi-card-helper" style={{ color: '#64748b' }}>
              {investmentStats.totalCount} póliza{investmentStats.totalCount !== 1 ? 's' : ''} en cartera
            </span>
            <div
              className="investment-kpi-card-accent"
              style={{ background: 'linear-gradient(90deg, #2563eb, #60a5fa)' }}
              aria-hidden="true"
            />
          </article>

          {/* 3. Ganancia Acumulada */}
          <article className="investment-kpi-card">
            <div className="investment-kpi-card-top">
              <span className="investment-kpi-card-label">Ganancia Generada</span>
              <div
                className="investment-kpi-card-icon"
                style={{
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  color: '#16a34a',
                }}
              >
                <TrendingUp size={16} aria-hidden="true" />
              </div>
            </div>
            <strong className="investment-kpi-card-value" style={{ color: '#15803d' }}>
              +{formatMoney(investmentStats.totalRendimientos)}
            </strong>
            <span className="investment-kpi-card-helper" style={{ color: '#16a34a', fontWeight: 600 }}>
              Devengos generados a hoy
            </span>
            <div
              className="investment-kpi-card-accent"
              style={{ background: 'linear-gradient(90deg, #10b981, #34d399)' }}
              aria-hidden="true"
            />
          </article>

          {/* 4. Pólizas Vigentes / Tasa Ponderada */}
          <article className="investment-kpi-card">
            <div className="investment-kpi-card-top">
              <span className="investment-kpi-card-label">Pólizas Vigentes</span>
              <div
                className="investment-kpi-card-icon"
                style={{
                  background: '#faf5ff',
                  border: '1px solid #f3e8ff',
                  color: '#9333ea',
                }}
              >
                <Clock size={16} aria-hidden="true" />
              </div>
            </div>
            <strong className="investment-kpi-card-value" style={{ color: '#581c87' }}>
              {investmentStats.activeCount} activa{investmentStats.activeCount !== 1 ? 's' : ''}
            </strong>
            <span className="investment-kpi-card-helper" style={{ color: '#64748b' }}>
              {investmentStats.avgYield
                ? `Tasa prom.: ${investmentStats.avgYield}% anual`
                : (investmentStats.concludedCount > 0
                    ? `${investmentStats.concludedCount} cumplida${investmentStats.concludedCount !== 1 ? 's' : ''}`
                    : 'En maduración')}
            </span>
            <div
              className="investment-kpi-card-accent"
              style={{ background: 'linear-gradient(90deg, #8b5cf6, #ec4899)' }}
              aria-hidden="true"
            />
          </article>
        </div>
      )}

      {actionSuccess && (
        <div style={{ marginBottom: '14px', position: 'relative' }}>
          <Alert type="success">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <span>{actionSuccess}</span>
              <button
                type="button"
                onClick={() => setActionSuccess('')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: '2px 4px', display: 'flex' }}
                aria-label="Cerrar aviso"
              >
                <X size={16} />
              </button>
            </div>
          </Alert>
        </div>
      )}

      {actionError && !activeAction && (
        <div style={{ marginBottom: '14px', position: 'relative' }}>
          <Alert type="error">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <span>{actionError}</span>
              <button
                type="button"
                onClick={() => setActionError('')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: '2px 4px', display: 'flex' }}
                aria-label="Cerrar aviso"
              >
                <X size={16} />
              </button>
            </div>
          </Alert>
        </div>
      )}

      {type === 'savings' && items.length > 0 && (
        <SavingsLifecycleAlertBanner
          items={items}
          onWithdraw={(item) => handleOpenAction('retirar', item)}
          onTransfer={(item) => handleOpenAction('transferir', item)}
        />
      )}

      {searchable && (
        <label className="request-search">
          <Search size={18} aria-hidden="true" />
          <span className="sr-only">Buscar registros</span>
          <input
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por plan, estado, fecha o metodo"
            type="search"
            value={query}
          />
        </label>
      )}

      {isLoading && (
        <div className="request-list-grid" aria-hidden="true">
          {[0, 1].map((item) => (
            <article className="request-card request-card-skeleton" key={item}>
              <span />
              <span />
              <span />
            </article>
          ))}
        </div>
      )}

      {!isLoading && error && (
        <div className="savings-plans-state savings-plans-error" role="alert">
          <AlertCircle size={34} aria-hidden="true" />
          <div>
            <h3>No se pudo cargar la informacion</h3>
            <p>{error}</p>
          </div>
        </div>
      )}

      {!isLoading && !error && items.length === 0 && (
        <div className="savings-plans-state">
          <div>
            <h3>{emptyTitle}</h3>
            <p>{emptyDescription}</p>
          </div>
        </div>
      )}

      {!isLoading && !error && items.length > 0 && filteredItems.length === 0 && (
        <div className="savings-plans-state">
          <div>
            <h3>No encontramos registros</h3>
            <p>Prueba con otro plan, estado o fecha.</p>
          </div>
        </div>
      )}

      {!isLoading && !error && filteredItems.length > 0 && (
        type === 'savings' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
            {filteredItems.map((item, index) => {
              const itemId = item?.id || item?.folio || item?.plan?.id || item?.ahorro?.id || index;
              const isExpanded = expandedItemIds.has(itemId);
              const status = getStatus(item);
              const isActive = Number(item?.status) === 1 || String(status).toLowerCase().includes('activ');
              const saldoDisp = Number(item?.saldo_disponible ?? 0);
              const frequency = item?.frecuencia_pago || 'Semanal';
              const yieldText = item?.rendimiento !== null && item?.rendimiento !== undefined
                ? `${item.rendimiento}% anual`
                : (item?.plan?.rendimiento ? `${item.plan.rendimiento}% anual` : 'Rendimiento anual');
              const endDate = getEndDate(item);
              const projection = calculateSavingsProjection(item);
              const hasEndDate = Boolean(endDate);
              const isMature = Boolean(item?.en_ventana_retiro);
              const isLockedByTerm = hasEndDate && !isMature;
              const canDebit = !isLockedByTerm && saldoDisp > 0;

              return (
                <article
                  className={`financial-compact-card ${isExpanded ? 'is-expanded' : ''}`}
                  key={itemId}
                >
                  {/* Encabezado interactivo de 2 Líneas */}
                  <div
                    className="financial-compact-header"
                    onClick={() => toggleItemExpanded(itemId)}
                    role="button"
                    tabIndex={0}
                    aria-expanded={isExpanded}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggleItemExpanded(itemId);
                      }
                    }}
                  >
                    {/* Línea 1: Nombre + Badge + Saldo Disponible + Chevron */}
                    <div className="financial-compact-line-1">
                      <div className="financial-compact-title-group">
                        <h3 className="financial-compact-title">
                          {getTitle(item, `Ahorro ${index + 1}`)}
                        </h3>
                        {item.esta_pausado ? (
                          <span
                            style={{
                              margin: 0,
                              fontSize: '0.66rem',
                              padding: '2px 8px',
                              borderRadius: '10px',
                              fontWeight: 600,
                              background: '#fef3c7',
                              color: '#b45309',
                              border: '1px solid #fde68a',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <Pause size={11} aria-hidden="true" />
                            Pausado
                          </span>
                        ) : (
                          <span className={`request-card-label status-${statusTone(status)}`} style={{ margin: 0, fontSize: '0.66rem', padding: '1px 7px', borderRadius: '10px' }}>
                            {statusLabel(status)}
                          </span>
                        )}
                      </div>
                      <div className="financial-compact-amount-group">
                        <span className="financial-compact-amount" style={{ color: saldoDisp > 0 ? '#16a34a' : 'var(--color-primary)' }}>
                          {formatMoney(item.saldo_disponible)}
                        </span>
                        <span className="financial-compact-chevron" aria-hidden="true">
                          <ChevronDown size={17} />
                        </span>
                      </div>
                    </div>

                    {/* Línea 2: Cuota / Frecuencia + Tasa + Vencimiento + Progreso */}
                    <div className="financial-compact-line-2">
                      <div className="financial-compact-subtext">
                        <span>{item.esta_pausado ? 'Aportaciones pausadas' : `${formatMoney(item.cuota)} / ${frequency}`}</span>
                        <span style={{ margin: '0 5px', color: '#cbd5e1' }}>•</span>
                        <span>{yieldText}</span>
                        {endDate && (
                          <>
                            <span style={{ margin: '0 5px', color: '#cbd5e1' }}>•</span>
                            <span style={{ color: '#475569', fontWeight: 600 }}>Vence: {formatDate(endDate)}</span>
                          </>
                        )}
                        {item.en_ventana_retiro && (
                          <>
                            <span style={{ margin: '0 5px', color: '#cbd5e1' }}>•</span>
                            <span style={{ color: '#15803d', fontWeight: 600 }}>🎉 Meta cumplida</span>
                          </>
                        )}
                        {Number(item.monto_pendiente_validacion) > 0 && (
                          <>
                            <span style={{ margin: '0 5px', color: '#cbd5e1' }}>•</span>
                            <span style={{ color: '#d97706', fontWeight: 600 }}>+{formatMoney(item.monto_pendiente_validacion)} en validación</span>
                          </>
                        )}
                      </div>

                      {isActive && projection?.progressPct !== undefined && (
                        <div className="financial-compact-progress-pill" title={`Meta: ${formatMoney(projection.montoProyectado)} (${projection.progressPct}%)`}>
                          <span style={{ fontSize: '0.70rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                            {projection.progressPct}%
                          </span>
                          <div className="financial-compact-micro-bar">
                            <div
                              className="financial-compact-micro-fill"
                              style={{
                                width: `${Math.min(100, projection.progressPct)}%`,
                                background: 'linear-gradient(90deg, #2563eb 0%, #10b981 100%)',
                                boxShadow: '0 0 6px rgba(16, 185, 129, 0.35)',
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Drawer expandible al clic */}
                  {isExpanded && (
                    <div className="financial-expanded-drawer">
                      <div className="financial-drawer-grid">
                        <div className="financial-drawer-field">
                          <span className="financial-drawer-label">Total Ahorrado</span>
                          <span className="financial-drawer-val" style={{ color: 'var(--color-primary)' }}>{formatMoney(item.monto_ahorro)}</span>
                        </div>
                        <div className="financial-drawer-field">
                          <span className="financial-drawer-label">Saldo Disponible</span>
                          <span className="financial-drawer-val" style={{ color: saldoDisp > 0 ? '#16a34a' : '#64748b' }}>{formatMoney(item.saldo_disponible)}</span>
                        </div>
                        <div className="financial-drawer-field">
                          <span className="financial-drawer-label">Cuota Periódica</span>
                          <span className="financial-drawer-val">{item.esta_pausado ? '$0.00 (Pausado)' : `${formatMoney(item.cuota)} (${frequency})`}</span>
                        </div>
                        <div className="financial-drawer-field">
                          <span className="financial-drawer-label">Rendimiento Anual</span>
                          <span className="financial-drawer-val">{yieldText}</span>
                        </div>
                        <div className="financial-drawer-field">
                          <span className="financial-drawer-label">{item.en_ventana_retiro ? 'Límite de Retiro' : 'Vence / Corte'}</span>
                          <span className="financial-drawer-val">
                            {item.en_ventana_retiro && item.fecha_limite_retiro
                              ? formatDate(item.fecha_limite_retiro)
                              : (endDate ? formatDate(endDate) : 'Permanente')}
                          </span>
                        </div>
                        {isActive && projection?.montoProyectado && (
                          <div className="financial-drawer-field">
                            <span className="financial-drawer-label">Meta Proyectada</span>
                            <span className="financial-drawer-val">{formatMoney(projection.montoProyectado)}</span>
                          </div>
                        )}
                        {Number(item.monto_pendiente_validacion) > 0 && (
                          <div className="financial-drawer-field">
                            <span className="financial-drawer-label">En Validación</span>
                            <span className="financial-drawer-val" style={{ color: '#d97706' }}>+{formatMoney(item.monto_pendiente_validacion)}</span>
                          </div>
                        )}
                      </div>

                      {/* Botones de acción */}
                      {isActive && (
                        <div className="financial-drawer-actions">
                          <Button
                            className="button-secondary icon-button"
                            style={{ fontSize: '0.74rem', padding: '6px 12px', minHeight: '32px' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenAction('kardex', item);
                            }}
                            title="Ver historial de movimientos y transacciones"
                          >
                            <History size={13} aria-hidden="true" />
                            Movimientos
                          </Button>
                          <Button
                            className="button-secondary icon-button"
                            style={{ fontSize: '0.74rem', padding: '6px 12px', minHeight: '32px' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenAction('fee', item);
                            }}
                            title="Actualizar cuota periódica de nómina"
                          >
                            <Pencil size={13} aria-hidden="true" />
                            Cuota
                          </Button>
                          <Button
                            className="button-primary icon-button btn-action-primary"
                            style={{
                              fontSize: '0.74rem',
                              padding: '6px 14px',
                              minHeight: '32px',
                              fontWeight: 600,
                              background: '#16a34a',
                              borderColor: '#15803d',
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setVoluntaryDepositAhorro(item);
                            }}
                            title="Realizar una aportación voluntaria a este ahorro (SPEI)"
                          >
                            <PlusCircle size={13} aria-hidden="true" />
                            Aportar
                          </Button>
                          <Button
                            className="button-secondary icon-button"
                            style={{
                              fontSize: '0.74rem',
                              padding: '6px 12px',
                              minHeight: '32px',
                              opacity: canDebit ? 1 : 0.4,
                              cursor: canDebit ? 'pointer' : 'not-allowed',
                            }}
                            disabled={!canDebit}
                            title={
                              isLockedByTerm
                                ? `Meta con plazo: disponible al vencer (${formatDate(endDate)})`
                                : (saldoDisp <= 0 ? 'Sin saldo disponible para transferir' : 'Transferir a otro ahorro')
                            }
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenAction('transfer', item);
                            }}
                          >
                            <ArrowRightLeft size={13} aria-hidden="true" />
                            Transferir
                          </Button>
                          <Button
                            className="button-secondary icon-button"
                            style={{
                              fontSize: '0.74rem',
                              padding: '6px 12px',
                              minHeight: '32px',
                              opacity: canDebit ? 1 : 0.4,
                              cursor: canDebit ? 'pointer' : 'not-allowed',
                            }}
                            disabled={!canDebit}
                            title={
                              isLockedByTerm
                                ? `Meta con plazo: disponible al vencer (${formatDate(endDate)})`
                                : (saldoDisp <= 0 ? 'Sin saldo disponible para retirar' : 'Solicitar retiro')
                            }
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenAction('withdraw', item);
                            }}
                          >
                            <ArrowDownToLine size={13} aria-hidden="true" />
                            Retirar
                          </Button>
                          <Button
                            className="button-secondary icon-button"
                            style={{
                              fontSize: '0.74rem',
                              padding: '6px 12px',
                              minHeight: '32px',
                              color: item.esta_pausado ? '#15803d' : '#64748b',
                              borderColor: item.esta_pausado ? '#86efac' : '#cbd5e1',
                              background: item.esta_pausado ? '#f0fdf4' : '#ffffff',
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenAction(item.esta_pausado ? 'resume' : 'pause', item);
                            }}
                            title={item.esta_pausado ? 'Reanudar aportaciones' : 'Pausar aportaciones temporalmente'}
                          >
                            {item.esta_pausado ? <Play size={12} aria-hidden="true" /> : <Pause size={12} aria-hidden="true" />}
                            {item.esta_pausado ? 'Reanudar' : 'Pausar'}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        ) : type === 'loans' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%' }}>
            {/* Segmented Control Tabs */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
              <div className="loan-tabs-wrapper">
                <button
                  type="button"
                  onClick={() => setLoanTab('current')}
                  className="loan-tab-btn"
                  style={{
                    background: loanTab === 'current' ? '#ffffff' : 'transparent',
                    color: loanTab === 'current' ? '#0f172a' : '#64748b',
                    boxShadow: loanTab === 'current' ? '0 1px 3px rgba(0, 0, 0, 0.08)' : 'none',
                  }}
                >
                  <span
                    style={{
                      display: 'inline-block',
                      width: '7px',
                      height: '7px',
                      borderRadius: '50%',
                      background: currentLoans.length > 0 ? '#10b981' : '#94a3b8',
                    }}
                  />
                  <span>En curso y trámite</span>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      padding: '1px 7px',
                      borderRadius: '8px',
                      background: loanTab === 'current' ? '#f1f5f9' : '#e2e8f0',
                      color: '#475569',
                      fontWeight: 700,
                    }}
                  >
                    {currentLoans.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setLoanTab('history')}
                  className="loan-tab-btn"
                  style={{
                    background: loanTab === 'history' ? '#ffffff' : 'transparent',
                    color: loanTab === 'history' ? '#0f172a' : '#64748b',
                    boxShadow: loanTab === 'history' ? '0 1px 3px rgba(0, 0, 0, 0.08)' : 'none',
                  }}
                >
                  <History size={14} />
                  <span>Historial de préstamos</span>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      padding: '1px 7px',
                      borderRadius: '8px',
                      background: loanTab === 'history' ? '#f1f5f9' : '#e2e8f0',
                      color: '#475569',
                      fontWeight: 700,
                    }}
                  >
                    {historyLoans.length}
                  </span>
                </button>
              </div>
            </div>

            {/* Content for Current/Active Loans Tab */}
            {loanTab === 'current' && (
              currentLoans.length === 0 ? (
                <div style={{ padding: '36px 16px', textAlign: 'center', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                  <Banknote size={36} style={{ color: '#94a3b8', margin: '0 auto 8px', display: 'block' }} />
                  <h4 style={{ margin: '0 0 4px', fontSize: '0.94rem', color: '#334155', fontWeight: 600 }}>
                    No tienes préstamos activos ni solicitudes en trámite
                  </h4>
                  <p style={{ margin: '0 0 12px', fontSize: '0.8rem', color: '#64748b' }}>
                    {historyLoans.length > 0
                      ? 'Tus préstamos concluidos y cancelados están organizados en el Historial.'
                      : 'Cuando solicites un préstamo, podrás darle seguimiento detallado aquí.'}
                  </p>
                  {historyLoans.length > 0 && (
                    <Button
                      type="button"
                      className="button-secondary"
                      style={{ fontSize: '0.78rem', padding: '6px 14px' }}
                      onClick={() => setLoanTab('history')}
                    >
                      <History size={14} />
                      Consultar historial ({historyLoans.length})
                    </Button>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
                  {currentLoans.map((item, index) => {
                    const itemId = item?.id || index;
                    const isExpanded = expandedItemIds.has(itemId);
                    const status = getStatus(item);
                    const statusNum = Number(item?.status ?? item?.id_status ?? 0);
                    const statusStr = String(item?.status_label || status || item?.estado || '').toLowerCase();
                    const isActive = statusNum === 5 || statusStr.includes('activ') || statusStr.includes('vigent');
                    const isDisbursementPending = statusNum === 7 || statusStr.includes('por dispersar');
                    const isPending = (statusNum === 2 || statusStr.includes('revis') || statusStr.includes('pend')) && !isDisbursementPending;
                    const isWaitingAval = isPending && (Boolean(item?.aval_id) || Boolean(item?.aval_token)) && (item?.aval_status === 0 || item?.aval_status === '0');
                    const isLiquidated = statusNum === 1 || statusNum === 6 || statusStr.includes('liquid') || (Number(item?.saldo_restante) <= 0.01 && item?.saldo_restante !== null && item?.saldo_restante !== undefined);

                    const originalAmount = Number(item?.monto_solicitado ?? item?.cantidad ?? item?.monto ?? 0);
                    const totalAdeudo = Number(item?.total_adeudo ?? (originalAmount > 0 ? originalAmount * 1.1 : 0));
                    const saldoRestante = Number(item?.saldo_restante ?? (isLiquidated ? 0 : totalAdeudo));
                    const montoPagado = Number(item?.monto_pagado ?? Math.max(0, totalAdeudo - saldoRestante));
                    const porcentajePagado = Number(item?.porcentaje_pagado ?? (totalAdeudo > 0 ? Math.min(100, Math.round((montoPagado / totalAdeudo) * 100)) : 0));
                    const cuotaFija = Number(item?.cuota_fija ?? (totalAdeudo > 0 ? totalAdeudo / 12 : 0));
                    const frecuencia = item?.frecuencia_pago || 'Semanal';
                    const montoPendiente = Number(item?.monto_pendiente_validacion ?? 0);
                    const moraAcumulada = Number(item?.mora_acumulada ?? 0);
                    const numAtrasos = Number(item?.num_atrasos ?? 0);
                    const planNombre = item?.plan?.nombre || item?.plan?.descripcion || item?.tipo || `Préstamo #${item?.id ?? index + 1}`;
                    const loanEndDate = item?.fecha_vencimiento || item?.fecha_fin || (() => {
                      if (item?.fecha_inicio) {
                        const semanas = Number(item?.semanas || item?.plazo_semanas || 0);
                        if (semanas > 0) {
                          const d = new Date(String(item.fecha_inicio).replace(' ', 'T'));
                          d.setDate(d.getDate() + (semanas * 7));
                          return d;
                        }
                      }
                      return null;
                    })();

                    return (
                      <article
                        className={`financial-compact-card ${isExpanded ? 'is-expanded' : ''}`}
                        key={itemId}
                      >
                        {/* Encabezado interactivo de 2 Líneas */}
                        <div
                          className="financial-compact-header"
                          onClick={() => toggleItemExpanded(itemId)}
                          role="button"
                          tabIndex={0}
                          aria-expanded={isExpanded}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              toggleItemExpanded(itemId);
                            }
                          }}
                        >
                          {/* Línea 1: Nombre + Badge + Adeudo Restante + Chevron */}
                          <div className="financial-compact-line-1">
                            <div className="financial-compact-title-group">
                              <h3 className="financial-compact-title">
                                {planNombre}
                              </h3>
                              <span
                                style={{
                                  fontSize: '0.66rem',
                                  padding: '1px 8px',
                                  borderRadius: '10px',
                                  fontWeight: 600,
                                  background: isLiquidated ? '#dcfce7' : (moraAcumulada > 0 ? '#fee2e2' : (isActive ? '#d1fae5' : isDisbursementPending ? '#e0e7ff' : isWaitingAval ? '#e0e7ff' : isPending ? '#fef3c7' : '#f1f5f9')),
                                  color: isLiquidated ? '#166534' : (moraAcumulada > 0 ? '#991b1b' : (isActive ? '#065f46' : isDisbursementPending ? '#3730a3' : isWaitingAval ? '#3730a3' : isPending ? '#92400e' : '#475569')),
                                  border: `1px solid ${isLiquidated ? '#86efac' : (moraAcumulada > 0 ? '#fca5a5' : (isActive ? '#6ee7b7' : isDisbursementPending ? '#c7d2fe' : isWaitingAval ? '#c7d2fe' : isPending ? '#fde68a' : '#cbd5e1'))}`,
                                }}
                              >
                                {isWaitingAval ? 'Esperando confirmación de aval' : isDisbursementPending ? 'Aprobado • Por Dispersar' : (moraAcumulada > 0 ? 'Con atraso' : (item?.status_label || statusLabel(status)))}
                              </span>
                            </div>
                            <div className="financial-compact-amount-group">
                              <span
                                className="financial-compact-amount"
                                style={{ color: (isLiquidated || saldoRestante === 0) ? '#059669' : (moraAcumulada > 0 ? '#dc2626' : '#0f172a') }}
                              >
                                {formatMoney(saldoRestante)}
                              </span>
                              <span className="financial-compact-chevron" aria-hidden="true">
                                <ChevronDown size={17} />
                              </span>
                            </div>
                          </div>

                          {/* Línea 2: Cuota + Vencimiento + Folio + Amortización % */}
                          <div className="financial-compact-line-2">
                            <div className="financial-compact-subtext">
                              <span>Cuota: {formatMoney(cuotaFija)} ({frecuencia})</span>
                              {loanEndDate && (
                                <>
                                  <span style={{ margin: '0 5px', color: '#cbd5e1' }}>•</span>
                                  <span style={{ color: '#475569', fontWeight: 600 }}>Vence: {formatDate(loanEndDate)}</span>
                                </>
                              )}
                              <span style={{ margin: '0 5px', color: '#cbd5e1' }}>•</span>
                              <span>Folio #{item?.id}</span>
                              {moraAcumulada > 0 && (
                                <>
                                  <span style={{ margin: '0 5px', color: '#cbd5e1' }}>•</span>
                                  <span style={{ color: '#dc2626', fontWeight: 600 }}>Mora: {formatMoney(moraAcumulada)}</span>
                                </>
                              )}
                              {montoPendiente > 0 && (
                                <>
                                  <span style={{ margin: '0 5px', color: '#cbd5e1' }}>•</span>
                                  <span style={{ color: '#d97706', fontWeight: 600 }}>+{formatMoney(montoPendiente)} en validación</span>
                                </>
                              )}
                            </div>

                            <div className="financial-compact-progress-pill" title={`Progreso: ${porcentajePagado}% (${formatMoney(montoPagado)} pagado de ${formatMoney(totalAdeudo)})`}>
                              <span style={{ fontSize: '0.70rem', fontWeight: 700, color: isLiquidated ? '#10b981' : '#2563eb' }}>
                                {porcentajePagado}% pagado
                              </span>
                              <div className="financial-compact-micro-bar">
                                <div
                                  className="financial-compact-micro-fill"
                                  style={{
                                    width: `${Math.min(100, Math.max(0, porcentajePagado))}%`,
                                    background: isLiquidated
                                      ? '#10b981'
                                      : 'linear-gradient(90deg, #3b82f6 0%, #10b981 100%)',
                                    boxShadow: isLiquidated ? '0 0 6px rgba(16, 185, 129, 0.35)' : '0 0 6px rgba(59, 130, 246, 0.3)',
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Drawer expandible al clic */}
                        {isExpanded && (
                          <div className="financial-expanded-drawer">
                            {/* Banner informativo de Dispersión en Curso */}
                            {isDisbursementPending && (
                              <div
                                style={{
                                  padding: '10px 14px',
                                  background: '#f5f3ff',
                                  border: '1px solid #ddd6fe',
                                  borderRadius: '8px',
                                  fontSize: '0.78rem',
                                  color: '#4c1d95',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                }}
                              >
                                <AlertCircle size={15} style={{ color: '#6d28d9', flexShrink: 0 }} />
                                <span>Crédito autorizado por comité. En proceso de dispersión bancaria.</span>
                              </div>
                            )}

                            <div className="financial-drawer-grid">
                              <div className="financial-drawer-field">
                                <span className="financial-drawer-label">Total Adeudo</span>
                                <span className="financial-drawer-val">{formatMoney(totalAdeudo)}</span>
                              </div>
                              <div className="financial-drawer-field">
                                <span className="financial-drawer-label">Monto Pagado</span>
                                <span className="financial-drawer-val" style={{ color: '#16a34a' }}>{formatMoney(montoPagado)}</span>
                              </div>
                              <div className="financial-drawer-field">
                                <span className="financial-drawer-label">Saldo Restante</span>
                                <span className="financial-drawer-val" style={{ color: (isLiquidated || saldoRestante === 0) ? '#059669' : (moraAcumulada > 0 ? '#dc2626' : '#0f172a') }}>
                                  {formatMoney(saldoRestante)}
                                </span>
                              </div>
                              <div className="financial-drawer-field">
                                <span className="financial-drawer-label">Cuota Fija ({frecuencia})</span>
                                <span className="financial-drawer-val">{formatMoney(cuotaFija)}</span>
                              </div>
                              <div className="financial-drawer-field">
                                <span className="financial-drawer-label">Monto Original Solicitado</span>
                                <span className="financial-drawer-val">{formatMoney(originalAmount)}</span>
                              </div>
                              <div className="financial-drawer-field">
                                <span className="financial-drawer-label">Plazo / Semanas</span>
                                <span className="financial-drawer-val">
                                  {item?.plazo_semanas ? `${item.plazo_semanas} semanas` : (item?.cuotas_totales ? `${item.cuotas_totales} cuotas` : 'Estándar')}
                                </span>
                              </div>
                              {item?.aval_nombre && (
                                <div className="financial-drawer-field">
                                  <span className="financial-drawer-label">Aval Asignado</span>
                                  <span className="financial-drawer-val">{item.aval_nombre}</span>
                                </div>
                              )}
                              {moraAcumulada > 0 && (
                                <div className="financial-drawer-field">
                                  <span className="financial-drawer-label">Mora Acumulada</span>
                                  <span className="financial-drawer-val" style={{ color: '#dc2626' }}>
                                    {formatMoney(moraAcumulada)} ({numAtrasos} atraso{numAtrasos !== 1 ? 's' : ''})
                                  </span>
                                </div>
                              )}
                              {montoPendiente > 0 && (
                                <div className="financial-drawer-field">
                                  <span className="financial-drawer-label">Abono en Validación</span>
                                  <span className="financial-drawer-val" style={{ color: '#d97706' }}>
                                    +{formatMoney(montoPendiente)}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Botones de acción */}
                            <div className="financial-drawer-actions">
                              {isActive && saldoRestante > 0 && (
                                <>
                                  <Button
                                    className="button-secondary icon-button"
                                    style={{ fontSize: '0.74rem', padding: '6px 12px', minHeight: '32px' }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenAction('kardex', item);
                                    }}
                                  >
                                    <History size={13} />
                                    Movimientos
                                  </Button>
                                  <Button
                                    variant="outline"
                                    className="button-outline icon-button"
                                    style={{ fontSize: '0.74rem', padding: '6px 12px', minHeight: '32px' }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenStatement(item.id);
                                    }}
                                    title="Generar Estado de Cuenta Oficial en PDF"
                                  >
                                    <FileText size={13} />
                                    Estado de cuenta
                                  </Button>
                                  <Button
                                    className="button-primary icon-button"
                                    style={{
                                      fontSize: '0.74rem',
                                      padding: '6px 14px',
                                      minHeight: '32px',
                                      background: '#059669',
                                      borderColor: '#047857',
                                    }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedLoanForAbono(item);
                                    }}
                                  >
                                    <CreditCard size={13} />
                                    Abonar / Liquidar
                                  </Button>
                                </>
                              )}
                              {isPending && onCancelLoan && (
                                <Button
                                  variant="outline"
                                  className="button-outline icon-button"
                                  style={{
                                    fontSize: '0.74rem',
                                    padding: '6px 12px',
                                    minHeight: '32px',
                                    color: '#dc2626',
                                    borderColor: '#fca5a5',
                                    background: '#ffffff',
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onCancelLoan(item);
                                  }}
                                >
                                  <X size={13} />
                                  Cancelar solicitud
                                </Button>
                              )}
                            </div>
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              )
            )}

            {/* Content for Kardex History Tab */}
            {loanTab === 'history' && (
              <LoanKardexTable items={historyLoans} />
            )}
          </div>
        ) : type === 'investments' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
            {filteredItems.map((item, index) => {
              const itemId = item?.id || item?.folio || item?.plan?.id || index;
              const isExpanded = expandedItemIds.has(itemId);
              const statusBadge = resolveMovementStatusBadge(item, 'investments');
              const capitalInicial = Number(item.cantidad || item.inversion || 0);
              const rendGenerado = Number(item.rendimiento_generado_hoy ?? item.rendimiento_generado ?? item.interes_acumulado ?? 0);
              const capitalActual = Number(item.capital_actual_hoy ?? item.capital_actual ?? (capitalInicial + rendGenerado));
              const tasaAnual = item.rendimiento !== null && item.rendimiento !== undefined
                ? Number(item.rendimiento)
                : (item.plan?.rendimiento ? Number(item.plan.rendimiento) : null);
              const yieldText = tasaAnual !== null ? `${tasaAnual}% anual` : 'Rendimiento pactado';
              const plazoText = item.tiempo ? `${item.tiempo} meses` : (item.plan?.periodo ? `${item.plan.periodo} meses` : 'Estándar');
              const endDate = item.fecha_fin || getEndDate(item);
              const checkoutUrl = getCheckoutUrl(item);
              const isPaymentPendingState = isPaymentPending(item);

              let diasRestantes = null;
              let progresoMaduracion = 100;
              if (endDate && item.fecha_inicio) {
                const startMs = new Date(String(item.fecha_inicio).slice(0, 10)).getTime();
                const endMs = new Date(String(endDate).slice(0, 10)).getTime();
                const nowMs = new Date().getTime();
                const totalDur = endMs - startMs;
                const transcurrido = nowMs - startMs;
                progresoMaduracion = totalDur > 0 ? Math.min(100, Math.max(0, Math.round((transcurrido / totalDur) * 100))) : 100;
                diasRestantes = Math.ceil((endMs - nowMs) / 86400000);
              }

              return (
                <article
                  className={`financial-compact-card ${isExpanded ? 'is-expanded' : ''}`}
                  key={itemId}
                >
                  {/* Encabezado interactivo de 2 Líneas */}
                  <div
                    className="financial-compact-header"
                    onClick={() => toggleItemExpanded(itemId)}
                    role="button"
                    tabIndex={0}
                    aria-expanded={isExpanded}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggleItemExpanded(itemId);
                      }
                    }}
                  >
                    {/* Línea 1: Nombre + Badge + Saldo Actual + Chevron */}
                    <div className="financial-compact-line-1">
                      <div className="financial-compact-title-group">
                        <h3 className="financial-compact-title">
                          {getTitle(item, `Póliza #${item.id || index + 1}`)}
                        </h3>
                        <span className={`request-card-label status-${statusBadge.tone}`} style={{ margin: 0, fontSize: '0.66rem', padding: '1px 7px', borderRadius: '10px' }}>
                          {statusBadge.label}
                        </span>
                      </div>
                      <div className="financial-compact-amount-group">
                        <span className="financial-compact-amount" style={{ color: 'var(--color-primary)' }}>
                          {formatMoney(capitalActual)}
                        </span>
                        <span className="financial-compact-chevron" aria-hidden="true">
                          <ChevronDown size={17} />
                        </span>
                      </div>
                    </div>

                    {/* Línea 2: Tasa + Plazo + Vencimiento + Ganancia + Micro-avance */}
                    <div className="financial-compact-line-2">
                      <div className="financial-compact-subtext">
                        <span>{yieldText}</span>
                        <span style={{ margin: '0 5px', color: '#cbd5e1' }}>•</span>
                        <span>{plazoText}</span>
                        {endDate && (
                          <>
                            <span style={{ margin: '0 5px', color: '#cbd5e1' }}>•</span>
                            <span style={{ color: '#475569', fontWeight: 600 }}>Vence: {formatDate(endDate)}</span>
                          </>
                        )}
                        <span style={{ margin: '0 5px', color: '#cbd5e1' }}>•</span>
                        <span style={{ color: '#16a34a', fontWeight: 600 }}>+{formatMoney(rendGenerado)} ganancia</span>
                      </div>
                      {endDate && (
                        <div className="financial-compact-progress-pill" title={`Maduración: ${progresoMaduracion}% (${diasRestantes !== null && diasRestantes <= 0 ? 'Plazo cumplido' : `${diasRestantes}d restantes`})`}>
                          <span style={{ fontSize: '0.70rem', fontWeight: 700, color: diasRestantes !== null && diasRestantes <= 0 ? '#10b981' : 'var(--color-primary)' }}>
                            {diasRestantes !== null && diasRestantes <= 0 ? 'Cumplido' : `${progresoMaduracion}%`}
                          </span>
                          <div className="financial-compact-micro-bar">
                            <div
                              className="financial-compact-micro-fill"
                              style={{
                                width: `${progresoMaduracion}%`,
                                background: (diasRestantes !== null && diasRestantes <= 0) || progresoMaduracion >= 100
                                  ? '#10b981'
                                  : (diasRestantes <= 30 ? 'linear-gradient(90deg, #f59e0b 0%, #ef4444 100%)' : 'linear-gradient(90deg, #4f46e5 0%, #06b6d4 100%)'),
                                boxShadow: (diasRestantes !== null && diasRestantes <= 0) || progresoMaduracion >= 100
                                  ? '0 0 6px rgba(16, 185, 129, 0.35)'
                                  : '0 0 6px rgba(79, 70, 229, 0.3)',
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Drawer expandible al clic */}
                  {isExpanded && (
                    <div className="financial-expanded-drawer">
                      <div className="financial-drawer-grid">
                        <div className="financial-drawer-field">
                          <span className="financial-drawer-label">Inversión Inicial</span>
                          <span className="financial-drawer-val">{formatMoney(capitalInicial)}</span>
                        </div>
                        <div className="financial-drawer-field">
                          <span className="financial-drawer-label">Ganancia Acumulada</span>
                          <span className="financial-drawer-val" style={{ color: '#16a34a' }}>+{formatMoney(rendGenerado)}</span>
                        </div>
                        <div className="financial-drawer-field">
                          <span className="financial-drawer-label">Saldo Total Actual</span>
                          <span className="financial-drawer-val" style={{ color: 'var(--color-primary)' }}>{formatMoney(capitalActual)}</span>
                        </div>
                        <div className="financial-drawer-field">
                          <span className="financial-drawer-label">Plazo Contratado</span>
                          <span className="financial-drawer-val">{plazoText}</span>
                        </div>
                        <div className="financial-drawer-field">
                          <span className="financial-drawer-label">Fecha de Vencimiento</span>
                          <span className="financial-drawer-val">{endDate ? formatDate(endDate) : 'Indefinido'}</span>
                        </div>
                        <div className="financial-drawer-field">
                          <span className="financial-drawer-label">Folio / Póliza</span>
                          <span className="financial-drawer-val">#{item.id}</span>
                        </div>
                        {item.payment_method && (
                          <div className="financial-drawer-field">
                            <span className="financial-drawer-label">Método de Pago</span>
                            <span className="financial-drawer-val" style={{ textTransform: 'capitalize' }}>{item.payment_method}</span>
                          </div>
                        )}
                      </div>

                      {/* Botones de acción */}
                      <div className="financial-drawer-actions">
                        <Button
                          className="button-secondary icon-button"
                          style={{ fontSize: '0.74rem', padding: '6px 12px', minHeight: '32px' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenAction('kardex', item);
                          }}
                          title="Ver historial de movimientos y transacciones"
                        >
                          <History size={13} aria-hidden="true" />
                          Movimientos
                        </Button>
                        <Button
                          className="button-secondary icon-button"
                          style={{ fontSize: '0.74rem', padding: '6px 12px', minHeight: '32px' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenStatement(item.id);
                          }}
                          title="Descargar Estado de Cuenta Oficial de esta póliza en PDF"
                        >
                          <FileText size={13} aria-hidden="true" />
                          Estado de Cuenta
                        </Button>
                        {isPaymentPendingState && checkoutUrl && (
                          <Button
                            className="button-primary icon-button btn-action-primary"
                            style={{ fontSize: '0.74rem', padding: '6px 14px', minHeight: '32px', fontWeight: 600 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              window.location.href = checkoutUrl;
                            }}
                          >
                            <CreditCard size={13} aria-hidden="true" />
                            Pagar con Stripe
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <div className="request-list-grid">
            {filteredItems.map((item, index) => {
              const statusBadge = resolveMovementStatusBadge(item, type);
              const checkoutUrl = getCheckoutUrl(item);

              return (
                <article className="request-card" key={item?.id || item?.folio || item?.plan?.id || item?.ahorro?.id || index}>
                  <div>
                    <span className={`request-card-label status-${statusBadge.tone}`}>{statusBadge.label}</span>
                    <h3>{getTitle(item, `Solicitud ${index + 1}`)}</h3>
                  </div>

                  <strong>{formatMoney(getAmount(item))}</strong>
                  <p>Fecha de registro: {formatDate(getDate(item))}</p>

                {getRecordDetails(item, type).filter(([, value]) => value !== undefined && value !== null && value !== '').length > 0 && (
                  <dl className="request-card-details">
                    {getRecordDetails(item, type)
                      .filter(([, value]) => value !== undefined && value !== null && value !== '')
                      .map(([label, value, kind]) => (
                        <div key={label}>
                          <dt>{label}</dt>
                          <dd>{formatDetailValue(label, value, kind)}</dd>
                        </div>
                      ))}
                  </dl>
                )}

                <div className="request-card-actions">
                  {type === 'investments' && isPaymentPending(item) && checkoutUrl && (
                    <Button className="icon-button" onClick={() => { window.location.href = checkoutUrl; }}>
                      <CreditCard size={18} aria-hidden="true" />
                      Pagar con Stripe
                    </Button>
                  )}
                  {checkoutUrl && type !== 'investments' && type !== 'savings' && (
                    <Button className="button-secondary icon-button" onClick={() => { window.location.href = checkoutUrl; }}>
                      <ExternalLink size={18} aria-hidden="true" />
                      Abrir pago
                    </Button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
        )
      )}

      {/* Sub-modal de Acciones para Ahorros */}
      {activeAction && createPortal(
        <div
          className="action-modal-backdrop"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.72)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            zIndex: 9999,
          }}
          role="presentation"
        >
          <section
            aria-modal="true"
            role="dialog"
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.28), 0 0 0 1px rgba(226, 232, 240, 0.9)',
              width: '100%',
              maxWidth: activeAction.type === 'kardex' ? 'min(96vw, 1120px)' : '480px',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '92vh',
            }}
          >
            <header
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                padding: activeAction.type === 'kardex' ? '18px 24px' : '16px 20px',
                borderBottom: '1px solid rgba(226, 232, 240, 0.9)',
                background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-primary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {getTitle(activeAction.item, 'Ahorro')}
                  </span>
                </div>
                <h2 style={{ margin: '3px 0 0', fontSize: '1.18rem', color: '#0f172a' }}>
                  {activeAction.type === 'fee' && 'Actualizar Cuota de Nómina'}
                  {activeAction.type === 'transfer' && 'Transferir entre Ahorros'}
                  {activeAction.type === 'withdraw' && 'Solicitar Retiro'}
                  {activeAction.type === 'kardex' && 'Historial de Movimientos (Kardex)'}
                  {activeAction.type === 'pause' && 'Pausar Aportaciones de Nómina'}
                  {activeAction.type === 'resume' && 'Reanudar Aportaciones de Nómina'}
                </h2>
              </div>
              <Button
                aria-label="Cerrar ventana"
                className="button-secondary"
                style={{ minHeight: '34px', padding: '6px', borderRadius: '8px' }}
                onClick={handleCloseAction}
              >
                <X size={17} aria-hidden="true" />
              </Button>
            </header>

            <div style={{ padding: activeAction.type === 'kardex' ? '20px 24px' : '18px 20px', display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto' }}>
              {actionError && <Alert type="error">{actionError}</Alert>}
              {actionSuccess && <Alert type="success">{actionSuccess}</Alert>}

              {activeAction.type === 'kardex' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* Metric Summary Bar */}
                  <div
                    style={{
                      background: '#f8fafc',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <div>
                      <span style={{ color: '#64748b', fontSize: '0.68rem', textTransform: 'uppercase', fontWeight: 600, display: 'block' }}>
                        {type === 'loans' ? 'Préstamo Solicitado' : 'Saldo en Ahorro'}
                      </span>
                      <strong style={{ color: 'var(--color-primary)', fontSize: '0.96rem', marginTop: '1px', display: 'block' }}>
                        {formatMoney(type === 'loans' ? (activeAction.item.monto_solicitado ?? activeAction.item.cantidad ?? activeAction.item.monto) : activeAction.item.monto_ahorro)}
                      </strong>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ color: '#64748b', fontSize: '0.68rem', textTransform: 'uppercase', fontWeight: 600, display: 'block' }}>
                        {type === 'loans' ? 'Adeudo Restante' : 'Saldo Disponible'}
                      </span>
                      <strong style={{ color: type === 'loans' ? (Number(activeAction.item.saldo_restante ?? 0) > 0 ? '#dc2626' : '#16a34a') : (Number(activeAction.item.saldo_disponible ?? 0) > 0 ? '#16a34a' : '#64748b'), fontSize: '0.96rem', marginTop: '1px', display: 'block' }}>
                        {formatMoney(type === 'loans' ? activeAction.item.saldo_restante : activeAction.item.saldo_disponible)}
                      </strong>
                    </div>
                  </div>

                  {/* Toolbar: Search input + Account selector + Category pills */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', flex: '1 1 320px' }}>
                      <div style={{ position: 'relative', flex: '1 1 180px', maxWidth: '240px' }}>
                        <Search size={13} style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                        <input
                          type="text"
                          value={kardexSearch}
                          onChange={(e) => setKardexSearch(e.target.value)}
                          placeholder="Buscar en historial..."
                          style={{
                            width: '100%',
                            padding: '5px 8px 5px 28px',
                            fontSize: '0.75rem',
                            border: '1px solid #cbd5e1',
                            borderRadius: '6px',
                            outline: 'none',
                            background: '#ffffff',
                          }}
                        />
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        {type !== 'loans' && (
                          <>
                            <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>Cuenta:</span>
                            <select
                              value={kardexAccountFilter}
                              onChange={(e) => setKardexAccountFilter(e.target.value)}
                              style={{
                                padding: '4px 8px',
                                fontSize: '0.72rem',
                                borderRadius: '6px',
                                border: '1px solid #cbd5e1',
                                background: '#ffffff',
                                color: '#334155',
                                outline: 'none',
                                fontWeight: 500,
                              }}
                            >
                              <option value="ALL">Todas las cuentas</option>
                              {items.map((it) => (
                                <option key={it.id} value={it.id}>
                                  {getTitle(it, `Ahorro #${it.id}`)}
                                </option>
                              ))}
                            </select>
                          </>
                        )}
                        <Button
                          type="button"
                          className="button-secondary icon-button"
                          style={{ fontSize: '0.7rem', padding: '3px 8px', height: '26px', minHeight: '26px', borderRadius: '6px' }}
                          onClick={() => handleOpenStatement(kardexAccountFilter !== 'ALL' ? kardexAccountFilter : (activeAction?.item?.id || 'ALL'))}
                          title="Generar Estado de Cuenta Oficial en PDF"
                        >
                          <FileText size={12} />
                          Estado de Cuenta (PDF)
                        </Button>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', alignItems: 'center' }}>
                      {(type === 'loans' ? [
                        { id: 'ALL', label: 'Todos' },
                        { id: 'PAGO_REGULAR', label: 'Pagos / Abonos' },
                        { id: 'MORA', label: 'Cargos Moratorios' },
                        { id: 'LIQUIDACION', label: 'Liquidación' }
                      ] : [
                        { id: 'ALL', label: 'Todos' },
                        { id: 'APORTACION', label: 'Aportaciones' },
                        { id: 'RENDIMIENTO', label: 'Rendimientos' },
                        { id: 'RETIRO', label: 'Retiros' },
                        { id: 'TRANSFER', label: 'Transferencias' },
                        { id: 'META', label: 'Metas' },
                      ]).map((pill) => {
                        const isSelected = kardexFilterType === pill.id;
                        return (
                          <button
                            key={pill.id}
                            type="button"
                            onClick={() => setKardexFilterType(pill.id)}
                            style={{
                              fontSize: '0.69rem',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              border: isSelected ? '1px solid var(--color-primary)' : '1px solid #e2e8f0',
                              background: isSelected ? 'var(--color-primary)' : '#ffffff',
                              color: isSelected ? '#ffffff' : '#64748b',
                              fontWeight: isSelected ? 600 : 500,
                              cursor: 'pointer',
                              transition: 'all 0.12s ease',
                            }}
                          >
                            {pill.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Excel Table */}
                  {isKardexLoading ? (
                    <div style={{ padding: '36px 0', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
                      <RefreshCw size={20} style={{ animation: 'spin 1s linear infinite', marginBottom: '8px', opacity: 0.7 }} />
                      <div>Cargando movimientos...</div>
                    </div>
                  ) : kardexMovements.length === 0 ? (
                    <div style={{ padding: '32px 0', textAlign: 'center', color: '#64748b' }}>
                      <div style={{ fontSize: '1.6rem', marginBottom: '6px' }}>📂</div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#334155' }}>Sin movimientos registrados</div>
                      <div style={{ fontSize: '0.76rem', marginTop: '3px' }}>
                        {type === 'loans' ? 'Los abonos, liquidaciones y cargos moratorios aparecerán aquí automáticamente.' : 'Las aportaciones de nómina, rendimientos y retiros aparecerán aquí automáticamente.'}
                      </div>
                    </div>
                  ) : (
                    <>
                      <div
                        style={{
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          overflowX: 'auto',
                          overflowY: 'auto',
                          maxHeight: '420px',
                          background: '#ffffff',
                          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
                        }}
                      >
                        <table style={{ width: '100%', minWidth: '860px', borderCollapse: 'collapse', fontSize: '0.78rem', textAlign: 'left' }}>
                          <thead>
                            <tr style={{ background: '#f8fafc', position: 'sticky', top: 0, zIndex: 1, boxShadow: '0 1px 0 #e2e8f0' }}>
                              <th
                                onClick={() => handleToggleKardexSort('fecha')}
                                style={{
                                  padding: '9px 12px',
                                  fontWeight: 600,
                                  color: kardexSortField === 'fecha' ? 'var(--color-primary)' : '#475569',
                                  cursor: 'pointer',
                                  userSelect: 'none',
                                  borderRight: '1px solid #e2e8f0',
                                  whiteSpace: 'nowrap',
                                  width: '135px',
                                }}
                                title="Clic para ordenar por fecha"
                              >
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                  <span>Fecha</span>
                                  {kardexSortField === 'fecha' ? (
                                    kardexSortDirection === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />
                                  ) : (
                                    <ArrowUpDown size={10} color="#94a3b8" />
                                  )}
                                </div>
                              </th>

                              <th
                                onClick={() => handleToggleKardexSort('ahorro')}
                                style={{
                                  padding: '9px 12px',
                                  fontWeight: 600,
                                  color: kardexSortField === 'ahorro' ? 'var(--color-primary)' : '#475569',
                                  cursor: 'pointer',
                                  userSelect: 'none',
                                  borderRight: '1px solid #e2e8f0',
                                  whiteSpace: 'nowrap',
                                  width: '145px',
                                }}
                                title={type === 'loans' ? "Clic para ordenar por método de pago (A-Z / Z-A)" : (type === 'investments' ? "Clic para ordenar por póliza (A-Z / Z-A)" : "Clic para ordenar por cuenta de ahorro (A-Z / Z-A)")}
                              >
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                  <span>{type === 'loans' ? 'Método' : (type === 'investments' ? 'Póliza' : 'Ahorro')}</span>
                                  {kardexSortField === 'ahorro' ? (
                                    kardexSortDirection === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />
                                  ) : (
                                    <ArrowUpDown size={10} color="#94a3b8" />
                                  )}
                                </div>
                              </th>

                              <th
                                onClick={() => handleToggleKardexSort('tipo')}
                                style={{
                                  padding: '9px 12px',
                                  fontWeight: 600,
                                  color: kardexSortField === 'tipo' ? 'var(--color-primary)' : '#475569',
                                  cursor: 'pointer',
                                  userSelect: 'none',
                                  borderRight: '1px solid #e2e8f0',
                                  whiteSpace: 'nowrap',
                                  width: '140px',
                                }}
                                title="Clic para ordenar por tipo (A-Z / Z-A)"
                              >
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                  <span>Tipo</span>
                                  {kardexSortField === 'tipo' ? (
                                    kardexSortDirection === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />
                                  ) : (
                                    <ArrowUpDown size={10} color="#94a3b8" />
                                  )}
                                </div>
                              </th>

                              <th
                                onClick={() => handleToggleKardexSort('observaciones')}
                                style={{
                                  padding: '9px 12px',
                                  fontWeight: 600,
                                  color: kardexSortField === 'observaciones' ? 'var(--color-primary)' : '#475569',
                                  cursor: 'pointer',
                                  userSelect: 'none',
                                  borderRight: '1px solid #e2e8f0',
                                  minWidth: '260px',
                                }}
                                title="Clic para ordenar por detalle (A-Z / Z-A)"
                              >
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                  <span>Concepto / Detalle</span>
                                  {kardexSortField === 'observaciones' ? (
                                    kardexSortDirection === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />
                                  ) : (
                                    <ArrowUpDown size={10} color="#94a3b8" />
                                  )}
                                </div>
                              </th>

                              <th
                                onClick={() => handleToggleKardexSort('monto')}
                                style={{
                                  padding: '9px 12px',
                                  fontWeight: 600,
                                  color: kardexSortField === 'monto' ? 'var(--color-primary)' : '#475569',
                                  cursor: 'pointer',
                                  userSelect: 'none',
                                  textAlign: 'right',
                                  borderRight: '1px solid #e2e8f0',
                                  whiteSpace: 'nowrap',
                                  width: '105px',
                                }}
                                title="Clic para ordenar por monto"
                              >
                                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', width: '100%' }}>
                                  <span>Monto</span>
                                  {kardexSortField === 'monto' ? (
                                    kardexSortDirection === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />
                                  ) : (
                                    <ArrowUpDown size={10} color="#94a3b8" />
                                  )}
                                </div>
                              </th>

                              <th
                                onClick={() => handleToggleKardexSort('saldo')}
                                style={{
                                  padding: '9px 12px',
                                  fontWeight: 600,
                                  color: kardexSortField === 'saldo' ? 'var(--color-primary)' : '#475569',
                                  cursor: 'pointer',
                                  userSelect: 'none',
                                  textAlign: 'right',
                                  whiteSpace: 'nowrap',
                                  width: '120px',
                                }}
                                title="Clic para ordenar por saldo resultante"
                              >
                                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', width: '100%' }}>
                                  <span>Saldo Resultante</span>
                                  {kardexSortField === 'saldo' ? (
                                    kardexSortDirection === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />
                                  ) : (
                                    <ArrowUpDown size={10} color="#94a3b8" />
                                  )}
                                </div>
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {processedKardexMovements.length === 0 ? (
                              <tr>
                                <td colSpan={6} style={{ padding: '28px 14px', textAlign: 'center', color: '#94a3b8' }}>
                                  No se encontraron movimientos con los filtros aplicados.
                                </td>
                              </tr>
                            ) : (
                              processedKardexMovements.map((mov, idx) => {
                                const amount = Number(mov.monto ?? 0);
                                const isPositive = amount > 0;
                                const isZero = amount === 0;
                                const isOdd = idx % 2 === 1;

                                return (
                                  <tr
                                    key={mov.id}
                                    style={{
                                      background: isOdd ? '#fbfcfe' : '#ffffff',
                                      borderBottom: '1px solid #f1f5f9',
                                      transition: 'background 0.12s ease',
                                    }}
                                    onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.background = isOdd ? '#fbfcfe' : '#ffffff'; }}
                                  >
                                    <td style={{ padding: '8px 12px', borderRight: '1px solid #f1f5f9', color: '#334155', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                                      {formatMovementDate(mov.fecha)}
                                    </td>
                                    <td style={{ padding: '8px 12px', borderRight: '1px solid #f1f5f9', fontWeight: 600, color: 'var(--color-primary-dark)', whiteSpace: 'nowrap', textTransform: type === 'loans' ? 'capitalize' : 'none' }}>
                                      {type === 'loans' ? (mov.metodo_pago || 'Transferencia') : (type === 'investments' ? mov.inversion_nombre : mov.ahorro_nombre)}
                                    </td>
                                    <td style={{ padding: '8px 12px', borderRight: '1px solid #f1f5f9', whiteSpace: 'nowrap' }}>
                                      <span
                                        style={{
                                          fontSize: '0.7rem',
                                          fontWeight: 500,
                                          color: '#475569',
                                        }}
                                      >
                                        {formatMovementType(mov.tipo)}
                                      </span>
                                    </td>
                                    <td style={{ padding: '8px 12px', borderRight: '1px solid #f1f5f9', color: '#475569', minWidth: '260px' }}>
                                      {getMovementConcept(mov)}
                                    </td>
                                    <td
                                      style={{
                                        padding: '8px 12px',
                                        borderRight: '1px solid #f1f5f9',
                                        textAlign: 'right',
                                        fontWeight: 600,
                                        whiteSpace: 'nowrap',
                                        fontVariantNumeric: 'tabular-nums',
                                        color: isPositive ? '#15803d' : (isZero ? '#64748b' : '#dc2626'),
                                      }}
                                    >
                                      {isPositive ? `+${formatMoney(amount)}` : (isZero ? formatMoney(0) : `-${formatMoney(Math.abs(amount))}`)}
                                    </td>
                                    <td
                                      style={{
                                        padding: '8px 12px',
                                        textAlign: 'right',
                                        fontWeight: 600,
                                        color: '#0f172a',
                                        whiteSpace: 'nowrap',
                                        fontVariantNumeric: 'tabular-nums',
                                      }}
                                    >
                                      {formatMoney(mov.saldo_resultante)}
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Status / Audit Footer Bar */}
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '0.75rem',
                          color: '#475569',
                          padding: '8px 14px',
                          background: '#f8fafc',
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0',
                          flexWrap: 'wrap',
                          gap: '10px',
                          marginTop: '4px',
                        }}
                      >
                        <span>
                          Mostrando <strong>{processedKardexMovements.length}</strong> de <strong>{kardexMovements.length}</strong> movimientos
                        </span>
                        <div style={{ display: 'flex', gap: '18px', alignItems: 'center' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            Abonos: <strong style={{ color: '#15803d', fontSize: '0.84rem' }}>+{formatMoney(kardexSummary.totalIngresos)}</strong>
                          </span>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            Cargos: <strong style={{ color: '#dc2626', fontSize: '0.84rem' }}>{formatMoney(kardexSummary.totalEgresos)}</strong>
                          </span>
                        </div>
                      </div>
                    </>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2px' }}>
                    <Button type="button" className="button-secondary" style={{ fontSize: '0.76rem', padding: '5px 14px' }} onClick={handleCloseAction}>
                      Cerrar
                    </Button>
                  </div>
                </div>
              )}

              {activeAction.type === 'fee' && (
                <form onSubmit={handleSubmitAction} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ background: '#f1f5f9', padding: '12px 14px', borderRadius: '8px', fontSize: '0.88rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ color: '#64748b' }}>Cuota actual:</span>
                      <strong style={{ color: '#0f172a' }}>
                        {formatMoney(activeAction.item.cuota)} ({activeAction.item.frecuencia_pago || 'Semanal'})
                      </strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>Monto mínimo del plan:</span>
                      <strong style={{ color: '#0f172a' }}>{formatMoney(activeAction.item.plan?.monto_min || 50)}</strong>
                    </div>
                    {maxFeeAllowed !== null && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                        <span style={{ color: '#64748b' }}>Máximo disponible (50% nómina):</span>
                        <strong style={{ color: maxFeeAllowed > 0 ? '#16a34a' : '#dc2626' }}>{formatMoney(maxFeeAllowed)}</strong>
                      </div>
                    )}
                  </div>

                  <Input
                    id="action-new-fee"
                    label="Nueva cuota periódica"
                    type="number"
                    step="0.01"
                    min="1"
                    max={maxFeeAllowed > 0 ? maxFeeAllowed : undefined}
                    value={actionFee}
                    onChange={(e) => setActionFee(e.target.value)}
                    placeholder="Ej. 150.00"
                    required
                  />

                  <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0, lineHeight: 1.4 }}>
                    * Esta nueva cuota se descontará en tu nómina próxima. Recuerda que la política exige mantener al menos 1 ahorro activo con una aportación mínima de $50 MXN.
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                    <Button type="button" className="button-secondary" onClick={handleCloseAction} disabled={isSubmittingAction}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={isSubmittingAction}>
                      {isSubmittingAction ? 'Guardando...' : 'Guardar Nueva Cuota'}
                    </Button>
                  </div>
                </form>
              )}

              {activeAction.type === 'transfer' && (
                <form onSubmit={handleSubmitAction} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ background: '#f1f5f9', padding: '12px 14px', borderRadius: '8px', fontSize: '0.88rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>Saldo disponible para transferir:</span>
                      <strong style={{ color: '#16a34a' }}>{formatMoney(activeAction.item.saldo_disponible)}</strong>
                    </div>
                  </div>

                  {destinationOptions.length === 0 ? (
                    <div style={{ padding: '12px', background: '#fef3c7', color: '#92400e', borderRadius: '8px', fontSize: '0.88rem' }}>
                      No tienes otros ahorros activos a los cuales transferir fondos. Abre un segundo plan para mover dinero entre metas.
                    </div>
                  ) : (
                    <>
                      <div className="form-field">
                        <label className="form-label" htmlFor="action-destino">
                          Ahorro de destino
                        </label>
                        <select
                          id="action-destino"
                          className="input"
                          value={actionDestinoId}
                          onChange={(e) => setActionDestinoId(e.target.value)}
                          required
                          style={{ width: '100%', height: '42px', background: '#fff' }}
                        >
                          <option value="">Selecciona el plan destino...</option>
                          {destinationOptions.map((opt) => (
                            <option key={opt.id} value={opt.id}>
                              {getTitle(opt, `Ahorro #${opt.id}`)} (Capital actual: {formatMoney(opt.monto_ahorro)})
                            </option>
                          ))}
                        </select>
                      </div>

                      <Input
                        id="action-transfer-amount"
                        label="Monto a transferir"
                        type="number"
                        step="0.01"
                        min="1"
                        max={activeAction.item.saldo_disponible}
                        value={actionAmount}
                        onChange={(e) => setActionAmount(e.target.value)}
                        placeholder={`Máximo ${formatMoney(activeAction.item.saldo_disponible)}`}
                        required
                      />

                      <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0, lineHeight: 1.4 }}>
                        * El dinero saldrá de tu Saldo Disponible en este ahorro y se sumará al capital de tu meta seleccionada (caja bloqueada).
                      </p>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                        <Button type="button" className="button-secondary" onClick={handleCloseAction} disabled={isSubmittingAction}>
                          Cancelar
                        </Button>
                        <Button type="submit" disabled={isSubmittingAction || !actionDestinoId}>
                          {isSubmittingAction ? 'Transfiriendo...' : 'Confirmar Transferencia'}
                        </Button>
                      </div>
                    </>
                  )}
                </form>
              )}

              {activeAction.type === 'withdraw' && (
                <form onSubmit={handleSubmitAction} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ background: '#f1f5f9', padding: '12px 14px', borderRadius: '8px', fontSize: '0.88rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#64748b' }}>Saldo disponible a retirar:</span>
                      <strong style={{ color: '#16a34a', fontSize: '1.1rem' }}>{formatMoney(activeAction.item.saldo_disponible)}</strong>
                    </div>
                  </div>

                  <Input
                    id="action-withdraw-amount"
                    label="Monto que deseas retirar"
                    type="number"
                    step="0.01"
                    min="1"
                    max={activeAction.item.saldo_disponible}
                    value={actionAmount}
                    onChange={(e) => setActionAmount(e.target.value)}
                    placeholder={`Máximo ${formatMoney(activeAction.item.saldo_disponible)}`}
                    required
                    action={(
                      <button
                        type="button"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--color-primary)',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          textDecoration: 'underline',
                        }}
                        onClick={() => setActionAmount(String(activeAction.item.saldo_disponible))}
                      >
                        Retirar todo
                      </button>
                    )}
                  />

                  <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0, lineHeight: 1.4 }}>
                    * El monto será debitado de tu saldo disponible y será procesado para depósito en tu próxima nómina o cuenta registrada.
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                    <Button type="button" className="button-secondary" onClick={handleCloseAction} disabled={isSubmittingAction}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={isSubmittingAction}>
                      {isSubmittingAction ? 'Procesando...' : 'Confirmar Retiro'}
                    </Button>
                  </div>
                </form>
              )}

              {activeAction.type === 'pause' && (
                <form onSubmit={handleSubmitAction} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '14px', borderRadius: '8px', fontSize: '0.88rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ color: '#64748b' }}>Plan de ahorro:</span>
                      <strong>{getTitle(activeAction.item, 'Ahorro')}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ color: '#64748b' }}>Cuota recurrente actual:</span>
                      <strong>{formatMoney(activeAction.item.cuota)} / {currentItemFreq.singular}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>Saldo acumulado:</span>
                      <strong style={{ color: '#16a34a' }}>
                        {formatMoney(Number(activeAction.item.monto_ahorro ?? 0) + Number(activeAction.item.saldo_disponible ?? 0))}
                      </strong>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label htmlFor="action-pause-periodos" style={{ fontSize: '0.88rem', fontWeight: 600, color: '#334155' }}>
                      ¿Por cuántos periodos ({currentItemFreq.plural}) deseas pausar las aportaciones?
                    </label>
                    <select
                      id="action-pause-periodos"
                      value={actionPausePeriodos}
                      onChange={(e) => setActionPausePeriodos(Number(e.target.value))}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.9rem',
                        background: '#fff',
                        outline: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      {currentItemFreq.options.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '12px', fontSize: '0.82rem', color: '#1e40af', lineHeight: 1.45 }}>
                    💡 <strong>Tu ahorro no se pierde:</strong> Durante la pausa no se descontará la cuota de tu nómina ({currentItemFreq.label.toLowerCase()}), pero tu saldo actual seguirá generando rendimientos normales. Puedes reanudar en cualquier momento antes de que venza el plazo.
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                    <Button type="button" className="button-secondary" onClick={handleCloseAction} disabled={isSubmittingAction}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={isSubmittingAction}>
                      {isSubmittingAction ? 'Pausando...' : 'Confirmar Pausa'}
                    </Button>
                  </div>
                </form>
              )}

              {activeAction.type === 'resume' && (
                <form onSubmit={handleSubmitAction} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '14px', borderRadius: '8px', fontSize: '0.88rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ color: '#64748b' }}>Plan de ahorro:</span>
                      <strong>{getTitle(activeAction.item, 'Ahorro')}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>Cuota a reactivar:</span>
                      <strong style={{ color: '#16a34a' }}>{formatMoney(activeAction.item.cuota)} / {currentItemFreq.singular}</strong>
                    </div>
                  </div>

                  <p style={{ fontSize: '0.85rem', color: '#475569', margin: 0, lineHeight: 1.45 }}>
                    Al reanudar, las aportaciones por descuento de nómina ({currentItemFreq.label.toLowerCase()}) volverán a programarse con normalidad en el siguiente ciclo de pago.
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                    <Button type="button" className="button-secondary" onClick={handleCloseAction} disabled={isSubmittingAction}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={isSubmittingAction}>
                      {isSubmittingAction ? 'Reanudando...' : 'Confirmar y Reanudar'}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </section>
        </div>,
        document.body
      )}

      {/* Modal Minimalista de Proyección de Ahorro */}
      {isProjectionOpen && createPortal(
        <SavingsProjectionModal
          items={items}
          plans={plans}
          suggestedFrequency={suggestedFrequency}
          isOpen={isProjectionOpen}
          onClose={() => setIsProjectionOpen(false)}
          onApplyCuota={(item, newCuota) => {
            handleOpenAction('fee', item);
            setActionFee(String(newCuota));
          }}
        />,
        document.body
      )}

      {/* Modal Oficial de Estado de Cuenta (PDF) */}
      {isStatementOpen && type === 'savings' && (
        <SavingsStatementModal
          isOpen={isStatementOpen}
          onClose={() => setIsStatementOpen(false)}
          initialAhorroId={statementInitialId}
          items={items}
        />
      )}

      {isStatementOpen && type === 'investments' && (
        <InvestmentStatementModal
          isOpen={isStatementOpen}
          onClose={() => setIsStatementOpen(false)}
          initialInversionId={statementInitialId}
          items={items}
        />
      )}

      {isStatementOpen && type === 'loans' && (
        <LoanStatementModal
          isOpen={isStatementOpen}
          onClose={() => setIsStatementOpen(false)}
          initialPrestamoId={statementInitialId}
          items={items}
        />
      )}

      {/* Modal de Aportación Voluntaria (SPEI) */}
      {voluntaryDepositAhorro && (
        <SavingsVoluntaryDepositModal
          isOpen={Boolean(voluntaryDepositAhorro)}
          ahorro={voluntaryDepositAhorro}
          onClose={() => setVoluntaryDepositAhorro(null)}
          onSuccess={(msg) => {
            setActionSuccess(msg);
            if (onRefresh) onRefresh();
          }}
        />
      )}

      {/* Modal de Abono a Préstamo (SPEI y Mercado Pago) */}
      {selectedLoanForAbono && (
        <LoanAbonoModal
          isOpen={Boolean(selectedLoanForAbono)}
          onClose={() => setSelectedLoanForAbono(null)}
          prestamo={selectedLoanForAbono}
          onSuccess={(msg) => {
            setActionSuccess(msg);
            if (onRefresh) onRefresh();
          }}
        />
      )}
    </section>
  );
}

export default FinancialRequestList;
