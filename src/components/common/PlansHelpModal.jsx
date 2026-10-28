import {
  Calendar,
  ChartNoAxesColumnIncreasing,
  HandCoins,
  HelpCircle,
  Info,
  PiggyBank,
  X,
} from 'lucide-react';
import { useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import Button from './Button.jsx';
import { planDescriptions, generalNote } from '../../features/savings/components/SavingsPlanCard.jsx';

function formatMoney(amount) {
  const num = Number(amount ?? 0);
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 2,
  }).format(num);
}

export default function PlansHelpModal({
  isOpen,
  onClose,
  title = 'Información de Planes',
  type = 'savings', // 'savings' | 'loans' | 'investments'
  plans = [],
}) {
  const modalId = useId();

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const renderSavingsDetails = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {plans.map((plan, idx) => {
        const name = plan?.nombre || plan?.name || `Plan #${idx + 1}`;
        const desc = planDescriptions[name] || plan?.descripcion || plan?.detalle || 'Plan de ahorro con rendimiento garantizado.';
        const rate = plan?.rendimiento ?? plan?.porcentaje ?? plan?.tasa ?? 0;
        const minAmount = plan?.monto_min ?? plan?.monto_minimo ?? 50;

        return (
          <div
            key={plan?.id || idx}
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '12px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <PiggyBank size={18} style={{ color: '#6b21a8' }} />
                <strong style={{ fontSize: '0.92rem', color: '#0f172a' }}>{name}</strong>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <span style={{ fontSize: '0.72rem', background: '#f3e8ff', color: '#6b21a8', padding: '2px 8px', borderRadius: '999px', fontWeight: 600 }}>
                  {rate}% rendimiento
                </span>
                <span style={{ fontSize: '0.72rem', background: '#e2e8f0', color: '#334155', padding: '2px 8px', borderRadius: '999px', fontWeight: 500 }}>
                  Mínimo {formatMoney(minAmount)}
                </span>
              </div>
            </div>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#475569', lineHeight: 1.4 }}>
              {desc}
            </p>
          </div>
        );
      })}

      {generalNote && (
        <div style={{ background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: '10px', padding: '10px 12px', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
          <Info size={16} style={{ color: '#7e22ce', flexShrink: 0, marginTop: '2px' }} />
          <p style={{ margin: 0, fontSize: '0.75rem', color: '#581c87', lineHeight: 1.35 }}>
            {generalNote}
          </p>
        </div>
      )}
    </div>
  );

  const renderLoansDetails = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {plans.map((plan, idx) => {
        const name = plan?.descripcion || plan?.nombre || `Plan #${idx + 1}`;
        const desc = plan?.detalle || 'Financiamiento directo con descuento vía nómina en cuotas fijas y sin comisiones ocultas.';
        const maxAmount = plan?.monto_maximo || plan?.monto_max || 0;
        const rate = plan?.interes ?? plan?.tasa ?? 0;
        const term = `${plan?.semanas || 1} semanas`;

        return (
          <div
            key={plan?.id || plan?.id_prestamo || idx}
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '12px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <HandCoins size={18} style={{ color: '#6b21a8' }} />
                <strong style={{ fontSize: '0.92rem', color: '#0f172a' }}>{name}</strong>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                {maxAmount > 0 && (
                  <span style={{ fontSize: '0.72rem', background: '#f3e8ff', color: '#6b21a8', padding: '2px 8px', borderRadius: '999px', fontWeight: 600 }}>
                    Hasta {formatMoney(maxAmount)}
                  </span>
                )}
                <span style={{ fontSize: '0.72rem', background: '#e2e8f0', color: '#334155', padding: '2px 8px', borderRadius: '999px', fontWeight: 500 }}>
                  Tasa {rate}% · {term}
                </span>
              </div>
            </div>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#475569', lineHeight: 1.4 }}>
              {desc}
            </p>
          </div>
        );
      })}
    </div>
  );

  const renderInvestmentsDetails = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {plans.map((plan, idx) => {
        const name = plan?.nombre || plan?.periodo || `Plan #${idx + 1}`;
        const desc = plan?.descripcion || plan?.detalle || 'Inversión a plazo fijo con rendimiento garantizado transferido a tu saldo disponible al vencimiento.';
        const rate = plan?.rendimiento ?? plan?.tasa ?? 0;
        const minAmount = plan?.monto_min ?? plan?.capital_minimo ?? 1000;
        const term = plan?.plazo || plan?.periodo || '1 mes';

        return (
          <div
            key={plan?.id || idx}
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '12px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ChartNoAxesColumnIncreasing size={18} style={{ color: '#6b21a8' }} />
                <strong style={{ fontSize: '0.92rem', color: '#0f172a' }}>{name}</strong>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <span style={{ fontSize: '0.72rem', background: '#f3e8ff', color: '#6b21a8', padding: '2px 8px', borderRadius: '999px', fontWeight: 600 }}>
                  {rate}% anual
                </span>
                <span style={{ fontSize: '0.72rem', background: '#e2e8f0', color: '#334155', padding: '2px 8px', borderRadius: '999px', fontWeight: 500 }}>
                  Mínimo {formatMoney(minAmount)} · {term}
                </span>
              </div>
            </div>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#475569', lineHeight: 1.4 }}>
              {desc}
            </p>
          </div>
        );
      })}
    </div>
  );

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 12000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        boxSizing: 'border-box',
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
          maxWidth: '520px',
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          boxSizing: 'border-box',
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
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <HelpCircle size={19} style={{ color: '#6b21a8' }} />
            <h3
              id={`${modalId}-title`}
              style={{
                margin: 0,
                fontSize: '1.05rem',
                fontWeight: 700,
                color: '#0f172a',
              }}
            >
              {title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#94a3b8',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              borderRadius: '6px',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Contenido Desplazable */}
        <div
          style={{
            padding: '16px 20px',
            overflowY: 'auto',
            flex: 1,
          }}
        >
          {type === 'savings' && renderSavingsDetails()}
          {type === 'loans' && renderLoansDetails()}
          {type === 'investments' && renderInvestmentsDetails()}
        </div>

        {/* Pie con Acción Precisa */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid #f1f5f9',
            display: 'flex',
            justifyContent: 'flex-end',
            background: '#ffffff',
          }}
        >
          <Button
            type="button"
            className="button-primary"
            onClick={onClose}
            style={{ minHeight: '36px', fontSize: '0.84rem', padding: '6px 18px' }}
          >
            Entendido
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
