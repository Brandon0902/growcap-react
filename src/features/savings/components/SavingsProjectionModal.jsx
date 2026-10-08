import { ArrowRight, Sparkles, TrendingUp, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import Button from '../../../components/common/Button.jsx';
import { calculateSavingsProjection } from '../utils/savingsProjection.js';

function formatMoney(amount) {
  const num = Number(amount ?? 0);
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 2,
  }).format(num);
}

function formatDate(dateObj) {
  if (!dateObj) return '';
  const d = new Date(dateObj);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function getTitle(item, fallback = 'Ahorro') {
  return item?.plan?.label || item?.plan?.nombre || item?.nombre || item?.label || item?.tipo_ahorro || item?.ahorro_nombre || fallback;
}

function SavingsProjectionModal({
  items = [],
  plans = [],
  isOpen,
  onClose,
  initialMode = null,
  initialId = null,
  suggestedFrequency = 'Quincenal',
  salaryCapacity = null,
  onApplyCuota,
  onSelectPlan,
}) {
  const activeSavings = useMemo(() => {
    return (items || []).filter((it) => Number(it?.status) === 1 || String(it?.estado ?? '').toLowerCase().includes('activ'));
  }, [items]);

  const activePlans = useMemo(() => {
    return (plans || []).filter((p) => Number(p?.status ?? 1) === 1);
  }, [plans]);

  const hasSavings = activeSavings.length > 0;
  const hasPlans = activePlans.length > 0;

  // Modo: 'savings' o 'plans'
  const [viewMode, setViewMode] = useState(() => {
    if (initialMode) return initialMode;
    return hasSavings ? 'savings' : 'plans';
  });

  const [selectedSavingsId, setSelectedSavingsId] = useState(() => {
    if (initialId && hasSavings) return String(initialId);
    return activeSavings.length === 1 ? String(activeSavings[0].id) : 'ALL';
  });

  const [selectedPlanId, setSelectedPlanId] = useState(() => {
    if (initialId && hasPlans) return String(initialId);
    return activePlans[0]?.id ? String(activePlans[0].id) : '';
  });

  const [simulatedCuota, setSimulatedCuota] = useState(100);
  const [horizonteMeses, setHorizonteMeses] = useState(12);

  // Sincronizar cuando abre el modal
  useEffect(() => {
    if (isOpen) {
      const mode = initialMode || (hasSavings ? 'savings' : 'plans');
      setViewMode(mode);

      if (mode === 'savings') {
        const id = initialId || (activeSavings.length === 1 ? String(activeSavings[0].id) : 'ALL');
        setSelectedSavingsId(id);
        if (id !== 'ALL') {
          const match = activeSavings.find((s) => String(s.id) === String(id));
          if (match) setSimulatedCuota(Number(match.cuota ?? 100));
        }
      } else {
        const id = initialId ? String(initialId) : (activePlans[0]?.id ? String(activePlans[0].id) : '');
        setSelectedPlanId(id);
        const match = activePlans.find((p) => String(p.id) === String(id)) || activePlans[0];
        if (match) setSimulatedCuota(Number(match.monto_min ?? match.monto_minimo ?? 100));
      }
    }
  }, [isOpen, initialMode, initialId, hasSavings, hasPlans]);

  // Sincronizar cuota simulada al cambiar de cuenta en modo 'savings'
  useEffect(() => {
    if (viewMode === 'savings' && selectedSavingsId !== 'ALL') {
      const match = activeSavings.find((s) => String(s.id) === String(selectedSavingsId));
      if (match) {
        setSimulatedCuota(Number(match.cuota ?? 100));
      }
    }
  }, [selectedSavingsId, viewMode, activeSavings]);

  // Sincronizar cuota simulada al cambiar de plan en modo 'plans'
  useEffect(() => {
    if (viewMode === 'plans' && selectedPlanId) {
      const match = activePlans.find((p) => String(p.id) === String(selectedPlanId));
      if (match) {
        setSimulatedCuota(Number(match.monto_min ?? match.monto_minimo ?? 100));
      }
    }
  }, [selectedPlanId, viewMode, activePlans]);

  // Proyección calculada
  const currentData = useMemo(() => {
    // MODO PLANES (SIMULADOR DE CONTRATACIÓN)
    if (viewMode === 'plans') {
      const match = activePlans.find((p) => String(p.id) === String(selectedPlanId)) || activePlans[0];
      if (!match) {
        return {
          isConsolidated: false,
          isPlanCatalog: true,
          montoActual: 0,
          aportacionesFuturas: 0,
          rendimientosProyectados: 0,
          montoProyectado: 0,
          progressPct: 0,
          frecuenciaLabel: suggestedFrequency || 'Quincenal',
          isPermanente: true,
        };
      }

      const proj = calculateSavingsProjection(match, simulatedCuota, horizonteMeses, suggestedFrequency);
      return {
        isConsolidated: false,
        isPlanCatalog: true,
        plan: match,
        ...proj,
      };
    }

    // MODO MIS AHORROS
    if (activeSavings.length === 0) {
      return {
        isConsolidated: true,
        isPlanCatalog: false,
        isPermanente: false,
        montoActual: 0,
        aportacionesFuturas: 0,
        rendimientosProyectados: 0,
        montoProyectado: 0,
        progressPct: 0,
        totalCuentas: 0,
        periodosRestantes: 0,
        frecuenciaLabel: 'Período',
      };
    }

    if (selectedSavingsId !== 'ALL') {
      const match = activeSavings.find((s) => String(s.id) === String(selectedSavingsId));
      if (match) {
        const proj = calculateSavingsProjection(match, simulatedCuota, horizonteMeses);
        return { isConsolidated: false, isPlanCatalog: false, item: match, ...proj };
      }
    }

    // Consolidado de todos los ahorros activos
    let montoActual = 0;
    let aportacionesFuturas = 0;
    let rendimientosProyectados = 0;
    let montoProyectado = 0;
    let progressSum = 0;

    for (const s of activeSavings) {
      const proj = calculateSavingsProjection(s, null, horizonteMeses);
      montoActual += proj.montoActual;
      aportacionesFuturas += proj.aportacionesFuturas;
      rendimientosProyectados += proj.rendimientosProyectados;
      montoProyectado += proj.montoProyectado;
      progressSum += proj.progressPct;
    }

    const count = Math.max(1, activeSavings.length);
    return {
      isConsolidated: true,
      isPlanCatalog: false,
      isPermanente: false,
      montoActual,
      aportacionesFuturas,
      rendimientosProyectados,
      montoProyectado,
      progressPct: Math.round(progressSum / count),
      totalCuentas: count,
      periodosRestantes: 0,
      frecuenciaLabel: 'Período',
    };
  }, [viewMode, activePlans, selectedPlanId, activeSavings, selectedSavingsId, simulatedCuota, horizonteMeses, suggestedFrequency]);

  if (!isOpen) return null;

  const originalCuota = Number(currentData?.item?.cuota ?? 0);
  const isCuotaModified = !currentData.isConsolidated
    && !currentData.isPlanCatalog
    && Number(simulatedCuota) > 0
    && Number(simulatedCuota) !== originalCuota;

  return (
    <div
      className="action-modal-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(3px)',
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
          boxShadow: '0 20px 45px -10px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(226, 232, 240, 0.9)',
          width: '100%',
          maxWidth: '500px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header sobrio y conciso per GEMINI.md */}
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '14px 18px',
            borderBottom: '1px solid #f1f5f9',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={18} color="var(--color-primary)" aria-hidden="true" />
            <h2 style={{ margin: 0, fontSize: '1rem', color: '#0f172a', fontWeight: 700 }}>
              Simulador de Ahorro
            </h2>
          </div>
          <button
            aria-label="Cerrar simulador"
            type="button"
            style={{
              background: 'transparent',
              border: 'none',
              padding: '6px',
              borderRadius: '6px',
              cursor: 'pointer',
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
            }}
            onClick={onClose}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        {/* Contenido Principal Simplificado */}
        <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Selector de modo si tiene ambos */}
          {hasSavings && hasPlans && (
            <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '8px', padding: '3px', gap: '2px' }}>
              <button
                type="button"
                style={{
                  flex: 1,
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '0.8rem',
                  fontWeight: viewMode === 'plans' ? 700 : 500,
                  background: viewMode === 'plans' ? '#ffffff' : 'transparent',
                  color: viewMode === 'plans' ? 'var(--color-primary)' : '#64748b',
                  boxShadow: viewMode === 'plans' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  cursor: 'pointer',
                }}
                onClick={() => setViewMode('plans')}
              >
                Explorar Planes
              </button>
              <button
                type="button"
                style={{
                  flex: 1,
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '0.8rem',
                  fontWeight: viewMode === 'savings' ? 700 : 500,
                  background: viewMode === 'savings' ? '#ffffff' : 'transparent',
                  color: viewMode === 'savings' ? 'var(--color-primary)' : '#64748b',
                  boxShadow: viewMode === 'savings' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  cursor: 'pointer',
                }}
                onClick={() => setViewMode('savings')}
              >
                Mis Ahorros ({activeSavings.length})
              </button>
            </div>
          )}

          {/* 1. Selector de Plan o Cuenta */}
          {viewMode === 'plans' ? (
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                Plan de ahorro:
              </label>
              <select
                className="input"
                value={selectedPlanId}
                onChange={(e) => setSelectedPlanId(e.target.value)}
                style={{ width: '100%', fontSize: '0.875rem', padding: '8px 12px', borderRadius: '8px' }}
              >
                {activePlans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {getTitle(p)} ({p.rendimiento || p.porcentaje || p.tasa || '0'}% anual)
                  </option>
                ))}
              </select>
            </div>
          ) : (
            activeSavings.length > 1 && (
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                  Cuenta a proyectar:
                </label>
                <select
                  className="input"
                  value={selectedSavingsId}
                  onChange={(e) => setSelectedSavingsId(e.target.value)}
                  style={{ width: '100%', fontSize: '0.875rem', padding: '8px 12px', borderRadius: '8px' }}
                >
                  <option value="ALL">Consolidado ({activeSavings.length} cuentas)</option>
                  {activeSavings.map((s) => (
                    <option key={s.id} value={s.id}>
                      {getTitle(s)} - Actual: {formatMoney(s.total_acumulado || s.monto_acumulado || 0)}
                    </option>
                  ))}
                </select>
              </div>
            )
          )}

          {/* 2. Cuota periódica */}
          {!currentData.isConsolidated && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#475569' }}>
                  Aportación por {(currentData.frecuenciaLabel || suggestedFrequency || 'período').toLowerCase()}:
                </label>
                {salaryCapacity?.max_cuota_permitida && Number(simulatedCuota) > salaryCapacity.max_cuota_permitida && (
                  <span style={{ fontSize: '0.72rem', color: '#dc2626', fontWeight: 600 }}>
                    Excede máx ${salaryCapacity.max_cuota_permitida}
                  </span>
                )}
              </div>

              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <span style={{ position: 'absolute', left: '12px', fontSize: '1.05rem', color: '#64748b', fontWeight: 600 }}>
                  $
                </span>
                <input
                  type="number"
                  min="50"
                  step="50"
                  value={simulatedCuota}
                  onChange={(e) => setSimulatedCuota(Math.max(0, Number(e.target.value)))}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 28px',
                    fontSize: '1rem',
                    fontWeight: 700,
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    color: '#0f172a',
                  }}
                />
              </div>

              {/* Botones de sugerencia rápida */}
              <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                {[100, 200, 500, 1000].map((pill) => (
                  <button
                    key={pill}
                    type="button"
                    style={{
                      flex: 1,
                      padding: '4px 6px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      borderRadius: '6px',
                      border: '1px solid #e2e8f0',
                      background: simulatedCuota === pill ? 'var(--color-primary)' : '#f8fafc',
                      color: simulatedCuota === pill ? '#ffffff' : '#475569',
                      cursor: 'pointer',
                      transition: 'all 0.1s ease',
                    }}
                    onClick={() => setSimulatedCuota(pill)}
                  >
                    ${pill}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 3. Selector de Plazo (si es plan permanente) */}
          {currentData.isPermanente && (
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                Plazo estimado:
              </label>
              <div style={{ display: 'flex', gap: '6px' }}>
                {[
                  { m: 6, label: '6 meses' },
                  { m: 12, label: '1 año' },
                  { m: 24, label: '2 años' },
                ].map((item) => (
                  <button
                    key={item.m}
                    type="button"
                    style={{
                      flex: 1,
                      padding: '6px 8px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      borderRadius: '6px',
                      border: '1px solid',
                      borderColor: horizonteMeses === item.m ? 'var(--color-primary)' : '#e2e8f0',
                      background: horizonteMeses === item.m ? 'rgba(147, 51, 234, 0.08)' : '#f8fafc',
                      color: horizonteMeses === item.m ? 'var(--color-primary)' : '#475569',
                      cursor: 'pointer',
                    }}
                    onClick={() => setHorizonteMeses(item.m)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 4. Tarjeta Hero con el Resultado Proyectado */}
          <div
            style={{
              background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
              border: '1px solid #bbf7d0',
              borderRadius: '12px',
              padding: '16px',
              textAlign: 'center',
            }}
          >
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {currentData.fechaFin ? `Total a recibir (${formatDate(currentData.fechaFin)})` : 'Total proyectado a recibir'}
            </span>
            <strong
              style={{
                display: 'block',
                fontSize: '1.9rem',
                color: '#14532d',
                fontWeight: 800,
                marginTop: '4px',
                fontVariantNumeric: 'tabular-nums',
                letterSpacing: '-0.02em',
              }}
            >
              {formatMoney(currentData.montoProyectado)}
            </strong>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px',
                marginTop: '12px',
                paddingTop: '10px',
                borderTop: '1px solid #bbf7d0',
                fontSize: '0.8rem',
              }}
            >
              <div style={{ textAlign: 'left' }}>
                <span style={{ display: 'block', fontSize: '0.7rem', color: '#166534' }}>Tu aportación</span>
                <strong style={{ color: '#0f172a', fontWeight: 700 }}>
                  {formatMoney(currentData.montoActual + currentData.aportacionesFuturas)}
                </strong>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ display: 'block', fontSize: '0.7rem', color: '#166534' }}>Ganancia estimada</span>
                <strong style={{ color: '#15803d', fontWeight: 800 }}>
                  +{formatMoney(currentData.rendimientosProyectados)}
                </strong>
              </div>
            </div>
          </div>
        </div>

        {/* Footer con llamada a la acción directa */}
        <footer
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 18px',
            borderTop: '1px solid #f1f5f9',
            background: '#fafafa',
            gap: '10px',
          }}
        >
          <Button
            type="button"
            className="button-secondary"
            style={{ fontSize: '0.8rem', padding: '6px 14px' }}
            onClick={onClose}
          >
            Cerrar
          </Button>

          {viewMode === 'plans' && onSelectPlan ? (
            <Button
              type="button"
              style={{
                fontSize: '0.8rem',
                padding: '6px 16px',
                background: 'var(--color-primary)',
                color: '#ffffff',
                fontWeight: 600,
                borderRadius: '6px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
              onClick={() => {
                onSelectPlan(currentData.plan, simulatedCuota);
                onClose();
              }}
            >
              <Sparkles size={14} aria-hidden="true" />
              Solicitar este ahorro
            </Button>
          ) : isCuotaModified && onApplyCuota ? (
            <Button
              type="button"
              style={{
                fontSize: '0.8rem',
                padding: '6px 16px',
                background: 'var(--color-primary)',
                color: '#ffffff',
                fontWeight: 600,
                borderRadius: '6px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
              onClick={() => {
                onApplyCuota(currentData.item, simulatedCuota);
                onClose();
              }}
            >
              Actualizar cuota
              <ArrowRight size={14} aria-hidden="true" />
            </Button>
          ) : null}
        </footer>
      </section>
    </div>
  );
}

export default SavingsProjectionModal;
