import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Building2,
  CheckCircle2,
  Clock,
  FileText,
  RefreshCw,
  Search,
  WalletCards,
  X,
} from 'lucide-react';
import { useEffect, useId, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import Alert from '../../../components/common/Alert.jsx';
import Button from '../../../components/common/Button.jsx';
import { normalizeApiError } from '../../../api/apiUtils.js';
import {
  getClienteMovimientosSaldo,
  getClienteSolicitudesRetiro,
} from '../services/dashboardService.js';

function formatMoney(amount) {
  const num = Number(amount ?? 0);
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 2,
  }).format(num);
}

function formatMovementDate(fechaStr) {
  if (!fechaStr) return '—';
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

function formatMovementType(tipo) {
  const map = {
    DEPOSITO: 'Depósito en Caja',
    APORTACION_AHORRO: 'Ahorro Disponible',
    TRASPASO_INVERSION: 'Traspaso Inversión',
    TRASPASO_AHORRO: 'Traspaso Ahorro',
    RETIRO: 'Retiro Bancario',
  };
  return map[String(tipo ?? '').trim().toUpperCase()] || tipo || 'Movimiento';
}

export default function GeneralKardexModal({
  isOpen,
  onClose,
  availableBalance = 0,
  initialTab = 'movements',
}) {
  const modalId = useId();

  // Pestaña activa: 'movements' | 'withdrawals'
  const [activeTab, setActiveTab] = useState(initialTab || 'movements');

  // Estados para Movimientos (Kardex)
  const [movements, setMovements] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [sortField, setSortField] = useState('fecha');
  const [sortDirection, setSortDirection] = useState('desc');

  // Estados para Solicitudes de Retiro
  const [withdrawals, setWithdrawals] = useState([]);
  const [isLoadingWithdrawals, setIsLoadingWithdrawals] = useState(false);
  const [withdrawalsError, setWithdrawalsError] = useState('');
  const [withdrawalSearch, setWithdrawalSearch] = useState('');
  const [withdrawalFilter, setWithdrawalFilter] = useState('ALL');

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab || 'movements');
      setSearch('');
      setFilterType('ALL');
      setSortField('fecha');
      setSortDirection('desc');
      setWithdrawalSearch('');
      setWithdrawalFilter('ALL');
      loadMovements();
      loadWithdrawals();
    }
  }, [isOpen, initialTab]);

  const loadMovements = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await getClienteMovimientosSaldo();
      setMovements(res?.data?.data || []);
    } catch (err) {
      const normalized = normalizeApiError(err, 'No fue posible cargar los movimientos.');
      setError(normalized.message);
    } finally {
      setIsLoading(false);
    }
  };

  const loadWithdrawals = async () => {
    setIsLoadingWithdrawals(true);
    setWithdrawalsError('');
    try {
      const res = await getClienteSolicitudesRetiro();
      setWithdrawals(res?.data?.data || []);
    } catch (err) {
      const normalized = normalizeApiError(err, 'No fue posible cargar las solicitudes de retiro.');
      setWithdrawalsError(normalized.message);
    } finally {
      setIsLoadingWithdrawals(false);
    }
  };

  const handleToggleSort = (field) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection(field === 'fecha' || field === 'monto' || field === 'saldo' ? 'desc' : 'asc');
    }
  };

  // Procesamiento del dataset filtrado y ordenado
  const processedMovements = useMemo(() => {
    let list = [...movements];

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter((m) => {
        const folioStr = String(m.folio || '').toLowerCase();
        const typeStr = formatMovementType(m.tipo).toLowerCase();
        const obsStr = String(m.observaciones || '').toLowerCase();
        const dateStr = formatMovementDate(m.fecha).toLowerCase();
        const amountStr = String(m.monto ?? '');
        return (
          folioStr.includes(q) ||
          typeStr.includes(q) ||
          obsStr.includes(q) ||
          dateStr.includes(q) ||
          amountStr.includes(q)
        );
      });
    }

    if (filterType !== 'ALL') {
      list = list.filter((m) => {
        const t = String(m.tipo || '').toUpperCase();
        if (filterType === 'DEPOSITO') return t === 'DEPOSITO';
        if (filterType === 'AHORRO') return t === 'APORTACION_AHORRO' || String(m.origen || '').includes('ahorro');
        if (filterType === 'TRASPASO') return t.includes('TRASPASO');
        if (filterType === 'RETIRO') return t === 'RETIRO';
        return true;
      });
    }

    list.sort((a, b) => {
      let valA;
      let valB;

      if (sortField === 'fecha') {
        valA = new Date(a.fecha || 0).getTime();
        valB = new Date(b.fecha || 0).getTime();
      } else if (sortField === 'monto') {
        valA = Number(a.monto ?? 0);
        valB = Number(b.monto ?? 0);
      } else if (sortField === 'saldo') {
        valA = Number(a.saldo_resultante ?? 0);
        valB = Number(b.saldo_resultante ?? 0);
      } else if (sortField === 'folio') {
        valA = String(a.folio || '').toLowerCase();
        valB = String(b.folio || '').toLowerCase();
      } else if (sortField === 'tipo') {
        valA = formatMovementType(a.tipo).toLowerCase();
        valB = formatMovementType(b.tipo).toLowerCase();
      } else {
        valA = String(a.observaciones || '').toLowerCase();
        valB = String(b.observaciones || '').toLowerCase();
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [movements, search, filterType, sortField, sortDirection]);

  // Resumen auditado dinámico
  const summary = useMemo(() => {
    let totalIngresos = 0;
    let totalEgresos = 0;

    processedMovements.forEach((m) => {
      const amt = Number(m.monto ?? 0);
      if (m.direccion === 'ENTRADA' && m.status === 1) {
        totalIngresos += amt;
      } else if (m.direccion === 'SALIDA' && [0, 1, 3, 4].includes(m.status)) {
        totalEgresos += amt;
      }
    });

    return {
      totalIngresos,
      totalEgresos,
      saldoNeto: totalIngresos - totalEgresos,
    };
  }, [processedMovements]);

  // Procesamiento de Solicitudes de Retiro
  const processedWithdrawals = useMemo(() => {
    let list = [...withdrawals];

    if (withdrawalSearch.trim()) {
      const q = withdrawalSearch.toLowerCase().trim();
      list = list.filter((w) => {
        const folioStr = String(w.folio || '').toLowerCase();
        const origenStr = String(w.origen_cuenta || '').toLowerCase();
        const statusStr = String(w.status_label || '').toLowerCase();
        const dateStr = formatMovementDate(w.fecha_solicitud).toLowerCase();
        const amountStr = String(w.cantidad ?? '');
        return (
          folioStr.includes(q) ||
          origenStr.includes(q) ||
          statusStr.includes(q) ||
          dateStr.includes(q) ||
          amountStr.includes(q)
        );
      });
    }

    if (withdrawalFilter !== 'ALL') {
      list = list.filter((w) => {
        const statusNum = Number(w.status ?? 0);
        if (withdrawalFilter === 'PENDING') return statusNum === 0 || w.status_label?.includes('proceso');
        if (withdrawalFilter === 'APPROVED') return [1, 3, 4].includes(statusNum) || w.status_label === 'Transferido';
        if (withdrawalFilter === 'REJECTED') return [2, 5].includes(statusNum) || w.status_label === 'Rechazado';
        return true;
      });
    }

    return list;
  }, [withdrawals, withdrawalSearch, withdrawalFilter]);

  const withdrawalsSummary = useMemo(() => {
    const pending = withdrawals.filter((w) => Number(w.status ?? 0) === 0 || w.status_label?.includes('proceso'));
    const transferred = withdrawals.filter((w) => [1, 3, 4].includes(Number(w.status ?? 0)) || w.status_label === 'Transferido');
    const rejected = withdrawals.filter((w) => [2, 5].includes(Number(w.status ?? 0)) || w.status_label === 'Rechazado');

    return {
      pendingCount: pending.length,
      pendingAmount: pending.reduce((sum, w) => sum + Number(w.cantidad ?? 0), 0),
      transferredCount: transferred.length,
      transferredAmount: transferred.reduce((sum, w) => sum + Number(w.cantidad ?? 0), 0),
      rejectedCount: rejected.length,
    };
  }, [withdrawals]);

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="action-modal-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        zIndex: 99999,
        overflowY: 'auto',
      }}
      role="presentation"
    >
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          .kardex-modal-printable,
          .kardex-modal-printable * {
            visibility: visible !important;
          }
          .kardex-modal-printable {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
            max-height: none !important;
          }
          .kardex-no-print {
            display: none !important;
          }
        }
      `}</style>

      <div
        className="action-modal-container kardex-modal-printable"
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          maxWidth: '920px',
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid #cbd5e1',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${modalId}-title`}
      >
        {/* Cabecera idéntica al modal de Inversiones */}
        <header
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#ffffff',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {activeTab === 'movements' ? (
              <WalletCards size={18} color="var(--color-primary)" />
            ) : (
              <Clock size={18} color="var(--color-primary)" />
            )}
            <h2 id={`${modalId}-title`} style={{ fontSize: '1.02rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
              {activeTab === 'movements' ? 'Historial de Movimientos - Saldo General' : 'Mis Solicitudes de Retiro'}
            </h2>
          </div>
          <Button
            aria-label="Cerrar ventana"
            className="button-secondary kardex-no-print"
            style={{ minHeight: '34px', padding: '6px', borderRadius: '8px' }}
            onClick={onClose}
          >
            <X size={17} aria-hidden="true" />
          </Button>
        </header>

        {/* Pestañas de navegación */}
        <div
          className="kardex-no-print"
          style={{
            display: 'flex',
            gap: '8px',
            padding: '8px 24px 0 24px',
            borderBottom: '1px solid #e2e8f0',
            background: '#f8fafc',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('movements')}
            style={{
              padding: '8px 14px',
              fontSize: '0.82rem',
              fontWeight: activeTab === 'movements' ? 600 : 500,
              color: activeTab === 'movements' ? 'var(--color-primary, #0284c7)' : '#64748b',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'movements' ? '2px solid var(--color-primary, #0284c7)' : '2px solid transparent',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <WalletCards size={15} />
            Movimientos de Saldo
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('withdrawals')}
            style={{
              padding: '8px 14px',
              fontSize: '0.82rem',
              fontWeight: activeTab === 'withdrawals' ? 600 : 500,
              color: activeTab === 'withdrawals' ? 'var(--color-primary, #0284c7)' : '#64748b',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'withdrawals' ? '2px solid var(--color-primary, #0284c7)' : '2px solid transparent',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Clock size={15} />
            Solicitudes de Retiro
            {withdrawalsSummary.pendingCount > 0 && (
              <span
                style={{
                  background: '#fef3c7',
                  color: '#92400e',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  padding: '1px 6px',
                  borderRadius: '9999px',
                  border: '1px solid #fde68a',
                }}
              >
                {withdrawalsSummary.pendingCount}
              </span>
            )}
          </button>
        </div>

        {/* Contenido principal */}
        <div
          style={{
            padding: '20px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            overflowY: 'auto',
          }}
        >
          {activeTab === 'movements' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {error && <Alert type="error">{error}</Alert>}
            {/* Metric Summary Bar (Estándar de Inversiones) */}
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
                  Saldo Disponible en Cuenta
                </span>
                <strong style={{ color: 'var(--color-primary)', fontSize: '0.96rem', marginTop: '1px', display: 'block' }}>
                  {formatMoney(availableBalance)}
                </strong>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ color: '#64748b', fontSize: '0.68rem', textTransform: 'uppercase', fontWeight: 600, display: 'block' }}>
                  Flujo Neto Registrado
                </span>
                <strong
                  style={{
                    color: summary.saldoNeto >= 0 ? '#16a34a' : '#dc2626',
                    fontSize: '0.96rem',
                    marginTop: '1px',
                    display: 'block',
                  }}
                >
                  {formatMoney(summary.saldoNeto)}
                </strong>
              </div>
            </div>

            {/* Toolbar: Search input + Botón PDF + Category pills */}
            <div
              className="kardex-no-print"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', flex: '1 1 320px' }}>
                <div style={{ position: 'relative', flex: '1 1 180px', maxWidth: '240px' }}>
                  <Search
                    size={13}
                    style={{
                      position: 'absolute',
                      left: '9px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#94a3b8',
                    }}
                  />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
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

                <Button
                  type="button"
                  className="button-secondary icon-button"
                  style={{ fontSize: '0.7rem', padding: '3px 8px', height: '26px', minHeight: '26px', borderRadius: '6px' }}
                  onClick={handlePrint}
                  title="Imprimir / Exportar Estado de Cuenta en PDF"
                  disabled={isLoading || movements.length === 0}
                >
                  <FileText size={12} />
                  Estado de Cuenta (PDF)
                </Button>
              </div>

              {/* Category Pills (Idénticas a Inversiones) */}
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', alignItems: 'center' }}>
                {[
                  { id: 'ALL', label: 'Todos' },
                  { id: 'DEPOSITO', label: 'Depósitos en Caja' },
                  { id: 'AHORRO', label: 'Ahorros' },
                  { id: 'TRASPASO', label: 'Traspasos Inversión' },
                  { id: 'RETIRO', label: 'Retiros' },
                ].map((pill) => {
                  const isSelected = filterType === pill.id;
                  return (
                    <button
                      key={pill.id}
                      type="button"
                      onClick={() => setFilterType(pill.id)}
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

            {/* Tabla Estándar Idéntica a Inversiones */}
            {isLoading ? (
              <div style={{ padding: '36px 0', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
                <RefreshCw size={20} style={{ animation: 'spin 1s linear infinite', marginBottom: '8px', opacity: 0.7 }} />
                <div>Cargando movimientos...</div>
              </div>
            ) : movements.length === 0 ? (
              <div style={{ padding: '32px 0', textAlign: 'center', color: '#64748b' }}>
                <div style={{ fontSize: '1.6rem', marginBottom: '6px' }}>📂</div>
                <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#334155' }}>Sin movimientos registrados</div>
                <div style={{ fontSize: '0.76rem', marginTop: '3px' }}>
                  Los depósitos en caja, traspasos de pólizas y retiros aparecerán aquí automáticamente.
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
                        {/* Fecha */}
                        <th
                          onClick={() => handleToggleSort('fecha')}
                          style={{
                            padding: '9px 12px',
                            fontWeight: 600,
                            color: sortField === 'fecha' ? 'var(--color-primary)' : '#475569',
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
                            {sortField === 'fecha' ? (
                              sortDirection === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />
                            ) : (
                              <ArrowUpDown size={10} color="#94a3b8" />
                            )}
                          </div>
                        </th>

                        {/* Folio / Origen */}
                        <th
                          onClick={() => handleToggleSort('folio')}
                          style={{
                            padding: '9px 12px',
                            fontWeight: 600,
                            color: sortField === 'folio' ? 'var(--color-primary)' : '#475569',
                            cursor: 'pointer',
                            userSelect: 'none',
                            borderRight: '1px solid #e2e8f0',
                            whiteSpace: 'nowrap',
                            width: '145px',
                          }}
                          title="Clic para ordenar por folio / referencia"
                        >
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <span>Origen / Folio</span>
                            {sortField === 'folio' ? (
                              sortDirection === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />
                            ) : (
                              <ArrowUpDown size={10} color="#94a3b8" />
                            )}
                          </div>
                        </th>

                        {/* Tipo */}
                        <th
                          onClick={() => handleToggleSort('tipo')}
                          style={{
                            padding: '9px 12px',
                            fontWeight: 600,
                            color: sortField === 'tipo' ? 'var(--color-primary)' : '#475569',
                            cursor: 'pointer',
                            userSelect: 'none',
                            borderRight: '1px solid #e2e8f0',
                            whiteSpace: 'nowrap',
                            width: '140px',
                          }}
                          title="Clic para ordenar por tipo"
                        >
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <span>Tipo</span>
                            {sortField === 'tipo' ? (
                              sortDirection === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />
                            ) : (
                              <ArrowUpDown size={10} color="#94a3b8" />
                            )}
                          </div>
                        </th>

                        {/* Concepto / Detalle */}
                        <th
                          onClick={() => handleToggleSort('observaciones')}
                          style={{
                            padding: '9px 12px',
                            fontWeight: 600,
                            color: sortField === 'observaciones' ? 'var(--color-primary)' : '#475569',
                            cursor: 'pointer',
                            userSelect: 'none',
                            borderRight: '1px solid #e2e8f0',
                            minWidth: '260px',
                          }}
                          title="Clic para ordenar por detalle"
                        >
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <span>Concepto / Detalle</span>
                            {sortField === 'observaciones' ? (
                              sortDirection === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />
                            ) : (
                              <ArrowUpDown size={10} color="#94a3b8" />
                            )}
                          </div>
                        </th>

                        {/* Monto */}
                        <th
                          onClick={() => handleToggleSort('monto')}
                          style={{
                            padding: '9px 12px',
                            fontWeight: 600,
                            color: sortField === 'monto' ? 'var(--color-primary)' : '#475569',
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
                            {sortField === 'monto' ? (
                              sortDirection === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />
                            ) : (
                              <ArrowUpDown size={10} color="#94a3b8" />
                            )}
                          </div>
                        </th>

                        {/* Saldo Resultante */}
                        <th
                          onClick={() => handleToggleSort('saldo')}
                          style={{
                            padding: '9px 12px',
                            fontWeight: 600,
                            color: sortField === 'saldo' ? 'var(--color-primary)' : '#475569',
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
                            {sortField === 'saldo' ? (
                              sortDirection === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />
                            ) : (
                              <ArrowUpDown size={10} color="#94a3b8" />
                            )}
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {processedMovements.length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{ padding: '28px 14px', textAlign: 'center', color: '#94a3b8' }}>
                            No se encontraron movimientos con los filtros aplicados.
                          </td>
                        </tr>
                      ) : (
                        processedMovements.map((mov, idx) => {
                          const amount = Number(mov.monto ?? 0);
                          const isPositive = mov.direccion === 'ENTRADA';
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
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#f1f5f9';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = isOdd ? '#fbfcfe' : '#ffffff';
                              }}
                            >
                              <td
                                style={{
                                  padding: '8px 12px',
                                  borderRight: '1px solid #f1f5f9',
                                  color: '#334155',
                                  whiteSpace: 'nowrap',
                                  fontVariantNumeric: 'tabular-nums',
                                }}
                              >
                                {formatMovementDate(mov.fecha)}
                              </td>
                              <td
                                style={{
                                  padding: '8px 12px',
                                  borderRight: '1px solid #f1f5f9',
                                  fontWeight: 600,
                                  color: 'var(--color-primary-dark)',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {mov.folio}
                              </td>
                              <td
                                style={{
                                  padding: '8px 12px',
                                  borderRight: '1px solid #f1f5f9',
                                  whiteSpace: 'nowrap',
                                }}
                              >
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
                              <td
                                style={{
                                  padding: '8px 12px',
                                  borderRight: '1px solid #f1f5f9',
                                  color: '#475569',
                                  minWidth: '260px',
                                }}
                              >
                                {mov.observaciones || '—'}
                              </td>
                              <td
                                style={{
                                  padding: '8px 12px',
                                  borderRight: '1px solid #f1f5f9',
                                  textAlign: 'right',
                                  fontWeight: 600,
                                  whiteSpace: 'nowrap',
                                  fontVariantNumeric: 'tabular-nums',
                                  color: isPositive ? '#15803d' : isZero ? '#64748b' : '#dc2626',
                                }}
                              >
                                {isPositive ? `+${formatMoney(amount)}` : isZero ? formatMoney(0) : `-${formatMoney(Math.abs(amount))}`}
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

                {/* Status / Audit Footer Bar (Idéntico a Inversiones) */}
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
                    Mostrando <strong>{processedMovements.length}</strong> de <strong>{movements.length}</strong> movimientos
                  </span>
                  <div style={{ display: 'flex', gap: '18px', alignItems: 'center' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      Abonos: <strong style={{ color: '#15803d', fontSize: '0.84rem' }}>+{formatMoney(summary.totalIngresos)}</strong>
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      Cargos: <strong style={{ color: '#dc2626', fontSize: '0.84rem' }}>-{formatMoney(summary.totalEgresos)}</strong>
                    </span>
                  </div>
                </div>
              </>
            )}
            </div>
          )}

          {activeTab === 'withdrawals' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {withdrawalsError && <Alert type="error">{withdrawalsError}</Alert>}

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
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div>
                  <span style={{ color: '#64748b', fontSize: '0.68rem', textTransform: 'uppercase', fontWeight: 600, display: 'block' }}>
                    En proceso de dispersión (Máx. 48 hrs)
                  </span>
                  <strong style={{ color: '#d97706', fontSize: '0.96rem', marginTop: '1px', display: 'block' }}>
                    {formatMoney(withdrawalsSummary.pendingAmount)} ({withdrawalsSummary.pendingCount})
                  </strong>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ color: '#64748b', fontSize: '0.68rem', textTransform: 'uppercase', fontWeight: 600, display: 'block' }}>
                    Total Transferido
                  </span>
                  <strong style={{ color: '#16a34a', fontSize: '0.96rem', marginTop: '1px', display: 'block' }}>
                    {formatMoney(withdrawalsSummary.transferredAmount)} ({withdrawalsSummary.transferredCount})
                  </strong>
                </div>
              </div>

              {/* Toolbar: Search + Filtros + Botón actualizar */}
              <div
                className="kardex-no-print"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '10px',
                }}
              >
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', flex: '1 1 320px' }}>
                  <div style={{ position: 'relative', flex: '1 1 180px', maxWidth: '240px' }}>
                    <Search
                      size={13}
                      style={{
                        position: 'absolute',
                        left: '9px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: '#94a3b8',
                      }}
                    />
                    <input
                      type="text"
                      value={withdrawalSearch}
                      onChange={(e) => setWithdrawalSearch(e.target.value)}
                      placeholder="Buscar por folio o cuenta..."
                      style={{
                        width: '100%',
                        padding: '5px 8px 5px 28px',
                        fontSize: '0.75rem',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        outline: 'none',
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {[
                      { id: 'ALL', label: `Todas (${withdrawals.length})` },
                      { id: 'PENDING', label: `En proceso (${withdrawalsSummary.pendingCount})` },
                      { id: 'APPROVED', label: `Transferidas (${withdrawalsSummary.transferredCount})` },
                      { id: 'REJECTED', label: `Rechazadas (${withdrawalsSummary.rejectedCount})` },
                    ].map((pill) => (
                      <button
                        key={pill.id}
                        type="button"
                        onClick={() => setWithdrawalFilter(pill.id)}
                        style={{
                          padding: '3px 8px',
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          borderRadius: '4px',
                          border: '1px solid',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          background: withdrawalFilter === pill.id ? 'var(--color-primary)' : '#f8fafc',
                          color: withdrawalFilter === pill.id ? '#ffffff' : '#64748b',
                          borderColor: withdrawalFilter === pill.id ? 'var(--color-primary)' : '#e2e8f0',
                        }}
                      >
                        {pill.label}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={loadWithdrawals}
                  disabled={isLoadingWithdrawals}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 10px',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    color: '#475569',
                    background: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    cursor: 'pointer',
                  }}
                >
                  <RefreshCw size={12} className={isLoadingWithdrawals ? 'animate-spin' : ''} />
                  Actualizar
                </button>
              </div>

              {/* Contenido tabla Solicitudes */}
              {isLoadingWithdrawals ? (
                <div style={{ padding: '36px 0', textAlign: 'center', color: '#64748b', fontSize: '0.82rem' }}>
                  <RefreshCw size={18} className="animate-spin" style={{ margin: '0 auto 8px', display: 'block' }} />
                  Cargando solicitudes de retiro...
                </div>
              ) : processedWithdrawals.length === 0 ? (
                <div
                  style={{
                    padding: '36px 16px',
                    textAlign: 'center',
                    background: '#f8fafc',
                    borderRadius: '8px',
                    border: '1px dashed #cbd5e1',
                    color: '#64748b',
                    fontSize: '0.8rem',
                  }}
                >
                  <Clock size={24} style={{ margin: '0 auto 8px', display: 'block', color: '#94a3b8' }} />
                  No se encontraron solicitudes de retiro
                  {withdrawalSearch || withdrawalFilter !== 'ALL' ? ' con los filtros aplicados.' : '.'}
                </div>
              ) : (
                <>
                  <div
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      background: '#ffffff',
                    }}
                  >
                    <div style={{ overflowX: 'auto', maxHeight: '420px' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.75rem' }}>
                        <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 1 }}>
                          <tr>
                            <th style={{ padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Folio</th>
                            <th style={{ padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Fecha Solicitud</th>
                            <th style={{ padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Origen</th>
                            <th style={{ padding: '8px 12px', fontWeight: 600, color: '#475569', textAlign: 'right' }}>Monto</th>
                            <th style={{ padding: '8px 12px', fontWeight: 600, color: '#475569', textAlign: 'center' }}>Estatus</th>
                          </tr>
                        </thead>
                        <tbody>
                          {processedWithdrawals.map((w, idx) => {
                            const isPending = Number(w.status ?? 0) === 0 || w.status_label?.includes('proceso');
                            const isApproved = [1, 3, 4].includes(Number(w.status ?? 0)) || w.status_label === 'Transferido';
                            const isRejected = [2, 5].includes(Number(w.status ?? 0)) || w.status_label === 'Rechazado';

                            return (
                              <tr
                                key={w.id || idx}
                                style={{
                                  borderBottom: '1px solid #f1f5f9',
                                  background: idx % 2 === 0 ? '#ffffff' : '#fcfcfd',
                                }}
                              >
                                <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontWeight: 600, color: '#1e293b' }}>
                                  {w.folio || `RET-${w.id}`}
                                </td>
                                <td style={{ padding: '8px 12px', color: '#475569', whiteSpace: 'nowrap' }}>
                                  {formatMovementDate(w.fecha_solicitud)}
                                </td>
                                <td style={{ padding: '8px 12px', color: '#334155' }}>
                                  <span style={{ fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                                    <Building2 size={13} style={{ color: '#64748b' }} />
                                    {w.origen_cuenta || 'Cuenta disponible'}
                                  </span>
                                </td>
                                <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                                  {formatMoney(w.cantidad)}
                                </td>
                                <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                                  <span
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      padding: '3px 8px',
                                      borderRadius: '9999px',
                                      fontSize: '0.68rem',
                                      fontWeight: 600,
                                      background: isPending ? '#fef3c7' : isApproved ? '#dcfce7' : '#fee2e2',
                                      color: isPending ? '#92400e' : isApproved ? '#166534' : '#991b1b',
                                      border: `1px solid ${isPending ? '#fde68a' : isApproved ? '#bbf7d0' : '#fecaca'}`,
                                      whiteSpace: 'nowrap',
                                    }}
                                  >
                                    {isPending && <Clock size={11} />}
                                    {isApproved && <CheckCircle2 size={11} />}
                                    {isRejected && <AlertCircle size={11} />}
                                    {w.status_label || (isPending ? 'En proceso' : isApproved ? 'Transferido' : 'Rechazado')}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Footer metrics de Solicitudes */}
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
                      Mostrando <strong>{processedWithdrawals.length}</strong> de <strong>{withdrawals.length}</strong> solicitudes
                    </span>
                    <div style={{ display: 'flex', gap: '18px', alignItems: 'center' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        En proceso: <strong style={{ color: '#d97706', fontSize: '0.84rem' }}>{formatMoney(withdrawalsSummary.pendingAmount)}</strong>
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        Transferido: <strong style={{ color: '#16a34a', fontSize: '0.84rem' }}>{formatMoney(withdrawalsSummary.transferredAmount)}</strong>
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Botón de cierre en footer */}
          <div className="kardex-no-print" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2px' }}>
            <Button
              type="button"
              className="button-secondary"
              style={{ fontSize: '0.76rem', padding: '5px 14px' }}
              onClick={onClose}
            >
              Cerrar
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
