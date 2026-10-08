import {
  AlertCircle,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Info,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useId, useState } from 'react';
import { createPortal } from 'react-dom';
import Button from '../../../components/common/Button.jsx';
import mpLogo from '../../../assets/mercadopago-logo.png';

function formatMoney(amount) {
  const num = Number(amount ?? 0);
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 2,
  }).format(num);
}

export default function SavingsDepositPoliciesModal({
  isOpen,
  onClose,
  policy,
  ahorro,
  defaultTab = 'LIMITS', // 'LIMITS' | 'CHANNELS'
}) {
  const modalId = useId();
  const [activeTab, setActiveTab] = useState(defaultTab);

  if (!isOpen) return null;

  const planNombre = ahorro?.plan?.nombre || ahorro?.plan_nombre || ahorro?.tipo_ahorro || 'Ahorro';
  const rendimientoRate = Number(ahorro?.rendimiento ?? ahorro?.plan?.rendimiento ?? 10);
  const isSiempreDisponible = Boolean(policy?.is_siempre_disponible);
  const limiteMensual = Number(policy?.limite_mensual ?? 10000);
  const acumuladoMes = Number(policy?.acumulado_mes ?? 0);
  const disponibleMes = Number(policy?.disponible_mes ?? 0);
  const diasRestantes = policy?.dias_restantes ?? null;

  const percentUsed = Math.min(100, Math.round((acumuladoMes / (limiteMensual || 1)) * 100));

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(3px)',
        zIndex: 100000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${modalId}-title`}
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '480px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.05)',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera Sobria */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid #f1f5f9',
            background: '#ffffff',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                background: '#f8fafc',
                color: '#334155',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid #e2e8f0',
              }}
            >
              <Info size={17} />
            </div>
            <div>
              <h2
                id={`${modalId}-title`}
                style={{
                  margin: 0,
                  fontSize: '1rem',
                  fontWeight: 700,
                  color: '#0f172a',
                  letterSpacing: '-0.01em',
                }}
              >
                Condiciones y Políticas de Aportación
              </h2>
              <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                {planNombre} • {rendimientoRate}% anual
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#94a3b8',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Selector de Pestañas Sobrio */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid #f1f5f9',
            background: '#f8fafc',
            padding: '0 20px',
            gap: '16px',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('LIMITS')}
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'LIMITS' ? '2px solid #0f172a' : '2px solid transparent',
              color: activeTab === 'LIMITS' ? '#0f172a' : '#64748b',
              fontWeight: activeTab === 'LIMITS' ? 700 : 500,
              fontSize: '0.78rem',
              padding: '10px 4px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Límites Mensuales
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('CHANNELS')}
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'CHANNELS' ? '2px solid #0f172a' : '2px solid transparent',
              color: activeTab === 'CHANNELS' ? '#0f172a' : '#64748b',
              fontWeight: activeTab === 'CHANNELS' ? 700 : 500,
              fontSize: '0.78rem',
              padding: '10px 4px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Canales y Tiempos
          </button>
        </div>

        {/* Contenido con scroll sobrio */}
        <div
          style={{
            padding: '18px 20px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          {activeTab === 'LIMITS' && (
            <>
              {/* Tarjeta de estado actual del mes */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#334155' }}>
                    Límite de aportación voluntaria de este mes:
                  </span>
                  <strong style={{ fontSize: '1rem', color: disponibleMes <= 0 ? '#64748b' : '#0f172a' }}>
                    {formatMoney(disponibleMes)}
                  </strong>
                </div>

                {/* Barra de progreso */}
                <div style={{ width: '100%', height: '5px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${percentUsed}%`,
                      height: '100%',
                      background: disponibleMes <= 0 ? '#94a3b8' : '#334155',
                      borderRadius: '3px',
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748b' }}>
                  <span>Límite mensual del plan: {formatMoney(limiteMensual)}</span>
                  <span>Aportado en el mes: {formatMoney(acumuladoMes)}</span>
                </div>
              </div>

              {/* Racional de Tesorería */}
              <div>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '0.82rem', fontWeight: 700, color: '#0f172a' }}>
                  {isSiempreDisponible ? 'Plan Siempre disponible' : 'Escalonamiento de Aportaciones por Plazo'}
                </h4>
                <p style={{ margin: 0, fontSize: '0.76rem', color: '#475569', lineHeight: '1.45' }}>
                  {isSiempreDisponible
                    ? 'Este plan cuenta con liquidez inmediata. Para mantener reservas saludables de efectivo, el límite mensual máximo para aportaciones voluntarias es de $10,000.00 MXN por colaborador.'
                    : 'Para proteger la estabilidad financiera y colocar los fondos en préstamos que generen el rendimiento prometido, las aportaciones voluntarias se regulan de acuerdo con los días restantes al término de tu plan:'}
                </p>
              </div>

              {/* Tabla de Fases para planes con plazo */}
              {!isSiempreDisponible && (
                <div
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    fontSize: '0.73rem',
                  }}
                >
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1.2fr 1fr 1fr',
                      background: '#f1f5f9',
                      padding: '7px 12px',
                      fontWeight: 700,
                      color: '#334155',
                    }}
                  >
                    <span>Tiempo al Vencimiento</span>
                    <span>Límite Mensual</span>
                    <span>Estado</span>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1.2fr 1fr 1fr',
                      padding: '8px 12px',
                      borderTop: '1px solid #f1f5f9',
                      background: diasRestantes !== null && diasRestantes > 60 ? '#f0fdf4' : '#ffffff',
                      color: '#1e293b',
                    }}
                  >
                    <span>Más de 60 días</span>
                    <strong>$25,000 MXN</strong>
                    <span style={{ color: '#16a34a', fontWeight: 600 }}>Abierto</span>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1.2fr 1fr 1fr',
                      padding: '8px 12px',
                      borderTop: '1px solid #f1f5f9',
                      background: diasRestantes !== null && diasRestantes >= 15 && diasRestantes <= 60 ? '#fffbeb' : '#ffffff',
                      color: '#1e293b',
                    }}
                  >
                    <span>De 15 a 60 días</span>
                    <strong>$5,000 MXN</strong>
                    <span style={{ color: '#d97706', fontWeight: 600 }}>Cierre gradual</span>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1.2fr 1fr 1fr',
                      padding: '8px 12px',
                      borderTop: '1px solid #f1f5f9',
                      background: diasRestantes !== null && diasRestantes < 15 ? '#f8fafc' : '#ffffff',
                      color: '#1e293b',
                    }}
                  >
                    <span>Menos de 15 días</span>
                    <strong>$0 MXN</strong>
                    <span style={{ color: '#64748b', fontWeight: 600 }}>Liquidación</span>
                  </div>
                </div>
              )}

              {/* Nota sobre nómina ordinaria */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '9px 12px',
                  fontSize: '0.73rem',
                  color: '#475569',
                  lineHeight: '1.4',
                }}
              >
                ℹ️ <strong>Importante:</strong> Las deducciones ordinarias programadas en tu nómina continúan aplicándose con normalidad hasta la fecha de corte. Los límites aplican únicamente para aportaciones extraordinarias voluntarias.
              </div>
            </>
          )}

          {activeTab === 'CHANNELS' && (
            <>
              {/* Canal SPEI */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Building2 size={16} color="#334155" />
                    <strong style={{ fontSize: '0.82rem', color: '#0f172a' }}>Transferencia SPEI</strong>
                  </div>
                  <span style={{ fontSize: '0.66rem', color: '#16a34a', fontWeight: 700, background: '#ecfdf5', padding: '2px 7px', borderRadius: '4px' }}>
                    0% Comisión
                  </span>
                </div>

                <p style={{ margin: 0, fontSize: '0.74rem', color: '#475569', lineHeight: '1.4' }}>
                  Realiza un traspaso desde tu banca móvil a la CLABE de GrowCap. Nuestro equipo de tesorería valida la referencia y el comprobante emitido por Banxico.
                </p>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.71rem', color: '#64748b' }}>
                  <Clock size={13} />
                  <span>Tiempo estimado: <strong>Hasta 24 horas hábiles</strong>.</span>
                </div>
              </div>

              {/* Canal Mercado Pago */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <img src={mpLogo} alt="Mercado Pago" style={{ height: '18px', width: 'auto' }} />
                    <strong style={{ fontSize: '0.82rem', color: '#0284c7' }}>Mercado Pago</strong>
                  </div>
                  <span style={{ fontSize: '0.66rem', color: '#0369a1', fontWeight: 700, background: '#e0f2fe', padding: '2px 7px', borderRadius: '4px' }}>
                    Acreditación 24/7
                  </span>
                </div>

                <p style={{ margin: 0, fontSize: '0.74rem', color: '#475569', lineHeight: '1.4' }}>
                  Paga al instante con tarjetas de débito o crédito, saldo en cuenta Mercado Pago o efectivo en tiendas de conveniencia.
                </p>

                <div
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    padding: '8px 10px',
                    fontSize: '0.71rem',
                    color: '#475569',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Tarifa operativa de pasarela:</span>
                    <strong>3.49% + $4.00 MXN (+ IVA)</strong>
                  </div>
                  <div style={{ fontSize: '0.67rem', color: '#64748b' }}>
                    El 100% de tu monto neto ingresa a tu meta. El recargo cubre el costo técnico del procesamiento inmediato.
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            padding: '12px 20px',
            borderTop: '1px solid #f1f5f9',
            background: '#f8fafc',
          }}
        >
          <Button
            type="button"
            className="button-primary"
            onClick={onClose}
            style={{ fontSize: '0.8rem', padding: '7px 22px' }}
          >
            Entendido
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
