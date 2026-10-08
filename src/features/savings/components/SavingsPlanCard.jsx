import {
  CalendarClock,
  ChartNoAxesColumnIncreasing,
  Coins,
  HandCoins,
  Landmark,
  Lock,
  PiggyBank,
  WalletCards,
} from 'lucide-react';
import { useRef } from 'react';
import { gsap, useGSAP } from '../../../animations/gsapSetup.js';

export const planDescriptions = {
  'Siempre disponible': 'Fondo de liquidez inmediata. Solicita tu capital en el momento que lo necesites y recíbelo en un plazo máximo de 24 horas hábiles tras tu solicitud.',
  'Verano': 'Ahorro estacional. Tu capital y rendimientos estarán disponibles para retiro de forma anual durante la primera semana de julio.',
  'Meta Navideña': 'Ahorro de fin de año. Diseñado para tus metas decembrinas. Disponible para retiro de forma anual durante la primera semana de diciembre.',
  'Meta Libre': 'Ahorro a medida. Define tu propia fecha meta (mínimo 2 meses). Al término del plazo, el capital y rendimientos pasarán a tu saldo disponible.'
};
export const generalNote = 'Nota: El capital no retirado en los plazos estacionales se reinvertirá automáticamente para el siguiente periodo continuo. Los retiros serán depositados en la nómina de la semana siguiente a la solicitud.';

const titleFields = ['nombre', 'name', 'titulo', 'title', 'plan', 'nombre_plan', 'nombre_ahorro', 'tipo', 'categoria'];
const descriptionFields = ['descripcion', 'description', 'detalle', 'detalles', 'resumen', 'observaciones', 'desc'];
const typeFields = ['tipo', 'categoria', 'type', 'modalidad', 'frecuencia_pago'];
const statusFields = ['estado', 'estatus', 'status', 'activo', 'active'];
const percentFields = ['porcentaje', 'porcentaje_1', 'tasa', 'tasa_interes', 'rendimiento', 'interes', 'interes_anual', 'percentage'];
const termFields = ['plazo', 'tiempo', 'duracion', 'meses', 'dias', 'periodo', 'tiempo_minimo', 'frecuencia_pago'];
const amountFields = [
  'monto_minimo',
  'monto_min',
  'monto_minimo_ahorro',
  'monto_ahorro_minimo',
  'minimo',
  'cantidad_minima',
  'monto',
  'monto_ahorro',
  'cuota',
  'aportacion_minima',
];

function getValue(plan, fields) {
  const field = fields.find((key) => plan?.[key] !== undefined && plan?.[key] !== null && plan?.[key] !== '');
  return field ? plan[field] : null;
}

function toText(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (typeof value === 'string' || typeof value === 'number') {
    return String(value);
  }

  if (typeof value === 'boolean') {
    return value ? 'Activo' : 'Inactivo';
  }

  if (Array.isArray(value)) {
    return value.map(toText).find(Boolean) || null;
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
      .map(toText)
      .find(Boolean);

    return readableValue || (value.id !== undefined ? `Plan #${value.id}` : null);
  }

  return null;
}

function getNumericValue(value) {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'object' && value !== null) {
    return getNumericValue(value.monto_min ?? value.monto ?? value.rendimiento ?? value.porcentaje ?? value.cantidad);
  }

  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.replace(/[$,%\s]/g, '').replace(/,/g, '');
  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : null;
}

function formatAmount(value) {
  const numeric = getNumericValue(value);

  if (numeric === null) {
    return toText(value);
  }

  return new Intl.NumberFormat('es-MX', {
    currency: 'MXN',
    maximumFractionDigits: 2,
    style: 'currency',
  }).format(numeric);
}

function formatPercent(value) {
  const numeric = getNumericValue(value);

  if (numeric === null) {
    return toText(value);
  }

  return `${new Intl.NumberFormat('es-MX', { maximumFractionDigits: 2 }).format(numeric)}%`;
}

function formatTerm(value) {
  const text = toText(value);

  if (!text) {
    return null;
  }

  return /\b(dia|dias|mes|meses|semana|semanas|quincena|quincenal|mensual|anual|ano|años|year)\b/i.test(text)
    ? text
    : `${text} plazo`;
}

function formatStatus(value) {
  if (typeof value === 'boolean') {
    return value ? 'Activo' : 'Inactivo';
  }

  if (value === 1 || value === '1') {
    return 'Activo';
  }

  if (value === 0 || value === '0') {
    return 'Inactivo';
  }

  return toText(value);
}

function getPlanIcon(plan) {
  const haystack = [
    getValue(plan, titleFields),
    getValue(plan, typeFields),
    getValue(plan, descriptionFields),
    formatTerm(getValue(plan, termFields)),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (/inversi[oó]n|invert|rendimiento|tasa|inter[eé]s/.test(haystack)) {
    return ChartNoAxesColumnIncreasing;
  }

  if (/pr[eé]stamo|prestamo|cr[eé]dito|credito|financiamiento/.test(haystack)) {
    return HandCoins;
  }

  if (/plazo|tiempo|periodo|mensual|quincenal|semanal/.test(haystack)) {
    return CalendarClock;
  }

  if (/ahorro|guardar|meta|alcanc[ií]a/.test(haystack)) {
    return PiggyBank;
  }

  if (/wallet|cartera|cuenta/.test(haystack)) {
    return WalletCards;
  }

  if (/monto|cuota|capital|dinero/.test(haystack)) {
    return Coins;
  }

  return Landmark;
}

function buildHighlights(plan) {
  const percentage = getValue(plan, percentFields);
  const amount = getValue(plan, amountFields);
  const status = getValue(plan, statusFields);
  const isEscalonado = plan.es_escalonado || plan.permite_fecha_personalizada;

  let percentObj = percentage !== null
    ? {
        numericValue: getNumericValue(percentage),
        value: formatPercent(percentage),
      }
    : null;

  if (isEscalonado) {
    const maxTasa = plan.tasa_max || 12.5;
    percentObj = {
      numericValue: maxTasa,
      value: `Hasta ${formatPercent(maxTasa)}`,
      prefix: 'Hasta ',
    };
  }

  return {
    amount: amount !== null ? formatAmount(amount) : null,
    percentage: percentObj,
    status: status !== null ? formatStatus(status) : null,
  };
}

function buildTags(plan) {
  const savingsType = getValue(plan, ['tipo_ahorro', 'tipo']);
  const isEscalonado = plan.es_escalonado || plan.permite_fecha_personalizada;

  const tags = [];
  if (savingsType !== null) {
    tags.push(`Tipo Ahorro: ${toText(savingsType)}`);
  }
  if (isEscalonado) {
    tags.push('Tasa escalonada por plazo');
  }
  
  return tags;
}

function SavingsPlanCard({ plan, index, onClick, disabled = false }) {
  const cardRef = useRef(null);
  const Icon = getPlanIcon(plan);
  const title = getValue(plan, titleFields) || `Plan ${plan?.id || index + 1}`;
  const highlights = buildHighlights(plan);
  const tags = buildTags(plan);

  const isPlanInactive = Number(plan?.status) === 0 || plan?.status === false;
  const isContractActive = Boolean(disabled);
  const isEffectiveDisabled = isContractActive || isPlanInactive;

  const { contextSafe } = useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const numbers = gsap.utils.toArray(cardRef.current?.querySelectorAll('.plan-number') || []);

        numbers.forEach((node) => {
          const value = Number(node.dataset.value);

          if (!Number.isFinite(value)) {
            return;
          }

          const counter = { value: 0 };
          const prefix = node.dataset.prefix || '';
          const suffix = node.dataset.suffix || '';

          gsap.to(counter, {
            value,
            duration: 0.9,
            ease: 'power2.out',
            onUpdate: () => {
              node.textContent = `${prefix}${new Intl.NumberFormat('es-MX', {
                maximumFractionDigits: suffix ? 2 : 0,
              }).format(counter.value)}${suffix}`;
            },
          });
        });
      });

      return () => mm.revert();
    },
    { dependencies: [plan], scope: cardRef, revertOnUpdate: true },
  );

  const lift = contextSafe(() => {
    if (isEffectiveDisabled || !cardRef.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    gsap.to(cardRef.current, {
      y: -8,
      scale: 1.01,
      duration: 0.24,
      ease: 'power2.out',
      overwrite: 'auto',
    });
    gsap.to(cardRef.current?.querySelector('.savings-plan-icon'), {
      rotation: -5,
      scale: 1.06,
      duration: 0.26,
      ease: 'back.out(1.8)',
      overwrite: 'auto',
    });
  });

  const settle = contextSafe(() => {
    if (isEffectiveDisabled || !cardRef.current) {
      return;
    }

    gsap.to(cardRef.current, {
      y: 0,
      scale: 1,
      duration: 0.28,
      ease: 'power2.out',
      overwrite: 'auto',
    });
    gsap.to(cardRef.current?.querySelector('.savings-plan-icon'), {
      rotation: 0,
      scale: 1,
      duration: 0.28,
      ease: 'power2.out',
      overwrite: 'auto',
    });
  });

  return (
    <article
      className={`savings-plan-card motion-plan-card ${isEffectiveDisabled ? 'savings-plan-disabled' : ''}`}
      onBlur={!isEffectiveDisabled ? settle : undefined}
      onFocus={!isEffectiveDisabled ? lift : undefined}
      onMouseEnter={!isEffectiveDisabled ? lift : undefined}
      onMouseLeave={!isEffectiveDisabled ? settle : undefined}
      onClick={() => {
        if (!isEffectiveDisabled && typeof onClick === 'function') onClick(plan);
      }}
      ref={cardRef}
      role={isEffectiveDisabled ? 'article' : 'button'}
      tabIndex={isEffectiveDisabled ? -1 : 0}
      style={
        isEffectiveDisabled
          ? {
              opacity: isPlanInactive ? 0.72 : 0.85,
              cursor: 'not-allowed',
              background: isPlanInactive ? '#fcfcfc' : '#f8fafc',
              borderColor: isPlanInactive ? '#fecaca' : '#e2e8f0',
              position: 'relative',
            }
          : { cursor: 'pointer' }
      }
    >
      <div className="savings-plan-card-top">
        <span className="savings-plan-icon" aria-hidden="true" style={isPlanInactive ? { filter: 'grayscale(0.6)', opacity: 0.7 } : undefined}>
          <Icon size={22} />
        </span>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, color: isPlanInactive ? '#64748b' : undefined }}>{toText(title)}</h3>
          {isPlanInactive ? (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.7rem',
                fontWeight: 700,
                background: '#fef2f2',
                color: '#ef4444',
                border: '1px solid #fecaca',
                padding: '2px 8px',
                borderRadius: '12px',
                letterSpacing: '0.02em',
              }}
            >
              <Lock size={11} aria-hidden="true" />
              INACTIVO
            </span>
          ) : isContractActive ? (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.7rem',
                fontWeight: 700,
                background: 'rgba(147, 51, 234, 0.1)',
                color: 'var(--color-primary)',
                border: '1px solid rgba(147, 51, 234, 0.25)',
                padding: '2px 8px',
                borderRadius: '12px',
                letterSpacing: '0.02em',
              }}
            >
              <Lock size={11} aria-hidden="true" />
              ACTIVO
            </span>
          ) : null}
        </div>
      </div>

      <div className="savings-plan-rate">
        <span>Porcentaje</span>
        <strong
          className={Number.isFinite(highlights.percentage?.numericValue) ? 'plan-number' : undefined}
          data-suffix="%"
          data-value={Number.isFinite(highlights.percentage?.numericValue) ? highlights.percentage.numericValue : undefined}
          data-prefix={highlights.percentage?.prefix}
          style={isPlanInactive ? { color: '#64748b' } : undefined}
        >
          {highlights.percentage?.value || 'No definido'}
        </strong>
      </div>

      <div className="savings-plan-summary">
        <span>
          <small>Monto minimo</small>
          <strong>{highlights.amount || 'No definido'}</strong>
        </span>
        <span>
          <small>Estado</small>
          <strong style={{ color: isPlanInactive ? '#ef4444' : '#10b981', fontWeight: 600 }}>
            {highlights.status || 'No definido'}
          </strong>
        </span>
      </div>

      {tags.length > 0 && (
        <div className="savings-plan-tags">
          {tags.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
      )}

      {isPlanInactive ? (
        <div
          style={{
            marginTop: '14px',
            padding: '9px 12px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            color: '#ef4444',
            fontSize: '0.78rem',
            fontWeight: 600,
          }}
        >
          <Lock size={13} aria-hidden="true" />
          <span>Plan no disponible actualmente</span>
        </div>
      ) : isContractActive ? (
        <div
          style={{
            marginTop: '14px',
            padding: '9px 12px',
            background: 'rgba(147, 51, 234, 0.05)',
            border: '1px solid rgba(147, 51, 234, 0.2)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            color: 'var(--color-primary)',
            fontSize: '0.78rem',
            fontWeight: 600,
          }}
        >
          <Lock size={13} aria-hidden="true" />
          <span>Ya estás ahorrando en este plan</span>
        </div>
      ) : null}
    </article>
  );
}

export default SavingsPlanCard;
