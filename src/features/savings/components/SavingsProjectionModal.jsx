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
        {/* Header Minimalista */}
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 20px',
            borderBottom: '1px solid #f1f5f9',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={18} color="var(--color-primary)" aria-hidden="true" />
            <h2 style={{ margin: 0, fontSize: '1.05rem', color: '#0f172a', fontWeight: 700 }}>
              {viewMode === 'plans' ? 'Simulador de Planes de Ahorro' : 'Proyección de Ahorro'}
            </h2>
          </div>
          <Button
            aria-label="Cerrar proyección"
            className="button-secondary"
            style={{ minHeight: '30px', padding: '5px', borderRadius: '6px' }}
            onClick={onClose}
          >
            <X size={16} aria-hidden="true" />
          </Button>
        </header>

        {/* Body */}
        <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Selector de categoría (si el usuario tiene ahorros activos Y además hay planes disponibles) */}
          {hasSavings && hasPlans && (
            <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '8px', padding: '3px', gap: '2px' }}>
              <button
                type="button"
                style={{
                  flex: 1,
                  padding: '5px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '0.74rem',
                  fontWeight: viewMode === 'savings' ? 700 : 500,
                  background: viewMode === 'savings' ? '#ffffff' : 'transparent',
                  color: viewMode === 'savings' ? 'var(--color-primary)' : '#64748b',
                  boxShadow: viewMode === 'savings' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onClick={() => setViewMode('savings')}
              >
                Mis Ahorros ({activeSavings.length})
              </button>
              <button
                type="button"
                style={{
                  flex: 1,
                  padding: '5px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '0.74rem',
                  fontWeight: viewMode === 'plans' ? 700 : 500,
                  background: viewMode === 'plans' ? '#ffffff' : 'transparent',
                  color: viewMode === 'plans' ? 'var(--color-primary)' : '#64748b',
                  boxShadow: viewMode === 'plans' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onClick={() => setViewMode('plans')}
              >
                Explorar Planes ({activePlans.length})
              </button>
            </div>
          )}

          {/* Sub-selector de Cuenta o Plan */}
          {viewMode === 'savings' && activeSavings.length > 1 && (
            <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
              <button
                type="button"
                style={{
                  fontSize: '0.73rem',
                  padding: '4px 10px',
                  borderRadius: '16px',
                  border: '1px solid',
                  borderColor: selectedSavingsId === 'ALL' ? 'var(--color-primary)' : '#e2e8f0',
                  background: selectedSavingsId === 'ALL' ? 'rgba(147, 51, 234, 0.08)' : '#ffffff',
                  color: selectedSavingsId === 'ALL' ? 'var(--color-primary)' : '#64748b',
                  fontWeight: selectedSavingsId === 'ALL' ? 600 : 400,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
                onClick={() => setSelectedSavingsId('ALL')}
              >
                Consolidado ({activeSavings.length})
              </button>
              {activeSavings.map((s) => {
                const isSelected = String(s.id) === String(selectedSavingsId);
                return (
                  <button
                    key={s.id}
                    type="button"
                    style={{
                      fontSize: '0.73rem',
                      padding: '4px 10px',
                      borderRadius: '16px',
                      border: '1px solid',
                      borderColor: isSelected ? 'var(--color-primary)' : '#e2e8f0',
                      background: isSelected ? 'rgba(147, 51, 234, 0.08)' : '#ffffff',
                      color: isSelected ? 'var(--color-primary)' : '#64748b',
                      fontWeight: isSelected ? 600 : 400,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                    onClick={() => setSelectedSavingsId(String(s.id))}
                  >
                    {getTitle(s)}
                  </button>
                );
              })}
            </div>
          )}

          {/* Selector de Planes de Ahorro */}
          {viewMode === 'plans' && activePlans.length > 1 && (
            <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
              {activePlans.map((p) => {
                const isSelected = String(p.id) === String(selectedPlanId);
                return (
                  <button
                    key={p.id}
                    type="button"
                    style={{
                      fontSize: '0.73rem',
                      padding: '4px 10px',
                      borderRadius: '16px',
                      border: '1px solid',
                      borderColor: isSelected ? 'var(--color-primary)' : '#e2e8f0',
                      background: isSelected ? 'rgba(147, 51, 234, 0.08)' : '#ffffff',
                      color: isSelected ? 'var(--color-primary)' : '#64748b',
                      fontWeight: isSelected ? 600 : 400,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                    onClick={() => setSelectedPlanId(String(p.id))}
                  >
                    {getTitle(p)}
                  </button>
                );
              })}
            </div>
          )}

          {/* Cifra Principal */}
          <div style={{ textAlign: 'center', padding: '4px 0' }}>
            {currentData.isConsolidated ? (
              <span style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                Meta Global Estimada
              </span>
            ) : currentData.isPermanente ? (
              <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '5px', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                  Estimado a {horizonteMeses} {horizonteMeses === 1 ? 'mes' : 'meses'} {currentData.fechaFin ? `• ${formatDate(currentData.fechaFin)}` : ''}
                </span>
                {/* Selector Interactivo de Plazo */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap', justifyContent: 'center' }}>
                  {[3, 6, 12, 24, 36].map((m) => (
                    <button
                      key={m}
                      type="button"
                      style={{
                        fontSize: '0.67rem',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        border: '1px solid',
                        borderColor: horizonteMeses === m ? 'var(--color-primary)' : '#e2e8f0',
                        background: horizonteMeses === m ? 'rgba(147, 51, 234, 0.08)' : '#ffffff',
                        color: horizonteMeses === m ? 'var(--color-primary)' : '#64748b',
                        fontWeight: horizonteMeses === m ? 700 : 500,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                      onClick={() => setHorizonteMeses(m)}
                    >
                      {m < 12 ? `${m}m` : `${m / 12} ${m / 12 === 1 ? 'año' : 'años'}`}
                    </button>
                  ))}
                  {/* Entrada numérica de meses libre */}
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', marginLeft: '3px' }}>
                    <input
                      type="number"
                      min="1"
                      max="120"
                      value={horizonteMeses}
                      onChange={(e) => setHorizonteMeses(Math.max(1, Math.min(120, Number(e.target.value))))}
                      style={{
                        width: '42px',
                        padding: '2px 3px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        textAlign: 'center',
                        color: '#0f172a',
                        background: '#ffffff',
                      }}
                      title="Personalizar meses de proyección"
                    />
                    <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>m</span>
                  </div>
                </div>
              </div>
            ) : (
              <span style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                Meta al Vencimiento ({formatDate(currentData.fechaFin)})
              </span>
            )}

            <strong
              style={{
                fontSize: '2.1rem',
                color: '#0f172a',
                fontWeight: 800,
                display: 'block',
                marginTop: '4px',
                fontVariantNumeric: 'tabular-nums',
                letterSpacing: '-0.02em',
              }}
            >
              {formatMoney(currentData.montoProyectado)}
            </strong>
            <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: '#64748b' }}>
              {currentData.isConsolidated
                ? `Proyección acumulada de tus ${currentData.totalCuentas} cuentas de ahorro activas.`
                : `Aportando ${formatMoney(currentData.cuota)} ${(currentData.frecuenciaLabel || '').toLowerCase()} al ${currentData.tasaAnualPct}% anual.`}
            </p>
          </div>

          {/* Simulación Sutil de Cuota */}
          {!currentData.isConsolidated && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '9px 12px',
                background: '#faf5ff',
                borderRadius: '8px',
                border: '1px solid #f3e8ff',
                gap: '8px',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.76rem', color: '#6b21a8', fontWeight: 600 }}>
                  Simular cuota:
                </span>
                <div style={{ display: 'inline-flex', alignItems: 'center', position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '8px', fontSize: '0.78rem', color: '#9333ea', fontWeight: 600 }}>
                    $
                  </span>
                  <input
                    type="number"
                    min="50"
                    max={salaryCapacity?.max_cuota_permitida ? salaryCapacity.max_cuota_permitida : undefined}
                    step="50"
                    value={simulatedCuota}
                    onChange={(e) => setSimulatedCuota(Math.max(0, Number(e.target.value)))}
                    style={{
                      width: '84px',
                      padding: '3px 6px 3px 18px',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      borderRadius: '6px',
                      border: '1px solid #d8b4fe',
                      background: '#ffffff',
                      color: '#0f172a',
                      textAlign: 'right',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  />
                </div>
                <span style={{ fontSize: '0.72rem', color: '#7e22ce' }}>
                  /{(currentData.frecuenciaLabel || '').toLowerCase()}
                </span>
                {salaryCapacity?.max_cuota_permitida && Number(simulatedCuota) > salaryCapacity.max_cuota_permitida && (
                  <span style={{ fontSize: '0.72rem', color: '#dc2626', fontWeight: 600 }}>
                    (Excede 50% nómina: máx ${salaryCapacity.max_cuota_permitida})
                  </span>
                )}
              </div>

              {/* Botón Aplicar cuota en modo 'savings' */}
              {isCuotaModified && onApplyCuota && (
                <Button
                  className="button-secondary icon-button"
                  style={{
                    fontSize: '0.74rem',
                    padding: '4px 10px',
                    height: '28px',
                    minHeight: '28px',
                    background: 'var(--color-primary)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: 600,
                  }}
                  onClick={() => {
                    onApplyCuota(currentData.item, simulatedCuota);
                    onClose();
                  }}
                  title="Aplicar esta nueva cuota de nómina"
                >
                  Aplicar cuota
                  <ArrowRight size={13} aria-hidden="true" style={{ marginLeft: '4px' }} />
                </Button>
              )}

              {/* En modo 'plans': Botón Elegir este plan */}
              {currentData.isPlanCatalog && onSelectPlan && (
                <Button
                  className="button-secondary icon-button"
                  style={{
                    fontSize: '0.74rem',
                    padding: '4px 10px',
                    height: '28px',
                    minHeight: '28px',
                    background: 'var(--color-primary)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: 600,
                  }}
                  onClick={() => {
                    onSelectPlan(currentData.plan, simulatedCuota);
                    onClose();
                  }}
                  title="Comenzar solicitud con este plan y cuota"
                >
                  Elegir plan
                  <ArrowRight size={13} aria-hidden="true" style={{ marginLeft: '4px' }} />
                </Button>
              )}
            </div>
          )}

          {/* Barra de Progreso Fina */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748b', marginBottom: '5px' }}>
              <span>{currentData.isPlanCatalog ? 'Meta de ahorro' : 'Avance del plazo'}</span>
              <strong style={{ color: 'var(--color-primary)' }}>
                {currentData.isPlanCatalog ? '100% al término' : `${currentData.progressPct}%`}
              </strong>
            </div>
            <div style={{ width: '100%', height: '6px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
              <div
                style={{
                  width: currentData.isPlanCatalog ? '100%' : `${currentData.progressPct}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, var(--color-primary) 0%, #16a34a 100%)',
                  borderRadius: '4px',
                  transition: 'width 0.35s ease',
                }}
              />
            </div>
          </div>

          {/* Desglose Contable Minimalista */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #f1f5f9',
              borderRadius: '10px',
              padding: '12px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              fontSize: '0.8rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
              <span>{currentData.isPlanCatalog ? 'Saldo inicial' : 'Ahorrado a la fecha'}</span>
              <strong style={{ color: '#0f172a' }}>{formatMoney(currentData.montoActual)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
              <span>
                {currentData.isPlanCatalog ? 'Total que aportarás' : 'Aportaciones de nómina restantes'}
                {!currentData.isConsolidated && currentData.periodosRestantes !== undefined ? (
                  ` (${currentData.periodosRestantes} ${(currentData.frecuenciaLabel || 'período').toLowerCase()}s)`
                ) : ''}
              </span>
              <strong style={{ color: 'var(--color-primary)' }}>{formatMoney(currentData.aportacionesFuturas)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', paddingTop: '4px', borderTop: '1px solid #e2e8f0' }}>
              <span>Rendimiento estimado a ganar</span>
              <strong style={{ color: '#16a34a' }}>+{formatMoney(currentData.rendimientosProyectados)}</strong>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 20px',
            borderTop: '1px solid #f1f5f9',
            background: '#fafafa',
          }}
        >
          {currentData.isPlanCatalog && onSelectPlan ? (
            <Button
              type="button"
              style={{
                fontSize: '0.78rem',
                padding: '6px 14px',
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
              Comenzar Ahorro
            </Button>
          ) : (
            <div />
          )}

          <Button
            type="button"
            className="button-secondary"
            style={{ fontSize: '0.78rem', padding: '6px 16px' }}
            onClick={onClose}
          >
            {currentData.isPlanCatalog ? 'Cerrar' : 'Entendido'}
          </Button>
        </footer>
      </section>
    </div>
  );
}

export default SavingsProjectionModal;
