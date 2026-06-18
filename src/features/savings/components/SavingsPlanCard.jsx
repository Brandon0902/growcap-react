import {
  CalendarClock,
  ChartNoAxesColumnIncreasing,
  Coins,
  HandCoins,
  Landmark,
  PiggyBank,
  WalletCards,
} from 'lucide-react';
import { useRef } from 'react';
import { gsap, useGSAP } from '../../../animations/gsapSetup.js';

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

  return {
    amount: amount !== null ? formatAmount(amount) : null,
    percentage: percentage !== null
      ? {
          numericValue: getNumericValue(percentage),
          value: formatPercent(percentage),
        }
      : null,
    status: status !== null ? formatStatus(status) : null,
  };
}

function buildTags(plan) {
  const savingsType = getValue(plan, ['tipo_ahorro', 'tipo']);

  if (savingsType === null) {
    return [];
  }

  return [`Tipo Ahorro: ${toText(savingsType)}`].filter(Boolean);
}

function SavingsPlanCard({ plan, index }) {
  const cardRef = useRef(null);
  const Icon = getPlanIcon(plan);
  const title = getValue(plan, titleFields) || `Plan ${plan?.id || index + 1}`;
  const highlights = buildHighlights(plan);
  const tags = buildTags(plan);

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
    if (!cardRef.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
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
    if (!cardRef.current) {
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
      className="savings-plan-card motion-plan-card"
      onBlur={settle}
      onFocus={lift}
      onMouseEnter={lift}
      onMouseLeave={settle}
      ref={cardRef}
      tabIndex={0}
    >
      <div className="savings-plan-card-top">
        <span className="savings-plan-icon" aria-hidden="true">
          <Icon size={22} />
        </span>
        <div>
          <h3>{toText(title)}</h3>
        </div>
      </div>

      <div className="savings-plan-rate">
        <span>Porcentaje</span>
        <strong
          className={Number.isFinite(highlights.percentage?.numericValue) ? 'plan-number' : undefined}
          data-suffix="%"
          data-value={Number.isFinite(highlights.percentage?.numericValue) ? highlights.percentage.numericValue : undefined}
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
          <strong>{highlights.status || 'No definido'}</strong>
        </span>
      </div>

      {tags.length > 0 && (
        <div className="savings-plan-tags">
          {tags.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
      )}
    </article>
  );
}

export default SavingsPlanCard;
