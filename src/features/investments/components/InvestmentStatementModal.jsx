import { Calendar, Download, FileText, Filter, Loader2, Printer, ShieldCheck, X } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import logoGrowcap from '../../../assets/logo-growcap.png';
import Alert from '../../../components/common/Alert.jsx';
import Button from '../../../components/common/Button.jsx';
import { normalizeApiError } from '../../../api/apiUtils.js';
import { getInvestmentStatement } from '../services/investmentService.js';

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
  if (t === 'RETIRO' || t === 'LIQUIDACION') return { label: 'Retiro / Liquidación', color: '#b91c1c', bg: '#fef2f2' };
  if (t.includes('INT') || t.includes('REND')) return { label: 'Rendimiento', color: '#15803d', bg: '#f0fdf4' };
  return { label: 'Aportación de Capital', color: '#047857', bg: '#ecfdf5' };
}

function InvestmentStatementModal({ isOpen, onClose, initialInversionId = 'ALL', items = [] }) {
  const modalId = useId();
  const [selectedId, setSelectedId] = useState(initialInversionId || 'ALL');

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
      setSelectedId(initialInversionId || 'ALL');
      setFechaDesde(defaultDates.desde);
      setFechaHasta(defaultDates.hasta);
      loadStatement(initialInversionId || 'ALL', defaultDates.desde, defaultDates.hasta);
    }
  }, [isOpen, initialInversionId, defaultDates]);

  const loadStatement = async (inversionId, desde, hasta) => {
    setIsLoading(true);
    setError('');
    try {
      const res = await getInvestmentStatement(inversionId, { desde, hasta });
      setStatementData(res.data);
    } catch (err) {
      setError(normalizeApiError(err).message || 'No fue posible cargar el estado de cuenta de inversiones.');
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
              Estado de Cuenta Oficial de Inversiones
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
              Póliza de inversión:
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
              <option value="ALL">Todas las pólizas (Consolidado)</option>
              {items.map((it) => (
                <option key={it.id} value={it.id}>
                  Póliza #{it.id} - {it.plan?.nombre || it.plan?.label || `Inversión (${formatMoney(it.cantidad || it.inversion)})`}
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
                    <h1 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em' }}>
                      ESTADO DE CUENTA DE INVERSIONES
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
                    DATOS DEL INVERSIONISTA
                  </strong>
                  <div><strong>Titular:</strong> {statementData.cliente?.nombre_completo}</div>
                  <div><strong>ID Cliente:</strong> {statementData.cliente?.codigo_cliente}</div>
                  <div><strong>RFC:</strong> {statementData.cliente?.rfc}</div>
                  <div><strong>Empresa:</strong> {statementData.cliente?.empresa} ({statementData.cliente?.puesto})</div>
                  <div><strong>Domicilio:</strong> {statementData.cliente?.direccion}</div>
                </div>

                <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <strong style={{ display: 'block', color: 'var(--color-primary-dark)', fontSize: '0.85rem', marginBottom: '4px' }}>
                    PERIODO Y MODALIDAD
                  </strong>
                  <div><strong>Desde:</strong> {formatDate(statementData.periodo?.desde)}</div>
                  <div><strong>Hasta:</strong> {formatDate(statementData.periodo?.hasta)}</div>
                  <div><strong>Modalidad:</strong> {statementData.is_consolidado ? 'Consolidado General' : 'Póliza Individual'}</div>
                  <div><strong>Moneda:</strong> Peso Mexicano (MXN)</div>
                  <div><strong>Contacto:</strong> {statementData.institucion?.contacto_soporte}</div>
                </div>
              </div>

              {/* Resumen Financiero Ejecutivo */}
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '0.88rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#475569', marginBottom: '8px' }}>
                  Resumen de Inversión en el Periodo
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                  <div style={{ background: '#f1f5f9', padding: '10px 14px', borderRadius: '8px', borderLeft: '4px solid #64748b' }}>
                    <small style={{ fontSize: '0.68rem', color: '#64748b', display: 'block' }}>Capital Invertido</small>
                    <strong style={{ fontSize: '1.05rem', color: '#0f172a' }}>{formatMoney(statementData.resumen?.capital_invertido_total)}</strong>
                  </div>
                  <div style={{ background: '#f0fdf4', padding: '10px 14px', borderRadius: '8px', borderLeft: '4px solid #16a34a' }}>
                    <small style={{ fontSize: '0.68rem', color: '#16a34a', display: 'block' }}>Rendimientos Generados</small>
                    <strong style={{ fontSize: '1.05rem', color: '#15803d' }}>+{formatMoney(statementData.resumen?.rendimientos_acumulados_total)}</strong>
                  </div>
                  <div style={{ background: '#fef2f2', padding: '10px 14px', borderRadius: '8px', borderLeft: '4px solid #dc2626' }}>
                    <small style={{ fontSize: '0.68rem', color: '#dc2626', display: 'block' }}>Retiros / Liquidaciones</small>
                    <strong style={{ fontSize: '1.05rem', color: '#b91c1c' }}>-{formatMoney(statementData.resumen?.total_retiros)}</strong>
                  </div>
                  <div style={{ background: 'rgba(107, 33, 168, 0.08)', padding: '10px 14px', borderRadius: '8px', borderLeft: '4px solid var(--color-primary)' }}>
                    <small style={{ fontSize: '0.68rem', color: 'var(--color-primary-dark)', display: 'block' }}>Saldo Vivo Actual</small>
                    <strong style={{ fontSize: '1.1rem', color: 'var(--color-primary)' }}>{formatMoney(statementData.resumen?.saldo_final)}</strong>
                  </div>
                </div>
              </div>

              {/* Tabla de Pólizas de Inversión */}
              {statementData.polizas?.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '0.88rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#475569', marginBottom: '8px' }}>
                    Pólizas de Inversión
                  </h3>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', textAlign: 'left' }}>
                        <th style={{ padding: '8px 10px' }}>Póliza / Plan</th>
                        <th style={{ padding: '8px 10px', textAlign: 'center' }}>Rendimiento Anual</th>
                        <th style={{ padding: '8px 10px', textAlign: 'right' }}>Capital Inicial</th>
                        <th style={{ padding: '8px 10px', textAlign: 'right' }}>Rendimientos</th>
                        <th style={{ padding: '8px 10px', textAlign: 'right' }}>Saldo Actual</th>
                        <th style={{ padding: '8px 10px', textAlign: 'center' }}>Vencimiento</th>
                        <th style={{ padding: '8px 10px', textAlign: 'center' }}>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {statementData.polizas.map((p, idx) => (
                        <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 1 ? '#fbfcfe' : '#fff' }}>
                          <td style={{ padding: '8px 10px', fontWeight: 600, color: '#0f172a' }}>
                            {p.nombre}
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'center', color: '#15803d', fontWeight: 600 }}>
                            {p.tasa_vigente}%
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                            {formatMoney(p.capital_inicial)}
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', color: '#15803d', fontWeight: 600 }}>
                            +{formatMoney(p.rendimiento_acumulado)}
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: 'var(--color-primary)' }}>
                            {formatMoney(p.saldo_actual)}
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                            {p.fecha_fin ? formatDate(p.fecha_fin) : 'Permanente'}
                            {p.dias_restantes !== null && (
                              <span style={{ display: 'block', fontSize: '0.66rem', color: p.dias_restantes < 0 ? '#10b981' : '#64748b' }}>
                                {p.dias_restantes < 0 ? '🎉 Plazo cumplido' : `${p.dias_restantes}d restantes`}
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                            <span style={{ fontSize: '0.68rem', padding: '2px 6px', borderRadius: '4px', fontWeight: 600, background: p.status_label === 'Liquidada' ? '#f1f5f9' : (p.status_label === 'Vencida' || p.status_label === 'Concluida' ? '#f5f3ff' : '#dcfce7'), color: p.status_label === 'Liquidada' ? '#475569' : (p.status_label === 'Vencida' || p.status_label === 'Concluida' ? '#6d28d9' : '#166534') }}>
                              {p.status_label === 'Vencida' ? 'Concluida' : p.status_label}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Tabla Detallada de Movimientos */}
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '0.88rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#475569', marginBottom: '8px' }}>
                  Detalle de Movimientos en el Periodo
                </h3>
                {statementData.movimientos?.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', background: '#f8fafc', borderRadius: '8px', color: '#64748b', fontSize: '0.82rem' }}>
                    No se registraron movimientos en el periodo seleccionado.
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', textAlign: 'left' }}>
                        <th style={{ padding: '8px 10px' }}>Fecha</th>
                        <th style={{ padding: '8px 10px' }}>Póliza</th>
                        <th style={{ padding: '8px 10px' }}>Tipo</th>
                        <th style={{ padding: '8px 10px' }}>Concepto</th>
                        <th style={{ padding: '8px 10px', textAlign: 'right' }}>Monto</th>
                        <th style={{ padding: '8px 10px', textAlign: 'right' }}>Saldo Resultante</th>
                      </tr>
                    </thead>
                    <tbody>
                      {statementData.movimientos.map((mov, idx) => {
                        const badge = formatMovementTypeBadge(mov.tipo);
                        const isPos = Number(mov.monto) > 0;
                        return (
                          <tr key={mov.id || idx} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 1 ? '#fbfcfe' : '#fff' }}>
                            <td style={{ padding: '8px 10px', whiteSpace: 'nowrap', color: '#475569' }}>
                              {formatDate(mov.fecha)}
                            </td>
                            <td style={{ padding: '8px 10px', fontWeight: 600, color: 'var(--color-primary-dark)' }}>
                              {mov.inversion_nombre}
                            </td>
                            <td style={{ padding: '8px 10px' }}>
                              <span style={{ fontSize: '0.68rem', padding: '2px 6px', borderRadius: '4px', fontWeight: 600, background: badge.bg, color: badge.color }}>
                                {badge.label}
                              </span>
                            </td>
                            <td style={{ padding: '8px 10px', color: '#334155' }}>
                              {mov.concepto}
                            </td>
                            <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600, color: isPos ? '#15803d' : '#b91c1c', whiteSpace: 'nowrap' }}>
                              {isPos ? `+${formatMoney(mov.monto)}` : `-${formatMoney(Math.abs(mov.monto))}`}
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
                    <span>Cadena de seguridad: {statementData.folio} • GROWCAP FONDO PATRIMONIAL</span>
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

export default InvestmentStatementModal;
