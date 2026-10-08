import { Calendar, Download, FileText, Filter, Loader2, Printer, ShieldCheck, X } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import logoGrowcap from '../../../assets/logo-growcap.png';
import Alert from '../../../components/common/Alert.jsx';
import Button from '../../../components/common/Button.jsx';
import { normalizeApiError } from '../../../api/apiUtils.js';
import { getSavingsStatement } from '../services/savingsService.js';

function formatMoney(amount) {
  const num = Number(amount ?? 0);
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 2,
  }).format(num);
}

function formatDate(dateStr) {
  if (!dateStr) return 'N/D';
  const d = new Date(String(dateStr).replace(' ', 'T'));
  if (isNaN(d.getTime())) return String(dateStr).slice(0, 10);
  return d.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatMovementTypeBadge(tipo) {
  const t = String(tipo ?? '').toUpperCase();
  if (t === 'RETIRO') return { label: 'Retiro', color: '#b91c1c', bg: '#fef2f2' };
  if (t === 'TRANSFER') return { label: 'Transf. Saliente', color: '#b45309', bg: '#fffbeb' };
  if (t === 'TRANSFER_IN') return { label: 'Transf. Entrante', color: '#0369a1', bg: '#f0f9ff' };
  if (t === 'META_CUMPLIDA') return { label: 'Meta Cumplida', color: '#15803d', bg: '#f0fdf4' };
  if (t === 'REINVERSION') return { label: 'Reinversión', color: '#7c3aed', bg: '#faf5ff' };
  if (t.includes('INT') || t.includes('REND')) return { label: 'Rendimiento', color: '#15803d', bg: '#f0fdf4' };
  return { label: 'Aportación', color: '#047857', bg: '#ecfdf5' };
}

function SavingsStatementModal({ isOpen, onClose, initialAhorroId = 'ALL', items = [] }) {
  const modalId = useId();
  const [selectedId, setSelectedId] = useState(initialAhorroId || 'ALL');

  // Rango de fechas: por defecto el último mes
  const defaultDates = useMemo(() => {
    const now = new Date();
    const hasta = now.toISOString().slice(0, 10);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const desde = oneMonthAgo.toISOString().slice(0, 10);
    return { desde, hasta };
  }, []);

  const [fechaDesde, setFechaDesde] = useState(defaultDates.desde);
  const [fechaHasta, setFechaHasta] = useState(defaultDates.hasta);
  const [statementData, setStatementData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const statementRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedId(initialAhorroId || 'ALL');
      setFechaDesde(defaultDates.desde);
      setFechaHasta(defaultDates.hasta);
      loadStatement(initialAhorroId || 'ALL', defaultDates.desde, defaultDates.hasta);
    }
  }, [isOpen, initialAhorroId, defaultDates]);

  const loadStatement = async (ahorroId, desde, hasta) => {
    setIsLoading(true);
    setError('');
    try {
      const res = await getSavingsStatement(ahorroId, { desde, hasta });
      setStatementData(res.data);
    } catch (err) {
      setError(normalizeApiError(err).message || 'No fue posible cargar el estado de cuenta.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyFilter = (e) => {
    e.preventDefault();
    loadStatement(selectedId, fechaDesde, fechaHasta);
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="action-modal-backdrop statement-modal-backdrop"
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
          .statement-printable-sheet,
          .statement-printable-sheet * {
            visibility: visible !important;
          }
          .statement-printable-sheet {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 20px !important;
            box-shadow: none !important;
            border: none !important;
            background: #ffffff !important;
          }
          .statement-no-print {
            display: none !important;
          }
        }
      `}</style>

      <section
        aria-labelledby={`statement-title-${modalId}`}
        aria-modal="true"
        role="dialog"
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          width: '100%',
          maxWidth: '850px',
          maxHeight: '94vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Cabecera del Modal (No Imprimible) */}
        <header
          className="statement-no-print"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 24px',
            borderBottom: '1px solid #e2e8f0',
            background: '#fafafa',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileText size={20} color="var(--color-primary)" />
            <h2 id={`statement-title-${modalId}`} style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
              Estado de Cuenta Oficial
            </h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Button
              className="button-primary"
              style={{
                fontSize: '0.8rem',
                padding: '6px 14px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'var(--color-primary)',
              }}
              onClick={handlePrint}
              disabled={isLoading || !statementData}
            >
              <Printer size={15} />
              Imprimir / Guardar PDF
            </Button>
            <Button
              aria-label="Cerrar estado de cuenta"
              className="button-secondary"
              style={{ minHeight: '32px', padding: '6px', borderRadius: '6px' }}
              onClick={onClose}
            >
              <X size={18} aria-hidden="true" />
            </Button>
          </div>
        </header>

        {/* Filtros de Control (No Imprimibles) */}
        <div
          className="statement-no-print"
          style={{
            padding: '12px 24px',
            background: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <form onSubmit={handleApplyFilter} style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
            {/* Selector de Ahorro */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>Cuenta:</span>
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                style={{
                  fontSize: '0.78rem',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#0f172a',
                  fontWeight: 600,
                }}
              >
                <option value="ALL">Consolidado (Todas las cuentas)</option>
                {items.map((it) => (
                  <option key={it.id} value={it.id}>
                    {it.plan?.nombre || it.nombre || it.plan?.label || `Ahorro #${it.id}`}
                  </option>
                ))}
              </select>
            </div>

            {/* Selector Desde */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>Desde:</span>
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                style={{
                  fontSize: '0.78rem',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                }}
              />
            </div>

            {/* Selector Hasta */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>Hasta:</span>
              <input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                style={{
                  fontSize: '0.78rem',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                }}
              />
            </div>

            <Button
              type="submit"
              className="button-secondary"
              style={{ fontSize: '0.76rem', padding: '4px 10px', height: '30px' }}
              disabled={isLoading}
            >
              <Filter size={13} style={{ marginRight: '4px' }} />
              Actualizar
            </Button>
          </form>

          {/* Atajos rápidos */}
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              type="button"
              style={{
                fontSize: '0.72rem',
                padding: '3px 8px',
                borderRadius: '4px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                cursor: 'pointer',
                color: '#475569',
              }}
              onClick={() => {
                setFechaDesde(defaultDates.desde);
                setFechaHasta(defaultDates.hasta);
                loadStatement(selectedId, defaultDates.desde, defaultDates.hasta);
              }}
            >
              Último Mes
            </button>
            <button
              type="button"
              style={{
                fontSize: '0.72rem',
                padding: '3px 8px',
                borderRadius: '4px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                cursor: 'pointer',
                color: '#475569',
              }}
              onClick={() => {
                const now = new Date();
                const hasta = now.toISOString().slice(0, 10);
                const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
                setFechaDesde(threeMonthsAgo);
                setFechaHasta(hasta);
                loadStatement(selectedId, threeMonthsAgo, hasta);
              }}
            >
              Trimestre
            </button>
            <button
              type="button"
              style={{
                fontSize: '0.72rem',
                padding: '3px 8px',
                borderRadius: '4px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                cursor: 'pointer',
                color: '#475569',
              }}
              onClick={() => {
                const now = new Date();
                const hasta = now.toISOString().slice(0, 10);
                setFechaDesde('2024-01-01');
                setFechaHasta(hasta);
                loadStatement(selectedId, '2024-01-01', hasta);
              }}
            >
              Todo
            </button>
          </div>
        </div>

        {/* Contenedor del Estado de Cuenta (Imprimible) */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', background: '#f1f5f9' }}>
          {isLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '12px' }}>
              <Loader2 size={32} className="spinning" color="var(--color-primary)" />
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.88rem' }}>Generando estado de cuenta certificado...</p>
            </div>
          ) : error ? (
            <Alert type="error">{error}</Alert>
          ) : statementData ? (
            /* HOJA MEMBRETADA OFICIAL */
            <article
              ref={statementRef}
              className="statement-printable-sheet"
              style={{
                background: '#ffffff',
                borderRadius: '12px',
                padding: '36px 40px',
                boxShadow: '0 4px 15px rgba(0, 0, 0, 0.05)',
                border: '1px solid #e2e8f0',
                fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
                color: '#0f172a',
              }}
            >
              {/* Encabezado Membretado */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid var(--color-primary)', paddingBottom: '18px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <img src={logoGrowcap} alt="GrowCap Logo" style={{ height: '42px', objectFit: 'contain' }} />
                  <div>
                    <h1 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
                      GROWCAP SOLUCIONES
                    </h1>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
                      Fondo de Previsión Social • Caja de Ahorro
                    </span>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ display: 'inline-block', background: '#faf5ff', border: '1px solid #e9d5ff', padding: '4px 10px', borderRadius: '6px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                      FOLIO: {statementData.folio}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.72rem', color: '#64748b' }}>
                    Emisión: {formatDate(statementData.emision_fecha)}
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: '0.72rem', fontWeight: 600, color: '#0f172a' }}>
                    Periodo: {formatDate(statementData.periodo?.desde)} al {formatDate(statementData.periodo?.hasta)}
                  </p>
                </div>
              </div>

              {/* Ficha de Datos: Cliente y Empresa */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', background: '#f8fafc', padding: '14px 16px', borderRadius: '8px', border: '1px solid #f1f5f9', marginBottom: '20px' }}>
                <div>
                  <span style={{ fontSize: '0.68rem', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700, letterSpacing: '0.04em' }}>
                    Datos del Titular
                  </span>
                  <strong style={{ display: 'block', fontSize: '0.92rem', color: '#0f172a', marginTop: '2px' }}>
                    {statementData.cliente?.nombre_completo}
                  </strong>
                  <div style={{ fontSize: '0.76rem', color: '#475569', marginTop: '3px', lineHeight: 1.4 }}>
                    <span><strong>RFC:</strong> {statementData.cliente?.rfc}</span> • <span><strong>ID/Código:</strong> {statementData.cliente?.codigo_cliente}</span>
                    <br />
                    <span><strong>Correo:</strong> {statementData.cliente?.email}</span>
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.68rem', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700, letterSpacing: '0.04em' }}>
                    Adscripción Laboral y Nómina
                  </span>
                  <strong style={{ display: 'block', fontSize: '0.92rem', color: '#0f172a', marginTop: '2px' }}>
                    {statementData.cliente?.empresa}
                  </strong>
                  <div style={{ fontSize: '0.76rem', color: '#475569', marginTop: '3px', lineHeight: 1.4 }}>
                    <span><strong>Puesto:</strong> {statementData.cliente?.puesto}</span>
                    <br />
                    <span><strong>Periodicidad de nómina:</strong> {statementData.cliente?.recurrencia_pago}</span>
                  </div>
                </div>
              </div>

              {/* Resumen Financiero del Periodo (KPIs) */}
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.03em', margin: '0 0 10px' }}>
                  Resumen Contable del Periodo
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
                  <div style={{ padding: '10px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                    <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>Saldo Anterior</span>
                    <strong style={{ display: 'block', fontSize: '1rem', color: '#0f172a', marginTop: '2px' }}>
                      {formatMoney(statementData.resumen?.saldo_inicial)}
                    </strong>
                  </div>
                  <div style={{ padding: '10px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px' }}>
                    <span style={{ fontSize: '0.68rem', color: '#166534', fontWeight: 600 }}>Aportaciones (+)</span>
                    <strong style={{ display: 'block', fontSize: '1rem', color: '#15803d', marginTop: '2px' }}>
                      +{formatMoney(statementData.resumen?.total_aportaciones)}
                    </strong>
                  </div>
                  <div style={{ padding: '10px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px' }}>
                    <span style={{ fontSize: '0.68rem', color: '#166534', fontWeight: 600 }}>Intereses Ganados (+)</span>
                    <strong style={{ display: 'block', fontSize: '1rem', color: '#15803d', marginTop: '2px' }}>
                      +{formatMoney(statementData.resumen?.total_intereses)}
                    </strong>
                  </div>
                  <div style={{ padding: '10px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px' }}>
                    <span style={{ fontSize: '0.68rem', color: '#991b1b', fontWeight: 600 }}>Retiros (-)</span>
                    <strong style={{ display: 'block', fontSize: '1rem', color: '#b91c1c', marginTop: '2px' }}>
                      -{formatMoney(statementData.resumen?.total_retiros)}
                    </strong>
                  </div>
                  <div style={{ padding: '10px 12px', background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: '8px' }}>
                    <span style={{ fontSize: '0.68rem', color: '#6b21a8', fontWeight: 700 }}>Saldo Final al Corte</span>
                    <strong style={{ display: 'block', fontSize: '1.05rem', color: 'var(--color-primary)', marginTop: '2px' }}>
                      {formatMoney(statementData.resumen?.saldo_final)}
                    </strong>
                  </div>
                </div>

                {/* Sub-desglose de Saldo en Ahorro vs Disponible */}
                <div style={{ display: 'flex', gap: '16px', marginTop: '8px', fontSize: '0.74rem', color: '#64748b' }}>
                  <span>• <strong>Capital en Meta (Caja Fuerte):</strong> {formatMoney(statementData.resumen?.saldo_en_ahorro)}</span>
                  <span>• <strong>Saldo Disponible:</strong> <strong style={{ color: '#16a34a' }}>{formatMoney(statementData.resumen?.saldo_disponible)}</strong></span>
                </div>
              </div>

              {/* Detalle de Cuentas (si es consolidado) */}
              {statementData.is_consolidado && statementData.cuentas?.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.03em', margin: '0 0 10px' }}>
                    Cuentas de Ahorro Incluidas ({statementData.cuentas.length})
                  </h3>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.76rem' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid #cbd5e1', textAlign: 'left', color: '#475569' }}>
                          <th style={{ padding: '7px 10px' }}>Plan</th>
                          <th style={{ padding: '7px 10px' }}>Tasa Anual</th>
                          <th style={{ padding: '7px 10px' }}>Cuota Nómina</th>
                          <th style={{ padding: '7px 10px' }}>Vencimiento</th>
                          <th style={{ padding: '7px 10px', textAlign: 'right' }}>En Meta</th>
                          <th style={{ padding: '7px 10px', textAlign: 'right' }}>Disponible</th>
                          <th style={{ padding: '7px 10px', textAlign: 'right' }}>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {statementData.cuentas.map((c) => (
                          <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '7px 10px', fontWeight: 600 }}>{c.nombre}</td>
                            <td style={{ padding: '7px 10px' }}>{c.tasa_vigente}%</td>
                            <td style={{ padding: '7px 10px' }}>{formatMoney(c.cuota)}</td>
                            <td style={{ padding: '7px 10px' }}>{c.fecha_fin ? formatDate(c.fecha_fin) : 'Permanente'}</td>
                            <td style={{ padding: '7px 10px', textAlign: 'right' }}>{formatMoney(c.monto_ahorro)}</td>
                            <td style={{ padding: '7px 10px', textAlign: 'right', color: '#16a34a' }}>{formatMoney(c.saldo_disponible)}</td>
                            <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 700 }}>{formatMoney(c.saldo_total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Detalle Cronológico de Movimientos */}
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.03em', margin: '0 0 10px' }}>
                  Movimientos del Periodo ({statementData.movimientos?.length || 0})
                </h3>
                {statementData.movimientos?.length === 0 ? (
                  <p style={{ fontSize: '0.78rem', color: '#94a3b8', fontStyle: 'italic', padding: '12px 0' }}>
                    No se registraron movimientos en el periodo seleccionado.
                  </p>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#475569' }}>
                          <th style={{ padding: '8px 10px', width: '90px' }}>Fecha</th>
                          <th style={{ padding: '8px 10px' }}>Cuenta</th>
                          <th style={{ padding: '8px 10px', width: '120px' }}>Tipo</th>
                          <th style={{ padding: '8px 10px' }}>Concepto / Detalle</th>
                          <th style={{ padding: '8px 10px', textAlign: 'right', width: '100px' }}>Monto</th>
                          <th style={{ padding: '8px 10px', textAlign: 'right', width: '100px' }}>Saldo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {statementData.movimientos.map((m) => {
                          const badge = formatMovementTypeBadge(m.tipo);
                          const isNegative = Number(m.monto) < 0 || m.tipo === 'RETIRO' || m.tipo === 'TRANSFER';
                          return (
                            <tr key={m.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '7px 10px', whiteSpace: 'nowrap', color: '#64748b' }}>{formatDate(m.fecha)}</td>
                              <td style={{ padding: '7px 10px', fontWeight: 500 }}>{m.ahorro_nombre}</td>
                              <td style={{ padding: '7px 10px' }}>
                                <span
                                  style={{
                                    display: 'inline-block',
                                    fontSize: '0.67rem',
                                    fontWeight: 700,
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    color: badge.color,
                                    background: badge.bg,
                                  }}
                                >
                                  {badge.label}
                                </span>
                              </td>
                              <td style={{ padding: '7px 10px', color: '#334155' }}>{m.concepto}</td>
                              <td
                                style={{
                                  padding: '7px 10px',
                                  textAlign: 'right',
                                  fontWeight: 600,
                                  color: isNegative ? '#b91c1c' : '#15803d',
                                }}
                              >
                                {isNegative ? `-${formatMoney(Math.abs(m.monto))}` : `+${formatMoney(m.monto)}`}
                              </td>
                              <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 600, color: '#0f172a' }}>
                                {formatMoney(m.saldo_resultante)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Pie Institucional y Sello Digital */}
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px', marginTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px' }}>
                <div style={{ maxWidth: '480px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#15803d', marginBottom: '4px' }}>
                    <ShieldCheck size={16} />
                    <strong style={{ fontSize: '0.75rem' }}>Documento Financiero Certificado</strong>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.68rem', color: '#64748b', lineHeight: 1.4 }}>
                    Este estado de cuenta es emitido formalmente por el Fondo de Previsión Social de GrowCap como comprobante de ahorro y rendimientos generados por retención vía nómina. Consérvelo para cualquier aclaración o trámite administrativo.
                  </p>
                  <p style={{ margin: '4px 0 0', fontSize: '0.65rem', color: '#94a3b8' }}>
                    Soporte: soporte@growcap.com.mx • Validez legal conforme a estatutos de previsión social.
                  </p>
                </div>

                <div style={{ textAlign: 'center', minWidth: '160px' }}>
                  <div style={{ borderBottom: '1px solid #94a3b8', width: '150px', height: '32px', margin: '0 auto 4px' }} />
                  <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#475569', display: 'block' }}>
                    Firma de Control
                  </span>
                  <span style={{ fontSize: '0.62rem', color: '#94a3b8' }}>
                    GrowCap Administración
                  </span>
                </div>
              </div>
            </article>
          ) : null}
        </div>

        {/* Footer del Modal (No Imprimible) */}
        <footer
          className="statement-no-print"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 24px',
            borderTop: '1px solid #e2e8f0',
            background: '#fafafa',
          }}
        >
          <span style={{ fontSize: '0.76rem', color: '#64748b' }}>
            {statementData ? `Folio: ${statementData.folio}` : 'Cargando datos...'}
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button
              className="button-primary"
              style={{
                fontSize: '0.8rem',
                padding: '6px 16px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'var(--color-primary)',
              }}
              onClick={handlePrint}
              disabled={isLoading || !statementData}
            >
              <Printer size={15} />
              Imprimir / Guardar PDF
            </Button>
            <Button
              className="button-secondary"
              style={{ fontSize: '0.8rem', padding: '6px 16px' }}
              onClick={onClose}
            >
              Cerrar
            </Button>
          </div>
        </footer>
      </section>
    </div>,
    document.body
  );
}

export default SavingsStatementModal;
