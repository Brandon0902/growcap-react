import { Calendar, Download, FileText, Filter, Loader2, Printer, ShieldCheck, X } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import logoGrowcap from '../../../assets/logo-growcap.png';
import Alert from '../../../components/common/Alert.jsx';
import Button from '../../../components/common/Button.jsx';
import { normalizeApiError } from '../../../api/apiUtils.js';
import { getLoanStatement } from '../services/loanService.js';

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
  if (t === 'DISPOSICION') return { label: 'Disposición de Crédito', color: '#1e40af', bg: '#eff6ff' };
  if (t.includes('PAG') || t.includes('ABONO')) return { label: 'Abono / Pago', color: '#15803d', bg: '#f0fdf4' };
  if (t.includes('MORA')) return { label: 'Cargo Moratorio', color: '#b91c1c', bg: '#fef2f2' };
  return { label: 'Movimiento de Crédito', color: '#475569', bg: '#f1f5f9' };
}

function formatInstallmentStatusBadge(statusLabel) {
  const s = String(statusLabel ?? '').toLowerCase();
  if (s.includes('pagad')) return { label: 'Pagado', color: '#15803d', bg: '#dcfce7' };
  if (s.includes('atras') || s.includes('mora') || s.includes('vencid')) return { label: 'Atrasado', color: '#b91c1c', bg: '#fee2e2' };
  return { label: 'Pendiente', color: '#b45309', bg: '#fef3c7' };
}

function LoanStatementModal({ isOpen, onClose, initialPrestamoId = 'ALL', items = [] }) {
  const modalId = useId();
  const [selectedId, setSelectedId] = useState(initialPrestamoId || 'ALL');

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
      setSelectedId(initialPrestamoId || 'ALL');
      setFechaDesde(defaultDates.desde);
      setFechaHasta(defaultDates.hasta);
      loadStatement(initialPrestamoId || 'ALL', defaultDates.desde, defaultDates.hasta);
    }
  }, [isOpen, initialPrestamoId, defaultDates]);

  const loadStatement = async (prestamoId, desde, hasta) => {
    setIsLoading(true);
    setError('');
    try {
      const res = await getLoanStatement(prestamoId, { desde, hasta });
      setStatementData(res);
    } catch (err) {
      setError(normalizeApiError(err).message || 'No fue posible cargar el estado de cuenta de préstamos.');
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
            padding: 20mm 15mm !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
          }
          .statement-no-print {
            display: none !important;
          }
        }
      `}</style>

      <div
        className="action-modal-container"
        style={{
          background: '#f8fafc',
          borderRadius: '16px',
          maxWidth: '920px',
          width: '100%',
          maxHeight: '94vh',
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
        {/* Top Control Bar (No Print) */}
        <div
          className="statement-no-print"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '14px 20px',
            background: '#ffffff',
            borderBottom: '1px solid #e2e8f0',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={20} color="var(--color-primary)" />
            <h2 id={`${modalId}-title`} style={{ fontSize: '1.05rem', margin: 0, color: '#0f172a', fontWeight: 600 }}>
              Estado de Cuenta Oficial de Préstamos
            </h2>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <Button
              className="button-primary icon-button"
              style={{ fontSize: '0.8rem', padding: '6px 14px', minHeight: '34px' }}
              onClick={handlePrint}
              disabled={isLoading || !statementData}
            >
              <Printer size={15} />
              Imprimir / Guardar PDF
            </Button>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#64748b',
                padding: '4px',
                display: 'flex',
                borderRadius: '6px',
              }}
              aria-label="Cerrar modal"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Filter Bar (No Print) */}
        <form
          onSubmit={handleApplyFilter}
          className="statement-no-print"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px',
            alignItems: 'flex-end',
            padding: '12px 20px',
            background: '#f1f5f9',
            borderBottom: '1px solid #e2e8f0',
          }}
        >
          <div style={{ flex: '1 1 200px' }}>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
              Crédito / Préstamo:
            </label>
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                background: '#fff',
                fontSize: '0.82rem',
                height: '34px',
              }}
            >
              <option value="ALL">Todos los préstamos (Consolidado)</option>
              {items.map((it) => (
                <option key={it.id} value={it.id}>
                  Préstamo #{it.id} - {it.plan?.nombre || it.tipo_prestamo || `Crédito (${formatMoney(it.monto || it.cantidad)})`}
                </option>
              ))}
            </select>
          </div>

          <div style={{ flex: '0 1 140px' }}>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
              Desde:
            </label>
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              style={{
                width: '100%',
                padding: '5px 8px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                background: '#fff',
                fontSize: '0.82rem',
                height: '34px',
              }}
            />
          </div>

          <div style={{ flex: '0 1 140px' }}>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
              Hasta:
            </label>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              style={{
                width: '100%',
                padding: '5px 8px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                background: '#fff',
                fontSize: '0.82rem',
                height: '34px',
              }}
            />
          </div>

          <Button
            type="submit"
            className="button-secondary icon-button"
            style={{ fontSize: '0.8rem', minHeight: '34px', padding: '6px 14px' }}
            disabled={isLoading}
          >
            <Filter size={14} />
            Aplicar Filtro
          </Button>
        </form>

        {/* Scrollable Printable Document Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px', background: '#e2e8f0' }}>
          {isLoading && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', gap: '12px' }}>
              <Loader2 size={36} className="animate-spin" color="var(--color-primary)" />
              <p style={{ color: '#475569', fontSize: '0.9rem', margin: 0 }}>Generando estado de cuenta oficial...</p>
            </div>
          )}

          {error && !isLoading && (
            <div style={{ maxWidth: '600px', margin: '0 auto' }}>
              <Alert type="error">{error}</Alert>
            </div>
          )}

          {!isLoading && statementData && (
            <article
              ref={statementRef}
              className="statement-printable-sheet"
              style={{
                background: '#ffffff',
                maxWidth: '820px',
                margin: '0 auto',
                padding: '36px 40px',
                borderRadius: '8px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                color: '#1e293b',
                fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
              }}
            >
              {/* Header con Membrete Corporativo */}
              <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #0f172a', paddingBottom: '18px', marginBottom: '22px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <img src={logoGrowcap} alt="GrowCap" style={{ height: '42px', width: 'auto' }} />
                  <div>
                    <h1 style={{ fontSize: '1.2rem', margin: 0, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em' }}>
                      ESTADO DE CUENTA DE CRÉDITO Y FINANCIAMIENTO
                    </h1>
                    <p style={{ fontSize: '0.74rem', color: '#64748b', margin: '2px 0 0' }}>
                      {statementData.institucion?.razon_social} • {statementData.institucion?.servicio}
                    </p>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ display: 'inline-block', fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1' }}>
                    FOLIO: {statementData.folio}
                  </span>
                  <p style={{ fontSize: '0.7rem', color: '#64748b', margin: '4px 0 0' }}>
                    Emisión: {formatDate(statementData.emision_fecha)}
                  </p>
                </div>
              </header>

              {/* Grid 2 Columnas: Cliente vs Periodo */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px', marginBottom: '22px', fontSize: '0.8rem' }}>
                <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <strong style={{ display: 'block', color: 'var(--color-primary-dark)', fontSize: '0.85rem', marginBottom: '4px' }}>
                    DATOS DEL TITULAR ACREDITADO
                  </strong>
                  <div><strong>Titular:</strong> {statementData.cliente?.nombre_completo}</div>
                  <div><strong>ID Cliente:</strong> {statementData.cliente?.codigo_cliente}</div>
                  <div><strong>RFC:</strong> {statementData.cliente?.rfc}</div>
                  <div><strong>Empresa:</strong> {statementData.cliente?.empresa} ({statementData.cliente?.puesto})</div>
                  <div><strong>Domicilio:</strong> {statementData.cliente?.direccion}</div>
                </div>

                <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <strong style={{ display: 'block', color: 'var(--color-primary-dark)', fontSize: '0.85rem', marginBottom: '4px' }}>
                    CONDICIONES Y PERIODO
                  </strong>
                  <div><strong>Desde:</strong> {formatDate(statementData.periodo?.desde)}</div>
                  <div><strong>Hasta:</strong> {formatDate(statementData.periodo?.hasta)}</div>
                  <div><strong>Modalidad:</strong> {statementData.is_consolidado ? 'Consolidado General de Cartera' : 'Póliza Individual de Crédito'}</div>
                  <div><strong>Frecuencia:</strong> Descuento vía {statementData.cliente?.recurrencia_pago || 'Nómina'}</div>
                  <div><strong>Moneda:</strong> Peso Mexicano (MXN)</div>
                </div>
              </div>

              {/* Resumen Financiero Ejecutivo (4 Tarjetas) */}
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '0.88rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#475569', marginBottom: '8px' }}>
                  Resumen de Crédito y Financiamiento
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                  <div style={{ background: '#f1f5f9', padding: '10px 14px', borderRadius: '8px', borderLeft: '4px solid #64748b' }}>
                    <small style={{ fontSize: '0.68rem', color: '#64748b', display: 'block' }}>Monto Financiado</small>
                    <strong style={{ fontSize: '1.05rem', color: '#0f172a' }}>{formatMoney(statementData.resumen?.monto_prestado_total)}</strong>
                    <span style={{ fontSize: '0.66rem', color: '#64748b', display: 'block', marginTop: '2px' }}>
                      +{formatMoney(statementData.resumen?.intereses_totales)} interés
                    </span>
                  </div>
                  <div style={{ background: '#f0fdf4', padding: '10px 14px', borderRadius: '8px', borderLeft: '4px solid #16a34a' }}>
                    <small style={{ fontSize: '0.68rem', color: '#16a34a', display: 'block' }}>Total Amortizado</small>
                    <strong style={{ fontSize: '1.05rem', color: '#15803d' }}>{formatMoney(statementData.resumen?.total_pagado)}</strong>
                    <span style={{ fontSize: '0.66rem', color: '#15803d', display: 'block', marginTop: '2px' }}>
                      {formatMoney(statementData.resumen?.pagos_en_periodo)} en periodo
                    </span>
                  </div>
                  <div style={{ background: 'rgba(107, 33, 168, 0.08)', padding: '10px 14px', borderRadius: '8px', borderLeft: '4px solid var(--color-primary)' }}>
                    <small style={{ fontSize: '0.68rem', color: 'var(--color-primary-dark)', display: 'block' }}>Saldo Deudor Vivo</small>
                    <strong style={{ fontSize: '1.08rem', color: 'var(--color-primary)' }}>{formatMoney(statementData.resumen?.saldo_insoluto_actual)}</strong>
                    {Number(statementData.resumen?.mora_acumulada) > 0 && (
                      <span style={{ fontSize: '0.66rem', color: '#b91c1c', display: 'block', marginTop: '2px', fontWeight: 600 }}>
                        Incluye {formatMoney(statementData.resumen?.mora_acumulada)} mora
                      </span>
                    )}
                  </div>
                  <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', borderLeft: '4px solid #0284c7' }}>
                    <small style={{ fontSize: '0.68rem', color: '#0284c7', display: 'block' }}>Progreso de Cuotas</small>
                    <strong style={{ fontSize: '1.05rem', color: '#0f172a' }}>
                      {statementData.resumen?.cuotas_pagadas} de {statementData.resumen?.cuotas_totales}
                    </strong>
                    <span style={{ fontSize: '0.66rem', color: '#64748b', display: 'block', marginTop: '2px' }}>
                      {statementData.resumen?.cuotas_pendientes} cuota{statementData.resumen?.cuotas_pendientes !== 1 ? 's' : ''} pendiente{statementData.resumen?.cuotas_pendientes !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              </div>

              {/* Tabla de Créditos en Cartera */}
              {statementData.prestamos?.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '0.88rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#475569', marginBottom: '8px' }}>
                    Créditos en Cartera
                  </h3>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', textAlign: 'left' }}>
                        <th style={{ padding: '8px 10px' }}>Crédito / Modalidad</th>
                        <th style={{ padding: '8px 10px', textAlign: 'center' }}>Tasa</th>
                        <th style={{ padding: '8px 10px', textAlign: 'right' }}>Capital</th>
                        <th style={{ padding: '8px 10px', textAlign: 'right' }}>Cuota Fija</th>
                        <th style={{ padding: '8px 10px', textAlign: 'center' }}>Plazo</th>
                        <th style={{ padding: '8px 10px', textAlign: 'right' }}>Pagado</th>
                        <th style={{ padding: '8px 10px', textAlign: 'right' }}>Saldo Restante</th>
                        <th style={{ padding: '8px 10px', textAlign: 'center' }}>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {statementData.prestamos.map((p, idx) => (
                        <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 1 ? '#fbfcfe' : '#fff' }}>
                          <td style={{ padding: '8px 10px', fontWeight: 600, color: '#0f172a' }}>
                            {p.plan_nombre} <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 400 }}>#{p.id}</span>
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'center', color: '#334155', fontWeight: 600 }}>
                            {p.tasa_interes}%
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                            {formatMoney(p.capital_original)}
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600 }}>
                            {formatMoney(p.cuota_fija)}
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                            {p.cuotas_pagadas}/{p.plazo_cuotas} ({p.progreso_pct}%)
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', color: '#15803d', fontWeight: 600 }}>
                            {formatMoney(p.monto_pagado)}
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: p.saldo_restante === 0 ? '#10b981' : 'var(--color-primary)' }}>
                            {formatMoney(p.saldo_restante)}
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                            <span style={{ fontSize: '0.68rem', padding: '2px 6px', borderRadius: '4px', fontWeight: 600, background: p.status_label === 'Liquidado' ? '#dcfce7' : (p.status_label === 'Activo' ? '#eff6ff' : '#f1f5f9'), color: p.status_label === 'Liquidado' ? '#166534' : (p.status_label === 'Activo' ? '#1d4ed8' : '#475569') }}>
                              {p.status_label}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Tabla Oficial de Amortización y Cuotas */}
              {statementData.tabla_amortizacion?.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '0.88rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#475569', marginBottom: '8px' }}>
                    Calendario y Tabla de Amortización
                  </h3>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', textAlign: 'left' }}>
                        <th style={{ padding: '7px 8px', textAlign: 'center' }}>Cuota</th>
                        <th style={{ padding: '7px 8px' }}>Vencimiento</th>
                        <th style={{ padding: '7px 8px' }}>Fecha Pago</th>
                        <th style={{ padding: '7px 8px', textAlign: 'right' }}>Cuota Pactada</th>
                        <th style={{ padding: '7px 8px', textAlign: 'right' }}>Abonado</th>
                        <th style={{ padding: '7px 8px', textAlign: 'right' }}>Saldo Restante</th>
                        <th style={{ padding: '7px 8px', textAlign: 'center' }}>Método / Ref.</th>
                        <th style={{ padding: '7px 8px', textAlign: 'center' }}>Estatus</th>
                      </tr>
                    </thead>
                    <tbody>
                      {statementData.tabla_amortizacion.map((cuota, idx) => {
                        const badge = formatInstallmentStatusBadge(cuota.status_label);
                        return (
                          <tr key={cuota.id || idx} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 1 ? '#fbfcfe' : '#fff' }}>
                            <td style={{ padding: '7px 8px', textAlign: 'center', fontWeight: 600, color: '#0f172a' }}>
                              #{cuota.num_pago}
                            </td>
                            <td style={{ padding: '7px 8px', whiteSpace: 'nowrap', color: '#475569' }}>
                              {formatDate(cuota.fecha_vencimiento)}
                            </td>
                            <td style={{ padding: '7px 8px', whiteSpace: 'nowrap', color: cuota.fecha_pago ? '#15803d' : '#94a3b8' }}>
                              {cuota.fecha_pago ? formatDate(cuota.fecha_pago) : '-'}
                            </td>
                            <td style={{ padding: '7px 8px', textAlign: 'right', fontWeight: 600 }}>
                              {formatMoney(cuota.cuota_esperada)}
                            </td>
                            <td style={{ padding: '7px 8px', textAlign: 'right', color: Number(cuota.monto_pagado) > 0 ? '#15803d' : '#64748b', fontWeight: 600 }}>
                              {Number(cuota.monto_pagado) > 0 ? formatMoney(cuota.monto_pagado) : '$0.00'}
                            </td>
                            <td style={{ padding: '7px 8px', textAlign: 'right', fontWeight: 600, color: '#334155' }}>
                              {formatMoney(cuota.saldo_restante)}
                            </td>
                            <td style={{ padding: '7px 8px', textAlign: 'center', fontSize: '0.72rem', color: '#64748b' }}>
                              {cuota.metodo_pago}
                            </td>
                            <td style={{ padding: '7px 8px', textAlign: 'center' }}>
                              <span style={{ fontSize: '0.68rem', padding: '2px 6px', borderRadius: '4px', fontWeight: 600, background: badge.bg, color: badge.color }}>
                                {badge.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Detalle de Movimientos en el Periodo */}
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '0.88rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#475569', marginBottom: '8px' }}>
                  Movimientos y Pagos en el Periodo
                </h3>
                {statementData.movimientos?.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', background: '#f8fafc', borderRadius: '8px', color: '#64748b', fontSize: '0.82rem' }}>
                    No se registraron movimientos en el rango de fechas seleccionado.
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', textAlign: 'left' }}>
                        <th style={{ padding: '8px 10px' }}>Fecha</th>
                        <th style={{ padding: '8px 10px' }}>Crédito</th>
                        <th style={{ padding: '8px 10px' }}>Tipo</th>
                        <th style={{ padding: '8px 10px' }}>Concepto</th>
                        <th style={{ padding: '8px 10px', textAlign: 'right' }}>Monto</th>
                        <th style={{ padding: '8px 10px', textAlign: 'right' }}>Saldo Deudor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {statementData.movimientos.map((mov, idx) => {
                        const badge = formatMovementTypeBadge(mov.tipo);
                        const isDisposicion = mov.tipo === 'DISPOSICION';
                        return (
                          <tr key={mov.id || idx} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 1 ? '#fbfcfe' : '#fff' }}>
                            <td style={{ padding: '8px 10px', whiteSpace: 'nowrap', color: '#475569' }}>
                              {formatDate(mov.fecha)}
                            </td>
                            <td style={{ padding: '8px 10px', fontWeight: 600, color: 'var(--color-primary-dark)' }}>
                              {mov.prestamo_nombre}
                            </td>
                            <td style={{ padding: '8px 10px' }}>
                              <span style={{ fontSize: '0.68rem', padding: '2px 6px', borderRadius: '4px', fontWeight: 600, background: badge.bg, color: badge.color }}>
                                {badge.label}
                              </span>
                            </td>
                            <td style={{ padding: '8px 10px', color: '#334155' }}>
                              {mov.concepto}
                            </td>
                            <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600, color: isDisposicion ? '#1e40af' : '#15803d', whiteSpace: 'nowrap' }}>
                              {isDisposicion ? `+${formatMoney(mov.monto)}` : `-${formatMoney(Math.abs(mov.monto))}`}
                            </td>
                            <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap' }}>
                              {formatMoney(mov.saldo_resultante)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Footer Oficial con Sello y Firma Digital */}
              <footer style={{ borderTop: '2px solid #e2e8f0', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem', color: '#64748b' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldCheck size={28} color="#059669" />
                  <div>
                    <strong style={{ display: 'block', color: '#0f172a' }}>DOCUMENTO OFICIAL VERIFICADO DIGITALMENTE</strong>
                    <span>Cadena de seguridad: {statementData.folio} • GROWCAP CARTERA Y CRÉDITO</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span>Página 1 de 1</span>
                  <span style={{ display: 'block' }}>www.growcap.com.mx</span>
                </div>
              </footer>
            </article>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

export default LoanStatementModal;
