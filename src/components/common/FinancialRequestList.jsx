import { AlertCircle, CreditCard, ExternalLink, RefreshCw, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import Button from './Button.jsx';

function getValue(item, fields) {
  const field = fields.find((key) => item?.[key] !== undefined && item?.[key] !== null && item?.[key] !== '');
  return field ? item[field] : null;
}

function formatText(value, fallback = 'No definido') {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  if (typeof value === 'string' || typeof value === 'number') {
    return String(value);
  }

  if (typeof value === 'boolean') {
    return value ? 'Si' : 'No';
  }

  if (Array.isArray(value)) {
    const firstReadable = value.map((item) => formatText(item, '')).find(Boolean);
    return firstReadable || fallback;
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
      .map((candidate) => formatText(candidate, ''))
      .find(Boolean);

    return readableValue || (value.id !== undefined ? `Plan #${value.id}` : fallback);
  }

  return fallback;
}

function normalizeText(value) {
  return formatText(value, '').toLowerCase();
}

function formatMoney(value) {
  if (value === null || value === undefined || value === '') {
    return 'No definido';
  }

  if (typeof value === 'object') {
    return formatMoney(
      value.monto
      ?? value.monto_ahorro
      ?? value.monto_min
      ?? value.cantidad
      ?? value.cuota
      ?? value.total
      ?? value.saldo,
    );
  }

  const normalized = typeof value === 'string' ? value.replace(/[$,\s]/g, '') : value;
  const number = Number(normalized);

  if (!Number.isFinite(number)) {
    return formatText(value);
  }

  return new Intl.NumberFormat('es-MX', {
    currency: 'MXN',
    maximumFractionDigits: 2,
    style: 'currency',
  }).format(number);
}

function formatDate(value) {
  if (!value) {
    return 'Sin fecha';
  }

  if (typeof value === 'object') {
    return formatDate(value.fecha_inicio || value.fecha_solicitud || value.fecha_registro || value.created_at || value.fecha);
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return formatText(value, 'Sin fecha');
  }

  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function statusLabel(value) {
  if (typeof value === 'boolean') {
    return value ? 'Activo' : 'Inactivo';
  }

  if (typeof value === 'object') {
    return statusLabel(value.status ?? value.estado ?? value.estatus ?? value.activo ?? value.nombre ?? value.label);
  }

  const normalized = String(value ?? '').toLowerCase();

  if (normalized === '0' || normalized.includes('pend')) {
    return 'Pendiente';
  }

  if (normalized === '1' || normalized.includes('aprob') || normalized.includes('activo')) {
    return 'Activo';
  }

  if (normalized === '2' || normalized.includes('rechaz') || normalized.includes('cancel')) {
    return 'Cerrado';
  }

  return formatText(value, 'Sin estado');
}

function statusTone(value) {
  const normalized = statusLabel(value).toLowerCase();

  if (normalized.includes('pag') || normalized.includes('aprob') || normalized.includes('activo') || normalized.includes('confirm')) {
    return 'success';
  }

  if (normalized.includes('pend') || normalized.includes('revision') || normalized.includes('revisi')) {
    return 'warning';
  }

  if (normalized.includes('rechaz') || normalized.includes('cancel') || normalized.includes('cerr')) {
    return 'danger';
  }

  return 'neutral';
}

function getAmount(item) {
  return getValue(item, [
    'cantidad',
    'monto',
    'monto_ahorro',
    'cantidad_inversion',
    'cantidad_prestamo',
    'total',
    'saldo',
  ]);
}

function getTitle(item, fallback) {
  const value = getValue(item, [
    'nombre',
    'name',
    'titulo',
    'title',
    'plan',
    'tipo_ahorro',
    'ahorro',
    'inversion',
    'prestamo',
    'tipo',
    'concepto',
    'id_activo',
    'ahorro_id',
    'id',
  ]);

  return formatText(value, fallback);
}

function getDate(item) {
  return getValue(item, [
    'fecha_inicio',
    'fecha_solicitud',
    'fecha_registro',
    'created_at',
    'fecha',
  ]);
}

function getEndDate(item) {
  return getValue(item, [
    'fecha_fin',
    'fecha_final',
    'fecha_vencimiento',
    'end_date',
  ]);
}

function getStatus(item) {
  return getValue(item, ['estado', 'estatus', 'status', 'activo']);
}

function getPaymentMethod(item) {
  return getValue(item, [
    'metodo_pago',
    'payment_method',
    'pay_method',
    'pago_inicial',
    'forma_pago',
  ]);
}

function getStripeStatus(item) {
  return getValue(item, [
    'stripe_status',
    'estado_stripe',
    'payment_status',
    'estatus_pago',
    'estado_pago',
    'pagado',
  ]);
}

function getCheckoutUrl(item) {
  return getValue(item, [
    'checkout_url',
    'stripe_url',
    'url_checkout',
    'payment_url',
    'url_pago',
  ]);
}

function getRecordDetails(item, type) {
  const commonDetails = [
    ['Plan', getValue(item, ['plan', 'ahorro', 'inversion', 'prestamo', 'tipo_ahorro', 'tipo'])],
    ['Fecha inicio', getDate(item), 'date'],
    ['Fecha fin', getEndDate(item), 'date'],
    ['Metodo de pago', getPaymentMethod(item)],
    ['Stripe', getStripeStatus(item), 'status'],
  ];

  if (type === 'savings') {
    return [
      ['Cuota', getValue(item, ['cuota', 'cuota_obligatoria']), 'money'],
      ['Monto inicial', getValue(item, ['monto_inicial', 'pago_inicial']), 'money'],
      ['Saldo acumulado', getValue(item, ['saldo', 'monto_acumulado', 'monto_ahorro', 'total']), 'money'],
      ...commonDetails,
    ];
  }

  if (type === 'investments') {
    return [
      ['Monto invertido', getValue(item, ['cantidad', 'monto', 'monto_invertido', 'total']), 'money'],
      ['Rendimiento', getValue(item, ['rendimiento', 'porcentaje', 'tasa'])],
      ['Fecha', getDate(item), 'date'],
      ['Plan', getValue(item, ['plan', 'inversion', 'tipo', 'id_activo'])],
      ['Estado de pago', getStripeStatus(item), 'status'],
    ];
  }

  if (type === 'loans') {
    return [
      ['Monto solicitado', getValue(item, ['cantidad', 'monto', 'cantidad_prestamo', 'monto_solicitado']), 'money'],
      ['Plan', getValue(item, ['plan', 'prestamo', 'tipo', 'id_activo'])],
      ['Fecha', getDate(item), 'date'],
      ['Aval', getValue(item, ['aval', 'codigo_aval', 'avalista'])],
      ['Documentos', getValue(item, ['documentos', 'docs', 'archivos'])],
      ['Metodo de pago', getPaymentMethod(item)],
    ];
  }

  return commonDetails;
}

function getPlanDetails(item) {
  const source = getValue(item, ['plan', 'ahorro', 'tipo_ahorro', 'id_activo', 'ahorro_id']) || item;

  if (!source || typeof source !== 'object') {
    return [];
  }

  return [
    ['Tipo', source.tipo_ahorro || source.tipo],
    ['Rendimiento', source.rendimiento],
    ['Monto minimo', source.monto_min],
    ['Meses minimos', source.meses_minimos],
    ['Temporada', source.is_temporada],
    ['Estado', source.status],
  ].filter(([, value]) => value !== undefined && value !== null && value !== '');
}

function formatDetailValue(label, value, kind) {
  if (kind === 'money') {
    return formatMoney(value);
  }

  if (kind === 'date') {
    return formatDate(value);
  }

  if (kind === 'status') {
    return statusLabel(value);
  }

  if (label === 'Monto minimo') {
    return formatMoney(value);
  }

  if (label === 'Estado') {
    return statusLabel(value);
  }

  return formatText(value);
}

function isPaymentPending(item) {
  const paymentStatus = normalizeText(getStripeStatus(item));
  const status = normalizeText(getStatus(item));

  return paymentStatus.includes('pend') || status.includes('pend') || paymentStatus === 'no' || paymentStatus === 'false';
}

function matchesSearch(item, query) {
  if (!query) {
    return true;
  }

  const searchable = [
    getTitle(item, ''),
    getStatus(item),
    getAmount(item),
    getDate(item),
    getEndDate(item),
    getPaymentMethod(item),
    getStripeStatus(item),
    ...getPlanDetails(item).map(([, value]) => value),
  ].map((value) => normalizeText(value)).join(' ');

  return searchable.includes(query.toLowerCase());
}

function FinancialRequestList({
  emptyDescription,
  emptyTitle,
  error,
  isLoading,
  items,
  onRefresh,
  searchable = false,
  title,
  type = 'general',
}) {
  const [query, setQuery] = useState('');
  const filteredItems = useMemo(
    () => items.filter((item) => matchesSearch(item, query.trim())),
    [items, query],
  );

  return (
    <section className="request-list motion-scroll" aria-live="polite">
      <div className="request-list-heading">
        <h2>{title}</h2>
        {onRefresh && (
          <Button className="button-secondary icon-button" disabled={isLoading} onClick={onRefresh}>
            <RefreshCw size={18} aria-hidden="true" />
            Actualizar
          </Button>
        )}
      </div>

      {searchable && (
        <label className="request-search">
          <Search size={18} aria-hidden="true" />
          <span className="sr-only">Buscar registros</span>
          <input
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por plan, estado, fecha o metodo"
            type="search"
            value={query}
          />
        </label>
      )}

      {isLoading && (
        <div className="request-list-grid" aria-hidden="true">
          {[0, 1].map((item) => (
            <article className="request-card request-card-skeleton" key={item}>
              <span />
              <span />
              <span />
            </article>
          ))}
        </div>
      )}

      {!isLoading && error && (
        <div className="savings-plans-state savings-plans-error" role="alert">
          <AlertCircle size={34} aria-hidden="true" />
          <div>
            <h3>No se pudo cargar la informacion</h3>
            <p>{error}</p>
          </div>
        </div>
      )}

      {!isLoading && !error && items.length === 0 && (
        <div className="savings-plans-state">
          <div>
            <h3>{emptyTitle}</h3>
            <p>{emptyDescription}</p>
          </div>
        </div>
      )}

      {!isLoading && !error && items.length > 0 && filteredItems.length === 0 && (
        <div className="savings-plans-state">
          <div>
            <h3>No encontramos registros</h3>
            <p>Prueba con otro plan, estado o fecha.</p>
          </div>
        </div>
      )}

      {!isLoading && !error && filteredItems.length > 0 && (
        <div className="request-list-grid">
          {filteredItems.map((item, index) => {
            const status = getStatus(item);
            const checkoutUrl = getCheckoutUrl(item);

            return (
            <article className="request-card" key={item?.id || item?.folio || item?.plan?.id || item?.ahorro?.id || index}>
              <div>
                <span className={`request-card-label status-${statusTone(status)}`}>{statusLabel(status)}</span>
                <h3>{getTitle(item, `Solicitud ${index + 1}`)}</h3>
              </div>
              <strong>{formatMoney(getAmount(item))}</strong>
              <p>Fecha: {formatDate(getDate(item))}</p>
              {getRecordDetails(item, type).filter(([, value]) => value !== undefined && value !== null && value !== '').length > 0 && (
                <dl className="request-card-details">
                  {getRecordDetails(item, type)
                    .filter(([, value]) => value !== undefined && value !== null && value !== '')
                    .map(([label, value, kind]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>{formatDetailValue(label, value, kind)}</dd>
                    </div>
                  ))}
                </dl>
              )}
              <div className="request-card-actions">
                {type === 'investments' && isPaymentPending(item) && checkoutUrl && (
                  <Button className="icon-button" onClick={() => { window.location.href = checkoutUrl; }}>
                    <CreditCard size={18} aria-hidden="true" />
                    Pagar con Stripe
                  </Button>
                )}
                {checkoutUrl && type !== 'investments' && (
                  <Button className="button-secondary icon-button" onClick={() => { window.location.href = checkoutUrl; }}>
                    <ExternalLink size={18} aria-hidden="true" />
                    Abrir pago
                  </Button>
                )}
              </div>
            </article>
          );
          })}
        </div>
      )}
    </section>
  );
}

export default FinancialRequestList;
